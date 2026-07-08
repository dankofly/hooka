
import { db } from './db.ts';

const STORAGE_KEY_CONSENT = 'hypeakz_consent_granted';

const hasConsent = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY_CONSENT) === 'true';
  } catch {
    return false;
  }
};

export const analytics = {
  track: (eventName: string, metadata: any = {}) => {
    // GDPR: no consent, no tracking. The banner in ConsentBanner.tsx sets this flag.
    if (!hasConsent()) return;
    console.debug(`[Analytics] Event: ${eventName}`, metadata);
    // Persist to database
    db.logEvent(eventName, metadata);
  }
};
