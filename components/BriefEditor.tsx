
import React, { useState } from 'react';
import { MarketingBrief, NeuroScores, TranslationObject, ContentChannel } from '../types.ts';
import { researchBrand } from '../services/gemini.ts';
import { analytics } from '../services/analytics.ts';

// Constants
const MAX_TRIGGER_WORDS = 3;
const DEFAULT_NEURO_SCORES: NeuroScores = {
  patternInterrupt: 70,
  emotionalIntensity: 70,
  curiosityGap: 70,
  scarcity: 50
};

const CHANNELS: ContentChannel[] = ['VIDEO', 'EMAIL_SUBJECT', 'NEWSLETTER', 'FACEBOOK', 'INSTAGRAM', 'PROMPT'];

const inputClasses = "w-full p-4 md:p-5 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-base text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 font-medium shadow-sm";
const labelClasses = "block text-sm font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-[0.15em] mb-2 md:mb-3 px-1 antialiased";

// NOTE: These are top-level components on purpose. Defining them inside the
// editor's render body recreates the component type on every keystroke,
// which remounts inputs (sliders lose drag, selects lose focus).

interface HelpProps {
  activeHelp: string | null;
  onToggleHelp: (key: string) => void;
}

const LabelWithHelp: React.FC<{ label: string; helpKey: string; htmlFor?: string } & HelpProps> = ({ label, helpKey, htmlFor, activeHelp, onToggleHelp }) => (
  <div className="flex items-center gap-2 mb-2 md:mb-3">
    <label
      htmlFor={htmlFor}
      className="text-sm font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-[0.15em] px-1 antialiased cursor-default"
    >
      {label}
    </label>
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onToggleHelp(helpKey);
      }}
      aria-label={`Help for ${label}`}
      aria-expanded={activeHelp === helpKey}
      className={`min-w-[28px] min-h-[28px] w-7 h-7 flex items-center justify-center rounded-full border transition-all ${
         activeHelp === helpKey
         ? 'border-purple-500 text-purple-500 bg-purple-500/10'
         : 'border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 hover:border-purple-400 hover:text-purple-400'
      }`}
    >
      <span className="text-xs font-bold" aria-hidden="true">?</span>
    </button>
  </div>
);

const ActiveHelpText: React.FC<{ helpKey: string; activeHelp: string | null; text?: string }> = ({ helpKey, activeHelp, text }) => {
  if (activeHelp !== helpKey) return null;

  return (
    <div className="mb-4 p-3 bg-purple-50 dark:bg-zinc-900 border-l-2 border-purple-500 rounded-r-md animate-in fade-in slide-in-from-top-1 duration-300">
      <p className="text-[10px] md:text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium whitespace-pre-line">
        {text || "Description unavailable."}
      </p>
    </div>
  );
};

interface SelectFieldProps extends HelpProps {
  label: string;
  value: string | undefined;
  options: string[];
  onChangeKey: keyof MarketingBrief;
  helpKey?: string;
  helpText?: string;
  autoLabel: string;
  disabled: boolean;
  onChange: (key: keyof MarketingBrief, value: MarketingBrief[keyof MarketingBrief]) => void;
}

