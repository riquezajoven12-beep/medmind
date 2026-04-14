// ============================================
// Landing Page — MedMind Homepage
// ============================================

import Link from 'next/link';
import { PLANS } from '@/types';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-navy-950 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 grid-bg opacity-40 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[400px] bg-cyber-purple/10 rounded-full blur-[100px] pointer-events-none" />

      {/* NAV */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5 max-w-7xl mx-auto">
        <div>
          <h1 className="font-display text-2xl gradient-text">MedMind</h1>
          <p className="text-[10px] tracking-[3px] uppercase text-slate-500 -mt-1">AI Study Maps</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition px-4 py-2">
            Log in
          </Link>
          <Link href="/signup" className="text-sm bg-brand-500 hover:bg-brand-600 text-navy-950 font-semibold px-5 py-2.5 rounded-xl transition">
            Start Free →
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative z-10 text-center px-6 pt-20 pb-16 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/5 text-brand-400 text-xs font-medium mb-8 animate-fade-in">
          <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse" />
          Powered by Claude AI
        </div>
        
        <h2 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] mb-6 animate-slide-up">
          <span className="text-white">Study Medicine</span>
          <br />
          <span className="gradient-text italic">Brilliantly</span>
        </h2>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: '100ms' }}>
          AI-powered mind maps that transform how you learn. Expand topics with AI, 
          convert to presentations & documents, add images and audio — all designed 
          for medical education.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '200ms' }}>
          <Link href="/signup" className="bg-brand-500 hover:bg-brand-400 text-navy-950 font-bold text-lg px-8 py-4 rounded-2xl transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-brand-500/20">
            Start Mapping Free
          </Link>
          <Link href="#features" className="border border-slate-700 hover:border-slate-500 text-slate-300 font-medium text-lg px-8 py-4 rounded-2xl transition">
            See Features ↓
          </Link>
        </div>

        <p className="text-xs text-slate-600 mt-4">No credit card required · 14-day Pro trial</p>
      </section>

      {/* PREVIEW */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-2xl border border-slate-800 bg-navy-900/60 p-2 shadow-2xl shadow-black/40">
          <div className="rounded-xl bg-navy-950 aspect-video flex items-center justify-center border border-slate-800/50 overflow-hidden relative">
            <div className="grid-bg absolute inset-0 opacity-30" />
            <div className="relative z-10 text-center">
              <div className="text-6xl mb-4">🧠</div>
              <p className="text-slate-500 text-sm">Interactive mind map canvas</p>
              <p className="text-slate-600 text-xs mt-1">Drag, zoom, connect — with AI at every node</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <h3 className="font-display text-4xl md:text-5xl text-white mb-4">
            Everything You Need to <span className="gradient-text-purple italic">Ace Medicine</span>
          </h3>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">Built by medical professionals, powered by AI, designed for the way you actually study.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: '✨', title: 'AI-Powered Expansion', desc: 'Select any topic and let AI generate subtopics, explanations, mnemonics, and clinical pearls instantly.' },
            { icon: '🗺️', title: 'Visual Mind Maps', desc: 'Infinite canvas with drag-and-drop nodes, auto-layout, color coding, and beautiful curved connections.' },
            { icon: '📄', title: 'Multi-Format Export', desc: 'One click to convert your mind map into PDF, PowerPoint, Word documents, or high-res images.' },
            { icon: '🖼️', title: 'Rich Media', desc: 'Attach images, audio recordings, PDFs, and videos directly to nodes. AI extracts text via OCR.' },
            { icon: '❓', title: 'Quiz & Spaced Repetition', desc: 'AI generates USMLE/PLAB-style MCQs from your maps. Track scores and schedule reviews.' },
            { icon: '🔗', title: 'Smart Connections', desc: 'AI discovers relationships between medical topics across your maps — building your knowledge graph.' },
            { icon: '📱', title: 'Works Everywhere', desc: 'Responsive design works on desktop, tablet, and mobile. Your maps sync across all devices.' },
            { icon: '👥', title: 'Team Collaboration', desc: 'Share maps with study groups. Real-time collaboration with role-based access control.' },
            { icon: '🏥', title: 'Medical Templates', desc: 'Pre-built templates for Anatomy, Pharmacology, Pathology, Physiology, and more.' },
          ].map((f, i) => (
            <div key={i} className="group p-6 rounded-2xl border border-slate-800 hover:border-brand-500/40 bg-navy-900/40 hover:bg-navy-900/70 transition-all duration-300">
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{f.icon}</div>
              <h4 className="text-lg font-semibold text-white mb-2">{f.title}</h4>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI SECTION */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-3xl border border-cyber-purple/30 bg-gradient-to-br from-cyber-purple/5 to-cyber-pink/5 p-12 md:p-16">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1">
              <p className="text-cyber-purple text-sm font-mono tracking-wider mb-4">CLAUDE AI INSIDE</p>
              <h3 className="font-display text-4xl text-white mb-4">
                Your AI Study <span className="gradient-text-purple italic">Partner</span>
              </h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                MedMind uses Claude, the most capable AI, trained to understand medical concepts deeply. 
                It doesn&apos;t just generate text — it understands pathophysiology, clinical reasoning, 
                and how medical knowledge connects.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {['Expand Topics', 'Clinical Pearls', 'Mnemonics', 'Quiz Generation', 'Differentials', 'Pharmacology', 'Explain Simply', 'Find Connections'].map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="w-1.5 h-1.5 bg-cyber-purple rounded-full" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full md:w-80 shrink-0">
              <div className="rounded-2xl bg-navy-950/80 border border-slate-800 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse" />
                  <span className="text-xs text-brand-400 font-medium">AI Response</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  <strong className="text-white">Heart Failure — Key Branches:</strong>
                </p>
                <div className="mt-3 space-y-2 text-xs text-slate-400">
                  <div className="pl-3 border-l-2 border-brand-500">Systolic vs Diastolic</div>
                  <div className="pl-3 border-l-2 border-cyber-purple">NYHA Classification</div>
                  <div className="pl-3 border-l-2 border-cyber-pink">Pathophysiology (Frank-Starling)</div>
                  <div className="pl-3 border-l-2 border-cyber-amber">Pharmacotherapy (ACEI, BB, MRA)</div>
                  <div className="pl-3 border-l-2 border-cyber-blue">Investigations (BNP, Echo)</div>
                </div>
                <button className="mt-4 w-full text-xs bg-brand-500/10 text-brand-400 py-2 rounded-lg border border-brand-500/20">
                  ➕ Add All to Mind Map
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <h3 className="font-display text-4xl md:text-5xl text-white mb-4">
            Simple, <span className="gradient-text italic">Honest</span> Pricing
          </h3>
          <p className="text-slate-400 text-lg">Start free. Upgrade when you&apos;re ready.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {(['free', 'pro', 'team'] as const).map((tier) => {
            const plan = PLANS[tier];
            const isPro = tier === 'pro';
            return (
              <div key={tier} className={`rounded-2xl p-8 border transition-all ${
                isPro 
                  ? 'border-brand-500/50 bg-brand-500/5 shadow-lg shadow-brand-500/10 scale-[1.02]' 
                  : 'border-slate-800 bg-navy-900/40'
              }`}>
                {isPro && (
                  <div className="text-xs font-bold text-brand-400 tracking-wider mb-4">MOST POPULAR</div>
                )}
                <h4 className="text-2xl font-bold text-white mb-1">{plan.name}</h4>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-white">${plan.price.monthly}</span>
                  {plan.price.monthly > 0 && <span className="text-slate-500">/month</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-brand-500 mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`block text-center py-3 rounded-xl font-semibold text-sm transition ${
                    isPro
                      ? 'bg-brand-500 hover:bg-brand-400 text-navy-950'
                      : 'border border-slate-700 hover:border-slate-500 text-slate-300'
                  }`}
                >
                  {tier === 'free' ? 'Start Free' : 'Start 14-Day Trial'}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-24 text-center">
        <h3 className="font-display text-4xl md:text-5xl text-white mb-6">
          Ready to Study <span className="gradient-text italic">Smarter</span>?
        </h3>
        <p className="text-slate-400 text-lg mb-8">Join thousands of medical students already using MedMind.</p>
        <Link href="/signup" className="inline-block bg-brand-500 hover:bg-brand-400 text-navy-950 font-bold text-lg px-10 py-4 rounded-2xl transition-all hover:scale-[1.02]">
          Create Your First Mind Map →
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-slate-800/50 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h4 className="font-display text-lg gradient-text">MedMind</h4>
            <p className="text-xs text-slate-600">© 2026 MedMind. Built for medical education.</p>
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-white transition">Privacy</a>
            <a href="#" className="hover:text-white transition">Terms</a>
            <a href="#" className="hover:text-white transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
