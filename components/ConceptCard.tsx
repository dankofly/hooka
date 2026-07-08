import React, { useState, useEffect, useRef, memo } from 'react';
import { ViralConcept, TranslationObject } from '../types.ts';

interface ConceptCardProps {
  concept: ViralConcept;
  index: number;
  t: TranslationObject;
  onSaveToLibrary?: (concept: ViralConcept) => Promise<boolean>;
}

const clampPct = (value: number) => Math.max(0, Math.min(100, value || 0));

// Memoized component to prevent unnecessary re-renders
export const ConceptCard: React.FC<ConceptCardProps> = memo(({ concept, index, t, onSaveToLibrary }) => {
  const [copied, setCopied] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
  }, []);

  const handleCopy = async () => {
    const text = `HOOK: ${concept.hook}\n\nSTRATEGIE: ${concept.strategy}\n\nSCRIPT:\n${concept.script}${concept.visualPrompt ? `\n\nVISUAL/VARIANTE:\n${concept.visualPrompt}` : ''}`;

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
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSave = async () => {
    if (!onSaveToLibrary || saveState !== 'idle') return;
    setSaveState('saving');
    const ok = await onSaveToLibrary(concept).catch(() => false);
    setSaveState(ok ? 'saved' : 'idle');
  };

  const ScoreBar = ({ label, value }: { label: string, value: number }) => (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-600 antialiased">
        <span>{label}</span>
        <span>{clampPct(value)}%</span>
      </div>
      <div className="h-1.5 w-full bg-zinc-800 dark:bg-zinc-900 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-1000 ease-out"
          style={{ width: `${clampPct(value)}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="group bg-zinc-950 dark:bg-black border border-zinc-800 dark:border-zinc-800 rounded-2xl shadow-xl hover:border-purple-500/30 transition-all duration-700 flex flex-col h-full overflow-hidden">

      {/* Strategy Header */}
      <div className="px-5 py-5 md:px-8 md:py-6 border-b border-zinc-900 dark:border-zinc-900 flex justify-between items-center bg-zinc-900/30 dark:bg-zinc-950/30 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)] shrink-0"></div>
          <span className="text-[10px] md:text-xs font-black text-zinc-200 dark:text-zinc-200 uppercase tracking-[0.2em] antialiased truncate">
            {concept.strategy}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onSaveToLibrary && (
            <button
              onClick={handleSave}
              disabled={saveState !== 'idle'}
              aria-label={saveState === 'saved' ? t.results.savedToLibrary : t.results.saveToLibrary}
              title={saveState === 'saved' ? t.results.savedToLibrary : t.results.saveToLibrary}
              className={`p-2.5 md:p-3 rounded-lg transition-all haptic-btn border ${
                saveState === 'saved'
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-zinc-800 dark:bg-zinc-900 border-zinc-700 dark:border-zinc-800 text-zinc-400 hover:text-white shadow-sm hover:border-zinc-600'
              }`}
            >
              {saveState === 'saved'
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M20 6 9 17 4 12"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>}
            </button>
          )}
          <button
            onClick={handleCopy}
            aria-label={copied ? (t.results.copySuccess || "Copied!") : "Copy to clipboard"}
            title={copied ? (t.results.copySuccess || "Copied!") : "Copy to clipboard"}
            className={`p-2.5 md:p-3 rounded-lg transition-all haptic-btn border ${
              copied ? 'bg-purple-600 border-purple-600 text-white' : 'bg-zinc-800 dark:bg-zinc-900 border-zinc-700 dark:border-zinc-800 text-zinc-400 hover:text-white shadow-sm hover:border-zinc-600'
            }`}
          >
            {copied ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M20 6 9 17 4 12"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>}
          </button>
        </div>
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

        {concept.visualPrompt && (
          <div className="space-y-3 md:space-y-4">
            <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-500 uppercase tracking-[0.25em] antialiased">{t.results.labels.visual}</h3>
            <div className="text-zinc-500 dark:text-zinc-500 whitespace-pre-wrap text-xs md:text-sm font-medium leading-relaxed antialiased pl-4 border-l-2 border-zinc-800/50">
              {concept.visualPrompt}
            </div>
          </div>
        )}

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
