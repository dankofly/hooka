import React, { useState, memo } from 'react';
import { ViralConcept, TranslationObject } from '../types.ts';

interface ConceptCardProps {
  concept: ViralConcept;
  index: number;
  t: TranslationObject;
}

// Memoized component to prevent unnecessary re-renders
export const ConceptCard: React.FC<ConceptCardProps> = memo(({ concept, index, t }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = `HOOK: ${concept.hook}\n\nSTRATEGIE: ${concept.strategy}\n\nSCRIPT:\n${concept.script}`;

    try {
      // Modern clipboard API with fallback
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers or insecure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const ScoreBar = ({ label, value }: { label: string, value: number }) => (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-600 antialiased">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-zinc-800 dark:bg-zinc-900 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-1000 ease-out" 
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="group bg-zinc-950 dark:bg-black border border-zinc-800 dark:border-zinc-800 rounded-2xl shadow-xl hover:border-purple-500/30 transition-all duration-700 flex flex-col h-full overflow-hidden">
      
      {/* Strategy Header */}
      <div className="px-5 py-5 md:px-8 md:py-6 border-b border-zinc-900 dark:border-zinc-900 flex justify-between items-center bg-zinc-900/30 dark:bg-zinc-950/30">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
          <span className="text-[10px] md:text-xs font-black text-zinc-200 dark:text-zinc-200 uppercase tracking-[0.2em] antialiased">
            {concept.strategy}
          </span>
        </div>
        <button
          onClick={handleCopy}
          aria-label={copied ? "Copied!" : "Copy to clipboard"}
          title={copied ? "Copied!" : "Copy to clipboard"}
          className={`p-2.5 md:p-3 rounded-lg transition-all haptic-btn border ${
            copied ? 'bg-purple-600 border-purple-600 text-white' : 'bg-zinc-800 dark:bg-zinc-900 border-zinc-700 dark:border-zinc-800 text-zinc-400 hover:text-white shadow-sm hover:border-zinc-600'
          }`}
        >
          {copied ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M20 6 9 17 4 12"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>}
        </button>
      </div>
      
      <div className="p-5 md:p-8 flex-grow flex flex-col gap-6 md:gap-8">
        <div className="space-y-3 md:space-y-4">
          <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-500 uppercase tracking-[0.25em] antialiased">{t.results.labels.hook}</h3>
          <p className="text-zinc-100 dark:text-white text-xl md:text-3xl font-black leading-[1.1] tracking-tight group-hover:text-purple-400 transition-colors duration-500 antialiased">
            "{concept.hook}"
          </p>
        </div>

        <div className="flex-grow space-y-3 md:space-y-4">
          <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-500 uppercase tracking-[0.25em] antialiased">{t.results.labels.script}</h3>
          <div className="text-zinc-400 dark:text-zinc-400 whitespace-pre-wrap text-sm md:text-base font-medium leading-relaxed italic antialiased pl-4 border-l-2 border-zinc-800">
            {concept.script}
          </div>
        </div>

        {/* Scores moved to bottom for better flow without image */}
        <div className="grid grid-cols-2 gap-x-4 md:gap-x-8 gap-y-4 md:gap-y-6 p-4 md:p-6 bg-zinc-900 dark:bg-zinc-950 rounded-xl border border-zinc-800 dark:border-zinc-900 mt-auto">
          <ScoreBar label={t.results.labels.pattern} value={concept.scores.patternInterrupt} />
          <ScoreBar label={t.results.labels.intensity} value={concept.scores.emotionalIntensity} />
          <ScoreBar label={t.results.labels.gap} value={concept.scores.curiosityGap} />
          <ScoreBar label={t.results.labels.fomo} value={concept.scores.scarcity} />
        </div>
      </div>
    </div>
  );
});

// Display name for React DevTools
ConceptCard.displayName = 'ConceptCard';