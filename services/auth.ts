
import { UserProfile } from '../types.ts';
import { analytics } from './analytics.ts';

// Type for Netlify Identity User
interface NetlifyUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
  app_metadata: {
    provider?: string;
    providers?: string[];
  };
  created_at: string;
}

// Declare global netlifyIdentity (loaded via CDN)
declare global {
  interface Window {
    netlifyIdentity: {
      init: (options?: { container?: string; locale?: string }) => void;
      open: (tab?: 'login' | 'signup') => void;
      close: () => void;
      logout: () => Promise<void>;
      currentUser: () => NetlifyUser | null;
      on: (event: string, callback: (user?: NetlifyUser) => void) => void;
      off: (event: string, callback?: Function) => void;
    };
  }
}

// Helper to generate stable ID from Netlify Identity user
const generateStableId = (netlifyUserId: string): string => {
  return `user-${netlifyUserId.substring(0, 12)}`;
};

// Convert Netlify Identity user to app UserProfile
const mapNetlifyUserToProfile = (netlifyUser: NetlifyUser): UserProfile => {
  return {
    id: generateStableId(netlifyUser.id),
    name: netlifyUser.user_metadata?.full_name || netlifyUser.email.split('@')[0],
    brand: '',
    email: netlifyUser.email,
    phone: '',
    createdAt: new Date(netlifyUser.created_at).getTime()
  };
};

export const authService = {
  // Initialize Netlify Identity widget
  init(): void {
    if (typeof window !== 'undefined' && window.netlifyIdentity) {
      window.netlifyIdentity.init();
    }
  },

  // Get current authenticated user
  getCurrentUser(): UserProfile | null {
    if (typeof window === 'undefined' || !window.netlifyIdentity) {
      return null;
    }

    const netlifyUser = window.netlifyIdentity.currentUser();
    if (!netlifyUser) return null;

    return mapNetlifyUserToProfile(netlifyUser);
  },

  // Open login modal (Netlify Identity widget handles email/password)
  async openLogin(): Promise<UserProfile> {
    analytics.track('login_start', {});

    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.netlifyIdentity) {
        reject(new Error('Netlify Identity not available'));
        return;
      }

      const onLogin = (user: NetlifyUser | undefined) => {
        if (user) {
          const profile = mapNetlifyUserToProfile(user);

          analytics.track('login_success', {
            userId: profile.id,
            name: profile.name,
            email: profile.email
          });

          window.netlifyIdentity.off('login', onLogin);
          window.netlifyIdentity.off('close', onClose);

          resolve(profile);
        }
      };

      const onClose = () => {
        const user = window.netlifyIdentity.currentUser();
        if (!user) {
          window.netlifyIdentity.off('login', onLogin);
          window.netlifyIdentity.off('close', onClose);
          reject(new Error('Authentication cancelled'));
        }
      };

      window.netlifyIdentity.on('login', onLogin);
      window.netlifyIdentity.on('close', onClose);

      // Open the Identity widget for login/signup
      window.netlifyIdentity.open('login');
    });
  },

  // Sign out
  logout(): void {
    if (typeof window !== 'undefined' && window.netlifyIdentity) {
      window.netlifyIdentity.logout();
      analytics.track('logout', {});
    }
  },

  // Subscribe to auth state changes
  onAuthStateChange(callback: (user: UserProfile | null) => void): () => void {
    if (typeof window === 'undefined' || !window.netlifyIdentity) {
      return () => {};
    }

    const handleLogin = (netlifyUser: NetlifyUser | undefined) => {
      if (netlifyUser) {
        callback(mapNetlifyUserToProfile(netlifyUser));
      }
    };

    const handleLogout = () => {
      callback(null);
    };

    window.netlifyIdentity.on('login', handleLogin);
    window.netlifyIdentity.on('logout', handleLogout);

    return () => {
      window.netlifyIdentity.off('login', handleLogin);
      window.netlifyIdentity.off('logout', handleLogout);
    };
  }
};
