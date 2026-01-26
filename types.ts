
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
    headline: string;
    empty: string;
  };
  profiles: {
    headline: string;
    saveBtn: string;
    savePlaceholder: string;
    loadBtn: string;
    empty: string;
    edit: { title: string; save: string };
  };
  neuroHelp: Record<string, { title: string; desc: string } | string>;
  errors: {
    authFailed: string;
    missingKey: string;
    invalidProviderOpenAI: string;
    scoutError: string;
    engineError: string;
  };
  consent: {
    message: string;
    accept: string;
  };
  impressum: { title: string; content: string };
  privacy: { title: string; content: string };
  admin: {
    title: string;
    password: string;
    login: string;
    stats: {
      users: string;
      hooks: string;
      apiCalls: string;
      tokens: string;
    };
    prompt: {
      title: string;
      placeholder: string;
      save: string;
    };
  };
}