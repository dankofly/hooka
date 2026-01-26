
import React, { useState, useEffect } from 'react';
import { getAdminPrompt, saveAdminPrompt, getAdminStats, verifyAdminPassword } from '../services/gemini.ts';
import { TranslationObject } from '../types.ts';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: TranslationObject;
}

interface ParameterStats {
  language?: { DE: number; EN: number };
  contentContext?: number;
  limbicType?: number;
  patternType?: number;
  repSystem?: number;
  motivation?: number;
  decisionStyle?: number;
  presupposition?: number;
  chunking?: number;
  triggerWords?: number;
  focusKeyword?: number;
}

interface AdminStats {
  userCount: number;
  generationCount: number;
  hookCount: number;
  tokenCount: number;
  premiumUsers: number;
  parameterStats: ParameterStats;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose, t }) => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [stats, setStats] = useState<AdminStats>({
    userCount: 0,
    generationCount: 0,
    hookCount: 0,
    tokenCount: 0,
    premiumUsers: 0,
    parameterStats: {}
  });
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setIsAuthenticated(false);
      setStatus('');
    }
  }, [isOpen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // SECURITY FIX: Verify password on server, never on client
      const isValid = await verifyAdminPassword(password);
      
      if (isValid) {
        setIsAuthenticated(true);
        await loadDashboardData();
      } else {
        setStatus('ACCESS DENIED. INVALID CREDENTIALS.');
        setTimeout(() => setStatus(''), 2000);
      }
    } catch (e) {
      setStatus('CONNECTION ERROR');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [p, s] = await Promise.all([
        getAdminPrompt().catch(() => ""),
        getAdminStats(password).catch(() => ({
          userCount: 0,
          generationCount: 0,
          hookCount: 0,
          tokenCount: 0,
          premiumUsers: 0,
          parameterStats: {}
        }))
      ]);
      setPrompt(p);
      setStats(s);
    } catch (e) {
      setStatus('DB CONNECTION ERROR');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setStatus('UPLOADING TO NEURAL CORE...');
    try {
      await saveAdminPrompt(password, prompt);
      setStatus('ALGORITHM SUCCESSFULLY RETRAINED.');
      setTimeout(() => setStatus(''), 2000);
    } catch (e) {
      setStatus('WRITE ERROR. CHECK LOGS.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black font-mono text-green-500 overflow-hidden">
      {/* Background Matrix Effect */}
      <div className="absolute inset-0 pointer-events-none bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAABlBMVEUAAAD///+l2Z/dAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAE0lEQVQImWP4////fwYGBgYGBgAz/wL+I0oK2QAAAABJRU5ErkJggg==')] opacity-20 bg-repeat z-0"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-900/5 to-transparent z-0 animate-pulse"></div>

      <div className="relative z-10 w-full h-full flex flex-col p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-end border-b-2 border-green-500/50 pb-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-widest text-green-500 glitch-text">
              {t.admin.title}
            </h1>
            <p className="text-xs md:text-sm text-green-800 mt-2 tracking-[0.5em] uppercase">
              {t.admin.subtitle}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-green-700 hover:text-green-400 hover:bg-green-900/20 px-4 py-2 border border-green-800 hover:border-green-500 transition-all uppercase text-xs font-bold tracking-widest"
          >
            [ {t.admin.disconnect} ]
          </button>
        </div>

        {!isAuthenticated ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="w-full max-w-md border border-green-500/30 p-8 bg-black/50 backdrop-blur-sm relative shadow-[0_0_100px_rgba(34,197,94,0.1)]">
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-green-500"></div>
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-green-500"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-green-500"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-green-500"></div>

              <h2 className="text-center text-xl font-bold mb-8 animate-pulse text-green-400">{t.admin.authReq}</h2>
              
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-green-800 text-xs tracking-[0.2em]">{t.admin.accessKey}</label>
                  <input
                    type="password"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black border-b border-green-800 focus:border-green-500 text-green-500 py-2 outline-none tracking-[0.5em] font-bold text-center text-xl placeholder-green-900 transition-all focus:bg-green-900/10"
                    placeholder="******"
                  />
                </div>
                {status && <div className="text-red-500 text-xs font-bold animate-pulse text-center">&gt;&gt; {status}</div>}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-green-900/20 border border-green-500/50 text-green-500 py-4 hover:bg-green-500 hover:text-black transition-all font-bold tracking-widest uppercase disabled:opacity-50 disabled:cursor-wait relative overflow-hidden group"
                >
                  <span className="relative z-10">{isLoading ? t.admin.decrypting : t.admin.initiate}</span>
                  <div className="absolute inset-0 bg-green-500 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-0"></div>
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden">
            {/* Left Column: Stats */}
            <div className="space-y-6 lg:col-span-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="bg-green-900/5 border border-green-500/20 p-6 relative">
                <h3 className="text-xs font-bold text-green-700 tracking-widest mb-4 border-b border-green-900/50 pb-2">{t.admin.metrics}</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-green-800 text-[10px] uppercase tracking-wider mb-1">{t.admin.users}</div>
                      <div className="text-3xl font-black text-green-400">{stats.userCount}</div>
                    </div>
                    <div>
                      <div className="text-green-800 text-[10px] uppercase tracking-wider mb-1">Premium</div>
                      <div className="text-3xl font-black text-yellow-400">{stats.premiumUsers}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-green-800 text-[10px] uppercase tracking-wider mb-1">Generierungen</div>
                    <div className="text-4xl font-black text-green-400">{stats.generationCount}</div>
                  </div>
                  <div>
                    <div className="text-green-800 text-[10px] uppercase tracking-wider mb-1">{t.admin.hooks}</div>
                    <div className="text-4xl font-black text-green-400">{stats.hookCount}</div>
                  </div>
                  <div>
                    <div className="text-green-800 text-[10px] uppercase tracking-wider mb-1">{t.admin.tokens}</div>
                    <div className="text-3xl font-black text-green-400">
                      {stats.tokenCount ? (stats.tokenCount / 1000).toFixed(1) + 'k' : '0'}
                      <span className="text-xs font-normal text-green-800 ml-2">tks</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parameter Usage Stats */}
              <div className="bg-green-900/5 border border-green-500/20 p-6 relative">
                <h3 className="text-xs font-bold text-green-700 tracking-widest mb-4 border-b border-green-900/50 pb-2">PARAMETER USAGE</h3>
                <div className="space-y-3 text-xs">
                  {/* Language Split */}
                  <div className="flex justify-between items-center">
                    <span className="text-green-600">Sprache</span>
                    <span className="text-green-400 font-mono">
                      DE: {stats.parameterStats?.language?.DE || 0} | EN: {stats.parameterStats?.language?.EN || 0}
                    </span>
                  </div>
                  {/* NLP Parameters */}
                  {[
                    { key: 'limbicType', label: 'Limbic Type' },
                    { key: 'patternType', label: 'Pattern Type' },
                    { key: 'contentContext', label: 'Content Context' },
                    { key: 'repSystem', label: 'VAK System' },
                    { key: 'motivation', label: 'Motivation' },
                    { key: 'decisionStyle', label: 'Decision Style' },
                    { key: 'presupposition', label: 'Presupposition' },
                    { key: 'chunking', label: 'Chunking' },
                    { key: 'triggerWords', label: 'Trigger Words' },
                    { key: 'focusKeyword', label: 'Focus Keyword' },
                  ].map(({ key, label }) => {
                    const value = stats.parameterStats?.[key as keyof ParameterStats] as number || 0;
                    const percentage = stats.generationCount > 0 ? Math.round((value / stats.generationCount) * 100) : 0;
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-green-600">{label}</span>
                          <span className="text-green-400 font-mono">{value} ({percentage}%)</span>
                        </div>
                        <div className="h-1 bg-green-900/50 rounded">
                          <div
                            className="h-full bg-green-500 rounded transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Prompt Editor */}
            <div className="lg:col-span-2 flex flex-col h-full overflow-hidden border border-green-500/30 bg-black relative">
              <div className="absolute top-0 left-0 bg-green-500 text-black text-[10px] font-bold px-2 py-1">{t.admin.editMode}</div>
              <div className="p-4 border-b border-green-500/20 flex justify-between items-center mt-4">
                 <label className="text-xs text-green-600 tracking-widest uppercase">
                   {t.admin.instructions}
                 </label>
                 <div className="flex gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] text-green-500">{t.admin.live}</span>
                 </div>
              </div>
              
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="flex-grow bg-black text-green-400 p-6 outline-none text-sm leading-relaxed font-mono resize-none focus:bg-green-900/5 transition-colors scrollbar-thin scrollbar-thumb-green-900 scrollbar-track-transparent"
                placeholder={t.admin.placeholder}
                spellCheck={false}
              />
              
              <div className="p-4 border-t border-green-500/30 flex justify-between items-center bg-green-900/5">
                 <div className="text-green-500 text-xs font-bold">
                   {status && <span>&gt;&gt; {status}</span>}
                 </div>
                 <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="px-8 py-3 bg-green-600 text-black font-bold tracking-widest hover:bg-green-500 disabled:opacity-50 uppercase text-xs"
                >
                  {isLoading ? t.admin.compiling : t.admin.commit}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};