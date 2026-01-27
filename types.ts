
export interface UserProfile {
  id: string;
  name: string;
  brand: string;
  email: string;
  phone?: string;
  createdAt: number;
}

export interface NeuroScores {
  patternInterrupt: number;
  emotionalIntensity: number;
  curiosityGap: number;
  scarcity: number;
}

export interface ViralConcept {
  hook: string;
  script: string;
  strategy: string;
  scores: NeuroScores;
  visualPrompt: string;
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export type Language = 'DE' | 'EN';

export interface MarketingBrief {
  productContext: string;
  targetAudience: string;
  goal: string;
  speaker: string;
  language: Language;
  sources?: { title: string; uri: string }[];
  targetScores?: NeuroScores;
  
  // NLP Fields
  contentContext?: string;
  limbicType?: string;
  focusKeyword?: string; // New SEO/Topic Field
  patternType?: string;
  repSystem?: string;
  motivation?: string;
  decisionStyle?: string;
  presupposition?: string;
  chunking?: string;
  triggerWords?: string[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  concepts: ViralConcept[];
  brief: MarketingBrief;
}

export interface BriefProfile {
  id: string;
  name: string;
  brief: MarketingBrief;
}

export interface UserQuota {
  usedGenerations: number;
  limit: number;
  isPremium: boolean;
}

// Translation object type - defines the structure of translation files
export interface TranslationObject {
  company: {
    name: string;
    owner: string;
    address: string[];
    email: string;
    phone: string;
    uid: string;
    authority: string;
    copyright: string;
  };
  nav: {
    logoText: string;
    editProfile: string;
    logout: string;
    vaultAccess: string;
    impressum: string;
    privacy: string;
  };
  hero: {
    badge: string;
    titleLine1: string;
    titleLine2: string;
    subtitleLine1: string;
    subtitleLine2: string;
  };
  tutorial: {
    headline: string;
    step1: { title: string; desc: string };
    step2: { title: string; desc: string };
    step3: { title: string; desc: string };
  };
  auth: {
    modalTitle: string;
    modalSubtitle: string;
    authenticatingTitle: string;
    connecting: string;
    continueWith: string;
    synchronizing: string;
  };
  briefing: {
    headline: string;
    subline: string;
    outputLang: string;
    setupMode: string;
    mode: { auto: string; pro: string };
    scout: {
      label: string;
      placeholder: string;
      buttonIdle: string;
      buttonActive: string;
      sourcesTitle: string;
    };
    fields: {
      context: { label: string; placeholder: string; help: string };
      goal: { label: string; placeholder: string; help: string };
      audience: { label: string; placeholder: string; help: string };
      speaker: { label: string; placeholder: string; help: string };
    };
    nlp: {
      headline: string;
      sections: { seo: string; limbic: string; nlp: string };
      labels: Record<string, string>;
      placeholders: Record<string, string>;
      options: Record<string, string[]>;
      tooltips?: Record<string, string>;
    };
    generateButton: { idle: string; loading: string };
  };
  results: {
    headline: string;
    copySuccess?: string;
    labels: {
      hook: string;
      script: string;
      pattern: string;
      intensity: string;
      gap: string;
      fomo: string;
    };
  };
  history: {
    title?: string;
    headline?: string;
    empty: string;
  };
  profileManager: {
    label: string;
    sublabel: string;
    empty: string;
    addButton: string;
    placeholder: string;
  };
  profileEdit: {
    title: string;
    subtitle: string;
    fields: {
      name: string;
      brand: string;
      email: string;
      phone: string;
    };
    cancel: string;
    save: string;
    saving: string;
    saved: string;
  };
  neuroHelp: Record<string, { title: string; desc: string } | string>;
  errors: {
    authFailed: string;
    missingKey: string;
    invalidProviderOpenAI: string;
    scoutError: string;
    engineError: string;
    profileSyncFailed?: string;
  };
  quota: {
    remaining: string;
    used: string;
    limitReached: string;
    upgradeTitle: string;
    upgradeText: string;
    upgradeSubtext: string;
    contactUs: string;
    contactEmail: string;
    checkoutButton: string;
    loginFirst: string;
    orContact: string;
    checkoutSuccess: string;
    checkoutCancelled: string;
    upgradeCta: string;
  };
  whyHooka: {
    navTitle: string;
    badge: string;
    headline: string;
    subheadline: string;
    problemTitle: string;
    problemText: string;
    solutionTitle: string;
    solutionText: string;
    tag1: string;
    tag2: string;
    tag3: string;
    featuresTitle: string;
    feature1Title: string;
    feature1Desc: string;
    feature2Title: string;
    feature2Desc: string;
    feature3Title: string;
    feature3Desc: string;
    autoBriefingTitle: string;
    autoBriefingText: string;
    ctaTitle: string;
    ctaSubtitle: string;
    ctaButton: string;
  };
  pricing: {
    navTitle: string;
    title: string;
    badge: string;
    headline: string;
    subheadline: string;
    freePlan: string;
    premiumPlan: string;
    forever: string;
    month: string;
    popular: string;
    ctaPremium: string;
    loginToUpgrade: string;
    activeSubscription: string;
    feature1Free: string;
    feature2Free: string;
    feature3Free: string;
    feature4Free: string;
    feature1Premium: string;
    feature2Premium: string;
    feature3Premium: string;
    feature4Premium: string;
    feature5Premium: string;
    feature6Premium: string;
    faqTitle: string;
    faq1Q: string;
    faq1A: string;
    faq2Q: string;
    faq2A: string;
    faq3Q: string;
    faq3A: string;
    questions: string;
  };
  legal: {
    consent: {
      title: string;
      text: string;
      button: string;
    };
    impressum: {
      title: string;
      h5: string;
      hContact: string;
      hAuthority: string;
      hUid: string;
      hCompany: string;
      companyText: string;
      memberText: string;
      hLaw: string;
      hOdr: string;
      odrText: string;
      hDispute: string;
      disputeText: string;
    };
    privacy: {
      title: string;
      h1: string;
      t1: string;
      h2: string;
      h3: string;
      t3a: string;
      t3b: string;
      t3c: string;
      h4: string;
      t4a: string;
      t4b: string;
      h5: string;
      t5: string;
    };
  };
  admin: {
    title: string;
    subtitle: string;
    disconnect: string;
    authReq: string;
    accessKey: string;
    decrypting: string;
    initiate: string;
    metrics: string;
    users: string;
    hooks: string;
    throughput: string;
    tokens: string;
    neuralAct: string;
    editMode: string;
    instructions: string;
    live: string;
    compiling: string;
    commit: string;
    placeholder: string;
  };
}