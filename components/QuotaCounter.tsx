
import React from 'react';
import { UserQuota, TranslationObject } from '../types.ts';

interface QuotaCounterProps {
  quota: UserQuota;
  t: TranslationObject;
  onUpgradeClick: () => void;
  variant?: 'default' | 'compact' | 'navbar';
}

export const QuotaCounter: React.FC<QuotaCounterProps> = ({
  quota,
  t,
  onUpgradeClick,
  variant = 'default'
}) => {
  const remaining = quota.limit - quota.usedGenerations;
  const percentage = (quota.usedGenerations / quota.limit) * 100;
  const isLow = remaining <= 3;
  const isEmpty = remaining <= 0;

  // Premium users see a badge instead
  if (quota.isPremium) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-full border border-purple-500/20">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-500">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
        </svg>
        <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider">
          Premium
        </span>
      </div>
    );
  }

  // Navbar variant - compact for navigation
  if (variant === 'navbar') {
    return (
      <button
        onClick={onUpgradeClick}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all hover:scale-105 ${
          isEmpty
            ? 'bg-red-500/10 border-red-500/30 text-red-500'
            : isLow
              ? 'bg-orange-500/10 border-orange-500/30 text-orange-500'
              : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
        }`}
      >
        <span className="text-sm font-black">{remaining}</span>
        <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">
          {t.quota.remaining}
        </span>
      </button>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <div className={`text-lg font-black ${isEmpty ? 'text-red-500' : isLow ? 'text-orange-500' : 'text-zinc-900 dark:text-white'}`}>
          {remaining}
        </div>
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
          {t.quota.remaining}
        </span>
      </div>
    );
  }

  // Default variant - full display
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Main Counter Card */}
      <div
        className={`relative overflow-hidden px-6 py-4 rounded-2xl border transition-all ${
          isEmpty
            ? 'bg-red-500/5 border-red-500/30'
            : isLow
              ? 'bg-orange-500/5 border-orange-500/30'
              : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
        }`}
      >
        <div className="flex items-center gap-4">
          {/* Circular Progress */}
          <div className="relative w-14 h-14">
            <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 56 56">
              {/* Background circle */}
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-zinc-200 dark:text-zinc-800"
              />
              {/* Progress circle */}
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${(100 - percentage) * 1.508} 150.8`}
                className={`transition-all duration-500 ${
                  isEmpty
                    ? 'text-red-500'
                    : isLow
                      ? 'text-orange-500'
                      : 'text-purple-500'
                }`}
              />
            </svg>
            {/* Center number */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-lg font-black ${
                isEmpty ? 'text-red-500' : isLow ? 'text-orange-500' : 'text-zinc-900 dark:text-white'
              }`}>
                {remaining}
              </span>
            </div>
          </div>

          {/* Text */}
          <div className="flex flex-col">
            <span className={`text-xs font-black uppercase tracking-wider ${
              isEmpty ? 'text-red-500' : isLow ? 'text-orange-500' : 'text-zinc-900 dark:text-white'
            }`}>
              {isEmpty ? t.quota.limitReached : `${remaining} ${t.quota.remaining}`}
            </span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {quota.usedGenerations} / {quota.limit} {t.quota.used || 'verwendet'}
            </span>
          </div>
        </div>

        {/* Progress bar underneath */}
        <div className="mt-3 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isEmpty
                ? 'bg-red-500'
                : isLow
                  ? 'bg-orange-500'
                  : 'bg-gradient-to-r from-purple-500 to-indigo-500'
            }`}
            style={{ width: `${100 - percentage}%` }}
          />
        </div>
      </div>

      {/* Upgrade hint when low */}
      {isLow && !isEmpty && (
        <button
          onClick={onUpgradeClick}
          className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline uppercase tracking-wider"
        >
          {t.quota.upgradeCta || 'Upgrade für unbegrenzte Generierungen'}
        </button>
      )}
    </div>
  );
};
