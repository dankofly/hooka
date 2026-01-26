
import React, { useState } from 'react';
import { TranslationObject, UserProfile, UserQuota } from '../types.ts';
import { db } from '../services/db.ts';

interface PricingPageProps {
  isOpen: boolean;
  onClose: () => void;
  t: TranslationObject;
  user: UserProfile | null;
  quota: UserQuota;
  onLoginRequired: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({
  isOpen,
  onClose,
  t,
  user,
  quota,
  onLoginRequired
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    if (!user) {
      onLoginRequired();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const checkoutUrl = await db.createCheckoutSession(user.id, user.email);
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        setError('Checkout konnte nicht gestartet werden. Bitte kontaktiere den Support.');
      }
    } catch (e: any) {
      console.error('Checkout error:', e);
      setError(e.message || 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  const features = {
    free: [
      t.pricing?.feature1Free || '10 Generierungen (Lifetime)',
      t.pricing?.feature2Free || '4 Hook-Varianten pro Generation',
      t.pricing?.feature3Free || 'Alle NLP-Parameter',
      t.pricing?.feature4Free || 'Brand Scanner'
    ],
    premium: [
      t.pricing?.feature1Premium || 'Unbegrenzte Generierungen',
      t.pricing?.feature2Premium || '4 Hook-Varianten pro Generation',
      t.pricing?.feature3Premium || 'Alle NLP-Parameter',
      t.pricing?.feature4Premium || 'Brand Scanner',
      t.pricing?.feature5Premium || 'Prioritäts-Support',
      t.pricing?.feature6Premium || 'Früher Zugang zu neuen Features'
    ]
  };

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
              {t.pricing?.title || 'Pricing'}
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
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-1.5 mb-4 rounded-full border border-purple-500/20 bg-purple-500/5">
              <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">
                {t.pricing?.badge || 'Simple Pricing'}
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-4">
              {t.pricing?.headline || 'Wähle deinen Plan'}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
              {t.pricing?.subheadline || 'Starte kostenlos mit 10 Generierungen. Upgrade für unbegrenzten Zugang.'}
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free Plan */}
            <div className="relative p-6 md:p-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <div className="mb-6">
                <h3 className="text-sm font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  {t.pricing?.freePlan || 'Free'}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-zinc-900 dark:text-white">€0</span>
                  <span className="text-zinc-500">{t.pricing?.forever || 'für immer'}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {features.free.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400 shrink-0 mt-0.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-center">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  {quota.usedGenerations} / {quota.limit} {t.quota.used || 'verwendet'}
                </span>
              </div>
            </div>

            {/* Premium Plan */}
            <div className="relative p-6 md:p-8 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl border border-purple-500/50 shadow-2xl shadow-purple-500/20">
              {/* Popular badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <div className="px-4 py-1 bg-white dark:bg-zinc-900 rounded-full border border-purple-500/30 shadow-lg">
                  <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                    {t.pricing?.popular || 'Beliebt'}
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-black text-purple-200 uppercase tracking-wider mb-2">
                  {t.pricing?.premiumPlan || 'Premium'}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">€10</span>
                  <span className="text-purple-200">/ {t.pricing?.month || 'Monat'}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {features.premium.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-300 shrink-0 mt-0.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span className="text-sm text-purple-100">{feature}</span>
                  </li>
                ))}
              </ul>

              {error && (
                <div className="mb-4 p-3 bg-red-500/20 rounded-lg text-red-200 text-sm text-center">
                  {error}
                </div>
              )}

              {quota.isPremium ? (
                <div className="p-4 bg-white/10 rounded-xl text-center">
                  <div className="flex items-center justify-center gap-2 text-white">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <span className="font-black uppercase tracking-wider text-sm">
                      {t.pricing?.activeSubscription || 'Aktives Abo'}
                    </span>
                  </div>
                </div>
              ) : user ? (
                <button
                  onClick={handleCheckout}
                  disabled={isLoading}
                  className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                    isLoading
                      ? 'bg-white/50 text-purple-600 cursor-wait'
                      : 'bg-white text-purple-600 hover:bg-purple-50 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Lädt...</span>
                    </div>
                  ) : (
                    t.pricing?.ctaPremium || 'Jetzt upgraden'
                  )}
                </button>
              ) : (
                <button
                  onClick={onLoginRequired}
                  className="w-full py-4 bg-white text-purple-600 rounded-xl font-black text-xs uppercase tracking-widest transition-all hover:bg-purple-50 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {t.pricing?.loginToUpgrade || 'Einloggen zum Upgraden'}
                </button>
              )}
            </div>
          </div>

          {/* FAQ / Info Section */}
          <div className="mt-16 max-w-2xl mx-auto">
            <h3 className="text-center text-sm font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-8">
              {t.pricing?.faqTitle || 'Häufige Fragen'}
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <h4 className="font-bold text-zinc-900 dark:text-white mb-2">
                  {t.pricing?.faq1Q || 'Was passiert nach den 10 Gratis-Generierungen?'}
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {t.pricing?.faq1A || 'Du kannst weiterhin alle generierten Hooks ansehen. Für neue Generierungen benötigst du ein Premium-Abo.'}
                </p>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <h4 className="font-bold text-zinc-900 dark:text-white mb-2">
                  {t.pricing?.faq2Q || 'Kann ich jederzeit kündigen?'}
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {t.pricing?.faq2A || 'Ja, du kannst dein Abo jederzeit kündigen. Es läuft dann zum Ende der Abrechnungsperiode aus.'}
                </p>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <h4 className="font-bold text-zinc-900 dark:text-white mb-2">
                  {t.pricing?.faq3Q || 'Welche Zahlungsmethoden werden akzeptiert?'}
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {t.pricing?.faq3A || 'Wir akzeptieren alle gängigen Kreditkarten über Stripe (Visa, Mastercard, American Express).'}
                </p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="mt-12 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
              {t.pricing?.questions || 'Noch Fragen?'}
            </p>
            <a
              href={`mailto:${t.quota.contactEmail}`}
              className="text-purple-600 dark:text-purple-400 font-bold hover:underline"
            >
              {t.quota.contactEmail}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
