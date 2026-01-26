
import React, { useState, useCallback, useEffect } from 'react';
import { MarketingBrief, ViralConcept, GenerationStatus, HistoryItem, BriefProfile, UserProfile, Language } from './types.ts';
import { generateViralHooks } from './services/gemini.ts';
import { db } from './services/db.ts';
import { analytics } from './services/analytics.ts';
import { authService } from './services/auth.ts';
import { BriefEditor } from './components/BriefEditor.tsx';
import { ConceptCard } from './components/ConceptCard.tsx';
import { HistoryList } from './components/HistoryList.tsx';
import { ProfileManager } from './components/ProfileManager.tsx';
import { ImpressumModal } from './components/ImpressumModal.tsx';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal.tsx';
import { ConsentBanner } from './components/ConsentBanner.tsx';
import { ProfileEditModal } from './components/ProfileEditModal.tsx';
import { AdminModal } from './components/AdminModal.tsx';
import { TRANSLATIONS } from './text.ts';

const STORAGE_KEY_THEME = 'hypeakz_theme';
const STORAGE_KEY_USER = 'hypeakz_user_profile';
const STORAGE_KEY_APP_LANG = 'hypeakz_app_lang';

const Logo = ({ text }: { text: string }) => (
  <div className="flex items-center gap-[10px] md:gap-[14px] select-none group">
    <div className="relative flex items-center justify-center">
      <svg 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className="text-zinc-500 dark:text-[#D1D1D1] transition-transform duration-500 group-hover:scale-105"
      >
        <path 
          d="M4 8.5L20 8.5L12 17.5L4 8.5Z" 
          fill="currentColor" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinejoin="round" 
        />
      </svg>
    </div>
    <span className="text-[14px] md:text-[17px] font-bold tracking-[0.2em] md:tracking-[0.32em] text-zinc-900 dark:text-[#F0F0F0] uppercase antialiased leading-none">
      {text}
    </span>
  </div>
);