const SelectField: React.FC<SelectFieldProps> = ({ label, value, options, onChangeKey, helpKey, helpText, autoLabel, disabled, onChange, activeHelp, onToggleHelp }) => {
  const fieldId = `field-${onChangeKey}`;
  return (
    <div className="space-y-1">
      {helpKey ? <LabelWithHelp label={label} helpKey={helpKey} htmlFor={fieldId} activeHelp={activeHelp} onToggleHelp={onToggleHelp} /> : <label htmlFor={fieldId} className={labelClasses}>{label}</label>}
      {helpKey && <ActiveHelpText helpKey={helpKey} activeHelp={activeHelp} text={helpText} />}
      <div className="relative">
        <select
          id={fieldId}
          value={value || ""}
          onChange={(e) => onChange(onChangeKey, e.target.value)}
          disabled={disabled}
          className={`${inputClasses} appearance-none cursor-pointer`}
        >
          <option value="">{autoLabel}</option>
          {options.map((opt, idx) => (
            <option key={idx} value={opt}>{opt}</option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
    </div>
  );
};

const Slider: React.FC<{ label: string; value: number; onChange: (v: number) => void; id: string; disabled: boolean }> = ({ label, value, onChange, id, disabled }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <label htmlFor={id} className={labelClasses.replace("mb-2 md:mb-3", "mb-0")}>{label}</label>
      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono w-10 text-right" aria-live="polite">{value}%</span>
    </div>
    <input
      id={id}
      type="range"
      min="0"
      max="100"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      disabled={disabled}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
    />
  </div>
);

interface BriefEditorProps {
  brief: MarketingBrief;
  onChange: (key: keyof MarketingBrief, value: MarketingBrief[keyof MarketingBrief]) => void;
  disabled: boolean;
  onAutoFill?: (data: Partial<MarketingBrief>) => void;
  t: TranslationObject;
}

export const BriefEditor: React.FC<BriefEditorProps> = ({ brief, onChange, disabled, onAutoFill, t }) => {
  const [url, setUrl] = useState('');
  const [isScouting, setIsScouting] = useState(false);
  const [showNeuroInfo, setShowNeuroInfo] = useState(false);
  const [mode, setMode] = useState<'AUTO' | 'PRO'>('AUTO');
  const [customTrigger, setCustomTrigger] = useState('');
  const [scoutError, setScoutError] = useState<string | null>(null);

  // Track which help item is currently active/expanded
  const [activeHelp, setActiveHelp] = useState<string | null>(null);
  const toggleHelp = (key: string) => setActiveHelp(prev => prev === key ? null : key);

  const activeChannel: ContentChannel = brief.channel || 'VIDEO';

  const handleScout = async () => {
    if (isScouting) return; // guard against parallel runs (Enter key spam)

    // Basic URL clean up to accept inputs like "hypeakz.io"
    let targetUrl = url.trim();
    if (!targetUrl || !onAutoFill) return;

    targetUrl = targetUrl.replace(/\s/g, '');
    const domainRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i;

    if (!domainRegex.test(targetUrl)) {
      setScoutError(t.briefing.scout.invalidUrl);
      return;
    }

    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    setScoutError(null);
    setIsScouting(true);
    try {
      const result = await researchBrand(targetUrl, brief.language);
      onAutoFill(result);
      setUrl('');
      analytics.track('scout_brand_success', { url: targetUrl });
    } catch (e: any) {
      console.error("Scouting Error:", e);
      if (e.message === "MISSING_API_KEY") {
        setScoutError(t.errors.missingKey);
      } else if (e.message === "INVALID_PROVIDER_OPENAI") {
        setScoutError(t.errors.invalidProviderOpenAI);
      } else {
        setScoutError(`${t.errors.scoutError}\n\n${e.message || 'Unknown Error'}`);
      }
    } finally {
      setIsScouting(false);
    }
  };

  const handleScoreChange = (key: keyof NeuroScores, value: number) => {
    const currentScores = brief.targetScores || DEFAULT_NEURO_SCORES;
    onChange('targetScores', { ...currentScores, [key]: value });
  };

  const toggleTriggerWord = (word: string) => {
    const currentList = brief.triggerWords || [];
    let newList;
    if (currentList.includes(word)) {
      newList = currentList.filter(w => w !== word);
    } else {
      if (currentList.length >= MAX_TRIGGER_WORDS) return;
      newList = [...currentList, word];
    }
    onChange('triggerWords', newList);
  };

  const addCustomTrigger = () => {
    if (!customTrigger.trim()) return;
    const word = customTrigger.trim();
    const currentList = brief.triggerWords || [];

    // Check duplication
    if (currentList.includes(word)) {
      setCustomTrigger('');
      return;
    }

    if (currentList.length >= MAX_TRIGGER_WORDS) {
      return;
    }

    onChange('triggerWords', [...currentList, word]);
    setCustomTrigger('');
  };

  const scores = brief.targetScores || DEFAULT_NEURO_SCORES;
  const autoLabel = brief.language === 'DE' ? 'Automatisch' : 'Auto-Select';
  const tooltips = t.briefing.nlp.tooltips || {};

  return (
    <div className="space-y-10 md:space-y-14 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-zinc-800 p-5 md:p-10 rounded-2xl shadow-xl relative overflow-hidden group">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-purple-500/10 transition-colors duration-1000"></div>

        <div className="flex flex-col sm:flex-row gap-4 items-end relative z-10">
          <div className="flex-grow space-y-2 md:space-y-3 w-full">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
              <h3 className="text-xs font-black text-zinc-700 dark:text-zinc-200 uppercase tracking-[0.2em] antialiased">{t.briefing.scout.label}</h3>
            </div>
            <input
              type="text"
              placeholder={t.briefing.scout.placeholder}
              className={inputClasses}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={disabled || isScouting}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleScout();
              }}
            />
          </div>
          <button
            onClick={handleScout}
            disabled={disabled || isScouting || !url}
            className={`haptic-btn w-full sm:w-auto relative overflow-hidden whitespace-nowrap px-8 py-4 md:py-5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all shadow-md antialiased border border-transparent ${
              isScouting
                ? 'bg-zinc-100 dark:bg-zinc-900 text-purple-600 dark:text-purple-400 cursor-wait'
                : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200'
            }`}
          >
            {isScouting && (
              <div className="absolute inset-0 z-0">
                 <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800"></div>
                 <div
                   className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent w-full h-full animate-shimmer"
                   style={{ backgroundSize: '200% 100%' }}
                 ></div>
              </div>
            )}
            <span className="relative z-10">{isScouting ? t.briefing.scout.buttonActive : t.briefing.scout.buttonIdle}</span>
          </button>
        </div>

        {scoutError && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/40 rounded-xl animate-in fade-in duration-300" role="alert">
            <p className="text-xs text-red-600 dark:text-red-400 font-bold whitespace-pre-wrap">{scoutError}</p>
          </div>
        )}

        {brief.sources && brief.sources.length > 0 && (
          <div className="mt-6 md:mt-8 p-4 md:p-5 bg-white/50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in duration-1000">
            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 antialiased">{t.briefing.scout.sourcesTitle}</h4>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {brief.sources.map((source, i) => (
                <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:text-white hover:bg-purple-600 transition-all uppercase tracking-wider bg-white dark:bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  {source.title.length > 25 ? source.title.substring(0, 25) + '...' : source.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 p-5 md:p-14 rounded-2xl shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-8 md:mb-12">
          <div>
             <h2 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter antialiased">{t.briefing.headline}</h2>
             <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] font-bold mt-2 antialiased">{t.briefing.subline}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
             <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1">{t.briefing.setupMode}</span>
                <button
                   onClick={() => setMode(mode === 'AUTO' ? 'PRO' : 'AUTO')}
                   className="relative bg-zinc-200 dark:bg-zinc-800 p-1 rounded-full flex items-center h-8 sm:h-9 w-[90px] sm:w-[100px] shrink-0 border border-zinc-300 dark:border-zinc-700 shadow-inner group"
                >
                   <div
                     className={`absolute left-1 top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] bg-white dark:bg-zinc-950 rounded-full shadow-sm transition-transform duration-300 ease-spring ${mode === 'PRO' ? 'translate-x-[calc(100%)]' : 'translate-x-0'}`}
                   ></div>
                   <span className={`relative z-10 w-1/2 text-center text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-colors duration-300 ${mode === 'AUTO' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500'}`}>
                     {t.briefing.mode.auto}
                   </span>
                   <span className={`relative z-10 w-1/2 text-center text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-colors duration-300 ${mode === 'PRO' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500'}`}>
                     {t.briefing.mode.pro}
                   </span>
                </button>
             </div>

             <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1">{t.briefing.outputLang}</span>
                <button
                   onClick={() => onChange('language', brief.language === 'DE' ? 'EN' : 'DE')}
                   disabled={disabled}
                   className="relative bg-zinc-200 dark:bg-zinc-800 p-1 rounded-full flex items-center h-8 sm:h-9 w-[90px] sm:w-[100px] shrink-0 border border-zinc-300 dark:border-zinc-700 shadow-inner group"
                >
                   <div
                     className={`absolute left-1 top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] bg-white dark:bg-zinc-950 rounded-full shadow-sm transition-transform duration-300 ease-spring ${brief.language === 'EN' ? 'translate-x-[calc(100%)]' : 'translate-x-0'}`}
                   ></div>
                   <span className={`relative z-10 w-1/2 text-center text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-colors duration-300 ${brief.language === 'DE' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500'}`}>
                     DE
                   </span>
                   <span className={`relative z-10 w-1/2 text-center text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-colors duration-300 ${brief.language === 'EN' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500'}`}>
                     EN
                   </span>
                </button>
             </div>
          </div>
        </div>

        {/* Channel Selector */}
        <div className="mb-10 md:mb-14">
          <span className={labelClasses}>{t.briefing.channel.label}</span>
          <div className="flex flex-wrap gap-2 md:gap-3" role="radiogroup" aria-label={t.briefing.channel.label}>
            {CHANNELS.map(ch => (
              <button
                key={ch}
                role="radio"
                aria-checked={activeChannel === ch}
                onClick={() => onChange('channel', ch)}
                disabled={disabled}
                className={`min-h-[44px] px-4 md:px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider border transition-all ${
                  activeChannel === ch
                    ? 'bg-purple-600 border-purple-600 text-white shadow-md'
                    : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-purple-400 dark:hover:border-purple-500'
                }`}
              >
                {t.briefing.channel.options[ch]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 md:gap-y-10 mb-12">
          <div className="space-y-1">
            <LabelWithHelp label={t.briefing.fields.context.label} helpKey="core_context" htmlFor="field-context" activeHelp={activeHelp} onToggleHelp={toggleHelp} />
            <ActiveHelpText helpKey="core_context" activeHelp={activeHelp} text={t.briefing.fields.context.help} />
            <textarea
              id="field-context"
              className={`${inputClasses} resize-none min-h-[140px] md:min-h-[160px] leading-relaxed`}
              value={brief.productContext}
              onChange={(e) => onChange('productContext', e.target.value)}
              disabled={disabled}
              placeholder={t.briefing.fields.context.placeholder}
            />
          </div>
          <div className="space-y-1">
            <LabelWithHelp label={t.briefing.fields.goal.label} helpKey="core_goal" htmlFor="field-goal" activeHelp={activeHelp} onToggleHelp={toggleHelp} />
            <ActiveHelpText helpKey="core_goal" activeHelp={activeHelp} text={t.briefing.fields.goal.help} />
            <textarea
              id="field-goal"
              className={`${inputClasses} resize-none min-h-[140px] md:min-h-[160px] leading-relaxed`}
              value={brief.goal}
              onChange={(e) => onChange('goal', e.target.value)}
              disabled={disabled}
              placeholder={t.briefing.fields.goal.placeholder}
            />
          </div>
          <div className="space-y-1">
            <LabelWithHelp label={t.briefing.fields.audience.label} helpKey="core_audience" htmlFor="field-audience" activeHelp={activeHelp} onToggleHelp={toggleHelp} />
            <ActiveHelpText helpKey="core_audience" activeHelp={activeHelp} text={t.briefing.fields.audience.help} />
            <input
              id="field-audience"
              type="text"
              className={inputClasses}
              value={brief.targetAudience}
              onChange={(e) => onChange('targetAudience', e.target.value)}
              disabled={disabled}
              placeholder={t.briefing.fields.audience.placeholder}
            />
          </div>
          <div className="space-y-1">
            <LabelWithHelp label={t.briefing.fields.speaker.label} helpKey="core_speaker" htmlFor="field-speaker" activeHelp={activeHelp} onToggleHelp={toggleHelp} />
            <ActiveHelpText helpKey="core_speaker" activeHelp={activeHelp} text={t.briefing.fields.speaker.help} />
            <input
              id="field-speaker"
              type="text"
              className={inputClasses}
              value={brief.speaker}
              onChange={(e) => onChange('speaker', e.target.value)}
              disabled={disabled}
              placeholder={t.briefing.fields.speaker.placeholder}
            />
          </div>
        </div>

        {mode === 'PRO' && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-8 md:pt-10 mb-12">
               <h3 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] antialiased mb-8 md:mb-12">
                  {t.briefing.nlp.headline}
               </h3>

               <div className="space-y-12">
                  <div className="relative pl-6 md:pl-8 border-l-2 border-blue-500/30">
                     <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        {t.briefing.nlp.sections.seo}
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                        <div className="space-y-1">
                           <LabelWithHelp label={t.briefing.nlp.labels.focusKeyword} helpKey="focusKeyword" htmlFor="field-focusKeyword" activeHelp={activeHelp} onToggleHelp={toggleHelp} />
                           <ActiveHelpText helpKey="focusKeyword" activeHelp={activeHelp} text={tooltips.focusKeyword} />
                           <input
                              id="field-focusKeyword"
                              type="text"
                              className={inputClasses}
                              value={brief.focusKeyword || ''}
                              onChange={(e) => onChange('focusKeyword', e.target.value)}
                              disabled={disabled}
                              placeholder={t.briefing.nlp.placeholders.focusKeyword}
                           />
                        </div>
                        <SelectField label={t.briefing.nlp.labels.contentContext} value={brief.contentContext} options={t.briefing.nlp.options.contentContext} onChangeKey="contentContext" helpKey="contentContext" helpText={tooltips.contentContext} autoLabel={autoLabel} disabled={disabled} onChange={onChange} activeHelp={activeHelp} onToggleHelp={toggleHelp} />
                     </div>
                  </div>

                  <div className="relative pl-6 md:pl-8 border-l-2 border-amber-500/30">
                     <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                        {t.briefing.nlp.sections.limbic}
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                        <SelectField label={t.briefing.nlp.labels.limbicType} value={brief.limbicType} options={t.briefing.nlp.options.limbicType} onChangeKey="limbicType" helpKey="limbicType" helpText={tooltips.limbicType} autoLabel={autoLabel} disabled={disabled} onChange={onChange} activeHelp={activeHelp} onToggleHelp={toggleHelp} />
                     </div>
                  </div>

                  <div className="relative pl-6 md:pl-8 border-l-2 border-purple-500/30">
                     <h4 className="text-[10px] font-black text-purple-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                        {t.briefing.nlp.sections.nlp}
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                        <SelectField label={t.briefing.nlp.labels.patternType} value={brief.patternType} options={t.briefing.nlp.options.patternType} onChangeKey="patternType" helpKey="patternType" helpText={tooltips.patternType} autoLabel={autoLabel} disabled={disabled} onChange={onChange} activeHelp={activeHelp} onToggleHelp={toggleHelp} />
                        <SelectField label={t.briefing.nlp.labels.repSystem} value={brief.repSystem} options={t.briefing.nlp.options.repSystem} onChangeKey="repSystem" helpKey="repSystem" helpText={tooltips.repSystem} autoLabel={autoLabel} disabled={disabled} onChange={onChange} activeHelp={activeHelp} onToggleHelp={toggleHelp} />
                        <SelectField label={t.briefing.nlp.labels.motivation} value={brief.motivation} options={t.briefing.nlp.options.motivation} onChangeKey="motivation" helpKey="motivation" helpText={tooltips.motivation} autoLabel={autoLabel} disabled={disabled} onChange={onChange} activeHelp={activeHelp} onToggleHelp={toggleHelp} />
                        <SelectField label={t.briefing.nlp.labels.decisionStyle} value={brief.decisionStyle} options={t.briefing.nlp.options.decisionStyle} onChangeKey="decisionStyle" helpKey="decisionStyle" helpText={tooltips.decisionStyle} autoLabel={autoLabel} disabled={disabled} onChange={onChange} activeHelp={activeHelp} onToggleHelp={toggleHelp} />
                        <SelectField label={t.briefing.nlp.labels.presupposition} value={brief.presupposition} options={t.briefing.nlp.options.presupposition} onChangeKey="presupposition" helpKey="presupposition" helpText={tooltips.presupposition} autoLabel={autoLabel} disabled={disabled} onChange={onChange} activeHelp={activeHelp} onToggleHelp={toggleHelp} />
                        <SelectField label={t.briefing.nlp.labels.chunking} value={brief.chunking} options={t.briefing.nlp.options.chunking} onChangeKey="chunking" helpKey="chunking" helpText={tooltips.chunking} autoLabel={autoLabel} disabled={disabled} onChange={onChange} activeHelp={activeHelp} onToggleHelp={toggleHelp} />

                        <div className="space-y-4 md:col-span-2">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                              <div>
                                 <LabelWithHelp label={t.briefing.nlp.labels.triggerWords} helpKey="triggerWords" activeHelp={activeHelp} onToggleHelp={toggleHelp} />
                                 <ActiveHelpText helpKey="triggerWords" activeHelp={activeHelp} text={tooltips.triggerWords} />
                                 <div className="flex flex-wrap gap-2">
                                    {t.briefing.nlp.options.triggerWords.map((word: string, i: number) => {
                                      const isSelected = brief.triggerWords?.includes(word);
                                      return (
                                        <button
                                          key={i}
                                          onClick={() => toggleTriggerWord(word)}
                                          disabled={disabled}
                                          className={`min-h-[44px] px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                                            isSelected
                                             ? 'bg-purple-600 border-purple-600 text-white shadow-md'
                                             : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-purple-400 dark:hover:border-purple-500'
                                          }`}
                                        >
                                          {word}
                                        </button>
                                      );
                                    })}
                                    {brief.triggerWords?.filter(w => !t.briefing.nlp.options.triggerWords.includes(w)).map((word, i) => (
                                        <button
                                          key={`custom-${i}`}
                                          onClick={() => toggleTriggerWord(word)}
                                          disabled={disabled}
                                          className="min-h-[44px] px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all bg-purple-600 border-purple-600 text-white shadow-md flex items-center gap-2"
                                        >
                                          {word}
                                          <span className="opacity-60 hover:opacity-100 text-base">&times;</span>
                                        </button>
                                    ))}
                                 </div>
                              </div>

                              <div className="relative group/trigger">
                                  <LabelWithHelp label={t.briefing.nlp.labels.customTrigger} helpKey="customTrigger" htmlFor="field-customTrigger" activeHelp={activeHelp} onToggleHelp={toggleHelp} />
                                  <ActiveHelpText helpKey="customTrigger" activeHelp={activeHelp} text={tooltips.customTrigger} />

                                  <div className="relative">
                                     <input
                                        id="field-customTrigger"
                                        type="text"
                                        value={customTrigger}
                                        onChange={(e) => setCustomTrigger(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addCustomTrigger()}
                                        placeholder={t.briefing.nlp.placeholders.customTrigger}
                                        className={`${inputClasses} pr-12`}
                                        disabled={disabled}
                                     />
                                     <button
                                       type="button"
                                       onClick={addCustomTrigger}
                                       disabled={!customTrigger.trim() || disabled}
                                       aria-label="Add custom trigger word"
                                       className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] p-2.5 rounded-lg text-zinc-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all disabled:opacity-30 flex items-center justify-center"
                                     >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                     </button>
                                  </div>
                               </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="pt-8 md:pt-10 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-8 md:mb-10">
                <h3 className="text-sm font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.15em] antialiased flex items-center gap-3">
                   <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                   Neuro-Metric Control
                </h3>
                <button
                  onClick={() => setShowNeuroInfo(!showNeuroInfo)}
                  className="group flex items-center gap-2.5 min-h-[44px] px-4 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-purple-500/50 transition-all shadow-sm active:scale-95"
                  aria-label="Erklärung anzeigen"
                  aria-expanded={showNeuroInfo}
                >
                  <span className="text-xs font-black text-zinc-500 group-hover:text-purple-500 uppercase tracking-widest transition-colors">
                    {t.neuroHelp.helpBtn as string}
                  </span>
                  <div className="text-zinc-400 group-hover:text-purple-500 transition-colors flex items-center">
                    {showNeuroInfo ? (
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                    ) : (
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    )}
                  </div>
                </button>
              </div>

              {showNeuroInfo && (
                <div className="mb-10 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  {Object.entries(t.neuroHelp).map(([key, data]: [string, any]) => {
                    if (key === 'helpBtn') return null;
                    return (
                      <div key={key} className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                        <div className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-1">
                          {data.title}
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                          {data.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                 <Slider
                    id="slider-pattern"
                    label={t.results.labels.pattern}
                    value={scores.patternInterrupt}
                    onChange={(v) => handleScoreChange('patternInterrupt', v)}
                    disabled={disabled}
                 />
                 <Slider
                    id="slider-intensity"
                    label={t.results.labels.intensity}
                    value={scores.emotionalIntensity}
                    onChange={(v) => handleScoreChange('emotionalIntensity', v)}
                    disabled={disabled}
                 />
                 <Slider
                    id="slider-gap"
                    label={t.results.labels.gap}
                    value={scores.curiosityGap}
                    onChange={(v) => handleScoreChange('curiosityGap', v)}
                    disabled={disabled}
                 />
                 <Slider
                    id="slider-fomo"
                    label={t.results.labels.fomo}
                    value={scores.scarcity}
                    onChange={(v) => handleScoreChange('scarcity', v)}
                    disabled={disabled}
                 />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
