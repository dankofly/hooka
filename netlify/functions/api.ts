
import { GoogleGenAI, Type } from "@google/genai";
import { neon } from '@netlify/neon';
import Stripe from 'stripe';
import crypto from 'crypto';

// Initialize Stripe (only if key is available)
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Stripe Price ID for €10/month subscription (set in Netlify env vars)
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;

// Gemini model used for all generation calls (also logged to analytics)
const GEMINI_MODEL = 'gemini-2.0-flash';

// SECURITY: Restrict CORS to allowed origins
const ALLOWED_ORIGINS = [
  "https://hooka.hypeakz.io",
  "https://stirring-otter-3510b8.netlify.app",
  "https://hypeakz.io",
  "https://www.hypeakz.io",
  process.env.ALLOWED_ORIGIN // Optional custom origin from env
].filter(Boolean);

const getCorsOrigin = (requestOrigin: string | undefined) => {
  // In development (localhost), allow the request
  if (requestOrigin?.includes("localhost") || requestOrigin?.includes("127.0.0.1")) {
    return requestOrigin;
  }
  // In production, only allow whitelisted origins
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }
  // Default to primary domain
  return "https://hooka.hypeakz.io";
};

const getHeaders = (requestOrigin?: string) => ({
  "Access-Control-Allow-Origin": getCorsOrigin(requestOrigin),
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

// SECURITY: Admin password MUST be set via environment variable
// If not set, admin functionality is disabled
const ADMIN_PASS = process.env.ADMIN_PASSWORD;

// Constant-time comparison so response timing leaks nothing about the password
const safeEqual = (a: unknown, b: unknown): boolean => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
};

// Identity of the caller, derived from the verified Netlify Identity JWT.
// Netlify populates context.clientContext.user only for valid Bearer tokens,
// so this cannot be spoofed by sending an arbitrary userId in the payload.
// Must mirror generateStableId() in services/auth.ts.
const getAuthUserId = (context: any): string | null => {
  const sub = context?.clientContext?.user?.sub;
  return sub ? `user-${String(sub).substring(0, 12)}` : null;
};

const getAuthEmail = (context: any): string | null =>
  context?.clientContext?.user?.email || null;

const getClientIp = (event: any): string => {
  return event.headers?.['x-nf-client-connection-ip']
    || event.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
    || 'unknown';
};

const getSql = () => {
  const url = process.env.NETLIFY_DATABASE_URL;
  if (!url) return null;
  return neon(url);
};

// Optimization: Cached Table Initialization Promise to avoid redundant queries per cold start
let tablesInitPromise: Promise<any> | null = null;

// Quota Constants
const FREE_GENERATION_LIMIT = 10;
const RESEARCH_DAILY_LIMIT = 10;
const ADMIN_FAIL_LIMIT = 8; // failed attempts per IP per 10 minutes

const ensureTables = async (sql: any) => {
  if (tablesInitPromise) return tablesInitPromise;

  tablesInitPromise = (async () => {
    await Promise.all([
      sql`CREATE TABLE IF NOT EXISTS hypeakz_users (id TEXT PRIMARY KEY, name TEXT, brand TEXT, email TEXT, phone TEXT, created_at BIGINT)`,
      sql`CREATE TABLE IF NOT EXISTS hypeakz_history (id TEXT PRIMARY KEY, timestamp BIGINT, brief JSONB, concepts JSONB)`,
      sql`CREATE TABLE IF NOT EXISTS hypeakz_profiles (id TEXT PRIMARY KEY, name TEXT, brief JSONB)`,
      sql`CREATE TABLE IF NOT EXISTS hypeakz_analytics (id TEXT PRIMARY KEY, event_name TEXT, timestamp BIGINT, metadata JSONB)`,
      sql`CREATE TABLE IF NOT EXISTS hypeakz_settings (key TEXT PRIMARY KEY, value TEXT)`,
      sql`CREATE TABLE IF NOT EXISTS hypeakz_quotas (user_id TEXT PRIMARY KEY, used_generations INT DEFAULT 0, is_premium BOOLEAN DEFAULT FALSE, stripe_customer_id TEXT, stripe_subscription_id TEXT, created_at BIGINT)`,
      sql`CREATE TABLE IF NOT EXISTS hypeakz_hooks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        hook TEXT NOT NULL,
        script TEXT,
        audience TEXT,
        product TEXT,
        result_metric TEXT,
        result_value REAL,
        notes TEXT,
        created_at BIGINT,
        updated_at BIGINT
      )`
    ]);
    // Per-user scoping for legacy tables (no-op when the column already exists)
    await Promise.all([
      sql`ALTER TABLE hypeakz_history ADD COLUMN IF NOT EXISTS user_id TEXT`,
      sql`ALTER TABLE hypeakz_profiles ADD COLUMN IF NOT EXISTS user_id TEXT`
    ]);
  })().catch(e => {
    console.error("Table init error:", e);
    tablesInitPromise = null;
  });

  return tablesInitPromise;
};

// Atomically consume one generation. Returns allowed=false when the free
// limit is reached and the caller is not premium. The WHERE clause on the
// upsert makes check-and-increment race-free.
const consumeGeneration = async (sql: any, key: string) => {
  const rows = await sql`
    INSERT INTO hypeakz_quotas (user_id, used_generations, is_premium, created_at)
    VALUES (${key}, 1, FALSE, ${Date.now()})
    ON CONFLICT (user_id) DO UPDATE
      SET used_generations = hypeakz_quotas.used_generations + 1
      WHERE hypeakz_quotas.is_premium = TRUE
         OR hypeakz_quotas.used_generations < ${FREE_GENERATION_LIMIT}
    RETURNING used_generations, is_premium
  `;
  if (rows.length === 0) {
    const cur = await sql`SELECT used_generations, is_premium FROM hypeakz_quotas WHERE user_id = ${key} LIMIT 1`;
    return {
      allowed: false,
      usedGenerations: cur[0]?.used_generations ?? FREE_GENERATION_LIMIT,
      isPremium: cur[0]?.is_premium === true
    };
  }
  return {
    allowed: true,
    usedGenerations: rows[0].used_generations,
    isPremium: rows[0].is_premium === true
  };
};

const refundGeneration = async (sql: any, key: string) => {
  try {
    await sql`UPDATE hypeakz_quotas SET used_generations = GREATEST(used_generations - 1, 0) WHERE user_id = ${key}`;
  } catch (e) {
    console.error("Quota refund failed:", e);
  }
};

const fetchUrlContent = async (targetUrl: string): Promise<string | null> => {
  try {
    const controller = new AbortController();
    // OPTIMIZED TIMEOUT: 12 seconds for Jina to properly render JS-heavy sites
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    let urlToScrape = targetUrl.trim();
    if (!urlToScrape.startsWith('http')) {
        urlToScrape = 'https://' + urlToScrape;
    }

    // Jina AI Reader URL (The Bridge)
    const scrapeUrl = `https://r.jina.ai/${urlToScrape}`;

    const response = await fetch(scrapeUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'markdown',
        'X-With-Generated-Alt': 'true',
        'X-With-Links-Summary': 'true', // Include link summaries for better context
        'X-Target-Selector': 'main, article, .content, #content, .main, body', // Focus on main content
        'User-Agent': 'Mozilla/5.0 (compatible; Hypeakz-Scanner/2.0; +https://hypeakz.io)'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const text = await response.text();

    // Validation: Filter out Jina error pages or empty results
    if (text.length < 150 || (text.includes("Jina Reader") && text.includes("Error"))) return null;
    if (text.includes("Cloudflare") || text.includes("Verify you are human") || text.includes("Access denied")) return null;
    if (text.includes("404") && text.includes("not found")) return null;
    if (text.includes("Page not found") || text.includes("Seite nicht gefunden")) return null;

    // Clean up common noise
    let cleanedText = text
      .replace(/\[Skip to.*?\]/gi, '')
      .replace(/Cookie.*?akzeptieren/gi, '')
      .replace(/Accept.*?cookies/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return cleanedText.substring(0, 50000); // Increased buffer for more context
  } catch (e) {
    console.log("Jina scrape failed, will use fallback:", e);
    return null;
  }
};

// Distilled from the HYPEAKZ Neuro-Copywriter framework (Häusel Limbic®,
// NLP/Milton Model, Hook Engine). Keep in sync with the neuro-copywriter skill.
const getSystemInstruction = (language: string, customTuning: string = "") => `
ROLE: You are an elite direct-response copywriter fused with a neuromarketing scientist (Häusel Limbic®, NLP/Milton Model). You engineer language that bypasses the rational filter and speaks directly to the brain's emotional decision systems. You do not write "nice" copy; you write copy that moves the reader's nervous system toward a decision.

THE ONE LAW: No emotion, no money. 70-95% of every buying decision runs unconscious (System 1, the Autopilot) in under 2 seconds. Activate the right motive system in the first 2 seconds, keep it active, and disarm the Balance brake (risk, doubt) with trust signals.

NON-NEGOTIABLE RULES:
1. Emotion before cognition: lead with the feeling/motive, justify with logic second.
2. The brain cannot process negation. Never write "verliere nicht / stop failing / no more stress". State the wanted end-state directly ("behalte die Kontrolle", "feel in control").
3. Match, then lead: pace the reader's current reality in their own words before moving them anywhere.
4. ONE motive system per concept. Hedging between motives lands in the dead middle and activates nothing. Across the 4 concepts, vary motive angle and hook mechanism.
5. Specificity beats vagueness: exact numbers (37%, 0,8 Sekunden) out-convert round claims. Kill every vague claim.
6. Only true scarcity. Fake urgency gets learned away and poisons trust.

LIMBIC MOTIVE SYSTEMS (commit per concept; when the brief specifies a Limbic profile, it is binding):
- BALANCE (Harmonizer/Traditionalist): security, belonging, the proven. Word-set: sicher, bewährt, vertraut, zuverlässig, Familie, gemeinsam, Garantie, seit [Jahr], sorgenfrei / safe, trusted, proven, guaranteed. Tone: warm, calm. Never max FOMO here, it triggers their risk brake.
- DOMINANCE (Performer): status, victory, control. Word-set: Erfolg, Nr. 1, exklusiv, Vorsprung, dominieren, Effizienz, Premium, gewinnen / win, elite, edge, master. Tone: confident, terse, uncompromising.
- STIMULANCE (Hedonist): novelty, curiosity, fun. Word-set: neu, entdecken, erleben, einzigartig, überraschend, Trend, jetzt / new, discover, unique, surprising. Tone: playful, fast, cheeky.
- Mixed zones: ADVENTURE (Dom+Stim: Risiko, Freiheit, Mut, Grenze), FANTASY/ENJOYMENT (Stim+Bal: genießen, sinnlich, Auszeit, Leichtigkeit), DISCIPLINE (Bal+Dom: präzise, effizient, logisch, geprüft).

HOOK ENGINE (choose one pattern-interrupt mechanism per concept, vary across the 4):
1. Contradiction: state the opposite of the reader's belief.
2. Paradox Reversal: a logical impossibility that intrigues.
3. Provocative Denial: "Lies das nicht, wenn..."
4. Unexpected Truth: a true thing nobody says out loud.
5. Rule Breaking: openly violate a category norm.
Hook construction: curiosity gap + one specific number/timeframe + one trigger word (endlich, kaum jemand, was dir niemand sagt, unbemerkt, genau jetzt, die Wahrheit über, bevor du / finally, hardly anyone, what nobody tells you, right now).

LANGUAGE STACK (weave in, never bolt on):
- Milton Model: presuppositions, embedded commands, pacing-and-leading, cause-effect chains, double binds, mind-reading openers ("Du kennst das: ...").
- Zeigarnik: open a loop early, resolve it late, or let the click/reply/open be what closes it.
- VAK predicates matched to the brief's sensory modality; rotate all three for broad audiences.
- Meta-programs from the brief (Toward/Away, Options/Procedures, Internal/External) shape verbs and framing.
- Identity level where possible: sell who the reader becomes, not what the product does.

SCORING: Score the four NeuroScores honestly per concept, do not flatter your own draft. Match the score profile to the motive: a Balance concept must not max scarcity.

LANGUAGE OF OUTPUT: ${language === 'DE' ? 'Deutsch. Du-Form, kurze direkte Sätze, konkret, keine Gedankenstriche, kein Marketing-Geschwurbel.' : 'English. Short direct sentences, concrete, no filler.'}
${customTuning ? `\nADMIN OVERRIDE:\n${customTuning}` : ''}
`;

// --- CHANNEL PRESETS ---
// Each channel redefines what the four output fields mean and adds
// channel-specific craft rules. VIDEO keeps the original behavior.
const CHANNEL_SPECS: Record<string, { label: string; fieldSpec: string; rules: string }> = {
  VIDEO: {
    label: 'Short-form video (TikTok, Reels, Shorts)',
    fieldSpec: `- "hook": The spoken/visible opening line of the video (first 1-3 seconds).
- "script": The full video script with rough timecodes, 20-40 seconds.
- "strategy": Why this works neurologically (1-2 sentences).
- "visualPrompt": A detailed visual/scene prompt usable in an AI video tool (setting, subject, camera, mood, style).`,
    rules: `- The hook must stop the scroll within 1 second.
- Write for spoken language, short sentences, no filler.`
  },
  EMAIL_SUBJECT: {
    label: 'E-mail subject line',
    fieldSpec: `- "hook": The subject line itself (max 50 characters, this is the product).
- "script": The preheader (max 90 characters) followed by the first two opening sentences of the email body.
- "strategy": Why this subject line gets opened (1-2 sentences).
- "visualPrompt": An alternative B-variant of the subject line for A/B testing (different psychological angle).`,
    rules: `- Max 50 characters per subject line, front-load the intrigue.
- Deliverability: no ALL CAPS words, no excessive punctuation (!!, ??), at most one emoji, avoid classic spam triggers.
- The subject must create an open loop that only opening the mail closes.
- Subject and preheader must complement each other, never repeat each other.`
  },
  NEWSLETTER: {
    label: 'Newsletter opener',
    fieldSpec: `- "hook": The first sentence of the newsletter (the line readers see after opening).
- "script": The complete opening section (2-3 short paragraphs) that pulls the reader into the main content.
- "strategy": Why this opener keeps people reading (1-2 sentences).
- "visualPrompt": A matching subject line suggestion for this opener (max 50 characters).`,
    rules: `- First sentence max 12 words, concrete, no throat-clearing ("Ich hoffe, es geht dir gut" is forbidden).
- Open with a scene, a number, a contrarian claim or a direct question.
- Each paragraph max 3 sentences.`
  },
  FACEBOOK: {
    label: 'Facebook post / ad',
    fieldSpec: `- "hook": The first line of the post (visible above the "see more" fold, max 90 characters).
- "script": The complete post text including line breaks and a clear CTA at the end.
- "strategy": Why this works for the Facebook feed (1-2 sentences).
- "visualPrompt": A detailed image/creative prompt for the accompanying visual (subject, composition, text overlay if any).`,
    rules: `- The first line must work standalone, everything after the fold is bonus.
- Short paragraphs (1-2 sentences), generous line breaks.
- One single CTA, no link-spam wording ("Link in comments" style is allowed).`
  },
  INSTAGRAM: {
    label: 'Instagram post / caption',
    fieldSpec: `- "hook": The first line of the caption (max 100 characters, visible before Instagram truncates with "... mehr").
- "script": The complete caption: hook line, body with generous line breaks, one CTA (save/share/comment prompt), then a block of 3-5 highly specific hashtags on the last line.
- "strategy": Why this works for the Instagram feed and the save/share algorithm (1-2 sentences).
- "visualPrompt": A detailed creative prompt for the visual: single image OR carousel concept (if carousel: slide-by-slide, max 6 slides, slide 1 = the hook as text overlay).`,
    rules: `- The first 100 characters must work standalone, everything after the truncation is bonus.
- Write for saves and shares, not likes: give a concrete takeaway worth keeping.
- Short paragraphs (1-2 lines), emojis sparingly and only as visual anchors, never mid-sentence decoration.
- Exactly one CTA. 3-5 niche hashtags, no generic mass tags (#love #instagood).
- No external-link talk in the caption (links do not work there); point to profile/DM/save instead.`
  }
};

const normalizeChannel = (raw: unknown): string => {
  const c = typeof raw === 'string' ? raw.toUpperCase() : 'VIDEO';
  return CHANNEL_SPECS[c] ? c : 'VIDEO';
};

export const handler = async (event: any, context: any) => {
  // Get origin from request headers for CORS
  const requestOrigin = event.headers?.origin || event.headers?.Origin;
  const headers = getHeaders(requestOrigin);

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "Method Not Allowed" };

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const sql = getSql();

    if (!apiKey && !sql) return { statusCode: 500, headers, body: JSON.stringify({ error: "Configuration Error" }) };

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    const { action, payload = {} } = body;
    const authUserId = getAuthUserId(context);
    const clientIp = getClientIp(event);
    // Quota/rate-limit key: verified identity first, IP as anonymous fallback
    const quotaKey = authUserId || `ip:${clientIp}`;
    let result: any = { success: true };

    if (sql && ['log-analytics', 'save-user', 'save-history', 'save-profile', 'save-admin-prompt', 'generate-hooks', 'get-quota', 'increment-quota', 'sync-quota', 'research', 'save-hook', 'update-hook-result', 'get-hooks', 'delete-hook', 'verify-admin'].includes(action)) {
      await ensureTables(sql);
    }

    switch (action) {
      // --- DB OPERATIONS (Standard) ---
      case 'init-db': { if (sql) await ensureTables(sql); break; }
      case 'log-analytics': {
        if (!sql) break;
        const { id, eventName, timestamp, metadata } = payload;
        if (typeof id !== 'string' || id.length > 64) break;
        if (typeof eventName !== 'string' || eventName.length > 64) break;
        if (metadata && JSON.stringify(metadata).length > 2048) break;
        await sql`INSERT INTO hypeakz_analytics (id, event_name, timestamp, metadata) VALUES (${id}, ${eventName}, ${timestamp}, ${metadata}) ON CONFLICT (id) DO NOTHING`;
        break;
      }
      case 'save-user': {
        if (!sql) break;
        // Only authenticated users are persisted, and only under their own verified id
        if (!authUserId) break;
        const u = payload;
        if (!u.name) break;
        await sql`INSERT INTO hypeakz_users (id, name, brand, email, phone, created_at) VALUES (${authUserId}, ${u.name}, ${u.brand}, ${getAuthEmail(context) || u.email}, ${u.phone || null}, ${u.createdAt || Date.now()}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, brand = EXCLUDED.brand, email = EXCLUDED.email, phone = EXCLUDED.phone`;
        break;
      }
      case 'get-user': {
        if (!sql || !authUserId) { result = null; break; }
        const rows = await sql`SELECT * FROM hypeakz_users WHERE id = ${authUserId} LIMIT 1`;
        result = rows.length === 0 ? null : {
          id: rows[0].id, name: rows[0].name, brand: rows[0].brand, email: rows[0].email, phone: rows[0].phone, createdAt: Number(rows[0].created_at)
        };
        break;
      }
      case 'save-history': {
        if (!sql || !authUserId) break;
        const h = payload;
        await sql`INSERT INTO hypeakz_history (id, user_id, timestamp, brief, concepts) VALUES (${h.id}, ${authUserId}, ${h.timestamp}, ${h.brief}, ${h.concepts}) ON CONFLICT (id) DO UPDATE SET timestamp = EXCLUDED.timestamp, brief = EXCLUDED.brief, concepts = EXCLUDED.concepts WHERE hypeakz_history.user_id = ${authUserId}`;
        break;
      }
      case 'get-history': {
        if (!sql || !authUserId) { result = []; break; }
        const rows = await sql`SELECT id, timestamp, brief, concepts FROM hypeakz_history WHERE user_id = ${authUserId} ORDER BY timestamp DESC LIMIT 20`;
        result = rows.map((r: any) => ({ id: r.id, timestamp: Number(r.timestamp), brief: r.brief, concepts: r.concepts }));
        break;
      }
      case 'save-profile': {
        if (!sql || !authUserId) break;
        const p = payload;
        await sql`INSERT INTO hypeakz_profiles (id, user_id, name, brief) VALUES (${p.id}, ${authUserId}, ${p.name}, ${p.brief}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, brief = EXCLUDED.brief WHERE hypeakz_profiles.user_id = ${authUserId}`;
        break;
      }
      case 'get-profiles': {
        if (!sql || !authUserId) { result = []; break; }
        result = await sql`SELECT id, name, brief FROM hypeakz_profiles WHERE user_id = ${authUserId} ORDER BY name ASC`;
        break;
      }
      case 'delete-profile': {
        if (!sql || !authUserId) break;
        await sql`DELETE FROM hypeakz_profiles WHERE id = ${payload.id} AND user_id = ${authUserId}`;
        break;
      }

      // --- HOOK LIBRARY (the learning loop; auth required) ---
      case 'save-hook': {
        if (!sql || !authUserId) break;
        const h = payload;
        if (!h.id || !h.hook) break;
        const channel = normalizeChannel(h.channel);
        await sql`
          INSERT INTO hypeakz_hooks (id, user_id, channel, hook, script, audience, product, notes, created_at, updated_at)
          VALUES (${h.id}, ${authUserId}, ${channel}, ${String(h.hook).substring(0, 500)}, ${h.script || null}, ${h.audience || null}, ${h.product || null}, ${h.notes || null}, ${Date.now()}, ${Date.now()})
          ON CONFLICT (id) DO UPDATE SET hook = EXCLUDED.hook, script = EXCLUDED.script, notes = EXCLUDED.notes, updated_at = EXCLUDED.updated_at
          WHERE hypeakz_hooks.user_id = ${authUserId}
        `;
        break;
      }
      case 'update-hook-result': {
        if (!sql || !authUserId) break;
        const { id, resultMetric, resultValue, notes } = payload;
        if (!id || typeof resultValue !== 'number') break;
        await sql`
          UPDATE hypeakz_hooks
          SET result_metric = ${resultMetric || 'performance'}, result_value = ${resultValue}, notes = ${notes || null}, updated_at = ${Date.now()}
          WHERE id = ${id} AND user_id = ${authUserId}
        `;
        break;
      }
      case 'get-hooks': {
        if (!sql || !authUserId) { result = []; break; }
        const channel = payload.channel ? normalizeChannel(payload.channel) : null;
        const rows = channel
          ? await sql`SELECT id, channel, hook, script, audience, product, result_metric, result_value, notes, created_at FROM hypeakz_hooks WHERE user_id = ${authUserId} AND channel = ${channel} ORDER BY created_at DESC LIMIT 100`
          : await sql`SELECT id, channel, hook, script, audience, product, result_metric, result_value, notes, created_at FROM hypeakz_hooks WHERE user_id = ${authUserId} ORDER BY created_at DESC LIMIT 100`;
        result = rows.map((r: any) => ({
          id: r.id, channel: r.channel, hook: r.hook, script: r.script, audience: r.audience,
          product: r.product, resultMetric: r.result_metric, resultValue: r.result_value,
          notes: r.notes, createdAt: Number(r.created_at)
        }));
        break;
      }
      case 'delete-hook': {
        if (!sql || !authUserId) break;
        await sql`DELETE FROM hypeakz_hooks WHERE id = ${payload.id} AND user_id = ${authUserId}`;
        break;
      }

      // --- QUOTA OPERATIONS ---
      case 'get-quota': {
        if (!sql) {
          result = { usedGenerations: 0, limit: FREE_GENERATION_LIMIT, isPremium: false };
          break;
        }
        const key = authUserId || (payload.userId ? String(payload.userId) : `ip:${clientIp}`);
        const rows = await sql`SELECT used_generations, is_premium FROM hypeakz_quotas WHERE user_id = ${key} LIMIT 1`;
        if (rows.length === 0) {
          result = { usedGenerations: 0, limit: FREE_GENERATION_LIMIT, isPremium: false };
        } else {
          result = {
            usedGenerations: rows[0].used_generations || 0,
            limit: FREE_GENERATION_LIMIT,
            isPremium: rows[0].is_premium === true
          };
        }
        break;
      }
      case 'increment-quota': {
        // Kept for backward compatibility; generation now increments server-side.
        break;
      }
      case 'sync-quota': {
        // Sync localStorage count with DB (takes higher value)
        if (!sql) break;
        const { localCount } = payload;
        const key = authUserId;
        if (!key || typeof localCount !== 'number') break;
        const safeLocal = Math.max(0, Math.min(Math.floor(localCount), FREE_GENERATION_LIMIT));

        const rows = await sql`SELECT used_generations, is_premium FROM hypeakz_quotas WHERE user_id = ${key} LIMIT 1`;

        if (rows.length === 0) {
          await sql`INSERT INTO hypeakz_quotas (user_id, used_generations, is_premium, created_at) VALUES (${key}, ${safeLocal}, FALSE, ${Date.now()})`;
          result = { usedGenerations: safeLocal, limit: FREE_GENERATION_LIMIT, isPremium: false };
        } else {
          const dbCount = rows[0].used_generations || 0;
          const isPremium = rows[0].is_premium === true;
          const finalCount = Math.max(dbCount, safeLocal);

          if (finalCount > dbCount) {
            await sql`UPDATE hypeakz_quotas SET used_generations = ${finalCount} WHERE user_id = ${key}`;
          }

          result = { usedGenerations: finalCount, limit: FREE_GENERATION_LIMIT, isPremium };
        }
        break;
      }

      // --- STRIPE CHECKOUT ---
      case 'create-checkout': {
        if (!stripe) {
          console.error("Stripe not initialized - STRIPE_SECRET_KEY missing");
          return { statusCode: 500, headers, body: JSON.stringify({ error: "Stripe not configured (missing secret key)" }) };
        }
        if (!STRIPE_PRICE_ID) {
          console.error("STRIPE_PRICE_ID not set");
          return { statusCode: 500, headers, body: JSON.stringify({ error: "Stripe not configured (missing price ID)" }) };
        }

        // Checkout requires a verified identity; the subscription must be
        // bound to the JWT-derived user id, not a client-chosen one.
        const checkoutUserId = authUserId;
        const checkoutEmail = getAuthEmail(context) || payload.userEmail;
        if (!checkoutUserId || !checkoutEmail) {
          return { statusCode: 401, headers, body: JSON.stringify({ error: "Login required for checkout" }) };
        }

        const { successUrl, cancelUrl } = payload;

        try {
          const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer_email: checkoutEmail,
            line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
            success_url: successUrl || 'https://hooka.hypeakz.io/?checkout=success',
            cancel_url: cancelUrl || 'https://hooka.hypeakz.io/?checkout=cancelled',
            metadata: { userId: checkoutUserId },
            subscription_data: {
              metadata: { userId: checkoutUserId }
            }
          });

          result = { sessionId: session.id, url: session.url };
        } catch (stripeError: any) {
          console.error("Stripe Checkout Error:", stripeError.message, stripeError.type);
          return { statusCode: 500, headers, body: JSON.stringify({
            error: stripeError.message || "Stripe checkout failed",
            type: stripeError.type
          }) };
        }
        break;
      }

      case 'check-subscription': {
        // Check if user has active subscription (called periodically)
        if (!sql || !authUserId) {
          result = { isPremium: false };
          break;
        }

        const rows = await sql`SELECT is_premium, stripe_subscription_id FROM hypeakz_quotas WHERE user_id = ${authUserId} LIMIT 1`;
        if (rows.length === 0 || !rows[0].is_premium) {
          result = { isPremium: false };
          break;
        }

        // Optionally verify with Stripe if subscription is still active
        if (stripe && rows[0].stripe_subscription_id) {
          try {
            const subscription = await stripe.subscriptions.retrieve(rows[0].stripe_subscription_id);
            const isActive = ['active', 'trialing'].includes(subscription.status);
            if (!isActive) {
              // Update DB if subscription is no longer active
              await sql`UPDATE hypeakz_quotas SET is_premium = FALSE WHERE user_id = ${authUserId}`;
              result = { isPremium: false };
              break;
            }
          } catch (e) {
            // If Stripe check fails, trust the DB
            console.warn("Stripe subscription check failed:", e);
          }
        }

        result = { isPremium: true };
        break;
      }

      // --- ADMIN OPERATIONS ---
      case 'verify-admin': {
        // If no admin password is configured, admin access is disabled
        if (!ADMIN_PASS) {
          result = { success: false };
          break;
        }
        // Rate limit: block after too many failed attempts per IP
        if (sql) {
          const tenMinAgo = Date.now() - 10 * 60 * 1000;
          const fails = await sql`SELECT COUNT(*) FROM hypeakz_analytics WHERE event_name = 'admin_fail' AND timestamp > ${tenMinAgo} AND metadata->>'ip' = ${clientIp}`;
          if (parseInt(fails[0].count) >= ADMIN_FAIL_LIMIT) {
            return { statusCode: 429, headers, body: JSON.stringify({ error: "Too many attempts. Try again later." }) };
          }
        }
        const isValid = safeEqual(payload.password, ADMIN_PASS);
        if (!isValid && sql) {
          const failId = `af-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          sql`INSERT INTO hypeakz_analytics (id, event_name, timestamp, metadata) VALUES (${failId}, 'admin_fail', ${Date.now()}, ${{ ip: clientIp }})`.catch(console.error);
        }
        await new Promise(r => setTimeout(r, 300));
        result = { success: isValid };
        break;
      }
      case 'get-admin-stats': {
         // Admin disabled if no password configured
         if (!ADMIN_PASS || !safeEqual(payload.password, ADMIN_PASS)) {
           return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
         }
         if (!sql) {
           result = {
             userCount: 0,
             generationCount: 0,
             hookCount: 0,
             tokenCount: 0,
             premiumUsers: 0,
             parameterStats: {}
           };
           break;
         }
         try {
           const [users, generations, tokens, quotas, paramStats] = await Promise.all([
             // Total users
             sql`SELECT COUNT(*) FROM hypeakz_users`,
             // Total generations (from analytics)
             sql`SELECT COUNT(*) FROM hypeakz_analytics WHERE event_name = 'generation'`,
             // Total tokens
             sql`SELECT SUM((metadata->>'tokens')::int) as total FROM hypeakz_analytics WHERE event_name IN ('ai_cost', 'generation')`,
             // Quota stats (total used generations + premium users)
             sql`SELECT
               SUM(used_generations) as total_used,
               COUNT(*) FILTER (WHERE is_premium = TRUE) as premium_count
             FROM hypeakz_quotas`,
             // Parameter usage stats
             sql`SELECT
               COUNT(*) FILTER (WHERE metadata->>'language' = 'DE') as lang_de,
               COUNT(*) FILTER (WHERE metadata->>'language' = 'EN') as lang_en,
               COUNT(*) FILTER (WHERE metadata->>'contentContext' IS NOT NULL) as content_context,
               COUNT(*) FILTER (WHERE metadata->>'limbicType' IS NOT NULL) as limbic_type,
               COUNT(*) FILTER (WHERE metadata->>'patternType' IS NOT NULL) as pattern_type,
               COUNT(*) FILTER (WHERE metadata->>'repSystem' IS NOT NULL) as rep_system,
               COUNT(*) FILTER (WHERE metadata->>'motivation' IS NOT NULL) as motivation,
               COUNT(*) FILTER (WHERE metadata->>'decisionStyle' IS NOT NULL) as decision_style,
               COUNT(*) FILTER (WHERE metadata->>'presupposition' IS NOT NULL) as presupposition,
               COUNT(*) FILTER (WHERE metadata->>'chunking' IS NOT NULL) as chunking,
               COUNT(*) FILTER (WHERE (metadata->>'triggerWordsUsed')::boolean = true) as trigger_words,
               COUNT(*) FILTER (WHERE (metadata->>'focusKeyword')::boolean = true) as focus_keyword
             FROM hypeakz_analytics WHERE event_name = 'generation'`
           ]);

           // Calculate generation count from quota table (more accurate) or analytics
           const quotaGenerations = quotas[0]?.total_used ? parseInt(quotas[0].total_used) : 0;
           const analyticsGenerations = parseInt(generations[0].count);
           const generationCount = Math.max(quotaGenerations, analyticsGenerations);

           result = {
             userCount: parseInt(users[0].count),
             generationCount: generationCount,
             hookCount: generationCount * 4, // 4 hooks per generation
             tokenCount: tokens[0].total ? parseInt(tokens[0].total) : 0,
             premiumUsers: quotas[0]?.premium_count ? parseInt(quotas[0].premium_count) : 0,
             parameterStats: {
               language: {
                 DE: parseInt(paramStats[0]?.lang_de || 0),
                 EN: parseInt(paramStats[0]?.lang_en || 0)
               },
               contentContext: parseInt(paramStats[0]?.content_context || 0),
               limbicType: parseInt(paramStats[0]?.limbic_type || 0),
               patternType: parseInt(paramStats[0]?.pattern_type || 0),
               repSystem: parseInt(paramStats[0]?.rep_system || 0),
               motivation: parseInt(paramStats[0]?.motivation || 0),
               decisionStyle: parseInt(paramStats[0]?.decision_style || 0),
               presupposition: parseInt(paramStats[0]?.presupposition || 0),
               chunking: parseInt(paramStats[0]?.chunking || 0),
               triggerWords: parseInt(paramStats[0]?.trigger_words || 0),
               focusKeyword: parseInt(paramStats[0]?.focus_keyword || 0)
             }
           };
         } catch (e) {
           console.error("Admin stats error:", e);
           result = {
             userCount: 0,
             generationCount: 0,
             hookCount: 0,
             tokenCount: 0,
             premiumUsers: 0,
             parameterStats: {}
           };
         }
         break;
      }
      case 'get-admin-prompt': {
        // The custom system prompt is operator IP, do not leak it unauthenticated
        if (!ADMIN_PASS || !safeEqual(payload.password, ADMIN_PASS)) {
          return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
        }
        if (!sql) { result = { prompt: "" }; break; }
        const rows = await sql`SELECT value FROM hypeakz_settings WHERE key = 'system_prompt' LIMIT 1`;
        result = { prompt: rows.length ? rows[0].value : "" };
        break;
      }
      case 'save-admin-prompt': {
        // Admin disabled if no password configured
        if (!ADMIN_PASS || !safeEqual(payload.password, ADMIN_PASS)) {
          return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
        }
        if (!sql) throw new Error("No Database");
        await sql`INSERT INTO hypeakz_settings (key, value) VALUES ('system_prompt', ${payload.prompt}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
        result = { success: true };
        break;
      }

      // --- RESEARCH ---
      case 'research': {
        if (!apiKey) throw new Error("Missing API Key");

        // Rate limit: research burns Gemini + Jina budget, cap it per caller and day
        if (sql) {
          const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
          const used = await sql`SELECT COUNT(*) FROM hypeakz_analytics WHERE event_name = 'research' AND timestamp > ${dayAgo} AND metadata->>'key' = ${quotaKey}`;
          if (parseInt(used[0].count) >= RESEARCH_DAILY_LIMIT) {
            return { statusCode: 429, headers, body: JSON.stringify({ error: "RESEARCH_LIMIT: Tageslimit für Auto-Briefings erreicht." }) };
          }
          const rId = `rs-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          sql`INSERT INTO hypeakz_analytics (id, event_name, timestamp, metadata) VALUES (${rId}, 'research', ${Date.now()}, ${{ key: quotaKey }})`.catch(console.error);
        }

        const ai = new GoogleGenAI({ apiKey });
        const { url, language } = payload;

        if (!url) throw new Error("URL Required");

        // 1. Try Jina AI Scrape (The Bridge)
        const scrapedMarkdown = await fetchUrlContent(url);

        let prompt = "";
        let useSearchTool = false;
        const isGerman = language === 'DE';

        if (scrapedMarkdown && scrapedMarkdown.length > 300) {
           // Scenario A: Scrape Successful (High Quality)
           prompt = `
You are a senior marketing analyst. Analyze this REAL website content and extract SPECIFIC, FACTUAL information.

=== WEBSITE CONTENT (from ${url}) ===
${scrapedMarkdown.substring(0, 40000)}
=== END CONTENT ===

CRITICAL RULES:
1. Extract ONLY information that is ACTUALLY present in the content above
2. Use SPECIFIC product names, features, prices, and details mentioned on the site
3. If the website is an e-commerce store, list actual product categories
4. If it's a service business, describe the actual services offered
5. Quote actual taglines or value propositions from the site when possible
6. DO NOT make up generic descriptions - be specific to THIS website
7. If certain information is not available, write "Nicht aus der Website ersichtlich" (DE) or "Not visible from website" (EN)

EXTRACT INTO THIS JSON FORMAT:
{
  "productContext": "${isGerman ? 'Beschreibe das konkrete Produkt/Service dieser Website. Nenne spezifische Features, Produktnamen, Preise falls vorhanden. Min. 2-3 Sätze mit echten Details von der Seite.' : 'Describe the specific product/service of this website. Name specific features, product names, prices if available. Min. 2-3 sentences with real details from the site.'}",
  "targetAudience": "${isGerman ? 'Wer ist die Zielgruppe basierend auf der Sprache, dem Design und den Inhalten der Seite? Sei spezifisch (z.B. "Deutsche Unternehmer im E-Commerce Bereich" statt nur "Unternehmer")' : 'Who is the target audience based on the language, design and content of the site? Be specific.'}",
  "goal": "${isGerman ? 'Was ist das Hauptziel der Website? (z.B. "Verkauf von X", "Lead-Generierung für Y", "Newsletter-Anmeldungen")' : 'What is the main goal of the website? (e.g. "Sell X", "Lead generation for Y", "Newsletter signups")'}",
  "speaker": "${isGerman ? 'Beschreibe den Tonfall der Website: Professionell/Casual? Du/Sie? Technisch/Einfach? Zitiere einen beispielhaften Satz von der Seite.' : 'Describe the tone of voice: Professional/Casual? Formal/Informal? Technical/Simple? Quote an example sentence from the site.'}"
}

OUTPUT: Valid JSON only, no markdown formatting.
LANGUAGE: ${isGerman ? 'German' : 'English'}`;
        } else {
           // Scenario B: Scrape Failed/Timeout -> Google Search Tool (Fallback)
           useSearchTool = true;
           prompt = `
You are a marketing research analyst. Research this website/brand: "${url}"

TASK: Find REAL information about this business using Google Search.

STRICT RULES:
1. Search for the actual website and company information
2. Find real product/service descriptions, not generic assumptions
3. Look for reviews, social media presence, or press mentions
4. If the business truly cannot be found, prefix all fields with "[Recherche erforderlich]" (DE) or "[Research needed]" (EN)
5. DO NOT invent fake products or services

OUTPUT THIS JSON:
{
  "productContext": "${isGerman ? 'Was verkauft/bietet dieses Unternehmen konkret an? Basierend auf Suchergebnissen.' : 'What does this company specifically sell/offer? Based on search results.'}",
  "targetAudience": "${isGerman ? 'Wer ist die wahrscheinliche Zielgruppe?' : 'Who is the likely target audience?'}",
  "goal": "${isGerman ? 'Hauptziel der Website (Verkauf, Leads, Awareness)' : 'Main website goal (Sales, Leads, Awareness)'}",
  "speaker": "${isGerman ? 'Tonfall basierend auf gefundenen Inhalten' : 'Tone of voice based on found content'}"
}

OUTPUT: Valid JSON only.
LANGUAGE: ${isGerman ? 'German' : 'English'}`;
        }

        const config: any = {
            temperature: 0.3 // Lower temperature for more factual extraction
        };

        if (useSearchTool) {
            // Note: responseMimeType (JSON mode) is NOT compatible with Google Search tool
            config.tools = [{googleSearch: {}}];
        } else {
            // Only use JSON mode when NOT using search tool
            config.responseMimeType = "application/json";
        }

        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: config,
        });

        // Robust JSON Parsing
        let jsonData: any = {};
        const responseText = response.text || "";

        try {
          jsonData = JSON.parse(responseText);
        } catch (e) {
          // Try to extract JSON from markdown code blocks
          const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) ||
                           responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
             const jsonStr = jsonMatch[1] || jsonMatch[0];
             try { jsonData = JSON.parse(jsonStr.trim()); } catch(e2) {
               console.error("JSON parse failed:", jsonStr);
             }
          }
        }

        // Validate that we got real content, not empty strings
        const hasRealContent = (jsonData.productContext && jsonData.productContext.length > 20) ||
                               (jsonData.targetAudience && jsonData.targetAudience.length > 10);

        if (!hasRealContent && useSearchTool) {
          // If search also failed, provide helpful fallback
          const domain = url.replace(/https?:\/\//, '').split('/')[0];
          jsonData = {
            productContext: isGerman
              ? `[Automatische Analyse von ${domain} nicht möglich] Bitte beschreibe dein Produkt/Service manuell.`
              : `[Automatic analysis of ${domain} not possible] Please describe your product/service manually.`,
            targetAudience: isGerman
              ? "Bitte definiere deine Zielgruppe manuell."
              : "Please define your target audience manually.",
            goal: isGerman ? "Conversion/Verkauf" : "Conversion/Sales",
            speaker: isGerman ? "Professionell und vertrauenswürdig" : "Professional and trustworthy"
          };
        }

        const sources = scrapedMarkdown
          ? [{ title: isGerman ? "Direkt-Scan der Website" : "Direct Website Scan", uri: url }]
          : [{ title: isGerman ? "KI-Recherche" : "AI Research", uri: url }];

        if (useSearchTool && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
             response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
                 if (chunk.web?.uri && chunk.web?.title) {
                     sources.push({ title: chunk.web.title, uri: chunk.web.uri });
                 }
             });
        }

        result = {
          productContext: jsonData.productContext || "",
          targetAudience: jsonData.targetAudience || "",
          goal: jsonData.goal || "",
          speaker: jsonData.speaker || "",
          sources: sources.slice(0, 5)
        };
        break;
      }

      // --- GENERATE HOOKS ---
      case 'generate-hooks': {
        if (!apiKey) throw new Error("Missing API Key");
        const { brief } = payload;
        if (!brief) throw new Error("Missing brief");
        const channel = normalizeChannel(brief.channel);
        const spec = CHANNEL_SPECS[channel];

        // SECURITY: enforce the free limit server-side, atomically, BEFORE
        // spending Gemini tokens. Anonymous callers are keyed by IP.
        let quotaState: { usedGenerations: number; isPremium: boolean } | null = null;
        if (sql) {
          const consumed = await consumeGeneration(sql, quotaKey);
          if (!consumed.allowed) {
            return { statusCode: 429, headers, body: JSON.stringify({
              error: "QUOTA_EXCEEDED",
              quota: { usedGenerations: consumed.usedGenerations, limit: FREE_GENERATION_LIMIT, isPremium: consumed.isPremium }
            }) };
          }
          quotaState = { usedGenerations: consumed.usedGenerations, isPremium: consumed.isPremium };
        }

        try {
          const ai = new GoogleGenAI({ apiKey });

          let customTuning = "";
          if (sql) {
            try {
               const rows = await sql`SELECT value FROM hypeakz_settings WHERE key = 'system_prompt' LIMIT 1`;
               if (rows.length) customTuning = rows[0].value;
            } catch (e) {}
          }

          // THE LEARNING LOOP: inject the caller's own proven winners/losers
          // for this channel as few-shot guidance.
          let learnings = "";
          if (sql && authUserId) {
            try {
              const rated = await sql`
                SELECT hook, result_metric, result_value FROM hypeakz_hooks
                WHERE user_id = ${authUserId} AND channel = ${channel} AND result_value IS NOT NULL
                ORDER BY result_value DESC LIMIT 50
              `;
              if (rated.length >= 2) {
                const winners = rated.slice(0, 5);
                const losers = rated.length >= 8 ? rated.slice(-3) : [];
                learnings = `
LEARNED FROM THIS USER'S REAL PERFORMANCE DATA (${spec.label}):
Top performers (imitate the underlying psychological patterns, do NOT copy them verbatim):
${winners.map((w: any) => `- "${w.hook}" (${w.result_metric}: ${w.result_value})`).join('\n')}
${losers.length ? `Weak performers (avoid these patterns):\n${losers.map((l: any) => `- "${l.hook}" (${l.result_metric}: ${l.result_value})`).join('\n')}` : ''}`;
              }
            } catch (e) {
              console.warn("Hook library lookup failed:", e);
            }
          }

          const scores = brief.targetScores || { patternInterrupt: 70, emotionalIntensity: 70, curiosityGap: 70, scarcity: 50 };
          const nlpConstraints = [
            brief.contentContext ? `- Content Format: ${brief.contentContext}` : '',
            brief.limbicType ? `- Limbic® Target Profile (Emotional System): ${brief.limbicType}` : '',
            brief.focusKeyword ? `- Focus Keyword (Must be included): ${brief.focusKeyword}` : '',
            brief.patternType ? `- Specific Pattern Interrupt: ${brief.patternType}` : '',
            brief.repSystem ? `- Sensory Modality (VAK): ${brief.repSystem}` : '',
            brief.motivation ? `- Meta-Program (Motivation): ${brief.motivation}` : '',
            brief.decisionStyle ? `- Meta-Program (Decision): ${brief.decisionStyle}` : '',
            brief.presupposition ? `- Presupposition: ${brief.presupposition}` : '',
            brief.chunking ? `- Chunking Level: ${brief.chunking}` : '',
            brief.triggerWords && brief.triggerWords.length > 0 ? `- Mandatory Trigger Words: ${brief.triggerWords.join(', ')}` : ''
          ].filter(Boolean).join('\n');

          const prompt = `Erstelle 4 Content-Konzepte für den Kanal: ${spec.label}.
          Context: ${brief.productContext}.
          Goal: ${brief.goal}.
          Audience: ${brief.targetAudience}.
          Speaker Style: ${brief.speaker}.

          OUTPUT FIELD DEFINITIONS FOR THIS CHANNEL:
          ${spec.fieldSpec}

          CHANNEL RULES (mandatory):
          ${spec.rules}
          ${learnings}

          NLP & STRUCTURAL CONSTRAINTS (Apply these strictly):
          ${nlpConstraints || "No specific NLP constraints selected. Optimize for maximum retention."}

          TARGET NEURO METRICS (Aim for these levels in your writing):
          - Pattern Interrupt: ${scores.patternInterrupt}/100 (Shock factor, unexpected start)
          - Emotional Intensity: ${scores.emotionalIntensity}/100 (Feeling depth)
          - Curiosity Gap: ${scores.curiosityGap}/100 (Open loops)
          - Scarcity/FOMO: ${scores.scarcity}/100 (Urgency)
          `;

          const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: {
              systemInstruction: getSystemInstruction(brief.language, customTuning),
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    hook: { type: Type.STRING },
                    script: { type: Type.STRING },
                    strategy: { type: Type.STRING },
                    visualPrompt: { type: Type.STRING },
                    scores: {
                      type: Type.OBJECT,
                      properties: {
                        patternInterrupt: { type: Type.INTEGER },
                        emotionalIntensity: { type: Type.INTEGER },
                        curiosityGap: { type: Type.INTEGER },
                        scarcity: { type: Type.INTEGER },
                      },
                      required: ["patternInterrupt", "emotionalIntensity", "curiosityGap", "scarcity"]
                    }
                  },
                  required: ["hook", "script", "strategy", "visualPrompt", "scores"]
                },
              },
            },
          });

          if (sql) {
            const totalTokens = response.usageMetadata?.totalTokenCount || 0;
            const timestamp = Date.now();

            // Log AI cost
            const costLogId = timestamp.toString() + Math.random().toString(36).substring(7);
            sql`INSERT INTO hypeakz_analytics (id, event_name, timestamp, metadata) VALUES (${costLogId}, 'ai_cost', ${timestamp}, ${{ tokens: totalTokens, model: GEMINI_MODEL }})`.catch(console.error);

            // Log generation with all parameters for stats
            const genLogId = timestamp.toString() + Math.random().toString(36).substring(2, 9);
            const generationMeta = {
              language: brief.language || 'DE',
              channel,
              contentContext: brief.contentContext || null,
              limbicType: brief.limbicType || null,
              focusKeyword: brief.focusKeyword ? true : false, // Just track if used, not the value
              patternType: brief.patternType || null,
              repSystem: brief.repSystem || null,
              motivation: brief.motivation || null,
              decisionStyle: brief.decisionStyle || null,
              presupposition: brief.presupposition || null,
              chunking: brief.chunking || null,
              triggerWordsUsed: brief.triggerWords && brief.triggerWords.length > 0,
              targetScores: scores,
              tokens: totalTokens
            };
            sql`INSERT INTO hypeakz_analytics (id, event_name, timestamp, metadata) VALUES (${genLogId}, 'generation', ${timestamp}, ${generationMeta})`.catch(console.error);
          }

          let concepts: any[] = [];
          try { concepts = JSON.parse(response.text || "[]"); } catch(e) { concepts = []; }
          result = {
            concepts,
            quota: quotaState
              ? { usedGenerations: quotaState.usedGenerations, limit: FREE_GENERATION_LIMIT, isPremium: quotaState.isPremium }
              : null
          };
        } catch (genError) {
          // Generation failed after the quota was consumed: give the credit back
          if (sql) await refundGeneration(sql, quotaKey);
          throw genError;
        }
        break;
      }

      default: return { statusCode: 400, headers, body: "Unknown Action" };
    }

    return { statusCode: 200, headers, body: JSON.stringify(result) };

  } catch (error: any) {
    console.error("API Error:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || "Server Error" }) };
  }
};
