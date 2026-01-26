
import { GoogleGenAI, Type } from "@google/genai";
import { neon } from '@netlify/neon';
import Stripe from 'stripe';

// Initialize Stripe (only if key is available)
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Stripe Price ID for €10/month subscription (set in Netlify env vars)
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;

// SECURITY: Restrict CORS to allowed origins
const ALLOWED_ORIGINS = [
  "https://hypeakz.io",
  "https://www.hypeakz.io",
  "https://hypeakz.netlify.app",
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
  return "https://hypeakz.io";
};

const getHeaders = (requestOrigin?: string) => ({
  "Access-Control-Allow-Origin": getCorsOrigin(requestOrigin),
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

// SECURITY: Admin password MUST be set via environment variable
// If not set, admin functionality is disabled
const ADMIN_PASS = process.env.ADMIN_PASSWORD;

const getSql = () => {
  const url = process.env.NETLIFY_DATABASE_URL;
  if (!url) return null;
  return neon(url);
};

// Optimization: Cached Table Initialization Promise to avoid redundant queries per cold start
let tablesInitPromise: Promise<any> | null = null;

// Quota Constants
const FREE_GENERATION_LIMIT = 10;

const ensureTables = async (sql: any) => {
  if (tablesInitPromise) return tablesInitPromise;

  tablesInitPromise = Promise.all([
    sql`CREATE TABLE IF NOT EXISTS hypeakz_users (id TEXT PRIMARY KEY, name TEXT, brand TEXT, email TEXT, phone TEXT, created_at BIGINT)`,
    sql`CREATE TABLE IF NOT EXISTS hypeakz_history (id TEXT PRIMARY KEY, timestamp BIGINT, brief JSONB, concepts JSONB)`,
    sql`CREATE TABLE IF NOT EXISTS hypeakz_profiles (id TEXT PRIMARY KEY, name TEXT, brief JSONB)`,
    sql`CREATE TABLE IF NOT EXISTS hypeakz_analytics (id TEXT PRIMARY KEY, event_name TEXT, timestamp BIGINT, metadata JSONB)`,
    sql`CREATE TABLE IF NOT EXISTS hypeakz_settings (key TEXT PRIMARY KEY, value TEXT)`,
    sql`CREATE TABLE IF NOT EXISTS hypeakz_quotas (user_id TEXT PRIMARY KEY, used_generations INT DEFAULT 0, is_premium BOOLEAN DEFAULT FALSE, stripe_customer_id TEXT, stripe_subscription_id TEXT, created_at BIGINT)`
  ]).catch(e => {
    console.error("Table init error:", e);
    tablesInitPromise = null;
  });

  return tablesInitPromise;
};

const fetchUrlContent = async (targetUrl: string): Promise<string | null> => {
  try {
    const controller = new AbortController();
    // OPTIMIZED TIMEOUT: 7 seconds. 
    // Gives Jina enough time to render JS-heavy sites, but leaves 3s for Gemini (in a 10s Netlify Function limit).
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    let urlToScrape = targetUrl.trim();
    if (!urlToScrape.startsWith('http')) {
        urlToScrape = 'https://' + urlToScrape;
    }

    // Jina AI Reader URL (The Bridge)
    const scrapeUrl = `https://r.jina.ai/${urlToScrape}`;

    const response = await fetch(scrapeUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/plain', // Request clean text/markdown
        'X-Return-Format': 'markdown',
        'X-With-Generated-Alt': 'true', // Get alt text for images to understand context
        'User-Agent': 'Hypeakz-Scanner/1.0'
      }
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    
    const text = await response.text();
    
    // Validation: Filter out Jina error pages or empty results
    if (text.length < 100 || (text.includes("Jina Reader") && text.includes("Error"))) return null;
    if (text.includes("Cloudflare") || text.includes("Verify you are human") || text.includes("Access denied")) return null;

    return text.substring(0, 35000); // Increased buffer to capture more context
  } catch (e) {
    // Fail silently so fallback (Google Search) can take over
    return null; 
  }
};

const getSystemInstruction = (language: string, customTuning: string = "") => `
ROLE: Du agierst als einer der weltweit besten Marketingexperten, spezialisiert auf Neuro-Marketing, NLP und virale Psychologie. 
MISSION: Erstelle Video-Skripte, die den kritischen Faktor des Gehirns umgehen und direkt das limbische System ansprechen.
TONE: Autoritär, direkt, hoch-konvertierend.
SPRACHE: ${language === 'DE' ? 'Deutsch' : 'Englisch'}.
${customTuning ? `\nADMIN OVERRIDE:\n${customTuning}` : ''}
`;

export const handler = async (event: any) => {
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

    const { action, payload } = body;
    let result: any = { success: true };

    if (sql && ['log-analytics', 'save-user', 'save-history', 'save-profile', 'save-admin-prompt', 'generate-hooks', 'get-quota', 'increment-quota', 'sync-quota'].includes(action)) {
      await ensureTables(sql);
    }

    switch (action) {
      // --- DB OPERATIONS (Standard) ---
      case 'init-db': { if (sql) await ensureTables(sql); break; }
      case 'log-analytics': {
        if (!sql) break;
        const { id, eventName, timestamp, metadata } = payload;
        await sql`INSERT INTO hypeakz_analytics (id, event_name, timestamp, metadata) VALUES (${id}, ${eventName}, ${timestamp}, ${metadata})`;
        break;
      }
      case 'save-user': {
        if (!sql) break;
        const u = payload;
        if (!u.id || !u.name) break; 
        await sql`INSERT INTO hypeakz_users (id, name, brand, email, phone, created_at) VALUES (${u.id}, ${u.name}, ${u.brand}, ${u.email}, ${u.phone || null}, ${u.createdAt}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, brand = EXCLUDED.brand, email = EXCLUDED.email, phone = EXCLUDED.phone`;
        break;
      }
      case 'get-user': {
        if (!sql) { result = null; break; }
        const rows = await sql`SELECT * FROM hypeakz_users WHERE id = ${payload.id} LIMIT 1`;
        result = rows.length === 0 ? null : {
          id: rows[0].id, name: rows[0].name, brand: rows[0].brand, email: rows[0].email, phone: rows[0].phone, createdAt: Number(rows[0].created_at)
        };
        break;
      }
      case 'save-history': {
        if (!sql) break;
        const h = payload;
        await sql`INSERT INTO hypeakz_history (id, timestamp, brief, concepts) VALUES (${h.id}, ${h.timestamp}, ${h.brief}, ${h.concepts}) ON CONFLICT (id) DO UPDATE SET timestamp = EXCLUDED.timestamp, brief = EXCLUDED.brief, concepts = EXCLUDED.concepts`;
        break;
      }
      case 'get-history': {
        if (!sql) { result = []; break; }
        const rows = await sql`SELECT id, timestamp, brief, concepts FROM hypeakz_history ORDER BY timestamp DESC LIMIT 20`;
        result = rows.map((r: any) => ({ id: r.id, timestamp: Number(r.timestamp), brief: r.brief, concepts: r.concepts }));
        break;
      }
      case 'save-profile': {
        if (!sql) break;
        const p = payload;
        await sql`INSERT INTO hypeakz_profiles (id, name, brief) VALUES (${p.id}, ${p.name}, ${p.brief}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, brief = EXCLUDED.brief`;
        break;
      }
      case 'get-profiles': {
        if (!sql) { result = []; break; }
        result = await sql`SELECT id, name, brief FROM hypeakz_profiles ORDER BY name ASC`;
        break;
      }
      case 'delete-profile': {
        if (!sql) break;
        await sql`DELETE FROM hypeakz_profiles WHERE id = ${payload.id}`;
        break;
      }

      // --- QUOTA OPERATIONS ---
      case 'get-quota': {
        if (!sql) {
          result = { usedGenerations: 0, limit: FREE_GENERATION_LIMIT, isPremium: false };
          break;
        }
        const { userId } = payload;
        if (!userId) {
          result = { usedGenerations: 0, limit: FREE_GENERATION_LIMIT, isPremium: false };
          break;
        }
        const rows = await sql`SELECT used_generations, is_premium FROM hypeakz_quotas WHERE user_id = ${userId} LIMIT 1`;
        if (rows.length === 0) {
          result = { usedGenerations: 0, limit: FREE_GENERATION_LIMIT, isPremium: false };
        } else {
          const isPremium = rows[0].is_premium === true;
          result = {
            usedGenerations: rows[0].used_generations || 0,
            limit: FREE_GENERATION_LIMIT,
            isPremium
          };
        }
        break;
      }
      case 'increment-quota': {
        if (!sql) break;
        const { userId } = payload;
        if (!userId) break;
        // Upsert: Insert if not exists, increment if exists
        await sql`
          INSERT INTO hypeakz_quotas (user_id, used_generations, is_premium, created_at)
          VALUES (${userId}, 1, FALSE, ${Date.now()})
          ON CONFLICT (user_id) DO UPDATE SET used_generations = hypeakz_quotas.used_generations + 1
        `;
        break;
      }
      case 'sync-quota': {
        // Sync localStorage count with DB (takes higher value)
        if (!sql) break;
        const { userId, localCount } = payload;
        if (!userId || typeof localCount !== 'number') break;

        const rows = await sql`SELECT used_generations, is_premium FROM hypeakz_quotas WHERE user_id = ${userId} LIMIT 1`;

        if (rows.length === 0) {
          // New user: use localCount
          await sql`INSERT INTO hypeakz_quotas (user_id, used_generations, is_premium, created_at) VALUES (${userId}, ${localCount}, FALSE, ${Date.now()})`;
          result = { usedGenerations: localCount, limit: FREE_GENERATION_LIMIT, isPremium: false };
        } else {
          // Existing user: take the higher value
          const dbCount = rows[0].used_generations || 0;
          const isPremium = rows[0].is_premium === true;
          const finalCount = Math.max(dbCount, localCount);

          if (finalCount > dbCount) {
            await sql`UPDATE hypeakz_quotas SET used_generations = ${finalCount} WHERE user_id = ${userId}`;
          }

          result = { usedGenerations: finalCount, limit: FREE_GENERATION_LIMIT, isPremium };
        }
        break;
      }

      // --- STRIPE CHECKOUT ---
      case 'create-checkout': {
        // Debug: Check what's configured
        const stripeConfigured = !!stripe;
        const priceConfigured = !!STRIPE_PRICE_ID;

        if (!stripeConfigured) {
          console.error("Stripe not initialized - STRIPE_SECRET_KEY missing");
          return { statusCode: 500, headers, body: JSON.stringify({ error: "Stripe not configured (missing secret key)" }) };
        }
        if (!priceConfigured) {
          console.error("STRIPE_PRICE_ID not set");
          return { statusCode: 500, headers, body: JSON.stringify({ error: "Stripe not configured (missing price ID)" }) };
        }

        const { userId, userEmail, successUrl, cancelUrl } = payload;
        if (!userId || !userEmail) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing userId or userEmail" }) };
        }

        try {
          const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer_email: userEmail,
            line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
            success_url: successUrl || 'https://hypeakz.io/?checkout=success',
            cancel_url: cancelUrl || 'https://hypeakz.io/?checkout=cancelled',
            metadata: { userId },
            subscription_data: {
              metadata: { userId }
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
        if (!sql) {
          result = { isPremium: false };
          break;
        }
        const { userId } = payload;
        if (!userId) {
          result = { isPremium: false };
          break;
        }

        const rows = await sql`SELECT is_premium, stripe_subscription_id FROM hypeakz_quotas WHERE user_id = ${userId} LIMIT 1`;
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
              await sql`UPDATE hypeakz_quotas SET is_premium = FALSE WHERE user_id = ${userId}`;
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
        const isValid = payload.password === ADMIN_PASS;
        await new Promise(r => setTimeout(r, 300)); // Prevent timing attacks
        result = { success: isValid };
        break;
      }
      case 'get-admin-stats': {
         // Admin disabled if no password configured
         if (!ADMIN_PASS || payload.password !== ADMIN_PASS) {
           return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
         }
         if (!sql) { result = { userCount: 0, historyCount: 0, apiCalls: 0, tokenCount: 0 }; break; }
         try {
           const [u, h, a, t] = await Promise.all([
             sql`SELECT COUNT(*) FROM hypeakz_users`, 
             sql`SELECT COUNT(*) FROM hypeakz_history`, 
             sql`SELECT COUNT(*) FROM hypeakz_analytics`,
             sql`SELECT SUM((metadata->>'tokens')::int) as total FROM hypeakz_analytics WHERE event_name = 'ai_cost'`
           ]);
           result = { userCount: parseInt(u[0].count), historyCount: parseInt(h[0].count) * 4, apiCalls: parseInt(a[0].count), tokenCount: t[0].total ? parseInt(t[0].total) : 0 };
         } catch (e) { result = { userCount: 0, historyCount: 0, apiCalls: 0, tokenCount: 0 }; }
         break;
      }
      case 'get-admin-prompt': {
        if (!sql) { result = { prompt: "" }; break; }
        const rows = await sql`SELECT value FROM hypeakz_settings WHERE key = 'system_prompt' LIMIT 1`;
        result = { prompt: rows.length ? rows[0].value : "" };
        break;
      }
      case 'save-admin-prompt': {
        // Admin disabled if no password configured
        if (!ADMIN_PASS || payload.password !== ADMIN_PASS) {
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
        const ai = new GoogleGenAI({ apiKey });
        const { url, language } = payload;
        
        if (!url) throw new Error("URL Required");

        // 1. Try Jina AI Scrape (The Bridge)
        const scrapedMarkdown = await fetchUrlContent(url);
        
        let prompt = "";
        let useSearchTool = false;
        
        if (scrapedMarkdown && scrapedMarkdown.length > 200) {
           // Scenario A: Scrape Successful (High Quality)
           prompt = `
           ANALYZE THIS WEBSITE CONTENT (Source: Jina AI Bridge):
           ---
           ${scrapedMarkdown}
           ---
           TASK: Extract 4 specific marketing insights to build a brief.
           
           Required JSON Output:
           { 
             "productContext": "Detailed description of product/service", 
             "targetAudience": "Specific avatar description", 
             "goal": "Primary conversion goal", 
             "speaker": "Brand tone of voice" 
           }
           Language: ${language === 'DE' ? 'German' : 'English'}`;
        } else {
           // Scenario B: Scrape Failed/Timeout -> Google Search Tool (Fallback)
           useSearchTool = true;
           prompt = `
           PERFORM A DEEP GOOGLE SEARCH FOR: "${url}"
           
           TASK: Create a professional marketing brief.
           
           STRICT RULES FOR FALLBACK:
           1. If the website is offline or unknown, INFER the business model from the domain name, but prefix with "[Inferred]".
           2. DO NOT INVENT fake products. If unsure, output general marketing best practices for that industry.
           
           Required JSON Output:
           1. productContext: What is likely being sold?
           2. targetAudience: Who is the customer?
           3. goal: Likely conversion goal (Leads/Sales).
           4. speaker: Professional brand voice.
           
           OUTPUT JSON ONLY.
           Language: ${language === 'DE' ? 'German' : 'English'}`;
        }

        const config: any = { 
            responseMimeType: "application/json" 
        };

        if (useSearchTool) {
            config.tools = [{googleSearch: {}}];
        }

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: config,
        });

        // Robust JSON Parsing
        let jsonData: any = {};
        const responseText = response.text || "";
        
        try {
          jsonData = JSON.parse(responseText);
        } catch (e) {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
             try { jsonData = JSON.parse(jsonMatch[0]); } catch(e2) {}
          }
        }

        const sources = scrapedMarkdown 
          ? [{ title: "Jina AI Direct Scan", uri: url }] 
          : [{ title: "AI Search Retrieval", uri: url }];

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
        const ai = new GoogleGenAI({ apiKey });
        const { brief } = payload;
        
        let customTuning = "";
        if (sql) {
          try {
             const rows = await sql`SELECT value FROM hypeakz_settings WHERE key = 'system_prompt' LIMIT 1`;
             if (rows.length) customTuning = rows[0].value;
          } catch (e) {}
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

        const prompt = `Erstelle 4 virale Video-Konzepte. 
        Context: ${brief.productContext}. 
        Goal: ${brief.goal}. 
        Audience: ${brief.targetAudience}.
        Speaker Style: ${brief.speaker}.
        
        NLP & STRUCTURAL CONSTRAINTS (Apply these strictly):
        ${nlpConstraints || "No specific NLP constraints selected. Optimize for maximum retention."}

        TARGET NEURO METRICS (Aim for these levels in your script writing):
        - Pattern Interrupt: ${scores.patternInterrupt}/100 (Shock factor, unexpected start)
        - Emotional Intensity: ${scores.emotionalIntensity}/100 (Feeling depth)
        - Curiosity Gap: ${scores.curiosityGap}/100 (Open loops)
        - Scarcity/FOMO: ${scores.scarcity}/100 (Urgency)
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview', 
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

        if (sql && response.usageMetadata) {
          const totalTokens = response.usageMetadata.totalTokenCount || 0;
          const logId = Date.now().toString() + Math.random().toString(36).substring(7);
          sql`INSERT INTO hypeakz_analytics (id, event_name, timestamp, metadata) VALUES (${logId}, 'ai_cost', ${Date.now()}, ${{ tokens: totalTokens, model: 'gemini-3-flash' }})`.catch(console.error);
        }

        try { result = JSON.parse(response.text || "[]"); } catch(e) { result = []; }
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
