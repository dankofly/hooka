
import { HistoryItem, BriefProfile, UserProfile, UserQuota } from '../types.ts';

// Constants
const API_TIMEOUT_MS = 5000; // 5 seconds timeout for DB calls
const MAX_LOCAL_HISTORY_ITEMS = 50;
const FREE_GENERATION_LIMIT = 10;

// Local Storage Keys
const LS_KEYS = {
  USER: 'hypeakz_db_user_backup',
  HISTORY: 'hypeakz_db_history_backup',
  PROFILES: 'hypeakz_db_profiles_backup',
  QUOTA: 'hypeakz_generations_used'
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
  },

  // --- QUOTA METHODS ---

  /**
   * Get current quota for user (logged in) or from localStorage (anonymous)
   */
  async getQuota(userId?: string): Promise<UserQuota> {
    // For logged-in users: fetch from DB
    if (userId) {
      const result = await callApi<UserQuota>('get-quota', { userId });
      if (result) {
        return result;
      }
    }

    // For anonymous users or if DB fails: use localStorage
    const localCount = this.getLocalQuotaCount();
    return {
      usedGenerations: localCount,
      limit: FREE_GENERATION_LIMIT,
      isPremium: false
    };
  },

  /**
   * Check if user can generate (has remaining quota)
   */
  async canGenerate(userId?: string): Promise<boolean> {
    const quota = await this.getQuota(userId);
    if (quota.isPremium) return true;
    return quota.usedGenerations < quota.limit;
  },

  /**
   * Increment quota after successful generation
   */
  async incrementQuota(userId?: string): Promise<void> {
    // Always increment local storage (for anonymous tracking)
    this.incrementLocalQuotaCount();

    // If logged in, also update DB
    if (userId) {
      await callApi('increment-quota', { userId });
    }
  },

  /**
   * Sync localStorage quota with DB on login (takes higher value)
   */
  async syncQuotaOnLogin(userId: string): Promise<UserQuota> {
    const localCount = this.getLocalQuotaCount();

    const result = await callApi<UserQuota>('sync-quota', { userId, localCount });
    if (result) {
      // Update local storage with synced value
      storage.set(LS_KEYS.QUOTA, result.usedGenerations.toString());
      return result;
    }

    // Fallback if API fails
    return {
      usedGenerations: localCount,
      limit: FREE_GENERATION_LIMIT,
      isPremium: false
    };
  },

  // --- Local Quota Helpers ---

  getLocalQuotaCount(): number {
    const stored = storage.get(LS_KEYS.QUOTA);
    if (!stored) return 0;
    const parsed = parseInt(stored, 10);
    return isNaN(parsed) ? 0 : parsed;
  },

  incrementLocalQuotaCount(): void {
    const current = this.getLocalQuotaCount();
    storage.set(LS_KEYS.QUOTA, (current + 1).toString());
  },

  // --- STRIPE CHECKOUT ---

  /**
   * Create a Stripe checkout session and return the URL
   * Throws an error with the message from the API if checkout fails
   */
  async createCheckoutSession(userId: string, userEmail: string): Promise<string | null> {
    const baseUrl = window.location.origin;

    try {
      const response = await fetch('/.netlify/functions/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-checkout',
          payload: {
            userId,
            userEmail,
            successUrl: `${baseUrl}/?checkout=success`,
            cancelUrl: `${baseUrl}/?checkout=cancelled`
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Throw the error message from the API
        throw new Error(data.error || `Checkout failed (${response.status})`);
      }

      return data?.url || null;
    } catch (error: any) {
      console.error('createCheckoutSession error:', error);
      throw error;
    }
  },

  /**
   * Check if user has an active subscription
   */
  async checkSubscription(userId: string): Promise<boolean> {
    const result = await callApi<{ isPremium: boolean }>('check-subscription', { userId });
    return result?.isPremium || false;
  }
};
