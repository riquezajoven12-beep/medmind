// ============================================
// Shared Map Viewer — /map/shared/[token]
// Public read-only view via share token
// ============================================
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import type { MindMapNode } from '@/types';

export default function SharedMapPage() {
  const params = useParams();
  const token = params.token as string;
  const supabase = createClient();

  const [map, setMap] = useState<any>(null);
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase.rpc('get_shared_map', { p_share_token: token });
      if (err || !data || data.length === 0) {
        setError('Map not found or no longer shared');
      } else {
        const m = data[0];
        setMap(m);
        setNodes(m.canvas_data?.nodes || []);
        // Center on first node
        if (m.canvas_data?.nodes?.length > 0) {
          const first = m.canvas_data.nodes[0];
          setPanX(window.innerWidth / 2 - first.position.x - 100);
          setPanY(window.innerHeight / 2 - first.position.y - 30);
        }
      }
      setLoading(false);
    }
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-xl font-semibold text-white mb-2">{error}</h1>
          <p className="text-sm text-slate-500 mb-6">This map may have been unshared or deleted.</p>
          <Link href="/" className="text-brand-400 text-sm hover:underline">Go to MedMind →</Link>
        </div>
      </div>
    );
  }

  const renderConnections = () => {
    return nodes.map(node => {
      if (!node.parentId) return '';
      const parent = nodes.find(n => n.id === node.parentId);
      if (!parent) return '';
      const px = parent.position.x + 100, py = parent.position.y + 30;
      const nx = node.position.x + 80, ny = node.position.y + 25;
      const cpx1 = px + (nx - px) * 0.4, cpx2 = px + (nx - px) * 0.6;
      const colors = ['#06d6a0', '#7c3aed', '#f72585', '#fbbf24'];
      const color = node.data.color || colors[Math.min(node.data.level - 1, 3)];
      return `<path d="M${px},${py} C${cpx1},${py} ${cpx2},${ny} ${nx},${ny}" fill="none" stroke="${color}" stroke-width="2" stroke-opacity="0.5"/>`;
    }).join('');
  };

  return (
    <div className="h-screen w-screen bg-navy-950 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="h-12 bg-navy-950/95 backdrop-blur-xl border-b border-slate-800/50 flex items-center px-4 shrink-0 z-50">
        <Link href="/" className="font-display text-lg gradient-text mr-4">MedMind</Link>
        <span className="text-white font-medium text-sm">{map.title}</span>
        <span className="text-xs text-slate-600 ml-3">{nodes.length} nodes · Read only</span>
        <div className="flex-1" />
        {map.owner_name && (
          <span className="text-xs text-slate-500">
            by {map.owner_name}
          </span>
        )}
        <Link href="/signup" className="ml-4 text-xs bg-brand-500 text-navy-950 font-semibold px-3 py-1.5 rounded-lg hover:bg-brand-400 transition">
          Start Free
        </Link>
      </header>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing"
        onWheel={e => {
          const delta = e.deltaY > 0 ? 0.92 : 1.08;
          setZoom(z => Math.max(0.15, Math.min(3, z * delta)));
        }}>
        <div className="absolute" style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, transformOrigin: '0 0', minWidth: 6000, minHeight: 6000 }}>
          <svg className="absolute inset-0 w-full h-full pointer-events-none" dangerouslySetInnerHTML={{ __html: renderConnections() }} />
          {nodes.map(node => {
            const levelColors = ['border-brand-500', 'border-violet-500', 'border-pink-500', 'border-amber-400'];
            return (
              <div key={node.id}
                className={`absolute rounded-2xl px-5 py-3.5 min-w-[140px] max-w-[300px] border-2 bg-navy-900/95 ${levelColors[Math.min(node.data.level, 3)]}`}
                style={{ left: node.position.x, top: node.position.y, borderColor: node.data.color || undefined }}>
                <div className={`font-semibold text-white text-sm ${node.data.level === 0 ? 'font-display text-lg' : ''}`}>
                  {node.data.title}
                </div>
                {node.data.content && <div className="text-xs text-slate-400 mt-1 leading-relaxed">{node.data.content}</div>}
                {node.data.media?.filter(m => m.type === 'image').map(m => (
                  <img key={m.id} src={m.url} alt={m.name} className="max-w-full max-h-20 rounded-lg mt-2 object-cover" />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
