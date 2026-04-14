// ============================================
// Signup Page
// ============================================
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({ name: '', email: '', password: '', specialty: '' });
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.name, specialty: form.specialty },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success('Check your email to confirm your account!');
      router.push('/login');
    }
  }

  async function handleOAuth(provider: 'google' | 'github') {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-6 relative">
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-cyber-purple/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="block text-center mb-10">
          <h1 className="font-display text-3xl gradient-text">MedMind</h1>
          <p className="text-[10px] tracking-[3px] uppercase text-slate-500 mt-0.5">AI Study Maps</p>
        </Link>

        <div className="rounded-2xl border border-slate-800 bg-navy-900/60 p-8">
          <h2 className="text-xl font-semibold text-white mb-1">Create your account</h2>
          <p className="text-sm text-slate-500 mb-6">Start studying smarter today</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button onClick={() => handleOAuth('google')} className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-sm text-slate-300 transition">
              Google
            </button>
            <button onClick={() => handleOAuth('github')} className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-sm text-slate-300 transition">
              GitHub
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-xs text-slate-600">or with email</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Full Name</label>
              <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full bg-navy-950 border border-slate-700 focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition"
                placeholder="Dr. Jane Smith" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Email</label>
              <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full bg-navy-950 border border-slate-700 focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition"
                placeholder="you@medschool.edu" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Password</label>
              <input type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                className="w-full bg-navy-950 border border-slate-700 focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition"
                placeholder="Min 8 characters" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Medical Specialty (optional)</label>
              <select value={form.specialty} onChange={e => setForm({...form, specialty: e.target.value})}
                className="w-full bg-navy-950 border border-slate-700 focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition">
                <option value="">Select specialty...</option>
                {['General Practice', 'Internal Medicine', 'Surgery', 'Pediatrics', 'Obstetrics & Gynecology', 'Cardiology', 'Neurology', 'Psychiatry', 'Radiology', 'Emergency Medicine', 'Anesthesiology', 'Pathology', 'Dermatology', 'Orthopedics', 'Other'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-navy-950 font-semibold py-3 rounded-xl transition text-sm">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-[11px] text-slate-600 mt-4 text-center">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-500 hover:text-brand-400 transition font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
