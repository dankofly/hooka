
import { HistoryItem, BriefProfile, UserProfile } from '../types.ts';

// Constants
const API_TIMEOUT_MS = 5000; // 5 seconds timeout for DB calls
const MAX_LOCAL_HISTORY_ITEMS = 50;

// Local Storage Keys
const LS_KEYS = {
  USER: 'hypeakz_db_user_backup',
  HISTORY: 'hypeakz_db_history_backup',
  PROFILES: 'hypeakz_db_profiles_backup'
} as const;

// Safe Storage Wrapper (Handles Private Mode / Quota Exceeded)
const storage = {
  get: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('Storage Access Error (Read):', e);
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('Storage Access Error (Write):', e);
    }
  }
};

// API response type
type ApiResponse<T = unknown> = T | null;

// Helper to call the API with Timeout
const callApi = async <T = unknown>(action: string, payload: Record<string, unknown> = {}): Promise<ApiResponse<T>> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch('/.netlify/functions/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;
    
    // Check content type to avoid crashing on HTML (404/500 pages)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") === -1) {
      return null;
    }

    return await response.json();
  } catch (error) {
    // Ignore AbortErrors (Timeouts) and standard fetch errors
    // console.debug(`DB API call skipped/failed [${action}]`);
    return null;
  }
};

// --- Local Storage Helpers ---

const localStore = {
  saveUser: (user: UserProfile) => {
    storage.set(LS_KEYS.USER, JSON.stringify(user));
  },
  getUser: (id: string): UserProfile | null => {
    const data = storage.get(LS_KEYS.USER);
    if (!data) return null;
    try {
      const user = JSON.parse(data);
      return user.id === id ? user : null;
    } catch { return null; }
  },
  getHistory: (): HistoryItem[] => {
    const data = storage.get(LS_KEYS.HISTORY);
    try { return data ? JSON.parse(data) : []; } catch { return []; }
  },
  saveHistoryItem: (item: HistoryItem) => {
    const current = localStore.getHistory();
    // Prevent duplicates based on ID, limit to max items
    const updated = [item, ...current.filter(i => i.id !== item.id)].slice(0, MAX_LOCAL_HISTORY_ITEMS);
    storage.set(LS_KEYS.HISTORY, JSON.stringify(updated));
  },
  getProfiles: (): BriefProfile[] => {
    const data = storage.get(LS_KEYS.PROFILES);
    try { return data ? JSON.parse(data) : []; } catch { return []; }
  },
  saveProfile: (profile: BriefProfile) => {
    const current = localStore.getProfiles();
    const updated = [profile, ...current.filter(p => p.id !== profile.id)];
    storage.set(LS_KEYS.PROFILES, JSON.stringify(updated));
  },
  deleteProfile: (id: string) => {
    const current = localStore.getProfiles();
    const updated = current.filter(p => p.id !== id);
    storage.set(LS_KEYS.PROFILES, JSON.stringify(updated));
  }
};

export const db = {
  async init() {
    // Attempt to init cloud DB (Fire & Forget)
    callApi('init-db').catch(() => {});
  },

  async logEvent(eventName: string, metadata: Record<string, unknown> = {}) {
    const id = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 11);
    callApi('log-analytics', { id, eventName, timestamp: Date.now(), metadata }).catch(() => {});
  },

  async saveUser(user: UserProfile) {
    // 1. Save Local (guaranteed success)
    localStore.saveUser(user);
    // 2. Try Sync Cloud (Non-blocking)
    await callApi('save-user', user);
  },

  async getUser(id: string): Promise<UserProfile | null> {
    // 1. Try Cloud
    const cloudResult = await callApi('get-user', { id });
    if (cloudResult) {
      // Sync local backup
      localStore.saveUser(cloudResult);
      return cloudResult;
    }
    // 2. Fallback Local
    return localStore.getUser(id);
  },

  async getHistory(): Promise<HistoryItem[]> {
    const cloudResult = await callApi('get-history');
    
    if (cloudResult && Array.isArray(cloudResult) && cloudResult.length > 0) {
      storage.set(LS_KEYS.HISTORY, JSON.stringify(cloudResult));
      return cloudResult;
    }

    return localStore.getHistory();
  },

  async saveHistoryItem(item: HistoryItem) {
    localStore.saveHistoryItem(item);
    await callApi('save-history', item);
  },

  async getProfiles(): Promise<BriefProfile[]> {
    const cloudResult = await callApi('get-profiles');
    
    if (cloudResult && Array.isArray(cloudResult) && cloudResult.length > 0) {
      storage.set(LS_KEYS.PROFILES, JSON.stringify(cloudResult));
      return cloudResult;
    }

    return localStore.getProfiles();
  },

  async saveProfile(profile: BriefProfile) {
    localStore.saveProfile(profile);
    await callApi('save-profile', profile);
  },

  async deleteProfile(id: string) {
    localStore.deleteProfile(id);
    await callApi('delete-profile', { id });
  }
};
