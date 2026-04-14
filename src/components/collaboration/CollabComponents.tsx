// ============================================
// Collaboration Components
// ============================================
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Collaborator } from '@/hooks/useCollaboration';

// ---- Live Cursors Overlay ----
export function LiveCursors({ collaborators, zoom, panX, panY }: {
  collaborators: Collaborator[];
  zoom: number;
  panX: number;
  panY: number;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {collaborators.map(c => {
        if (!c.cursor) return null;
        const screenX = c.cursor.x * zoom + panX;
        const screenY = c.cursor.y * zoom + panY;
        
        return (
          <div key={c.id} className="absolute transition-all duration-100 ease-out"
            style={{ left: screenX, top: screenY }}>
            {/* Cursor SVG */}
            <svg width="20" height="24" viewBox="0 0 20 24" fill="none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
              <path d="M4 0L20 14H10L4 24V0Z" fill={c.color} />
              <path d="M4 0L20 14H10L4 24V0Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            {/* Name label */}
            <div className="absolute left-5 top-4 px-2 py-0.5 rounded-md text-[10px] font-medium text-white whitespace-nowrap shadow-lg"
              style={{ backgroundColor: c.color }}>
              {c.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Presence Bar (shows who's online) ----
export function PresenceBar({ collaborators, isConnected }: {
  collaborators: Collaborator[];
  isConnected: boolean;
}) {
  if (!isConnected && collaborators.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Connection indicator */}
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-brand-400 animate-pulse' : 'bg-slate-600'}`}
        title={isConnected ? 'Connected' : 'Disconnected'} />
      
      {/* Collaborator avatars */}
      <div className="flex -space-x-2">
        {collaborators.slice(0, 5).map(c => (
          <div key={c.id} className="relative group">
            <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold overflow-hidden"
              style={{ borderColor: c.color, backgroundColor: c.color + '20', color: c.color }}
              title={c.name}>
              {c.avatar ? (
                <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
              ) : (
                c.name[0]?.toUpperCase() || '?'
              )}
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md text-[10px] bg-navy-900 border border-slate-800 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none shadow-xl">
              {c.name}
              {c.selectedNodeId && <span className="text-slate-500 ml-1">· editing</span>}
            </div>
          </div>
        ))}
        {collaborators.length > 5 && (
          <div className="w-7 h-7 rounded-full border-2 border-slate-700 bg-navy-900 flex items-center justify-center text-[10px] text-slate-400 font-medium">
            +{collaborators.length - 5}
          </div>
        )}
      </div>

      {collaborators.length > 0 && (
        <span className="text-[10px] text-slate-600 ml-1">
          {collaborators.length} online
        </span>
      )}
    </div>
  );
}

// ---- Node Selection Indicator (shows who's editing which node) ----
export function CollabNodeIndicator({ collaborators, nodeId }: {
  collaborators: Collaborator[];
  nodeId: string;
}) {
  const editors = collaborators.filter(c => c.selectedNodeId === nodeId);
  if (editors.length === 0) return null;

  return (
    <div className="absolute -top-8 left-0 flex items-center gap-1">
      {editors.map(c => (
        <div key={c.id} className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium text-white"
          style={{ backgroundColor: c.color }}>
          {c.name.split(' ')[0]}
        </div>
      ))}
    </div>
  );
}

// ---- Share Dialog ----
export function ShareDialog({ mapId, shareToken, isOpen, onClose }: {
  mapId: string;
  shareToken: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [sharing, setSharing] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/map/shared/${shareToken}`;

  async function shareWithUser() {
    if (!email.trim()) return;
    setSharing(true);
    
    // Look up user by email
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.trim())
      .single();

    if (!targetProfile) {
      toast.error('User not found. They need a MedMind account first.');
      setSharing(false);
      return;
    }

    // Add to shared_with array
    const { error } = await supabase.rpc('add_map_collaborator', {
      p_map_id: mapId,
      p_user_id: targetProfile.id,
    });

    if (error) {
      // Fallback: update directly
      const { data: map } = await supabase.from('maps').select('shared_with').eq('id', mapId).single();
      if (map) {
        const existing = map.shared_with || [];
        if (!existing.includes(targetProfile.id)) {
          await supabase.from('maps')
            .update({ shared_with: [...existing, targetProfile.id] })
            .eq('id', mapId);
        }
      }
    }

    toast.success(`Shared with ${email}`);
    setEmail('');
    setSharing(false);
  }

  async function togglePublic() {
    const newVal = !isPublic;
    setIsPublic(newVal);
    await supabase.from('maps').update({ is_public: newVal }).eq('id', mapId);
    toast.success(newVal ? 'Map is now public' : 'Map is now private');
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard');
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-navy-900 border border-slate-800 rounded-2xl w-[480px] max-w-[90vw] shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Share Mind Map</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Invite by email */}
          <div>
            <label className="text-xs text-slate-500 mb-2 block">Invite by email</label>
            <div className="flex gap-2">
              <input value={email} onChange={e => setEmail(e.target.value)}
                placeholder="colleague@medschool.edu"
                onKeyDown={e => e.key === 'Enter' && shareWithUser()}
                className="flex-1 bg-navy-950 border border-slate-800 focus:border-brand-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition" />
              <select value={permission} onChange={e => setPermission(e.target.value as 'view' | 'edit')}
                className="bg-navy-950 border border-slate-800 rounded-xl px-3 text-sm text-slate-400 outline-none">
                <option value="view">Can view</option>
                <option value="edit">Can edit</option>
              </select>
              <button onClick={shareWithUser} disabled={sharing}
                className="bg-brand-500 hover:bg-brand-400 text-navy-950 font-semibold px-4 rounded-xl text-sm transition disabled:opacity-50">
                {sharing ? '...' : 'Invite'}
              </button>
            </div>
          </div>

          {/* Share link */}
          <div>
            <label className="text-xs text-slate-500 mb-2 block">Share link</label>
            <div className="flex gap-2">
              <input value={shareUrl} readOnly
                className="flex-1 bg-navy-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400 outline-none font-mono text-xs" />
              <button onClick={copyLink}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition">
                📋 Copy
              </button>
            </div>
          </div>

          {/* Public toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-navy-950/50">
            <div>
              <p className="text-sm text-white font-medium">Public access</p>
              <p className="text-xs text-slate-500">Anyone with the link can view</p>
            </div>
            <button onClick={togglePublic}
              className={`w-11 h-6 rounded-full relative transition ${isPublic ? 'bg-brand-500' : 'bg-slate-700'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isPublic ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {/* Team plan notice */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-violet-500/20 bg-violet-500/5">
            <span className="text-lg">👥</span>
            <div>
              <p className="text-sm text-white font-medium">Real-time collaboration</p>
              <p className="text-xs text-slate-500">
                Team plan members can edit simultaneously with live cursors, presence indicators, and instant sync.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
