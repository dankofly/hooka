
import React from 'react';
import { TranslationObject, UserProfile } from '../types.ts';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: TranslationObject;
  usedGenerations: number;
  limit: number;
  user: UserProfile | null;
  onLoginRequired: () => void;
}

// Shown when an anonymous visitor hits the free limit. Logged-in users
// generate without limits, so the only CTA here is the free login.
export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  t,
  usedGenerations,
  limit,
  onLoginRequired
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      <div
        className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 px-6 py-8 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <div className="relative">
            {/* Lock icon */}
            <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>

            <h2 id="upgrade-modal-title" className="text-xl font-black text-white uppercase tracking-wider mb-2">
              {t.quota.limitReached}
            </h2>

            {/* Progress indicator */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20">
              <span className="text-2xl font-black text-white">{usedGenerations}</span>
              <span className="text-white/60 font-medium">/</span>
              <span className="text-lg font-bold text-white/80">{limit}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-zinc-900 dark:text-white font-bold text-lg">
              {t.quota.upgradeTitle}
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">
              {t.quota.upgradeText}
            </p>
            <p className="text-zinc-500 dark:text-zinc-500 text-xs">
              {t.quota.upgradeSubtext}
            </p>
          </div>

          {/* CTA: free login */}
          <button
            onClick={onLoginRequired}
            className="block w-full px-6 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-black text-xs uppercase tracking-widest text-center transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            {t.quota.loginFirst}
          </button>

          {/* Alternative: Email Contact */}
          <div className="text-center pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-2">{t.quota.orContact}</p>
            <a
              href={`mailto:${t.quota.contactEmail}?subject=Hooka`}
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium"
            >
              {t.quota.contactEmail}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
