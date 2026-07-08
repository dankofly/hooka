import React, { useState, useEffect, useCallback } from 'react';
import { LibraryHook, TranslationObject } from '../types.ts';
import { db } from '../services/db.ts';

interface HookLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  t: TranslationObject;
}

const METRIC_KEYS = ['open_rate', 'ctr', 'views', 'engagement', 'other'];

// Personal hook library with real-world results. Rated hooks feed back into
// generation as few-shot examples (see generate-hooks in the API).
export const HookLibrary: React.FC<HookLibraryProps> = ({ isOpen, onClose, t }) => {
  const [hooks, setHooks] = useState<LibraryHook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, { metric: string; value: string }>>({});
  const [savedId, setSavedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await db.getHooks();
      setHooks(items);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleSaveResult = async (hook: LibraryHook) => {
    const edit = editValues[hook.id];
    const value = parseFloat((edit?.value || '').replace(',', '.'));
    if (isNaN(value)) return;
    const metric = edit?.metric || hook.resultMetric || 'open_rate';
    const ok = await db.updateHookResult(hook.id, metric, value);
    if (ok) {
      setHooks(prev => prev.map(h => h.id === hook.id ? { ...h, resultMetric: metric, resultValue: value } : h));
      setSavedId(hook.id);
      setTimeout(() => setSavedId(null), 1500);
    }
  };

  const handleDelete = async (id: string) => {
    setHooks(prev => prev.filter(h => h.id !== id));
    await db.deleteHook(id);
  };

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label={t.library.title} className="fixed inset-0 z-[150] overflow-y-auto bg-zinc-50 dark:bg-black">
      <div className="sticky top-0 z-10 glass bg-white/90 dark:bg-black/90 border-b border-zinc-200 dark:border-zinc-800 px-4 md:px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg md:text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">{t.library.title}</h1>
          <p className="text-[10px] md:text-xs text-zinc-500 font-medium mt-1 max-w-xl">{t.library.subtitle}</p>
        </div>
        <button
          onClick={onClose}
          className="min-w-[44px] min-h-[44px] px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:border-purple-500 transition-all"
        >
          {t.library.close}
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-4">
        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && hooks.length === 0 && (
          <p className="text-center text-sm text-zinc-500 py-16 font-medium">{t.library.empty}</p>
        )}

        {hooks.map(hook => {
          const edit = editValues[hook.id] || { metric: hook.resultMetric || 'open_rate', value: hook.resultValue != null ? String(hook.resultValue) : '' };
          return (
            <div key={hook.id} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 md:p-6 space-y-4 shadow-sm">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <span className="inline-block text-[9px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 bg-purple-500/10 rounded-full px-3 py-1 mb-2">
                    {t.briefing.channel.options[hook.channel] || hook.channel}
                  </span>
                  <p className="text-zinc-900 dark:text-white font-black text-base md:text-lg leading-snug">"{hook.hook}"</p>
                  {hook.audience && <p className="text-[10px] text-zinc-500 mt-1 truncate">{hook.audience}</p>}
                </div>
                <button
                  onClick={() => handleDelete(hook.id)}
                  aria-label={t.library.deleteButton}
                  title={t.library.deleteButton}
                  className="shrink-0 min-w-[40px] min-h-[40px] p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                </button>
              </div>

              <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-900">
                <div className="flex flex-col gap-1">
                  <label htmlFor={`metric-${hook.id}`} className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t.library.metricLabel}</label>
                  <select
                    id={`metric-${hook.id}`}
                    value={edit.metric}
                    onChange={(e) => setEditValues(prev => ({ ...prev, [hook.id]: { ...edit, metric: e.target.value } }))}
                    className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-900 dark:text-zinc-100 outline-none focus:border-purple-500"
                  >
                    {METRIC_KEYS.map(m => (
                      <option key={m} value={m}>{t.library.metrics[m] || m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor={`value-${hook.id}`} className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t.library.resultLabel}</label>
                  <input
                    id={`value-${hook.id}`}
                    type="text"
                    inputMode="decimal"
                    placeholder={t.library.valuePlaceholder}
                    value={edit.value}
                    onChange={(e) => setEditValues(prev => ({ ...prev, [hook.id]: { ...edit, value: e.target.value } }))}
                    className="w-28 p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-900 dark:text-zinc-100 outline-none focus:border-purple-500"
                  />
                </div>
                <button
                  onClick={() => handleSaveResult(hook)}
                  className={`min-h-[40px] px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    savedId === hook.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90'
                  }`}
                >
                  {savedId === hook.id ? t.library.resultSaved : t.library.saveResult}
                </button>
                {hook.resultValue != null && savedId !== hook.id && (
                  <span className="text-[10px] font-bold text-zinc-500 pb-3">
                    {(t.library.metrics[hook.resultMetric || ''] || hook.resultMetric)}: {hook.resultValue}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
