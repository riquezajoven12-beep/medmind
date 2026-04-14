// ============================================
// Billing Page — Plan Management & Invoices
// ============================================
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { PLANS } from '@/types';
import type { Profile, SubscriptionTier } from '@/types';

export default function BillingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setProfile(data as Profile);
      setLoading(false);
    }
    load();
  }, []);

  async function handleUpgrade(tier: SubscriptionTier) {
    if (tier === 'free' || tier === profile?.subscription_tier) return;
    setUpgrading(true);

    const plan = PLANS[tier];
    const priceId = billingCycle === 'yearly' ? plan.stripePriceId.yearly : plan.stripePriceId.monthly;

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to create checkout session');
      }
    } catch (e) {
      toast.error('Something went wrong');
    }
    setUpgrading(false);
  }

  async function handleManageBilling() {
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'portal' }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error('Failed to open billing portal');
    } catch (e) {
      toast.error('Something went wrong');
    }
  }

  const currentPlan = profile ? PLANS[profile.subscription_tier] : PLANS.free;
  const isSubscribed = profile?.subscription_tier !== 'free';
  const periodEnd = profile?.subscription_period_end ? new Date(profile.subscription_period_end) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950">
      <header className="h-14 bg-navy-950/95 backdrop-blur-xl border-b border-slate-800/50 flex items-center px-6 z-50 sticky top-0">
        <Link href="/dashboard" className="text-slate-500 hover:text-white transition text-sm mr-4">← Dashboard</Link>
        <h1 className="font-display text-xl gradient-text">Billing & Plan</h1>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Current Plan Card */}
        <div className={`rounded-2xl border p-6 ${
          isSubscribed ? 'border-brand-500/30 bg-brand-500/5' : 'border-slate-800 bg-navy-900/40'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-white">{currentPlan.name} Plan</h2>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                  profile?.subscription_status === 'active' ? 'bg-brand-500/10 text-brand-400' :
                  profile?.subscription_status === 'trialing' ? 'bg-amber-500/10 text-amber-400' :
                  profile?.subscription_status === 'past_due' ? 'bg-red-500/10 text-red-400' :
                  'bg-slate-800 text-slate-500'
                }`}>
                  {profile?.subscription_status || 'active'}
                </span>
              </div>
              {isSubscribed && periodEnd && (
                <p className="text-sm text-slate-500 mt-1">
                  {profile?.subscription_status === 'trialing' ? 'Trial ends' : 'Renews'} on {periodEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
              {!isSubscribed && (
                <p className="text-sm text-slate-500 mt-1">Upgrade to unlock unlimited maps, AI queries, and exports</p>
              )}
            </div>
            {isSubscribed && (
              <button onClick={handleManageBilling}
                className="px-4 py-2 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition">
                Manage Billing →
              </button>
            )}
          </div>

          {/* Usage bars */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            {[
              {
                label: 'Maps',
                used: profile?.maps_created || 0,
                limit: currentPlan.limits.maps,
                color: 'from-brand-500 to-cyber-blue',
              },
              {
                label: 'AI Queries Today',
                used: profile?.ai_queries_today || 0,
                limit: currentPlan.limits.aiQueries,
                color: 'from-violet-500 to-pink-500',
              },
              {
                label: 'Storage',
                used: Math.round((profile?.storage_used_bytes || 0) / (1024 * 1024)),
                limit: Math.round(currentPlan.limits.storage / (1024 * 1024)),
                color: 'from-amber-400 to-orange-500',
                unit: 'MB',
              },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-800/50 bg-navy-950/40 p-4">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>{item.label}</span>
                  <span>{item.used}{item.unit ? item.unit : ''} / {item.limit === -1 ? '∞' : `${item.limit}${item.unit || ''}`}</span>
                </div>
                <div className="h-2 rounded-full bg-navy-950 overflow-hidden">
                  <div className={`h-full rounded-full bg-gradient-to-r ${item.color} transition-all`}
                    style={{ width: `${item.limit === -1 ? 5 : Math.min(100, (item.used / item.limit) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-center gap-4">
          <span className={`text-sm ${billingCycle === 'monthly' ? 'text-white font-medium' : 'text-slate-500'}`}>Monthly</span>
          <button onClick={() => setBillingCycle(b => b === 'monthly' ? 'yearly' : 'monthly')}
            className={`w-12 h-6 rounded-full relative transition ${billingCycle === 'yearly' ? 'bg-brand-500' : 'bg-slate-700'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${billingCycle === 'yearly' ? 'left-7' : 'left-1'}`} />
          </button>
          <span className={`text-sm ${billingCycle === 'yearly' ? 'text-white font-medium' : 'text-slate-500'}`}>
            Yearly <span className="text-brand-400 text-xs font-medium ml-1">Save 33%</span>
          </span>
        </div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {(['free', 'pro', 'team'] as const).map(tier => {
            const plan = PLANS[tier];
            const isCurrent = profile?.subscription_tier === tier;
            const isPro = tier === 'pro';
            const price = billingCycle === 'yearly' ? plan.price.yearly / 12 : plan.price.monthly;

            return (
              <div key={tier} className={`rounded-2xl p-8 border transition-all relative ${
                isPro ? 'border-brand-500/50 bg-brand-500/5 shadow-lg shadow-brand-500/10' :
                isCurrent ? 'border-slate-600 bg-navy-900/60' :
                'border-slate-800 bg-navy-900/40 hover:border-slate-600'
              }`}>
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-navy-950 text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full">
                    Current Plan
                  </div>
                )}

                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-white">
                    ${price.toFixed(0)}
                  </span>
                  {price > 0 && (
                    <span className="text-slate-500 text-sm">/mo</span>
                  )}
                  {billingCycle === 'yearly' && price > 0 && (
                    <span className="text-xs text-slate-600 ml-2">(${plan.price.yearly}/yr)</span>
                  )}
                </div>

                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <span className={`mt-0.5 ${isPro ? 'text-brand-400' : 'text-slate-600'}`}>✓</span>
                      <span className="text-slate-300">{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(tier)}
                  disabled={isCurrent || tier === 'free' || upgrading}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    isPro ? 'bg-brand-500 hover:bg-brand-400 text-navy-950' :
                    tier === 'team' ? 'bg-cyber-purple hover:bg-violet-500 text-white' :
                    'border border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {isCurrent ? 'Current Plan' :
                   tier === 'free' ? 'Free Forever' :
                   upgrading ? 'Redirecting...' :
                   `Upgrade to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison */}
        <div className="rounded-2xl border border-slate-800 bg-navy-900/40 overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h3 className="text-lg font-semibold text-white">Feature Comparison</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-xs text-slate-500 font-medium p-4">Feature</th>
                <th className="text-center text-xs text-slate-500 font-medium p-4">Starter</th>
                <th className="text-center text-xs text-brand-400 font-medium p-4">Pro</th>
                <th className="text-center text-xs text-violet-400 font-medium p-4">Team</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: 'Mind Maps', free: '5', pro: 'Unlimited', team: 'Unlimited' },
                { feature: 'AI Queries / Day', free: '10', pro: '100', team: '500' },
                { feature: 'Storage', free: '50 MB', pro: '5 GB', team: '50 GB' },
                { feature: 'Export PNG', free: '✓', pro: '✓', team: '✓' },
                { feature: 'Export JSON', free: '✓', pro: '✓', team: '✓' },
                { feature: 'Export PDF', free: '✗', pro: '✓', team: '✓' },
                { feature: 'Export PPTX', free: '✗', pro: '✓', team: '✓' },
                { feature: 'Export DOCX', free: '✗', pro: '✓', team: '✓' },
                { feature: 'Image OCR', free: '✗', pro: '✓', team: '✓' },
                { feature: 'Audio Transcription', free: '✗', pro: '✓', team: '✓' },
                { feature: 'Community Templates', free: '✗', pro: '✓', team: '✓' },
                { feature: 'Spaced Repetition', free: '✗', pro: '✓', team: '✓' },
                { feature: 'Real-time Collaboration', free: '✗', pro: '✗', team: '✓' },
                { feature: 'Shared Workspaces', free: '✗', pro: '✗', team: '✓' },
                { feature: 'Admin Panel', free: '✗', pro: '✗', team: '✓' },
                { feature: 'Priority Support', free: '✗', pro: '✓', team: '✓' },
              ].map((row, i) => (
                <tr key={i} className="border-b border-slate-800/50 last:border-0">
                  <td className="text-sm text-slate-300 p-4">{row.feature}</td>
                  <td className={`text-center text-sm p-4 ${row.free === '✗' ? 'text-slate-700' : 'text-slate-400'}`}>{row.free}</td>
                  <td className={`text-center text-sm p-4 ${row.pro === '✗' ? 'text-slate-700' : 'text-brand-400'}`}>{row.pro}</td>
                  <td className={`text-center text-sm p-4 ${row.team === '✗' ? 'text-slate-700' : 'text-violet-400'}`}>{row.team}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FAQ */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Frequently Asked</h3>
          {[
            { q: 'Can I cancel anytime?', a: 'Yes. Cancel from the billing portal. You keep access until the end of your billing period.' },
            { q: 'What happens to my maps if I downgrade?', a: 'Your maps are safe. You just won\'t be able to create new ones beyond the free tier limit, and premium exports will be locked.' },
            { q: 'Do you offer student discounts?', a: 'Email us at hello@medmind.app with your student ID for 40% off Pro plans.' },
            { q: 'Is there a free trial?', a: 'Yes — 14-day free trial on Pro and Team plans. No credit card required to start.' },
          ].map((faq, i) => (
            <div key={i} className="rounded-xl border border-slate-800 bg-navy-900/40 p-5">
              <h4 className="text-sm font-medium text-white mb-1">{faq.q}</h4>
              <p className="text-sm text-slate-500">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
