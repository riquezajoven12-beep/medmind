// ============================================
// Dashboard Page
// ============================================
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { PLANS } from '@/types';
import type { MindMap, Profile, Folder } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<Profile | null>(null);
  const [maps, setMaps] = useState<MindMap[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'created'>('recent');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const loadData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { router.push('/login'); return; }

    const [profileRes, mapsRes, foldersRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', authUser.id).single(),
      fetch(`/api/maps?sort=${sortBy}${search ? `&q=${search}` : ''}${selectedFolder ? `&folder=${selectedFolder}` : ''}`).then(r => r.json()),
      supabase.from('folders').select('*').eq('user_id', authUser.id).order('sort_order'),
    ]);

    if (profileRes.data) setUser(profileRes.data as Profile);
    if (Array.isArray(mapsRes)) setMaps(mapsRes);
    if (foldersRes.data) setFolders(foldersRes.data as Folder[]);
    setLoading(false);
  }, [sortBy, search, selectedFolder]);

  useEffect(() => { loadData(); }, [loadData]);

  async function createMap() {
    const res = await fetch('/api/maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled Map' }),
    });
    const data = await res.json();
    if (data.error) {
      toast.error(data.error);
    } else {
      router.push(`/map/${data.id}`);
    }
  }

  async function deleteMap(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this map? This cannot be undone.')) return;
    await fetch(`/api/maps?id=${id}`, { method: 'DELETE' });
    setMaps(maps.filter(m => m.id !== id));
    toast.success('Map deleted');
  }

  async function toggleFavorite(map: MindMap, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch('/api/maps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: map.id, is_favorite: !map.is_favorite }),
    });
    setMaps(maps.map(m => m.id === map.id ? { ...m, is_favorite: !m.is_favorite } : m));
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data } = await supabase.from('folders').insert({
      user_id: authUser.id,
      name: newFolderName.trim(),
    }).select().single();
    if (data) setFolders([...folders, data as Folder]);
    setNewFolderName('');
    setShowNewFolder(false);
    toast.success('Folder created');
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const plan = user ? PLANS[user.subscription_tier] : PLANS.free;
  const filteredMaps = maps.filter(m =>
    !search || m.title.toLowerCase().includes(search.toLowerCase())
  );
  const favoriteMaps = filteredMaps.filter(m => m.is_favorite);
  const otherMaps = filteredMaps.filter(m => !m.is_favorite);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading your maps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-navy-900/50 border-r border-slate-800/50 flex flex-col z-50">
        <div className="p-5 border-b border-slate-800/50">
          <h1 className="font-display text-xl gradient-text">MedMind</h1>
          <p className="text-[9px] tracking-[2px] uppercase text-slate-600 -mt-0.5">AI Study Maps</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <button onClick={() => setSelectedFolder(null)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
              !selectedFolder ? 'bg-brand-500/10 text-brand-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}>
            <span>🗺</span> All Maps
            <span className="ml-auto text-xs text-slate-600">{maps.length}</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-slate-800/50 hover:text-white transition">
            <span>⭐</span> Favorites
            <span className="ml-auto text-xs text-slate-600">{favoriteMaps.length}</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-slate-800/50 hover:text-white transition">
            <span>📋</span> Templates
          </button>

          <div className="pt-4 pb-2">
            <div className="flex items-center justify-between px-3">
              <span className="text-[10px] tracking-wider uppercase text-slate-600 font-semibold">Folders</span>
              <button onClick={() => setShowNewFolder(!showNewFolder)} className="text-slate-600 hover:text-brand-400 text-lg transition">+</button>
            </div>
          </div>

          {showNewFolder && (
            <div className="px-3 flex gap-2">
              <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createFolder()}
                placeholder="Folder name..." autoFocus
                className="flex-1 bg-navy-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none" />
              <button onClick={createFolder} className="text-brand-400 text-xs font-semibold">Add</button>
            </div>
          )}

          {folders.map(folder => (
            <button key={folder.id} onClick={() => setSelectedFolder(folder.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition ${
                selectedFolder === folder.id ? 'bg-cyber-purple/10 text-cyber-purple' : 'text-slate-400 hover:bg-slate-800/50'
              }`}>
              <span>{folder.icon}</span> {folder.name}
            </button>
          ))}
        </nav>

        {/* Plan badge */}
        <div className="p-4 border-t border-slate-800/50">
          <div className={`rounded-xl p-3 border ${
            user?.subscription_tier === 'pro' ? 'border-brand-500/30 bg-brand-500/5' :
            user?.subscription_tier === 'team' ? 'border-cyber-purple/30 bg-cyber-purple/5' :
            'border-slate-800 bg-slate-800/20'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-white">{plan.name} Plan</span>
              {user?.subscription_tier === 'free' && (
                <Link href="#pricing" className="text-[10px] text-brand-400 font-semibold">Upgrade</Link>
              )}
            </div>
            <div className="text-[11px] text-slate-500">
              {plan.limits.maps === -1 ? '∞' : `${maps.length}/${plan.limits.maps}`} maps ·
              {user?.ai_queries_today || 0}/{plan.limits.aiQueries} AI/day
            </div>
          </div>
        </div>

        {/* User */}
        <div className="p-3 border-t border-slate-800/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-cyber-blue flex items-center justify-center text-xs font-bold text-navy-950">
            {user?.full_name?.[0] || user?.email?.[0] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{user?.full_name || 'User'}</div>
            <div className="text-[10px] text-slate-600 truncate">{user?.email}</div>
          </div>
          <button onClick={handleLogout} className="text-slate-600 hover:text-red-400 text-xs transition" title="Sign out">
            ⏻
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-navy-950/90 backdrop-blur-xl border-b border-slate-800/50 px-8 py-4 flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search maps..."
              className="w-full max-w-md bg-navy-900/60 border border-slate-800 focus:border-brand-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600"
            />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            className="bg-navy-900/60 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-400 outline-none">
            <option value="recent">Recently edited</option>
            <option value="name">Name A-Z</option>
            <option value="created">Date created</option>
          </select>
          <button onClick={createMap}
            className="bg-brand-500 hover:bg-brand-400 text-navy-950 font-semibold px-5 py-2.5 rounded-xl text-sm transition flex items-center gap-2">
            <span className="text-lg">+</span> New Map
          </button>
        </div>

        <div className="p-8">
          {/* Welcome */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-1">
              Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
            </h2>
            <p className="text-sm text-slate-500">
              {maps.length === 0 ? 'Create your first mind map to get started' : `You have ${maps.length} mind map${maps.length === 1 ? '' : 's'}`}
            </p>
          </div>

          {/* Favorites */}
          {favoriteMaps.length > 0 && (
            <div className="mb-10">
              <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">⭐ Favorites</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {favoriteMaps.map(map => <MapCard key={map.id} map={map} onDelete={deleteMap} onFav={toggleFavorite} onClick={() => router.push(`/map/${map.id}`)} />)}
              </div>
            </div>
          )}

          {/* All Maps */}
          {otherMaps.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-4">
                {selectedFolder ? folders.find(f => f.id === selectedFolder)?.name || 'Folder' : 'All Maps'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {otherMaps.map(map => <MapCard key={map.id} map={map} onDelete={deleteMap} onFav={toggleFavorite} onClick={() => router.push(`/map/${map.id}`)} />)}
              </div>
            </div>
          )}

          {/* Empty state */}
          {maps.length === 0 && (
            <div className="text-center py-20">
              <div className="text-6xl mb-6">🧠</div>
              <h3 className="text-xl font-semibold text-white mb-2">No mind maps yet</h3>
              <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
                Create your first AI-powered mind map and start studying smarter.
              </p>
              <button onClick={createMap}
                className="bg-brand-500 hover:bg-brand-400 text-navy-950 font-semibold px-6 py-3 rounded-xl transition">
                Create Your First Map
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ---- Map Card Component ----
function MapCard({ map, onDelete, onFav, onClick }: {
  map: MindMap;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onFav: (map: MindMap, e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  const timeAgo = getTimeAgo(map.last_edited_at);

  return (
    <div onClick={onClick}
      className="group rounded-2xl border border-slate-800 hover:border-brand-500/30 bg-navy-900/40 hover:bg-navy-900/70 transition-all duration-300 cursor-pointer overflow-hidden">
      {/* Color bar */}
      <div className="h-1.5" style={{ background: map.cover_color }} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="text-2xl">{map.icon}</div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
            <button onClick={(e) => onFav(map, e)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition ${
                map.is_favorite ? 'bg-amber-500/10 text-amber-400' : 'hover:bg-slate-800 text-slate-600'
              }`}>
              {map.is_favorite ? '⭐' : '☆'}
            </button>
            <button onClick={(e) => onDelete(map.id, e)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition">
              🗑
            </button>
          </div>
        </div>

        <h4 className="font-semibold text-white text-sm mb-1 line-clamp-1">{map.title}</h4>
        {map.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-3">{map.description}</p>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-600">
          <span>{map.node_count} nodes</span>
          <span>{timeAgo}</span>
        </div>

        {map.tags.length > 0 && (
          <div className="flex gap-1 mt-3 flex-wrap">
            {map.tags.slice(0, 3).map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-400 text-[10px]">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}
