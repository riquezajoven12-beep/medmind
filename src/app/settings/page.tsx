// ============================================
// Settings Page — Profile, Preferences, Account
// ============================================
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Profile } from '@/types';

const SPECIALTIES = [
  'General Practice', 'Internal Medicine', 'Surgery', 'Pediatrics',
  'Obstetrics & Gynecology', 'Cardiology', 'Neurology', 'Psychiatry',
  'Radiology', 'Emergency Medicine', 'Anesthesiology', 'Pathology',
  'Dermatology', 'Orthopedics', 'Ophthalmology', 'ENT',
  'Oncology', 'Nephrology', 'Pulmonology', 'Gastroenterology', 'Other',
];

const YEARS = ['Pre-clinical Year 1', 'Pre-clinical Year 2', 'Clinical Year 3', 'Clinical Year 4', 'Clinical Year 5', 'Intern / HO', 'Medical Officer', 'Registrar', 'Resident', 'Fellow', 'Specialist / Consultant', 'Attending', 'Other'];

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'account' | 'notifications'>('profile');

  // Form state
  const [form, setForm] = useState({
    full_name: '',
    specialty: '',
    institution: '',
    year_of_study: '',
    theme: 'dark' as 'dark' | 'light' | 'system',
    default_layout: 'radial' as 'radial' | 'tree' | 'horizontal',
  });

  const [passwordForm, setPasswordForm] = useState({ current: '', new_password: '', confirm: '' });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        const p = data as Profile;
        setProfile(p);
        setForm({
          full_name: p.full_name || '',
          specialty: p.specialty || '',
          institution: p.institution || '',
          year_of_study: p.year_of_study || '',
          theme: p.theme,
          default_layout: p.default_layout,
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);

    // Upload avatar if changed
    let avatarUrl = profile.avatar_url;
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop();
      const path = `${profile.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('media').upload(path, avatarFile, { upsert: true });
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
      specialty: form.specialty,
      institution: form.institution,
      year_of_study: form.year_of_study,
      theme: form.theme,
      default_layout: form.default_layout,
      avatar_url: avatarUrl,
    }).eq('id', profile.id);

    if (error) toast.error(error.message);
    else {
      toast.success('Settings saved');
      setProfile({ ...profile, ...form, avatar_url: avatarUrl });
    }
    setSaving(false);
  }

  async function changePassword() {
    if (passwordForm.new_password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm) {
      toast.error('Passwords do not match');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: passwordForm.new_password });
    if (error) toast.error(error.message);
    else {
      toast.success('Password updated');
      setPasswordForm({ current: '', new_password: '', confirm: '' });
    }
  }

  async function deleteAccount() {
    if (!confirm('Are you sure? This will permanently delete your account and all maps. This CANNOT be undone.')) return;
    if (!confirm('Final confirmation: Type DELETE to confirm')) return;
    // In production, this would call a server action that uses the admin client
    toast.error('Account deletion requires contacting support for safety');
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const storageUsedMB = ((profile?.storage_used_bytes || 0) / (1024 * 1024)).toFixed(1);
  const storageLimitMB = profile?.subscription_tier === 'team' ? 51200 : profile?.subscription_tier === 'pro' ? 5120 : 50;

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Header */}
      <header className="h-14 bg-navy-950/95 backdrop-blur-xl border-b border-slate-800/50 flex items-center px-6 z-50 sticky top-0">
        <Link href="/dashboard" className="text-slate-500 hover:text-white transition text-sm mr-4">← Dashboard</Link>
        <h1 className="font-display text-xl gradient-text">Settings</h1>
        <div className="flex-1" />
        <button onClick={saveProfile} disabled={saving}
          className="bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-navy-950 font-semibold px-5 py-2 rounded-xl text-sm transition">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar Nav */}
        <nav className="w-48 shrink-0 space-y-1">
          {([
            { id: 'profile', icon: '👤', label: 'Profile' },
            { id: 'preferences', icon: '⚙️', label: 'Preferences' },
            { id: 'account', icon: '🔒', label: 'Account' },
            { id: 'notifications', icon: '🔔', label: 'Notifications' },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition ${
                activeTab === tab.id ? 'bg-brand-500/10 text-brand-400 font-medium' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}

          <div className="pt-4 border-t border-slate-800/50 mt-4">
            <Link href="/billing" className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-slate-800/50 hover:text-white transition">
              <span>💳</span> Billing & Plan
            </Link>
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* ===== PROFILE TAB ===== */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Profile</h2>
                <p className="text-sm text-slate-500">Your personal information visible to collaborators</p>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-cyber-blue flex items-center justify-center text-2xl font-bold text-navy-950 overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      profile?.full_name?.[0] || profile?.email?.[0] || '?'
                    )}
                  </div>
                  <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-navy-900 border border-slate-700 flex items-center justify-center cursor-pointer hover:border-brand-500 transition text-xs">
                    📷
                    <input type="file" accept="image/*" className="hidden" onChange={e => setAvatarFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">{profile?.full_name || 'Set your name'}</p>
                  <p className="text-xs text-slate-500">{profile?.email}</p>
                  {avatarFile && <p className="text-xs text-brand-400 mt-1">New photo selected — save to apply</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Full Name</label>
                  <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                    className="w-full bg-navy-900/60 border border-slate-800 focus:border-brand-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Email</label>
                  <input value={profile?.email || ''} disabled
                    className="w-full bg-navy-950/50 border border-slate-800/50 rounded-xl px-4 py-3 text-sm text-slate-500 outline-none cursor-not-allowed" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Medical Specialty</label>
                  <select value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })}
                    className="w-full bg-navy-900/60 border border-slate-800 focus:border-brand-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition">
                    <option value="">Select...</option>
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Year / Level</label>
                  <select value={form.year_of_study} onChange={e => setForm({ ...form, year_of_study: e.target.value })}
                    className="w-full bg-navy-900/60 border border-slate-800 focus:border-brand-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition">
                    <option value="">Select...</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 mb-1.5 block">Institution / Hospital</label>
                  <input value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })}
                    placeholder="e.g. University of Malaya Medical Centre"
                    className="w-full bg-navy-900/60 border border-slate-800 focus:border-brand-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition" />
                </div>
              </div>

              {/* Usage Stats */}
              <div className="rounded-2xl border border-slate-800 bg-navy-900/40 p-6">
                <h3 className="text-sm font-semibold text-white mb-4">Usage</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-white">{profile?.maps_created || 0}</p>
                    <p className="text-xs text-slate-500">Maps created</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{profile?.ai_queries_today || 0}</p>
                    <p className="text-xs text-slate-500">AI queries today</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{storageUsedMB} MB</p>
                    <p className="text-xs text-slate-500">of {storageLimitMB > 1000 ? `${(storageLimitMB / 1024).toFixed(0)}GB` : `${storageLimitMB}MB`} used</p>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-navy-950 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyber-blue transition-all"
                    style={{ width: `${Math.min(100, (parseFloat(storageUsedMB) / storageLimitMB) * 100)}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* ===== PREFERENCES TAB ===== */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Preferences</h2>
                <p className="text-sm text-slate-500">Customize your MedMind experience</p>
              </div>

              {/* Theme */}
              <div>
                <label className="text-xs text-slate-500 mb-3 block">Theme</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { id: 'dark', icon: '🌙', label: 'Dark', desc: 'Easy on the eyes' },
                    { id: 'light', icon: '☀️', label: 'Light', desc: 'Classic white' },
                    { id: 'system', icon: '💻', label: 'System', desc: 'Match OS setting' },
                  ] as const).map(t => (
                    <button key={t.id} onClick={() => setForm({ ...form, theme: t.id })}
                      className={`p-4 rounded-xl border text-left transition ${
                        form.theme === t.id ? 'border-brand-500/50 bg-brand-500/5' : 'border-slate-800 hover:border-slate-600'
                      }`}>
                      <div className="text-xl mb-2">{t.icon}</div>
                      <div className="text-sm font-medium text-white">{t.label}</div>
                      <div className="text-[11px] text-slate-500">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Layout */}
              <div>
                <label className="text-xs text-slate-500 mb-3 block">Default Mind Map Layout</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { id: 'radial', icon: '🎯', label: 'Radial', desc: 'Center outward' },
                    { id: 'tree', icon: '🌳', label: 'Tree', desc: 'Top to bottom' },
                    { id: 'horizontal', icon: '➡️', label: 'Horizontal', desc: 'Left to right' },
                  ] as const).map(l => (
                    <button key={l.id} onClick={() => setForm({ ...form, default_layout: l.id })}
                      className={`p-4 rounded-xl border text-left transition ${
                        form.default_layout === l.id ? 'border-brand-500/50 bg-brand-500/5' : 'border-slate-800 hover:border-slate-600'
                      }`}>
                      <div className="text-xl mb-2">{l.icon}</div>
                      <div className="text-sm font-medium text-white">{l.label}</div>
                      <div className="text-[11px] text-slate-500">{l.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Editor Preferences */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white">Editor</h3>
                {[
                  { label: 'Auto-save maps every 5 seconds', default: true },
                  { label: 'Show minimap on canvas', default: true },
                  { label: 'Snap nodes to grid', default: false },
                  { label: 'Animate node connections', default: true },
                  { label: 'Show AI-generated badge on nodes', default: true },
                ].map((pref, i) => (
                  <label key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition">
                    <span className="text-sm text-slate-300">{pref.label}</span>
                    <div className={`w-10 h-5 rounded-full relative transition cursor-pointer ${pref.default ? 'bg-brand-500' : 'bg-slate-700'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${pref.default ? 'left-5' : 'left-0.5'}`} />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ===== ACCOUNT TAB ===== */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Account & Security</h2>
                <p className="text-sm text-slate-500">Manage your password and account settings</p>
              </div>

              {/* Change Password */}
              <div className="rounded-2xl border border-slate-800 bg-navy-900/40 p-6 space-y-4">
                <h3 className="text-sm font-semibold text-white">Change Password</h3>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">New Password</label>
                  <input type="password" value={passwordForm.new_password}
                    onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    placeholder="Min 8 characters"
                    className="w-full bg-navy-950 border border-slate-800 focus:border-brand-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Confirm New Password</label>
                  <input type="password" value={passwordForm.confirm}
                    onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    className="w-full bg-navy-950 border border-slate-800 focus:border-brand-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition" />
                </div>
                <button onClick={changePassword}
                  className="bg-brand-500 hover:bg-brand-400 text-navy-950 font-semibold px-5 py-2.5 rounded-xl text-sm transition">
                  Update Password
                </button>
              </div>

              {/* Connected Accounts */}
              <div className="rounded-2xl border border-slate-800 bg-navy-900/40 p-6 space-y-3">
                <h3 className="text-sm font-semibold text-white mb-2">Connected Accounts</h3>
                {[
                  { name: 'Google', icon: '🔵', connected: true },
                  { name: 'GitHub', icon: '⚫', connected: false },
                ].map(a => (
                  <div key={a.name} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <span>{a.icon}</span>
                      <span className="text-sm text-white">{a.name}</span>
                    </div>
                    <button className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                      a.connected ? 'border-slate-700 text-slate-500 hover:border-red-500/30 hover:text-red-400' : 'border-brand-500/30 text-brand-400 hover:bg-brand-500/5'
                    }`}>
                      {a.connected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Sessions */}
              <div className="rounded-2xl border border-slate-800 bg-navy-900/40 p-6">
                <h3 className="text-sm font-semibold text-white mb-3">Active Sessions</h3>
                <button onClick={handleLogout}
                  className="text-sm text-red-400 hover:text-red-300 transition">
                  Sign out of all sessions
                </button>
              </div>

              {/* Danger Zone */}
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 space-y-3">
                <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
                <p className="text-xs text-slate-500">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <button onClick={deleteAccount}
                  className="text-sm px-4 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition">
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {/* ===== NOTIFICATIONS TAB ===== */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Notifications</h2>
                <p className="text-sm text-slate-500">Control what emails and alerts you receive</p>
              </div>

              {[
                { category: 'Study', items: [
                  { label: 'Spaced repetition reminders', desc: 'Get reminded to review maps', default: true },
                  { label: 'Weekly study summary', desc: 'Your study activity digest', default: true },
                ]},
                { category: 'Collaboration', items: [
                  { label: 'Shared map activity', desc: 'When someone edits a shared map', default: true },
                  { label: 'Map sharing invitations', desc: 'When someone shares a map with you', default: true },
                  { label: 'Comments & mentions', desc: 'When you are mentioned in a map', default: true },
                ]},
                { category: 'Product', items: [
                  { label: 'Feature updates', desc: 'New features and improvements', default: false },
                  { label: 'Tips & tutorials', desc: 'Learn how to study more effectively', default: false },
                ]},
              ].map(group => (
                <div key={group.category} className="space-y-2">
                  <h3 className="text-sm font-semibold text-white">{group.category}</h3>
                  {group.items.map((item, i) => (
                    <label key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition">
                      <div>
                        <div className="text-sm text-slate-300">{item.label}</div>
                        <div className="text-[11px] text-slate-600">{item.desc}</div>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition cursor-pointer ${item.default ? 'bg-brand-500' : 'bg-slate-700'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${item.default ? 'left-5' : 'left-0.5'}`} />
                      </div>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
