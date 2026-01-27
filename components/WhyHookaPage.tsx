
import React from 'react';
import { TranslationObject } from '../types.ts';

interface WhyHookaPageProps {
  isOpen: boolean;
  onClose: () => void;
  t: TranslationObject;
}

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-purple-500/50 transition-all duration-300">
    <div className="w-12 h-12 mb-4 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
      {icon}
    </div>
    <h3 className="font-black text-zinc-900 dark:text-white uppercase tracking-wide text-sm mb-2">{title}</h3>
    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{description}</p>
  </div>
);

export const WhyHookaPage: React.FC<WhyHookaPageProps> = ({
  isOpen,
  onClose,
  t
}) => {
  if (!isOpen) return null;

  const whyHooka = t.whyHooka;

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div className="min-h-screen bg-white dark:bg-black">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-wider">
              {whyHooka.navTitle}
            </h1>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 py-12" onClick={(e) => e.stopPropagation()}>
          {/* Hero */}
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1.5 mb-4 rounded-full border border-purple-500/20 bg-purple-500/5">
              <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">
                {whyHooka.badge}
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-6">
              {whyHooka.headline}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto text-lg leading-relaxed">
              {whyHooka.subheadline}
            </p>
          </div>

          {/* Problem Section */}
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.3em]">
                {whyHooka.problemTitle}
              </h3>
              <div className="h-px flex-grow bg-zinc-200 dark:bg-zinc-800"></div>
            </div>
            <div className="p-8 bg-red-500/5 border border-red-500/20 rounded-2xl">
              <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {whyHooka.problemText}
              </p>
            </div>
          </div>

          {/* Solution Section */}
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.3em]">
                {whyHooka.solutionTitle}
              </h3>
              <div className="h-px flex-grow bg-zinc-200 dark:bg-zinc-800"></div>
            </div>
            <div className="p-8 bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-purple-500/20 rounded-2xl">
              <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-6">
                {whyHooka.solutionText}
              </p>
              <div className="flex flex-wrap gap-3">
                {[whyHooka.tag1, whyHooka.tag2, whyHooka.tag3].map((tag, i) => (
                  <span key={i} className="px-4 py-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full text-xs font-black uppercase tracking-wider">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.3em]">
                {whyHooka.featuresTitle}
              </h3>
              <div className="h-px flex-grow bg-zinc-200 dark:bg-zinc-800"></div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                icon={
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                }
                title={whyHooka.feature1Title}
                description={whyHooka.feature1Desc}
              />
              <FeatureCard
                icon={
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                }
                title={whyHooka.feature2Title}
                description={whyHooka.feature2Desc}
              />
              <FeatureCard
                icon={
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                }
                title={whyHooka.feature3Title}
                description={whyHooka.feature3Desc}
              />
            </div>
          </div>

          {/* Auto-Briefing Section */}
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.3em]">
                {whyHooka.autoBriefingTitle}
              </h3>
              <div className="h-px flex-grow bg-zinc-200 dark:bg-zinc-800"></div>
            </div>
            <div className="p-8 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
              <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {whyHooka.autoBriefingText}
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center py-12 border-t border-zinc-200 dark:border-zinc-800">
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-4">
              {whyHooka.ctaTitle}
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8">
              {whyHooka.ctaSubtitle}
            </p>
            <button
              onClick={onClose}
              className="px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {whyHooka.ctaButton}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