const TutorialCard = ({ step, title, desc }: { step: string, title: string, desc: string }) => (
  <div className="flex-1 min-w-[240px] p-6 bg-white/50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-2xl group hover:border-purple-500/50 transition-all duration-500">
    <div className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-2 opacity-50 group-hover:opacity-100 transition-opacity">{step}</div>
    <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase mb-2 tracking-tight">{title}</h4>
    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">{desc}</p>
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // UI Language state
  const [appLanguage, setAppLanguage] = useState<Language>('DE');

  // Brief state (includes Output Language)
  const [brief, setBrief] = useState<MarketingBrief>({
    productContext: "",
    targetAudience: "",
    goal: "",
    speaker: "",
    language: 'DE' // This controls the output generation language
  });
  
  // Current translation object based on APP language
  const t = TRANSLATIONS[appLanguage];

  const [concepts, setConcepts] = useState<ViralConcept[]>([]);
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [profiles, setProfiles] = useState<BriefProfile[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | undefined>();
  const [isDark, setIsDark] = useState(false);
  const [isImpressumOpen, setIsImpressumOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
    const darkMode = savedTheme ? savedTheme === 'dark' : false;
    setIsDark(darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const savedLang = localStorage.getItem(STORAGE_KEY_APP_LANG);
    if (savedLang === 'DE' || savedLang === 'EN') {
      setAppLanguage(savedLang as Language);
    }

    // Initialize Netlify Identity
    authService.init();

    // Check for existing Netlify Identity session
    const existingIdentityUser = authService.getCurrentUser();
    if (existingIdentityUser) {
      // Try to get enriched profile from DB
      db.getUser(existingIdentityUser.id).then(dbUser => {
        if (dbUser) {
          setUser(dbUser);
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(dbUser));
        } else {
          setUser(existingIdentityUser);
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(existingIdentityUser));
        }
      }).catch(err => {
        // Fallback to Identity user if DB fails
        setUser(existingIdentityUser);
        console.debug("DB sync failed, using Identity user:", err);
      });
    } else {
      // Fallback to localStorage for backward compatibility
      try {
        const savedUser = localStorage.getItem(STORAGE_KEY_USER);
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          db.getUser(parsed.id).then(cloudUser => {
            if (cloudUser) {
              setUser(cloudUser);
              localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(cloudUser));
            }
          }).catch(err => console.debug("Offline or Sync Failed:", err));
        }
      } catch (e) {
        console.warn("Could not load local user data", e);
      }
    }

    // Subscribe to auth state changes
    const unsubscribe = authService.onAuthStateChange((profile) => {
      if (profile) {
        db.getUser(profile.id).then(dbUser => {
          const mergedUser = dbUser || profile;
          setUser(mergedUser);
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(mergedUser));
          if (!dbUser) {
            setIsProfileModalOpen(true);
            db.saveUser(profile).catch(err => console.warn("DB save failed", err));
          }
        }).catch(() => {
          setUser(profile);
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
        });
      } else {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY_USER);
      }
    });

    // Initial Load: Data
    db.init().then(async () => {
      const [h, p] = await Promise.all([db.getHistory(), db.getProfiles()]);
      if (h) setHistory(h);
      if (p) setProfiles(p);
    });

    return () => unsubscribe();
  }, []);

  const handleAppLanguageChange = (lang: Language) => {
    setAppLanguage(lang);
    localStorage.setItem(STORAGE_KEY_APP_LANG, lang);
  };

  const handleBriefChange = useCallback((key: keyof MarketingBrief, value: any) => {
    setBrief(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleLogin = async () => {
    setIsAuthenticating(true);
    try {
      const newUser = await authService.openLogin();

      // Check if user already exists in DB
      const existingDbUser = await db.getUser(newUser.id).catch(() => null);
      const finalUser = existingDbUser ? { ...existingDbUser, ...newUser } : newUser;

      // OPTIMISTIC UI UPDATE: Log in immediately
      setUser(finalUser);
      try {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(finalUser));
      } catch (e) {
        console.warn("Local storage blocked");
      }

      // Only show profile modal for new users (need to fill brand/phone)
      if (!existingDbUser || !existingDbUser.brand) {
        setIsProfileModalOpen(true);
      }

      analytics.track('login_success', { name: finalUser.name });

      // Sync DB in background
      db.saveUser(finalUser).catch(err => console.warn("Background DB sync failed", err));

    } catch (err: any) {
      // Don't show error if user just closed the modal
      if (err.message !== 'Authentication cancelled') {
        console.error("Login failed", err);
        setError(t.errors.authFailed);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleUpdateProfile = async (updatedUser: UserProfile) => {
    setUser(updatedUser);
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updatedUser));
    } catch(e) {}
    
    // Optimistic Update
    setIsProfileModalOpen(false);
    analytics.track('profile_updated', { userId: updatedUser.id });

    // Background Sync
    await db.saveUser(updatedUser);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    localStorage.removeItem(STORAGE_KEY_USER);
  };

  const handleGenerate = async () => {
    setStatus(GenerationStatus.IDLE); // Clear UI results before start
    setConcepts([]);
    setStatus(GenerationStatus.LOADING);
    setError(null);
    try {
      const results = await generateViralHooks(brief);
      setConcepts(results);
      setStatus(GenerationStatus.SUCCESS);
      const newItem = { id: Date.now().toString(), timestamp: Date.now(), concepts: results, brief: { ...brief } };
      setHistory(prev => [newItem, ...prev].slice(0, 10));
      setActiveHistoryId(newItem.id);
      
      await db.saveHistoryItem(newItem);
      
      analytics.track('generate_hooks', { 
        count: results.length, 
        language: brief.language,
        userId: user?.id || 'anonymous'
      });
      
    } catch (e: any) {
      console.error("Generation Error:", e);
      let msg = e.message || t.errors.engineError;
      if (e.message === "MISSING_API_KEY") msg = t.errors.missingKey;
      if (e.message === "INVALID_PROVIDER_OPENAI") msg = t.errors.invalidProviderOpenAI;
      setError(msg);
      setStatus(GenerationStatus.ERROR);
    }
  };

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem(STORAGE_KEY_THEME, next ? 'dark' : 'light');
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black relative selection:bg-purple-500/30 font-sans transition-colors duration-1000 pb-20">
      <ConsentBanner t={t} />
      <div className="fixed inset-0 pointer-events-none neuro-grid opacity-30"></div>
      
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-purple-600/5 rounded-full blur-[120px] animate-float opacity-50"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[100px] animate-pulse-fast opacity-30"></div>
      </div>

      <nav className="sticky top-0 z-[60] glass bg-white/90 dark:bg-black/90 border-b border-zinc-200 dark:border-zinc-800 px-4 md:px-8 py-4 md:py-5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Logo text={t.nav.logoText} />
          <div className="flex items-center gap-3 md:gap-6">
            
            <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1 border border-zinc-200 dark:border-zinc-800">
              {(['DE', 'EN'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleAppLanguageChange(lang)}
                  className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${
                    appLanguage === lang
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 hidden md:block"></div>

            <button
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="p-2 md:p-2.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all"
            >
              {isDark ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2" fill="none" stroke="currentColor" strokeWidth="2"/></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
            </button>
            {user ? (
              <div className="flex items-center gap-3 md:gap-5 pl-3 md:pl-6 border-l border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-right-4">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">{user.name}</span>
                  <div className="flex gap-3">
                    <button onClick={() => setIsProfileModalOpen(true)} className="text-[10px] font-bold text-zinc-400 hover:text-purple-500 uppercase tracking-widest transition-colors">{t.nav.editProfile}</button>
                    <button onClick={handleLogout} className="text-[10px] font-bold text-red-500/60 hover:text-red-500 uppercase tracking-widest transition-colors">{t.nav.logout}</button>
                  </div>
                </div>
                <button onClick={() => setIsProfileModalOpen(true)} className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-white text-xs md:text-sm font-black haptic-btn transition-all hover:rotate-3 shadow-md">
                  {user.name.charAt(0)}
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                disabled={isAuthenticating}
                className={`px-4 py-2 md:px-6 md:py-2.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest haptic-btn shadow-xl transition-all hover:scale-105 active:scale-95 ${
                  isAuthenticating
                    ? 'bg-zinc-400 dark:bg-zinc-600 text-white cursor-wait'
                    : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                }`}
              >
                {isAuthenticating ? t.auth.synchronizing : t.nav.vaultAccess}
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-16 space-y-12 md:space-y-20 relative z-10">
        <div className="text-center space-y-6 md:space-y-8 py-4 md:py-8 animate-in fade-in slide-in-from-bottom-12 duration-1000">
          <div className="inline-block px-4 py-1.5 md:px-5 md:py-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <span className="text-[9px] md:text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.3em] md:tracking-[0.35em] antialiased">{t.hero.badge}</span>
          </div>
          <div className="space-y-0">
            <h1 className="text-4xl md:text-8xl font-black tracking-tighter leading-[0.9] uppercase flex flex-col items-center antialiased">
              <span className="text-zinc-900 dark:text-white">{t.hero.titleLine1}</span>
              <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 dark:from-white dark:via-zinc-300 dark:to-zinc-500 bg-clip-text text-transparent">
                {t.hero.titleLine2}
              </span>
            </h1>
          </div>
          <p className="max-w-2xl mx-auto text-zinc-600 dark:text-zinc-400 text-sm md:text-lg font-medium leading-relaxed tracking-tight px-2 md:px-4 antialiased">
            {t.hero.subtitleLine1} <br className="hidden md:block"/>
            {t.hero.subtitleLine2}
          </p>
        </div>

        {/* Tutorial Section */}
        <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
            <h3 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em] antialiased flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              {t.tutorial.headline}
            </h3>
            <div className="h-px flex-grow bg-zinc-200 dark:bg-zinc-800"></div>
          </div>
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            <TutorialCard step="Phase 01" title={t.tutorial.step1.title} desc={t.tutorial.step1.desc} />
            <TutorialCard step="Phase 02" title={t.tutorial.step2.title} desc={t.tutorial.step2.desc} />
            <TutorialCard step="Phase 03" title={t.tutorial.step3.title} desc={t.tutorial.step3.desc} />
          </div>
        </div>
        
        {error && status === GenerationStatus.ERROR && (
          <div className="max-w-3xl mx-auto bg-red-500/10 border border-red-500/50 rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4">
             <div className="flex gap-4">
               <div className="shrink-0 text-red-500">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
               </div>
               <div className="space-y-2">
                 <h3 className="font-black text-red-500 uppercase tracking-widest text-sm">System Error</h3>
                 <p className="text-zinc-800 dark:text-zinc-200 text-sm whitespace-pre-wrap font-medium">{error}</p>
               </div>
             </div>
          </div>
        )}

        <div className="space-y-10 md:space-y-14">
          <div className="glass bg-white/60 dark:bg-zinc-900/40 p-4 md:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-700">
            <ProfileManager 
              profiles={profiles} 
              currentBrief={brief}
              t={t}
              onSave={async (n) => {
                const p = { id: Date.now().toString(), name: n, brief: { ...brief } };
                setProfiles(prev => [p, ...prev]);
                await db.saveProfile(p);
              }} 
              onLoad={(p) => setBrief(p.brief)} 
              onDelete={async (id) => {
                setProfiles(prev => prev.filter(x => x.id !== id));
                await db.deleteProfile(id);
              }} 
            />
          </div>
          <BriefEditor brief={brief} onChange={handleBriefChange} onAutoFill={(d) => setBrief(prev => ({...prev, ...d}))} disabled={status === GenerationStatus.LOADING} t={t} />
          <div className="flex justify-center py-2 md:py-6">
            <button 
              onClick={handleGenerate} 
              disabled={status === GenerationStatus.LOADING}
              className={`group relative overflow-hidden w-full md:w-auto px-8 py-5 md:px-20 md:py-8 rounded-xl md:rounded-2xl font-black text-xs uppercase tracking-[0.3em] md:tracking-[0.4em] transition-all duration-700 antialiased ${
                status === GenerationStatus.LOADING ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 cursor-wait' : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_80px_-20px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              <div className="relative z-10 flex items-center justify-center">
                {status === GenerationStatus.LOADING ? (
                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>{t.briefing.generateButton.loading}</span>
                  </div>
                ) : t.briefing.generateButton.idle}
              </div>

              {status !== GenerationStatus.LOADING && (
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 rounded-2xl blur-xl opacity-0 group-hover:opacity-10 transition duration-1000"></div>
              )}
            </button>
          </div>
        </div>

        {status === GenerationStatus.SUCCESS && concepts.length > 0 && (
          <div className="space-y-10 md:space-y-16 animate-in fade-in slide-in-from-bottom-20 duration-1000 pt-10">
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
              <h2 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter antialiased">{t.results.headline}</h2>
              <div className="h-px w-full flex-grow bg-zinc-200 dark:bg-zinc-800"></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
              {concepts.map((c, i) => (
                <div key={`concept-${i}-${c.hook.substring(0, 20).replace(/\s/g, '-')}`} className={`animate-in fade-in slide-in-from-bottom-10 duration-1000 fill-mode-both`} style={{ animationDelay: `${i * 150}ms` }}>
                  <ConceptCard concept={c} index={i} t={t} />
                </div>
              ))}
            </div>
          </div>
        )}

        <HistoryList history={history} t={t} onSelect={(item) => {
          setConcepts(item.concepts);
          setBrief(item.brief);
          setActiveHistoryId(item.id);
          setStatus(GenerationStatus.SUCCESS);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }} activeId={activeHistoryId} />
      </main>

      {isProfileModalOpen && user && (
        <ProfileEditModal user={user} t={t} onClose={() => setIsProfileModalOpen(false)} onSave={handleUpdateProfile} />
      )}

      <footer className="max-w-7xl mx-auto px-6 py-12 md:py-24 border-t border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-10">
        <p className="text-[9px] md:text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.3em] antialiased text-center md:text-left">{t.company.copyright}</p>
        <div className="flex gap-8 md:gap-12">
          <button onClick={() => setIsImpressumOpen(true)} className="text-[9px] md:text-[10px] font-black text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors uppercase tracking-[0.2em] antialiased">{t.nav.impressum}</button>
          <button onClick={() => setIsPrivacyOpen(true)} className="text-[9px] md:text-[10px] font-black text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors uppercase tracking-[0.2em] antialiased">{t.nav.privacy}</button>
          {/* Admin Button */}
          <button
            onClick={() => setIsAdminOpen(true)}
            aria-label="Admin panel"
            className="text-zinc-300 dark:text-zinc-800 hover:text-purple-500 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </button>
        </div>
      </footer>
      <ImpressumModal isOpen={isImpressumOpen} t={t} onClose={() => setIsImpressumOpen(false)} />
      <PrivacyPolicyModal isOpen={isPrivacyOpen} t={t} onClose={() => setIsPrivacyOpen(false)} />
      <AdminModal isOpen={isAdminOpen} t={t} onClose={() => setIsAdminOpen(false)} />
    </div>
  );
};
export default App;
