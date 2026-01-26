
const COMMON = {
  company: {
    name: "HYPEAKZ.IO",
    owner: "Daniel Kofler",
    address: ["Thal-Aue 95", "9911 Assling", "Österreich"],
    email: "mail@danielkofler.com",
    phone: "+43 676 7293888",
    uid: "ATU77537202",
    authority: "Bezirkshauptmannschaft: Lienz",
    copyright: "© 2026 HYPEAKZ.IO | AI UNLOCKED"
  }
};

export const TRANSLATIONS = {
  EN: {
    ...COMMON,
    nav: {
      logoText: "HYPEAKZ.IO",
      editProfile: "Edit Profile",
      logout: "Logout",
      vaultAccess: "Vault Access",
      impressum: "Impressum",
      privacy: "Privacy"
    },
    hero: {
      badge: "Neuro-Hook Generator",
      titleLine1: "STOP THE",
      titleLine2: "SCROLL.",
      subtitleLine1: "HOOKA is the AI video hook generator that massively increases",
      subtitleLine2: "your conversion rate through neuro-psychological triggers."
    },
    tutorial: {
      headline: "The Viral Workflow",
      step1: { title: "1. Brand Scan", desc: "Scan your URL (Optional) to let the AI learn your brand DNA." },
      step2: { title: "2. Define Goal", desc: "Fill out the parameters. Be specific about your target audience." },
      step3: { title: "3. NLP Tuning", desc: "Use Pro Mode to inject psychological triggers and stop the scroll." }
    },
    briefing: {
      headline: "Setup Parameters",
      subline: "Fine-tune the output",
      outputLang: "Output Language",
      setupMode: "Setup Mode",
      mode: {
        auto: "Auto",
        pro: "Pro"
      },
      scout: {
        label: "Identity Node Extraction (Optional)",
        placeholder: "Enter brand URL to auto-brief...",
        buttonIdle: "Scan Brand",
        buttonActive: "Extracting...",
        sourcesTitle: "Neural Sources"
      },
      fields: {
        context: { 
          label: "Identity Context", 
          placeholder: "What is the product/offer?",
          help: "Describe your offer precisely. What is the core problem you solve and what is the unique selling point?"
        },
        goal: { 
          label: "Primary Goal", 
          placeholder: "What is the desired reaction (Sales, Leads)?",
          help: "Define the specific conversion goal. Do you want sales, newsletter signups, or more profile visits?"
        },
        audience: { 
          label: "Target Persona", 
          placeholder: "Who are we interrupting?",
          help: "Describe your ideal customer avatar. What keeps them awake at night? What are their deepest desires?"
        },
        speaker: { 
          label: "Authority Speaker", 
          placeholder: "Tone of voice / Brand Persona",
          help: "Who is the 'Character' in the video? A scientific expert, a funny friend, or a high-performance coach?"
        }
      },
      nlp: {
        headline: "Advanced Configuration",
        sections: {
          seo: "SEO & Content Context",
          limbic: "Limbic® Emotional Profiling",
          nlp: "Neuro-Linguistic Architecture"
        },
        labels: {
          contentContext: "Content Format",
          limbicType: "Limbic® Type",
          focusKeyword: "Focus Keyword",
          patternType: "Pattern Interrupt Style",
          repSystem: "Sensory Modality (VAK)",
          motivation: "Meta-Program: Motivation",
          decisionStyle: "Meta-Program: Decision",
          presupposition: "Presupposition Type",
          chunking: "Chunking Level",
          triggerWords: "Trigger Word Set (Max 3)",
          customTrigger: "Custom Trigger"
        },
        placeholders: {
          focusKeyword: "Main Topic / Keyword...",
          customTrigger: "Add specific word..."
        },
        tooltips: {
          focusKeyword: "Defines the semantic anchor for the AI. This keyword is integrated naturally into the script to signal thematic relevance to algorithms (SEO) and the viewer (Interest) immediately.",
          contentContext: "Frames the output format. 'Instagram Reel' prioritizes fast cuts and visual descriptions. 'Ad Headline' forces extreme compression. 'E-Mail' uses a subject-line specific structure.",
          limbicType: "Based on the Limbic® Map. \n• Harmonizer: Needs safety, care, belonging (Oxytocin). \n• Performer: Needs status, efficiency, victory (Testosterone). \n• Hedonist: Needs fun, novelty, kick (Dopamine). \nSets the emotional frequency of the copy.",
          patternType: "The psychological mechanism to stop the scroll. \n• Contradiction: States the opposite of belief. \n• Paradox: A logical impossibility that intrigues. \n• Denial: 'Don't watch this'. \nForces the brain out of autopilot.",
          repSystem: "Neuro-Linguistic Programming (VAK). \n• Visual: 'See', 'Focus', 'Bright'. \n• Auditory: 'Hear', 'Resonate', 'Loud'. \n• Kinesthetic: 'Grasp', 'Feel', 'Heavy'. \nMatches the primary processing channel of the persona.",
          motivation: "Meta-Program 'Direction'. \n• Towards: Motivated by goals and gains (Greed). \n• Away-From: Motivated by solving problems and avoiding pain (Fear).",
          decisionStyle: "Meta-Program 'Reasoning'. \n• Options: Wants choices, possibilities, and freedom. \n• Procedures: Wants a step-by-step 'How-To' guide and clear structure.",
          presupposition: "Hypnotic language patterns. Implies a truth without stating it directly. Example: 'When you earn more...' presupposes that you WILL earn more. Bypasses critical resistance.",
          chunking: "Information Hierarchy. \n• Chunk Down: Specific details, data, distinct facts. Good for logic types. \n• Chunk Up: Abstract concepts, big picture, visions. Good for emotional types.",
          triggerWords: "Signal Detection Theory. Specific words that act as 'Power Words'. The AI is forced to weave these exact terms into the hook to maximize impact.",
          customTrigger: "Manual injection of specific vocabulary. Useful for slogans, insider terms, or branding elements that must appear verbatim in the output."
        },
        options: {
          contentContext: [
            "Instagram Reel", "TikTok", "YouTube Shorts", "Ad Headline", "Landingpage Hero", "E-Mail Subject"
          ],
          limbicType: [
            "Harmonizer (Balance/Care)", 
            "Open-Minded (Fantasy/Enjoyment)", 
            "Hedonist (Fun/Novelty)", 
            "Adventurer (Risk/Freedom)", 
            "Performer (Status/Dominance)", 
            "Disciplined (Logic/Precision)", 
            "Traditionalist (Safety/Order)"
          ],
          patternType: [
            "Contradiction", "Paradox Reversal", "Provocative Denial", "Unexpected Truth", "Rule Breaking"
          ],
          repSystem: [
            "Visual (see, clear, picture)", "Auditory (hear, say, sound)", "Kinesthetic (feel, pressure, heavy)"
          ],
          motivation: [
            "Towards (Goal, Gain, Improvement)", "Away-from (Avoidance, Loss, Pain)"
          ],
          decisionStyle: [
            "Options (Freedom, Possibilities, Choice)", "Procedures (Steps, Structure, Process)"
          ],
          presupposition: [
            "Temporal (when, as soon as, after)", "Causal (because, therefore, due to)", "Identity (People who..., real...)", "Possession (your, what you lack)"
          ],
          chunking: [
            "Chunk Down (Specific, Concrete, Measurable)", "Chunk Up (Abstract, Principle, Perspective)"
          ],
          triggerWords: [
            "finally", "most people don't realize", "unnoticed", "hidden", "immediately", "hardly anyone", "right now"
          ]
        }
      },
      generateButton: {
        idle: "GENERATE VIRAL HOOKS",
        loading: "Decoding Pathways..."
      }
    },
    neuroHelp: {
      helpBtn: "Help",
      limbic: {
        title: "Limbic® Types",
        desc: "Based on the Limbic Map (Häusel). Defines the emotional driver of the user: Balance (Harmonizer), Dominance (Performer), or Stimulance (Hedonist/Adventurer). Tunes the script's emotional resonance."
      },
      pattern: {
        title: "Pattern Interrupt",
        desc: "Breaks cognitive routines and the user's 'autopilot'. Unexpected visual or auditory stimuli force the brain to pay immediate attention."
      },
      intensity: {
        title: "Emotional Intensity",
        desc: "Controls the depth of limbic activation. High values use strong emotions (shock, humor, anger) to increase message retention."
      },
      gap: {
        title: "Zeigarnik Gap",
        desc: "Creates an information vacuum ('Open Loop'). The brain instinctively demands the resolution of a started story or question."
      },
      fomo: {
        title: "FOMO Pressure",
        desc: "'Fear Of Missing Out'. Creates psychological pressure to act (Urgency) through scarcity or exclusivity to overcome passivity."
      }
    },
    results: {
      headline: "Neuro Concepts",
      copySuccess: "Copied!",
      labels: {
        hook: "The Viral Hook",
        script: "Video Script",
        pattern: "Pattern-Interrupt",
        intensity: "Intensity",
        gap: "Zeigarnik Gap",
        fomo: "FOMO Pressure"
      }
    },
    history: {
      title: "Timeline",
      empty: "New Generation"
    },
    profileManager: {
      label: "Briefing Vault",
      sublabel: "Secure your current setup",
      empty: "Vault is empty",
      addButton: "SAVE SETUP",
      placeholder: "NAME SETUP..."
    },
    auth: {
      modalTitle: "Enter the Vault",
      modalSubtitle: "Select your identity node",
      authenticatingTitle: "Authenticating...",
      connecting: "Connecting to identity node",
      continueWith: "Continue with",
      synchronizing: "Synchronizing..."
    },
    profileEdit: {
      title: "Identity",
      subtitle: "Customize your node parameters",
      fields: {
        name: "Full Identity Name",
        brand: "Brand / Agency Authority",
        email: "Email Address",
        phone: "Neural Hotline (Phone)"
      },
      cancel: "Cancel",
      save: "Sync Profile",
      saving: "Syncing...",
      saved: "Synced"
    },
    legal: {
      consent: {
        title: "Privacy Settings",
        text: "HYPEAKZ.IO uses LocalStorage and external APIs (Google Gemini) to generate viral hooks. By using the app, you agree to the processing of your inputs for AI generation.",
        button: "Agree"
      },
      impressum: {
        title: "Imprint",
        h5: "Information according to § 5 TMG",
        hContact: "Contact",
        hAuthority: "Supervisory Authority",
        hUid: "VAT ID",
        hCompany: "Company Details",
        companyText: "Business Purpose: AI Automation and Marketing Services",
        memberText: "Membership: Austrian Economic Chambers (WKO)",
        hLaw: "Legal Regulations",
        hOdr: "Online Dispute Resolution",
        odrText: "The EU Commission provides a platform for online dispute resolution, which can be found at:",
        hDispute: "Dispute Resolution",
        disputeText: "We are generally not obliged and not willing to participate in dispute resolution proceedings before a consumer arbitration board."
      },
      privacy: {
        title: "Privacy Policy",
        h1: "1. Privacy at a Glance",
        t1: "We take the protection of your personal data very seriously. We treat your personal data confidentially and in accordance with the statutory data protection regulations and this privacy policy.",
        h2: "2. Responsible Body",
        h3: "3. Data Collection in this App",
        t3a: "Entered Data: All data you enter into the briefing form is transmitted to the Google Gemini API for processing.",
        t3b: "Cloud Storage: If you register or save profiles, this data is stored in an encrypted database (Neon/PostgreSQL) to enable access from different devices.",
        t3c: "LocalStorage: We use your browser's local storage to save your settings (e.g., Darkmode) and session information.",
        h4: "4. Third Parties & API Usage",
        t4a: "Google Gemini API: To generate marketing content, your inputs are transmitted to Google servers. Please do not enter sensitive personal data of third parties into the forms.",
        t4b: "Neon DB: We use Neon for data persistence. Servers are primarily located in the EU/USA.",
        h5: "5. Ihre Rechte",
        t5: "You have the right to free information about the origin, recipient, and purpose of your stored personal data at any time, as well as a right to correction, blocking, or deletion of this data."
      }
    },
    admin: {
      title: "HYPEAKZ_CORE",
      subtitle: "Neural Algorithm Control Center v2.0",
      disconnect: "DISCONNECT",
      authReq: "AUTHENTICATION REQUIRED",
      accessKey: "ACCESS KEY",
      decrypting: "DECRYPTING...",
      initiate: "INITIATE SESSION",
      metrics: "SYSTEM METRICS",
      users: "Total Users",
      hooks: "Generated Hooks",
      throughput: "API Throughput",
      tokens: "Token Consumption",
      neuralAct: "NEURAL ACTIVITY",
      editMode: "EDIT_MODE",
      instructions: "Algorithm Fine-Tuning Instructions",
      live: "LIVE",
      compiling: "COMPILING...",
      commit: "COMMIT CHANGES",
      placeholder: "// Enter system override instructions here..."
    },
    errors: {
      authFailed: "Authentication failed.",
      engineError: "AI-Engine Error.",
      profileSyncFailed: "Fehler beim Profil-Sync. Bitte erneut versuchen.",
      missingKey: "SERVER ERROR: API Key Missing.\n\nPlease ensure 'GEMINI_API_KEY' is set in Netlify Environment Variables (WITHOUT VITE_ prefix).",
      invalidProviderOpenAI: "CONFIG ERROR: Falscher API Key Typ.\n\nDu verwendest einen OpenAI Key (sk-...). Diese App benötigt einen GOOGLE GEMINI Key (AIza...).\nBitte erstelle einen Key im Google AI Studio.",
      scoutError: "Fehler bei der Website-Analyse."
    },
    quota: {
      remaining: "left",
      used: "used",
      limitReached: "Limit Reached",
      upgradeTitle: "Upgrade to Premium",
      upgradeText: "You have used all 10 free generations.",
      upgradeSubtext: "Unlock unlimited viral hooks with Premium access.",
      contactUs: "Contact us for Premium Access",
      contactEmail: "mail@danielkofler.com",
      checkoutButton: "Upgrade Now - €10/month",
      loginFirst: "Login First",
      orContact: "Or contact us directly",
      checkoutSuccess: "Welcome to Premium!",
      checkoutCancelled: "Checkout cancelled",
      upgradeCta: "Upgrade for unlimited generations"
    },
    pricing: {
      title: "Pricing",
      badge: "Simple Pricing",
      headline: "Choose Your Plan",
      subheadline: "Start free with 10 generations. Upgrade for unlimited access.",
      freePlan: "Free",
      premiumPlan: "Premium",
      forever: "forever",
      month: "month",
      popular: "Popular",
      ctaPremium: "Upgrade Now",
      loginToUpgrade: "Login to Upgrade",
      activeSubscription: "Active Subscription",
      feature1Free: "10 Generations (Lifetime)",
      feature2Free: "4 Hook Variants per Generation",
      feature3Free: "All NLP Parameters",
      feature4Free: "Brand Scanner",
      feature1Premium: "Unlimited Generations",
      feature2Premium: "4 Hook Variants per Generation",
      feature3Premium: "All NLP Parameters",
      feature4Premium: "Brand Scanner",
      feature5Premium: "Priority Support",
      feature6Premium: "Early Access to New Features",
      faqTitle: "Frequently Asked Questions",
      faq1Q: "What happens after 10 free generations?",
      faq1A: "You can still view all generated hooks. For new generations, you need a Premium subscription.",
      faq2Q: "Can I cancel anytime?",
      faq2A: "Yes, you can cancel your subscription anytime. It will remain active until the end of the billing period.",
      faq3Q: "Which payment methods are accepted?",
      faq3A: "We accept all major credit cards via Stripe (Visa, Mastercard, American Express).",
      questions: "Still have questions?"
    }
  },

  DE: {
    ...COMMON,
    nav: {
      logoText: "HYPEAKZ.IO",
      editProfile: "Profil",
      logout: "Abmelden",
      vaultAccess: "Vault Login",
      impressum: "Impressum",
      privacy: "Datenschutz"
    },
    hero: {
      badge: "Neuro-Hook Generator",
      titleLine1: "STOP THE",
      titleLine2: "SCROLL.",
      subtitleLine1: "HOOKA ist der AI Video-Hook-Generator, der durch neuro-psychologische",
      subtitleLine2: "Trigger deine Conversion-Rate massiv steigert."
    },
    tutorial: {
      headline: "The Viral Workflow",
      step1: { title: "1. Brand Scan", desc: "URL scannen (Optional), damit die KI deine Marken-DNA versteht." },
      step2: { title: "2. Briefing", desc: "Parameter ausfüllen. Sei spezifisch bei Zielgruppe und Kontext." },
      step3: { title: "3. NLP Tuning", desc: "Nutze den Pro-Modus für psychologische Trigger & Pattern Interrupts." }
    },
    briefing: {
      headline: "Briefing Parameter",
      subline: "Fine-tune the output",
      outputLang: "Ausgabesprache",
      setupMode: "Setup Modus",
      mode: {
        auto: "Auto",
        pro: "Pro"
      },
      scout: {
        label: "Identity Node Extraction (Optional)",
        placeholder: "Marken-URL eingeben (z.B. hypeakz.io)...",
        buttonIdle: "Analysieren",
        buttonActive: "Analysiere...",
        sourcesTitle: "Gefundene Quellen"
      },
      fields: {
        context: { 
          label: "Produkt & Angebot", 
          placeholder: "Was wird beworben? (Kontext)",
          help: "Beschreibe dein Angebot so präzise wie möglich. Was ist das Kernproblem, das du löst und was ist das Alleinstellungsmerkmal?"
        },
        goal: { 
          label: "Kampagnenziel", 
          placeholder: "Was ist die gewünschte Reaktion (Sales, Leads)?",
          help: "Definiere das konkrete Conversion-Ziel. Willst du Verkäufe, Newsletter-Anmeldungen oder mehr Profilaufrufe?"
        },
        audience: { 
          label: "Zielgruppe (Avatar)", 
          placeholder: "Wen unterbrechen wir?",
          help: "Beschreibe deinen idealen Kunden-Avatar. Was lässt ihn nachts nicht schlafen? Was sind seine tiefsten Wünsche?"
        },
        speaker: { 
          label: "Sprecher / Tonalität", 
          placeholder: "Tone of Voice / Markenpersönlichkeit",
          help: "Wer ist der 'Charakter' im Video? Ein wissenschaftlicher Experte, ein kumpelhafter Freund oder ein High-Performance Coach?"
        }
      },
      nlp: {
        headline: "Erweiterte Konfiguration",
        sections: {
          seo: "SEO & Content Kontext",
          limbic: "Limbic® Emotional Profiling",
          nlp: "Neuro-Linguistische Architektur"
        },
        labels: {
          contentContext: "Format / Plattform",
          limbicType: "Limbic® Typ",
          focusKeyword: "Fokus Keyword",
          patternType: "Pattern Interrupt",
          repSystem: "Wahrnehmungskanal (VAK)",
          motivation: "Meta-Programm: Motivation",
          decisionStyle: "Meta-Programm: Entscheidungsstil",
          presupposition: "Presupposition (Vorannahme)",
          chunking: "Detail-Tiefe (Chunking)",
          triggerWords: "Power-Wörter (Max 3)",
          customTrigger: "Eigenes Power-Wort"
        },
        placeholders: {
          focusKeyword: "Haupt-Keyword / Thema...",
          customTrigger: "Wort hinzufügen..."
        },
        tooltips: {
          focusKeyword: "Der semantische Anker für die KI. Dieses Wort wird organisch ins Skript integriert, um Algorithmen (SEO) und dem Zuschauer (Interesse) sofortige Relevanz zu signalisieren.",
          contentContext: "Rahmt das Ausgabeformat. 'Instagram Reel' priorisiert schnelle Schnitte und visuelle Beschreibungen. 'Ad Headline' erzwingt extreme Verdichtung.",
          limbicType: "Basiert auf der Limbic® Map. \n• Harmoniser: Braucht Sicherheit, Geborgenheit (Oxytocin). \n• Performer: Braucht Status, Effizienz, Sieg (Testosteron). \n• Hedonist: Braucht Spaß, Neues, Kicks (Dopamin). \nSetzt die emotionale Frequenz der Copy.",
          patternType: "Der psychologische Mechanismus, um den Scroll zu stoppen. \n• Widerspruch: Behauptet das Gegenteil des Glaubens. \n• Paradox: Eine logische Unmöglichkeit. \n• Verneinung: 'Schau das nicht'. \nZwingt das Gehirn aus dem Autopiloten.",
          repSystem: "Neuro-Linguistisches Programmieren (VAK). \n• Visuell: 'Sehen', 'Klar', 'Bild'. \n• Auditiv: 'Hören', 'Klingen'. \n• Kinästhetisch: 'Greifen', 'Fühlen', 'Schwer'. \nMatcht den primären Wahrnehmungskanal der Persona.",
          motivation: "Meta-Programm 'Richtung'. \n• Hin-zu: Motiviert durch Ziele und Gewinn (Gier). \n• Weg-von: Motiviert durch Problemlösung und Schmerzvermeidung (Angst).",
          decisionStyle: "Meta-Programm 'Entscheidung'. \n• Optionen: Will Auswahl, Möglichkeiten und Freiheit. \n• Prozeduren: Will eine Schritt-für-Schritt Anleitung und klare Struktur.",
          presupposition: "Hypnotische Sprachmuster. Impliziert eine Wahrheit, ohne sie direkt zu behaupten. Beispiel: 'Wenn du mehr verdienst...' setzt voraus, DASS du mehr verdienen wirst. Umgeht kritischen Widerstand.",
          chunking: "Informations-Hierarchie. \n• Chunk Down: Spezifische Details, Daten, Fakten. Gut für Logiker. \n• Chunk Up: Abstrakte Konzepte, Big Picture, Visionen. Gut für emotionale Typen.",
          triggerWords: "Signal Detection Theory. Spezifische Wörter, die als 'Power Words' fungieren. Die KI wird gezwungen, diese exakten Begriffe in den Hook einzuweben, um maximale Resonanz zu erzeugen.",
          customTrigger: "Manuelle Injektion spezifischer Vokabeln. Nützlich für Slogans, Insider-Begriffe oder Branding-Elemente, die zwingend im Output erscheinen müssen."
        },
        options: {
          contentContext: [
            "Instagram Reel", "TikTok", "YouTube Shorts", "Ad Headline", "Landingpage Hero", "E-Mail Subject"
          ],
          limbicType: [
            "Harmoniser (Balance & Fürsorge)", 
            "Offener (Genuss & Fantasie)", 
            "Hedonist (Spaß & Impuls)", 
            "Abenteurer (Risiko & Freiheit)", 
            "Performer (Erfolg & Status)", 
            "Disziplinierter (Logik & Präzision)", 
            "Traditionalist (Sicherheit & Ordnung)"
          ],
          patternType: [
            "Widerspruch", "Paradoxe Umkehr", "Provokative Verneinung", "Unerwartete Wahrheit", "Regelbruch"
          ],
          repSystem: [
            "Visuell (sehen, sichtbar, klar, Bild)", "Auditiv (hören, sagen, klingen, Stimme)", "Kinästhetisch (fühlen, Druck, leicht, schwer)"
          ],
          motivation: [
            "Hin-zu (Ziel, Gewinn, Verbesserung)", "Weg-von (Vermeidung, Verlust, Schmerz)"
          ],
          decisionStyle: [
            "Optionen (Freiheit, Möglichkeiten, Auswahl)", "Prozesse (Schritte, Struktur, Ablauf)"
          ],
          presupposition: [
            "Zeitlich („wenn“, „sobald“, „nachdem“)", "Kausal („weil“, „dadurch“, „deshalb“)", "Identität („Menschen, die...“, „wer wirklich...“)", "Besitz („dein“, „deine“, „was dir fehlt“)"
          ],
          chunking: [
            "Chunk Down (konkret, spezifisch, messbar)", "Chunk Up (abstrakt, Prinzip, Perspektive)"
          ],
          triggerWords: [
            "endlich", "die meisten merken nicht", "unbemerkt", "versteckt", "sofort", "kaum jemand", "genau jetzt"
          ]
        }
      },
      generateButton: {
        idle: "VIRALE HOOKS GENERIEREN",
        loading: "Decoding Pathways..."
      }
    },
    neuroHelp: {
      helpBtn: "Hilfe",
      limbic: {
        title: "Limbic® Types",
        desc: "Basiert auf der Limbic Map (Häusel). Definiert den emotionalen Treiber: Balance (Harmoniser), Dominanz (Performer) oder Stimulanz (Hedonist/Abenteurer). Bestimmt die emotionale Tonalität des Skripts."
      },
      pattern: {
        title: "Pattern Interrupt",
        desc: "Durchbricht kognitive Routinen und den 'Autopiloten' des Nutzers. Unerwartete visuelle oder auditive Reize zwingen das Gehirn zur sofortigen Aufmerksamkeit."
      },
      intensity: {
        title: "Emotional Intensity",
        desc: "Steuert die Tiefe der limbischen Aktivierung. Hohe Werte nutzen starke Emotionen (Schock, Humor, Wut), um die Merkfähigkeit der Botschaft zu erhöhen."
      },
      gap: {
        title: "Zeigarnik Gap",
        desc: "Erzeugt ein Informationsvakuum ('Open Loop'). Das Gehirn verlangt instinktiv nach der Auflösung einer angefangenen Geschichte oder Frage."
      },
      fomo: {
        title: "FOMO Pressure",
        desc: "'Fear Of Missing Out'. Erzeugt durch Verknappung oder Exklusivität einen psychologischen Handlungsdruck (Urgency), um Passivität zu überwinden."
      }
    },
    results: {
      headline: "Neuro Concepts",
      copySuccess: "Kopiert!",
      labels: {
        hook: "Der Viral Hook",
        script: "Video Skript",
        pattern: "Pattern-Interrupt",
        intensity: "Intensität",
        gap: "Zeigarnik Gap",
        fomo: "FOMO Druck"
      }
    },
    history: {
      title: "Verlauf",
      empty: "Neue Generierung"
    },
    profileManager: {
      label: "Briefing Vault",
      sublabel: "Aktuelles Setup sichern",
      empty: "Dein Vault ist leer",
      addButton: "SETUP SICHERN",
      placeholder: "SETUP NAME..."
    },
    auth: {
      modalTitle: "Enter the Vault",
      modalSubtitle: "Wähle deinen Identity Node",
      authenticatingTitle: "Authenticating...",
      connecting: "Verbinde zu Identity Node",
      continueWith: "Weiter mit",
      synchronizing: "Synchronisiere..."
    },
    profileEdit: {
      title: "Identität",
      subtitle: "Node Parameter anpassen",
      fields: {
        name: "Voller Name",
        brand: "Marke / Agentur",
        email: "E-Mail Adresse",
        phone: "Neural Hotline (Telefon)"
      },
      cancel: "Abbrechen",
      save: "Profil Syncen",
      saving: "Syncing...",
      saved: "Gesynced"
    },
    legal: {
      consent: {
        title: "Datenschutz-Einstellungen",
        text: "HYPEAKZ.IO nutzt LocalStorage und externe APIs (Google Gemini), um virale Hooks zu generieren. Durch die Nutzung der App erklären Sie sich mit der Verarbeitung Ihrer Eingaben zur KI-Generierung einverstanden.",
        button: "Einverstanden"
      },
      impressum: {
        title: "Impressum",
        h5: "Angaben gemäß § 5 TMG",
        hContact: "Kontakt",
        hAuthority: "Aufsichtsbehörde",
        hUid: "Umsatzsteuer-ID",
        hCompany: "Unternehmensangaben",
        companyText: "Unternehmensgegenstand: AI Automation und Marketingdienstleistungen",
        memberText: "Mitgliedschaft: Wirtschaftskammer Österreich (WKO)",
        hLaw: "Rechtsvorschriften",
        hOdr: "Online-Streitbeilegung",
        odrText: "Die EU-Kommission stellt eine Plattform zur Online-Streitbeilegung bereit, die du unter folgendem Link findest:",
        hDispute: "Streitbeilegung",
        disputeText: "Wir sind grundsätzlich nicht verpflichtet und nicht bereit an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen."
      },
      privacy: {
        title: "Datenschutzerklärung",
        h1: "1. Datenschutz auf einen Blick",
        t1: "Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.",
        h2: "2. Verantwortliche Stelle",
        h3: "3. Datenerfassung in dieser App",
        t3a: "Eingegebene Daten: Alle Daten, die Sie in das Briefing-Formular eingeben, werden zur Verarbeitung an die Google Gemini API übertragen.",
        t3b: "Cloud-Speicherung: Wenn Sie sich registrieren oder Profile speichern, werden diese Daten in einer verschlüsselten Datenbank (Neon/PostgreSQL) gespeichert, um Ihnen den Zugriff von verschiedenen Geräten zu ermöglichen.",
        t3c: "LocalStorage: Wir nutzen den lokalen Speicher Ihres Browsers, um Ihre Einstellungen (z.B. Darkmode) und Session-Informationen zu speichern.",
        h4: "4. Drittanbieter & API-Nutzung",
        t4a: "Google Gemini API: Zur Generierung der Marketing-Inhalte werden Ihre Eingaben an Google-Server übertragen. Bitte geben Sie keine sensiblen personenbezogenen Daten Dritter in die Formulare ein.",
        t4b: "Neon DB: Wir nutzen Neon für die Datenpersistenz. Die Server befinden sich primär in der EU/USA.",
        h5: "5. Ihre Rechte",
        t5: "Sie haben jederzeit das Recht auf unentgeltliche Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten sowie ein Recht auf Berichtigung, Sperrung oder Löschung dieser Daten."
      }
    },
    admin: {
      title: "HYPEAKZ_CORE",
      subtitle: "Neural Algorithm Control Center v2.0",
      disconnect: "DISCONNECT",
      authReq: "AUTHENTICATION REQUIRED",
      accessKey: "ACCESS KEY",
      decrypting: "DECRYPTING...",
      initiate: "INITIATE SESSION",
      metrics: "SYSTEM METRICS",
      users: "Total Users",
      hooks: "Generated Hooks",
      throughput: "API Throughput",
      tokens: "Token Consumption",
      neuralAct: "NEURAL ACTIVITY",
      editMode: "EDIT_MODE",
      instructions: "Algorithm Fine-Tuning Instructions",
      live: "LIVE",
      compiling: "COMPILING...",
      commit: "COMMIT CHANGES",
      placeholder: "// System Override Anweisungen hier eingeben..."
    },
    errors: {
      authFailed: "Authentifizierung fehlgeschlagen.",
      engineError: "AI-Engine Error.",
      profileSyncFailed: "Fehler beim Profil-Sync. Bitte erneut versuchen.",
      missingKey: "SERVER ERROR: API Key Missing.\n\ Bitte stelle sicher, dass 'GEMINI_API_KEY' in den Netlify Environment Variables gesetzt ist (OHNE VITE_ Prefix).",
      invalidProviderOpenAI: "CONFIG ERROR: Falscher API Key Typ.\n\nDu verwendest einen OpenAI Key (sk-...). Diese App benötigt einen GOOGLE GEMINI Key (AIza...).\nBitte erstelle einen Key im Google AI Studio.",
      scoutError: "Fehler bei der Website-Analyse."
    },
    quota: {
      remaining: "übrig",
      used: "verwendet",
      limitReached: "Limit erreicht",
      upgradeTitle: "Upgrade auf Premium",
      upgradeText: "Du hast alle 10 Gratis-Generierungen aufgebraucht.",
      upgradeSubtext: "Schalte unbegrenzte virale Hooks mit Premium-Zugang frei.",
      contactUs: "Kontaktiere uns für Premium-Zugang",
      contactEmail: "mail@danielkofler.com",
      checkoutButton: "Jetzt upgraden - €10/Monat",
      loginFirst: "Erst einloggen",
      orContact: "Oder kontaktiere uns direkt",
      checkoutSuccess: "Willkommen bei Premium!",
      checkoutCancelled: "Checkout abgebrochen",
      upgradeCta: "Upgrade für unbegrenzte Generierungen"
    },
    pricing: {
      title: "Preise",
      badge: "Einfache Preise",
      headline: "Wähle deinen Plan",
      subheadline: "Starte kostenlos mit 10 Generierungen. Upgrade für unbegrenzten Zugang.",
      freePlan: "Free",
      premiumPlan: "Premium",
      forever: "für immer",
      month: "Monat",
      popular: "Beliebt",
      ctaPremium: "Jetzt upgraden",
      loginToUpgrade: "Einloggen zum Upgraden",
      activeSubscription: "Aktives Abo",
      feature1Free: "10 Generierungen (Lifetime)",
      feature2Free: "4 Hook-Varianten pro Generation",
      feature3Free: "Alle NLP-Parameter",
      feature4Free: "Brand Scanner",
      feature1Premium: "Unbegrenzte Generierungen",
      feature2Premium: "4 Hook-Varianten pro Generation",
      feature3Premium: "Alle NLP-Parameter",
      feature4Premium: "Brand Scanner",
      feature5Premium: "Prioritäts-Support",
      feature6Premium: "Früher Zugang zu neuen Features",
      faqTitle: "Häufige Fragen",
      faq1Q: "Was passiert nach den 10 Gratis-Generierungen?",
      faq1A: "Du kannst weiterhin alle generierten Hooks ansehen. Für neue Generierungen benötigst du ein Premium-Abo.",
      faq2Q: "Kann ich jederzeit kündigen?",
      faq2A: "Ja, du kannst dein Abo jederzeit kündigen. Es läuft dann zum Ende der Abrechnungsperiode aus.",
      faq3Q: "Welche Zahlungsmethoden werden akzeptiert?",
      faq3A: "Wir akzeptieren alle gängigen Kreditkarten über Stripe (Visa, Mastercard, American Express).",
      questions: "Noch Fragen?"
    }
  }
};
