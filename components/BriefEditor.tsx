
import React, { useState } from 'react';
import { MarketingBrief, Language, NeuroScores, TranslationObject } from '../types.ts';
import { researchBrand } from '../services/gemini.ts';
import { analytics } from '../services/analytics.ts';

interface BriefEditorProps {
  brief: MarketingBrief;
  onChange: (key: keyof MarketingBrief, value: any) => void;
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
  
  // Track which help item is currently active/expanded
  const [activeHelp, setActiveHelp] = useState<string | null>(null);

  const handleScout = async () => {
    // Basic URL clean up to accept inputs like "hypeakz.io"
    let targetUrl = url.trim();
    if (!targetUrl || !onAutoFill) return;

    targetUrl = targetUrl.replace(/\s/g, '');
    const domainRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i;

    if (!domainRegex.test(targetUrl)) {
      alert("Bitte geben Sie eine gültige URL ein (z.B. 'hypeakz.io' oder 'google.com').");
      return;
    }

    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }
    
    setIsScouting(true);
    try {
      const result = await researchBrand(targetUrl, brief.language);
      onAutoFill(result);
      setUrl('');
      analytics.track('scout_brand_success', { url: targetUrl });
    } catch (e: any) {
      console.error("Scouting Error:", e);
      if (e.message === "MISSING_API_KEY") {
        alert(t.errors.missingKey);
      } else if (e.message === "INVALID_PROVIDER_OPENAI") {
        alert(t.errors.invalidProviderOpenAI);
      } else {
        alert(`${t.errors.scoutError}\n\nDetails: ${e.message || 'Unknown Error'}`);
      }
    } finally {
      setIsScouting(false);
    }
  };

  const handleScoreChange = (key: keyof NeuroScores, value: number) => {
    const currentScores = brief.targetScores || {
      patternInterrupt: 70,
      emotionalIntensity: 70,
      curiosityGap: 70,
      scarcity: 50
    };
    onChange('targetScores', { ...currentScores, [key]: value });
  };

  const toggleTriggerWord = (word: string) => {
    const currentList = brief.triggerWords || [];
    let newList;
    if (currentList.includes(word)) {
      newList = currentList.filter(w => w !== word);
    } else {
      if (currentList.length >= 3) return; // Max 3 selection
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

    if (currentList.length >= 3) {
      return; 
    }
    
    onChange('triggerWords', [...currentList, word]);
    setCustomTrigger('');
  };

  const scores = brief.targetScores || {
    patternInterrupt: 70,
    emotionalIntensity: 70,
    curiosityGap: 70,
    scarcity: 50
  };

  const inputClasses = "w-full p-4 md:p-5 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm md:text-base text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 font-medium shadow-sm";
  const labelClasses = "block text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] mb-2 md:mb-3 px-1 antialiased";

  const LabelWithHelp = ({ label, helpKey }: { label: string, helpKey: string }) => (
    <div className="flex items-center gap-2 mb-2 md:mb-3">
      <label className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] px-1 antialiased cursor-default">
        {label}
      </label>
      <button
        onClick={(e) => {
          e.preventDefault();
          setActiveHelp(activeHelp === helpKey ? null : helpKey);
        }}
        className={`w-4 h-4 flex items-center justify-center rounded-full border transition-all ${
           activeHelp === helpKey 
           ? 'border-purple-500 text-purple-500 bg-purple-500/10' 
           : 'border-zinc-300 dark:border-zinc-700 text-zinc-300 dark:text-zinc-600 hover:border-purple-400 hover:text-purple-400'
        }`}
      >
        <span className="text-[9px] font-bold">i</span>
      </button>
    </div>
  );

  const ActiveHelpText = ({ helpKey, customText }: { helpKey: string, customText?: string }) => {
    if (activeHelp !== helpKey) return null;
    const text = customText || t.briefing.nlp.tooltips?.[helpKey] || "Description unavailable.";
    
    return (
      <div className="mb-4 p-3 bg-purple-50 dark:bg-zinc-900 border-l-2 border-purple-500 rounded-r-md animate-in fade-in slide-in-from-top-1 duration-300">
        <p className="text-[10px] md:text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium whitespace-pre-line">
          {text}
        </p>
      </div>
    );
  };

  const SelectField = ({ label, value, options, onChangeKey, helpKey }: { label: string, value: string | undefined, options: string[], onChangeKey: keyof MarketingBrief, helpKey?: string }) => (
    <div className="space-y-1">
      {helpKey ? <LabelWithHelp label={label} helpKey={helpKey} /> : <label className={labelClasses}>{label}</label>}
      {helpKey && <ActiveHelpText helpKey={helpKey} />}
      <div className="relative">
        <select
          value={value || ""}
          onChange={(e) => onChange(onChangeKey, e.target.value)}
          disabled={disabled}
          className={`${inputClasses} appearance-none cursor-pointer`}
        >
          <option value="">{brief.language === 'DE' ? 'Automatisch' : 'Auto-Select'}</option>
          {options.map((opt, idx) => (
            <option key={idx} value={opt}>{opt}</option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
    </div>
  );

  const Slider = ({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className={labelClasses.replace("mb-2 md:mb-3", "mb-0")}>{label}</label>
        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono w-10 text-right">{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        disabled={disabled}
        className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
      />
    </div>
  );

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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-8 md:mb-16">
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 md:gap-y-10 mb-12">
          <div className="space-y-1">
            <LabelWithHelp label={t.briefing.fields.context.label} helpKey="core_context" />
            <ActiveHelpText helpKey="core_context" customText={t.briefing.fields.context.help} />
            <textarea
              className={`${inputClasses} resize-none min-h-[140px] md:min-h-[160px] leading-relaxed`}
              value={brief.productContext}
              onChange={(e) => onChange('productContext', e.target.value)}
              disabled={disabled}
              placeholder={t.briefing.fields.context.placeholder}
            />
          </div>
          <div className="space-y-1">
            <LabelWithHelp label={t.briefing.fields.goal.label} helpKey="core_goal" />
            <ActiveHelpText helpKey="core_goal" customText={t.briefing.fields.goal.help} />
            <textarea
              className={`${inputClasses} resize-none min-h-[140px] md:min-h-[160px] leading-relaxed`}
              value={brief.goal}
              onChange={(e) => onChange('goal', e.target.value)}
              disabled={disabled}
              placeholder={t.briefing.fields.goal.placeholder}
            />
          </div>
          <div className="space-y-1">
            <LabelWithHelp label={t.briefing.fields.audience.label} helpKey="core_audience" />
            <ActiveHelpText helpKey="core_audience" customText={t.briefing.fields.audience.help} />
            <input
              type="text"
              className={inputClasses}
              value={brief.targetAudience}
              onChange={(e) => onChange('targetAudience', e.target.value)}
              disabled={disabled}
              placeholder={t.briefing.fields.audience.placeholder}
            />
          </div>
          <div className="space-y-1">
            <LabelWithHelp label={t.briefing.fields.speaker.label} helpKey="core_speaker" />
            <ActiveHelpText helpKey="core_speaker" customText={t.briefing.fields.speaker.help} />
            <input
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
                           <LabelWithHelp label={t.briefing.nlp.labels.focusKeyword} helpKey="focusKeyword" />
                           <ActiveHelpText helpKey="focusKeyword" />
                           <input
                              type="text"
                              className={inputClasses}
                              value={brief.focusKeyword || ''}
                              onChange={(e) => onChange('focusKeyword', e.target.value)}
                              disabled={disabled}
                              placeholder={t.briefing.nlp.placeholders.focusKeyword}
                           />
                        </div>
                        <SelectField label={t.briefing.nlp.labels.contentContext} value={brief.contentContext} options={t.briefing.nlp.options.contentContext} onChangeKey="contentContext" helpKey="contentContext" />
                     </div>
                  </div>

                  <div className="relative pl-6 md:pl-8 border-l-2 border-amber-500/30">
                     <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                        {t.briefing.nlp.sections.limbic}
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                        <SelectField label={t.briefing.nlp.labels.limbicType} value={brief.limbicType} options={t.briefing.nlp.options.limbicType} onChangeKey="limbicType" helpKey="limbicType" />
                     </div>
                  </div>

                  <div className="relative pl-6 md:pl-8 border-l-2 border-purple-500/30">
                     <h4 className="text-[10px] font-black text-purple-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                        {t.briefing.nlp.sections.nlp}
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                        <SelectField label={t.briefing.nlp.labels.patternType} value={brief.patternType} options={t.briefing.nlp.options.patternType} onChangeKey="patternType" helpKey="patternType" />
                        <SelectField label={t.briefing.nlp.labels.repSystem} value={brief.repSystem} options={t.briefing.nlp.options.repSystem} onChangeKey="repSystem" helpKey="repSystem" />
                        <SelectField label={t.briefing.nlp.labels.motivation} value={brief.motivation} options={t.briefing.nlp.options.motivation} onChangeKey="motivation" helpKey="motivation" />
                        <SelectField label={t.briefing.nlp.labels.decisionStyle} value={brief.decisionStyle} options={t.briefing.nlp.options.decisionStyle} onChangeKey="decisionStyle" helpKey="decisionStyle" />
                        <SelectField label={t.briefing.nlp.labels.presupposition} value={brief.presupposition} options={t.briefing.nlp.options.presupposition} onChangeKey="presupposition" helpKey="presupposition" />
                        <SelectField label={t.briefing.nlp.labels.chunking} value={brief.chunking} options={t.briefing.nlp.options.chunking} onChangeKey="chunking" helpKey="chunking" />
                        
                        <div className="space-y-4 md:col-span-2">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                              <div>
                                 <LabelWithHelp label={t.briefing.nlp.labels.triggerWords} helpKey="triggerWords" />
                                 <ActiveHelpText helpKey="triggerWords" />
                                 <div className="flex flex-wrap gap-2">
                                    {t.briefing.nlp.options.triggerWords.map((word: string, i: number) => {
                                      const isSelected = brief.triggerWords?.includes(word);
                                      return (
                                        <button
                                          key={i}
                                          onClick={() => toggleTriggerWord(word)}
                                          disabled={disabled}
                                          className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                            isSelected 
                                             ? 'bg-purple-600 border-purple-600 text-white shadow-md'
                                             : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-600'
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
                                          className="px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all bg-purple-600 border-purple-600 text-white shadow-md flex items-center gap-1"
                                        >
                                          {word}
                                          <span className="opacity-50 hover:opacity-100">&times;</span>
                                        </button>
                                    ))}
                                 </div>
                              </div>
                              
                              <div className="relative group/trigger">
                                  <LabelWithHelp label={t.briefing.nlp.labels.customTrigger} helpKey="customTrigger" />
                                  <ActiveHelpText helpKey="customTrigger" />
                                  
                                  <div className="relative">
                                     <input 
                                        type="text" 
                                        value={customTrigger}
                                        onChange={(e) => setCustomTrigger(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addCustomTrigger()}
                                        placeholder={t.briefing.nlp.placeholders.customTrigger}
                                        className={`${inputClasses} pr-12`}
                                        disabled={disabled}
                                     />
                                     <button 
                                       onClick={addCustomTrigger}
                                       disabled={!customTrigger.trim() || disabled}
                                       className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-zinc-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all disabled:opacity-30"
                                     >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
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
                <h3 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] antialiased flex items-center gap-3">
                   <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                   Neuro-Metric Control
                </h3>
                <button 
                  onClick={() => setShowNeuroInfo(!showNeuroInfo)}
                  className="group flex items-center gap-2.5 px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-purple-500/50 transition-all shadow-sm active:scale-95"
                  aria-label="Erklärung anzeigen"
                >
                  <span className="text-[10px] font-black text-zinc-400 group-hover:text-purple-500 uppercase tracking-[0.2em] transition-colors">
                    {t.neuroHelp.helpBtn}
                  </span>
                  <div className="text-zinc-400 group-hover:text-purple-500 transition-colors flex items-center">
                    {showNeuroInfo ? (
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18 15 12 9 6 15"/></svg>
                    ) : (
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
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
                    label={t.results.labels.pattern} 
                    value={scores.patternInterrupt} 
                    onChange={(v) => handleScoreChange('patternInterrupt', v)} 
                 />
                 <Slider 
                    label={t.results.labels.intensity} 
                    value={scores.emotionalIntensity} 
                    onChange={(v) => handleScoreChange('emotionalIntensity', v)} 
                 />
                 <Slider 
                    label={t.results.labels.gap} 
                    value={scores.curiosityGap} 
                    onChange={(v) => handleScoreChange('curiosityGap', v)} 
                 />
                 <Slider 
                    label={t.results.labels.fomo} 
                    value={scores.scarcity} 
                    onChange={(v) => handleScoreChange('scarcity', v)} 
                 />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
