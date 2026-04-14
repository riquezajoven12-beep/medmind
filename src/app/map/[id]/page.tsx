// ============================================
// Map Editor Page — /map/[id]
// ============================================
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import type { MindMap, MindMapNode, AIAction, Profile } from '@/types';

// ===== TYPES =====
interface CanvasNode extends MindMapNode {
  width?: number;
  height?: number;
}

type SidePanel = 'none' | 'ai' | 'properties';
type ViewMode = 'mindmap' | 'document' | 'presentation';

export default function MapEditorPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const mapId = params.id as string;

  // State
  const [map, setMap] = useState<MindMap | null>(null);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('mindmap');
  const [sidePanel, setSidePanel] = useState<SidePanel>('none');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string>('');
  const [aiStructured, setAiStructured] = useState<any>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [slideIndex, setSlideIndex] = useState(0);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Canvas state
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const dragNode = useRef<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const autoSaveTimer = useRef<any>(null);

  // Load map data
  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push('/login'); return; }

      const [profileRes, mapRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', authUser.id).single(),
        supabase.from('maps').select('*').eq('id', mapId).single(),
      ]);

      if (profileRes.data) setUser(profileRes.data as Profile);
      if (mapRes.data) {
        const m = mapRes.data as MindMap;
        setMap(m);
        setNodes(m.canvas_data.nodes || []);
        if (m.canvas_data.viewport) {
          setPanX(m.canvas_data.viewport.x);
          setPanY(m.canvas_data.viewport.y);
          setZoom(m.canvas_data.viewport.zoom);
        }
        // Center on first node if no viewport saved
        if (m.canvas_data.nodes?.length > 0 && !m.canvas_data.viewport?.x) {
          const first = m.canvas_data.nodes[0];
          setPanX(window.innerWidth / 2 - first.position.x - 100);
          setPanY(window.innerHeight / 2 - first.position.y - 30);
        }
      } else {
        toast.error('Map not found');
        router.push('/dashboard');
      }
      setLoading(false);
    }
    load();
  }, [mapId]);

  // Auto-save
  const saveMap = useCallback(async (currentNodes: CanvasNode[]) => {
    if (!map) return;
    setSaving(true);
    await fetch('/api/maps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: map.id,
        canvas_data: {
          nodes: currentNodes,
          edges: [],
          viewport: { x: panX, y: panY, zoom },
        },
      }),
    });
    setSaving(false);
  }, [map, panX, panY, zoom]);

  const triggerAutoSave = useCallback((newNodes: CanvasNode[]) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => saveMap(newNodes), 2000);
  }, [saveMap]);

  // Node operations
  const addNode = useCallback((parentId: string | null, title: string, desc: string, x: number, y: number, aiGenerated = false) => {
    const level = parentId ? (nodes.find(n => n.id === parentId)?.data.level || 0) + 1 : 0;
    const colors = ['#06d6a0', '#7c3aed', '#f72585', '#fbbf24', '#00b4d8'];
    const newNode: CanvasNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: level === 0 ? 'root' : 'topic',
      position: { x, y },
      data: {
        title, content: desc, level, color: colors[level % colors.length],
        icon: null, collapsed: false, media: [], aiGenerated, tags: [],
        style: {},
      },
      parentId,
    };
    const newNodes = [...nodes, newNode];
    setNodes(newNodes);
    setSelectedId(newNode.id);
    setEditTitle(title);
    setEditDesc(desc);
    saveSnapshot(newNodes);
    triggerAutoSave(newNodes);
    return newNode;
  }, [nodes, triggerAutoSave]);

  const deleteNode = useCallback((id: string) => {
    const toDelete = new Set<string>();
    const findChildren = (pid: string) => {
      toDelete.add(pid);
      nodes.filter(n => n.parentId === pid).forEach(n => findChildren(n.id));
    };
    findChildren(id);
    const newNodes = nodes.filter(n => !toDelete.has(n.id));
    setNodes(newNodes);
    if (selectedId === id) setSelectedId(null);
    saveSnapshot(newNodes);
    triggerAutoSave(newNodes);
  }, [nodes, selectedId, triggerAutoSave]);

  const addChildToNode = useCallback((parentId: string) => {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;
    const children = nodes.filter(n => n.parentId === parentId);
    const angle = ((children.length * 50) - 60) * Math.PI / 180;
    const dist = 250 + children.length * 20;
    addNode(parentId, 'Subtopic', '', parent.position.x + Math.cos(angle) * dist, parent.position.y + Math.sin(angle) * dist);
  }, [nodes, addNode]);

  const updateNodeData = useCallback((id: string, updates: Partial<MindMapNode['data']>) => {
    const newNodes = nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n);
    setNodes(newNodes);
    triggerAutoSave(newNodes);
  }, [nodes, triggerAutoSave]);

  // Undo/Redo
  const saveSnapshot = (currentNodes: CanvasNode[]) => {
    undoStack.current.push(JSON.stringify(currentNodes));
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
  };

  const undo = () => {
    if (undoStack.current.length < 1) return;
    redoStack.current.push(JSON.stringify(nodes));
    const prev = JSON.parse(undoStack.current.pop()!);
    setNodes(prev);
    triggerAutoSave(prev);
    toast('Undone', { duration: 1000 });
  };

  const redo = () => {
    if (redoStack.current.length < 1) return;
    undoStack.current.push(JSON.stringify(nodes));
    const next = JSON.parse(redoStack.current.pop()!);
    setNodes(next);
    triggerAutoSave(next);
    toast('Redone', { duration: 1000 });
  };

  // AI Actions
  const callAI = async (action: AIAction, customPrompt?: string) => {
    const node = selectedId ? nodes.find(n => n.id === selectedId) : null;
    const topic = node?.data.title || 'General Medicine';
    setAiLoading(true);
    setAiResult('');
    setAiStructured(null);
    if (sidePanel !== 'ai') setSidePanel('ai');

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, topic, mapId, nodeId: selectedId, customPrompt }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        setAiResult(data.error);
      } else {
        setAiResult(data.content);
        setAiStructured(data.structured);
      }
    } catch (e: any) {
      toast.error('AI request failed');
      setAiResult('Request failed: ' + e.message);
    }
    setAiLoading(false);
  };

  const applyAINodes = (items: any[]) => {
    if (!selectedId) { toast.error('Select a node first'); return; }
    const parent = nodes.find(n => n.id === selectedId);
    if (!parent) return;
    const existing = nodes.filter(n => n.parentId === selectedId).length;
    items.forEach((item, i) => {
      const angle = ((existing + i) * 50 - 80) * Math.PI / 180;
      const dist = 260 + (existing + i) * 20;
      addNode(selectedId!, item.title, item.desc || item.connection || '', 
        parent.position.x + Math.cos(angle) * dist, parent.position.y + Math.sin(angle) * dist, true);
    });
    toast.success(`Added ${items.length} subtopics`);
  };

  const applyAIMap = (mapData: any) => {
    const cx = (window.innerWidth / 2 - panX) / zoom;
    const cy = (window.innerHeight / 2 - panY) / zoom;
    const root = addNode(null, mapData.title, '', cx, cy);
    (mapData.children || []).forEach((child: any, i: number) => {
      const angle = (i * (360 / (mapData.children.length || 1)) - 90) * Math.PI / 180;
      const cNode = addNode(root!.id, child.title, child.desc || '', cx + Math.cos(angle) * 300, cy + Math.sin(angle) * 300, true);
      (child.children || []).forEach((gc: any, j: number) => {
        const sa = angle + (j - 1) * 0.5;
        addNode(cNode!.id, gc.title, gc.desc || '', cNode!.position.x + Math.cos(sa) * 220, cNode!.position.y + Math.sin(sa) * 220, true);
      });
    });
    toast.success('Mind map generated!');
  };

  // Media upload
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio') => {
    if (!selectedId || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      const node = nodes.find(n => n.id === selectedId);
      if (!node) return;
      const media = [...node.data.media, {
        id: `media-${Date.now()}`, type, url: ev.target?.result as string,
        name: file.name, size: file.size,
      }];
      updateNodeData(selectedId!, { media });
      toast.success(`${type === 'image' ? '🖼' : '🎵'} ${file.name} added`);
    };
    reader.readAsDataURL(file);
  };

  // Canvas handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-inner') || (e.target as HTMLElement).tagName === 'svg') {
      isPanning.current = true;
      panStart.current = { x: e.clientX - panX, y: e.clientY - panY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning.current) {
      setPanX(e.clientX - panStart.current.x);
      setPanY(e.clientY - panStart.current.y);
    }
    if (dragNode.current) {
      const newX = (e.clientX - panX) / zoom - dragOffset.current.x;
      const newY = (e.clientY - panY) / zoom - dragOffset.current.y;
      setNodes(prev => prev.map(n => n.id === dragNode.current ? { ...n, position: { x: newX, y: newY } } : n));
    }
  };

  const handleMouseUp = () => {
    if (dragNode.current) {
      saveSnapshot(nodes);
      triggerAutoSave(nodes);
    }
    isPanning.current = false;
    dragNode.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    const newZoom = Math.max(0.15, Math.min(3, zoom * delta));
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setPanX(mx - (mx - panX) * (newZoom / zoom));
    setPanY(my - (my - panY) * (newZoom / zoom));
    setZoom(newZoom);
  };

  const handleCanvasDblClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.mind-node')) return;
    const x = (e.clientX - panX) / zoom;
    const y = (e.clientY - panY) / zoom;
    addNode(null, 'New Topic', '', x - 70, y - 25);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    dragNode.current = nodeId;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    dragOffset.current = {
      x: (e.clientX - panX) / zoom - node.position.x,
      y: (e.clientY - panY) / zoom - node.position.y,
    };
  };

  const selectNode = (id: string) => {
    setSelectedId(id);
    const node = nodes.find(n => n.id === id);
    if (node) {
      setEditTitle(node.data.title);
      setEditDesc(node.data.content);
    }
  };

  const fitToScreen = () => {
    if (!nodes.length) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.position.x); minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + 200); maxY = Math.max(maxY, n.position.y + 60);
    });
    const w = maxX - minX + 200, h = maxY - minY + 200;
    const vw = window.innerWidth - (sidePanel !== 'none' ? 380 : 0);
    const vh = window.innerHeight - 56;
    const newZoom = Math.min(vw / w, vh / h, 1.5);
    setZoom(newZoom);
    setPanX(vw / 2 - (minX + w / 2) * newZoom);
    setPanY(vh / 2 + 56 - (minY + h / 2) * newZoom);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === 'Delete' && selectedId) deleteNode(selectedId);
      if (e.key === 'Tab') { e.preventDefault(); if (selectedId) addChildToNode(selectedId); }
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveMap(nodes); toast.success('Saved'); }
      if (e.key === 'Escape') { setSelectedId(null); setSidePanel('none'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, nodes]);

  // Render connections SVG
  const renderConnections = () => {
    const paths: string[] = [];
    nodes.forEach(node => {
      if (!node.parentId) return;
      const parent = nodes.find(n => n.id === node.parentId);
      if (!parent) return;
      const px = parent.position.x + 100, py = parent.position.y + 30;
      const nx = node.position.x + 80, ny = node.position.y + 25;
      const cpx1 = px + (nx - px) * 0.4;
      const cpx2 = px + (nx - px) * 0.6;
      const colors = ['#06d6a0', '#7c3aed', '#f72585', '#fbbf24'];
      const color = node.data.color || colors[Math.min(node.data.level - 1, 3)];
      paths.push(`<path d="M${px},${py} C${cpx1},${py} ${cpx2},${ny} ${nx},${ny}" fill="none" stroke="${color}" stroke-width="2" stroke-opacity="0.5"/>`);
    });
    return paths.join('');
  };

  // Document view
  const renderDocView = () => {
    const roots = nodes.filter(n => !n.parentId);
    return (
      <div className="max-w-3xl mx-auto p-12">
        <div className="bg-navy-900/60 border border-slate-800 rounded-2xl p-12">
          {roots.map(root => (
            <div key={root.id}>
              <h1 className="font-display text-4xl gradient-text mb-6">{root.data.title}</h1>
              {root.data.content && <p className="text-slate-400 mb-4 leading-relaxed">{root.data.content}</p>}
              {root.data.media.filter(m => m.type === 'image').map(m => (
                <img key={m.id} src={m.url} alt={m.name} className="max-w-full rounded-xl mb-4" />
              ))}
              {renderDocChildren(root.id, 2)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDocChildren = (parentId: string, level: number): React.ReactNode => {
    const children = nodes.filter(n => n.parentId === parentId);
    if (!children.length) return null;
    return children.map(child => {
      const Tag = `h${Math.min(level, 4)}` as keyof JSX.IntrinsicElements;
      const colors = ['', '', 'text-violet-400', 'text-pink-400', 'text-amber-400'];
      return (
        <div key={child.id} className="mt-6">
          <Tag className={`font-semibold mb-2 ${colors[Math.min(level, 4)] || 'text-white'}`}>{child.data.title}</Tag>
          {child.data.content && <p className="text-slate-400 text-sm leading-relaxed mb-2">{child.data.content}</p>}
          {child.data.media.filter(m => m.type === 'image').map(m => (
            <img key={m.id} src={m.url} alt={m.name} className="max-w-full rounded-lg mb-3" />
          ))}
          {renderDocChildren(child.id, level + 1)}
        </div>
      );
    });
  };

  // Slides
  const buildSlides = () => {
    const slides: { title: string; items: string[]; media?: string }[] = [];
    nodes.filter(n => !n.parentId).forEach(root => {
      const children = nodes.filter(n => n.parentId === root.id);
      slides.push({ title: root.data.title, items: children.map(c => c.data.title), media: root.data.media.find(m => m.type === 'image')?.url });
      children.forEach(child => {
        const gc = nodes.filter(n => n.parentId === child.id);
        slides.push({ title: child.data.title, items: gc.length ? gc.map(g => g.data.title + (g.data.content ? ': ' + g.data.content : '')) : child.data.content ? [child.data.content] : [], media: child.data.media.find(m => m.type === 'image')?.url });
      });
    });
    return slides;
  };

  // Export
  const exportMap = async (format: string) => {
    if (format === 'json') {
      const blob = new Blob([JSON.stringify({ nodes, version: 2 }, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `${map?.title || 'mindmap'}.json`);
    } else if (format === 'markdown') {
      let md = '';
      nodes.filter(n => !n.parentId).forEach(root => {
        md += `# ${root.data.title}\n${root.data.content ? root.data.content + '\n' : ''}\n`;
        const addChildren = (pid: string, lvl: number) => {
          nodes.filter(n => n.parentId === pid).forEach(c => {
            md += `${'#'.repeat(Math.min(lvl, 6))} ${c.data.title}\n${c.data.content ? c.data.content + '\n' : ''}\n`;
            addChildren(c.id, lvl + 1);
          });
        };
        addChildren(root.id, 2);
      });
      downloadBlob(new Blob([md], { type: 'text/markdown' }), `${map?.title || 'mindmap'}.md`);
    }
    toast.success(`Exported as ${format.toUpperCase()}`);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const selectedNode = selectedId ? nodes.find(n => n.id === selectedId) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-navy-950 overflow-hidden flex flex-col">
      {/* ===== HEADER ===== */}
      <header className="h-14 bg-navy-950/95 backdrop-blur-xl border-b border-slate-800/50 flex items-center px-4 gap-2 shrink-0 z-50">
        <button onClick={() => router.push('/dashboard')} className="text-slate-500 hover:text-white transition mr-2 text-sm">← Back</button>
        
        <input value={map?.title || ''} onChange={e => { if (map) setMap({ ...map, title: e.target.value }); }}
          onBlur={() => { if (map) fetch('/api/maps', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: map.id, title: map.title }) }); }}
          className="bg-transparent border-none text-white font-semibold text-sm outline-none max-w-xs" />
        
        <span className="text-xs text-slate-700 mx-2">·</span>
        <span className="text-xs text-slate-600">{nodes.length} nodes</span>
        <span className="text-xs text-slate-700 mx-1">·</span>
        <span className="text-xs text-slate-600">{saving ? 'Saving...' : 'Saved'}</span>

        <div className="flex-1" />

        <div className="flex gap-1">
          <button onClick={() => addNode(null, 'New Topic', '', (window.innerWidth/2 - panX)/zoom, (window.innerHeight/2 - panY)/zoom)}
            className="px-3 py-1.5 text-xs rounded-lg bg-navy-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 transition">➕ Topic</button>
          <button onClick={undo} className="px-3 py-1.5 text-xs rounded-lg bg-navy-900 border border-slate-800 text-slate-400 hover:text-white transition">↩</button>
          <button onClick={redo} className="px-3 py-1.5 text-xs rounded-lg bg-navy-900 border border-slate-800 text-slate-400 hover:text-white transition">↪</button>
          <button onClick={fitToScreen} className="px-3 py-1.5 text-xs rounded-lg bg-navy-900 border border-slate-800 text-slate-400 hover:text-white transition">⊞</button>
          <button onClick={() => setSidePanel(sidePanel === 'ai' ? 'none' : 'ai')}
            className={`px-3 py-1.5 text-xs rounded-lg border transition font-medium ${sidePanel === 'ai' ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' : 'bg-gradient-to-r from-violet-600/80 to-pink-600/80 border-transparent text-white'}`}>
            ✨ AI
          </button>
        </div>

        <div className="flex bg-navy-900 rounded-lg border border-slate-800 p-0.5 ml-2">
          {(['mindmap', 'document', 'presentation'] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-xs rounded-md transition ${viewMode === mode ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
              {mode === 'mindmap' ? '🗺 Map' : mode === 'document' ? '📄 Doc' : '🎬 Slides'}
            </button>
          ))}
        </div>

        <div className="relative ml-2">
          <button onClick={() => document.getElementById('exportMenu')?.classList.toggle('hidden')}
            className="px-3 py-1.5 text-xs rounded-lg bg-brand-500 text-navy-950 font-semibold hover:bg-brand-400 transition">📤 Export</button>
          <div id="exportMenu" className="hidden absolute right-0 top-full mt-1 bg-navy-900 border border-slate-800 rounded-xl p-2 w-44 z-50 shadow-2xl">
            {['json', 'markdown'].map(f => (
              <button key={f} onClick={() => { exportMap(f); document.getElementById('exportMenu')?.classList.add('hidden'); }}
                className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
                {f === 'json' ? '💾 JSON (save/load)' : '📝 Markdown'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ===== MAIN AREA ===== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas / Views */}
        <div className="flex-1 relative">
          {viewMode === 'mindmap' && (
            <div ref={canvasRef} className="w-full h-full overflow-hidden relative cursor-grab active:cursor-grabbing"
              onMouseDown={handleCanvasMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
              onWheel={handleWheel} onDoubleClick={handleCanvasDblClick}>
              <div className="canvas-inner absolute" style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, transformOrigin: '0 0', minWidth: 6000, minHeight: 6000 }}>
                {/* Connections */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" dangerouslySetInnerHTML={{ __html: renderConnections() }} />
                
                {/* Nodes */}
                {nodes.map(node => {
                  const isSelected = node.id === selectedId;
                  const levelColors = ['border-brand-500', 'border-violet-500', 'border-pink-500', 'border-amber-400', 'border-cyan-400'];
                  return (
                    <div key={node.id}
                      className={`mind-node absolute rounded-2xl px-5 py-3.5 min-w-[140px] max-w-[300px] cursor-move transition-shadow border-2 bg-navy-900/95 ${
                        levelColors[Math.min(node.data.level, 4)]} ${isSelected ? 'selected ring-2 ring-brand-500/50' : ''}`}
                      style={{ left: node.position.x, top: node.position.y, borderColor: node.data.color || undefined, zIndex: isSelected ? 20 : 10 }}
                      onMouseDown={e => handleNodeMouseDown(e, node.id)}
                      onClick={e => { e.stopPropagation(); selectNode(node.id); }}
                      onDoubleClick={e => { e.stopPropagation(); selectNode(node.id); setSidePanel('properties'); }}>
                      
                      {/* Hover actions */}
                      <div className={`absolute -top-9 left-1/2 -translate-x-1/2 bg-navy-900 border border-slate-800 rounded-lg p-1 flex gap-0.5 z-30 ${isSelected ? 'flex' : 'hidden group-hover:flex'}`}
                        style={{ display: isSelected ? 'flex' : undefined }}>
                        <button onClick={e => { e.stopPropagation(); addChildToNode(node.id); }} className="w-6 h-6 rounded text-slate-500 hover:text-white hover:bg-slate-800 flex items-center justify-center text-xs">+</button>
                        <button onClick={e => { e.stopPropagation(); selectNode(node.id); callAI('expand'); }} className="w-6 h-6 rounded text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 flex items-center justify-center text-xs">✨</button>
                        <button onClick={e => { e.stopPropagation(); deleteNode(node.id); }} className="w-6 h-6 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center text-xs">×</button>
                      </div>

                      {/* Title */}
                      <div className={`font-semibold text-white text-sm ${node.data.level === 0 ? 'font-display text-lg' : ''}`}>
                        {node.data.aiGenerated && <span className="text-violet-400 mr-1 text-xs">✨</span>}
                        {node.data.title}
                      </div>
                      {node.data.content && <div className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-3">{node.data.content}</div>}
                      
                      {/* Media */}
                      {node.data.media.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {node.data.media.map(m => m.type === 'image' ? (
                            <img key={m.id} src={m.url} alt={m.name} className="max-w-full max-h-20 rounded-lg object-cover" />
                          ) : (
                            <audio key={m.id} controls src={m.url} className="w-full h-7 mt-1" />
                          ))}
                        </div>
                      )}

                      {/* Add child handle */}
                      <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-brand-500 text-navy-950 flex items-center justify-center text-sm font-bold cursor-pointer opacity-0 hover:opacity-100 transition z-20 border-2 border-navy-950"
                        onClick={e => { e.stopPropagation(); addChildToNode(node.id); }}>+</div>
                    </div>
                  );
                })}
              </div>

              {/* Zoom controls */}
              <div className="absolute bottom-6 right-6 flex flex-col gap-1 z-20">
                <button onClick={() => setZoom(Math.min(3, zoom * 1.2))} className="w-9 h-9 rounded-lg bg-navy-900/90 border border-slate-800 text-white flex items-center justify-center hover:bg-slate-800 transition">+</button>
                <div className="text-center text-[10px] text-slate-600 font-mono py-0.5">{Math.round(zoom * 100)}%</div>
                <button onClick={() => setZoom(Math.max(0.15, zoom / 1.2))} className="w-9 h-9 rounded-lg bg-navy-900/90 border border-slate-800 text-white flex items-center justify-center hover:bg-slate-800 transition">−</button>
              </div>

              {/* Help */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-navy-900/80 border border-slate-800/50 rounded-full px-4 py-1.5 text-[10px] text-slate-600 z-20">
                Double-click to add · Tab = child · Enter = sibling · Ctrl+S = save
              </div>
            </div>
          )}

          {viewMode === 'document' && (
            <div className="w-full h-full overflow-y-auto">{renderDocView()}</div>
          )}

          {viewMode === 'presentation' && (() => {
            const slides = buildSlides();
            const s = slides[Math.min(slideIndex, slides.length - 1)];
            return s ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-8">
                <div className="w-full max-w-4xl aspect-video bg-navy-900/60 border border-slate-800 rounded-3xl p-16 flex flex-col justify-center shadow-2xl">
                  <h1 className="font-display text-4xl gradient-text mb-6">{s.title}</h1>
                  <div className="space-y-3">
                    {s.items.map((item, i) => (
                      <div key={i} className="text-lg text-slate-300 pl-6 relative">
                        <span className="absolute left-0 text-brand-500">▸</span>{item}
                      </div>
                    ))}
                  </div>
                  {s.media && <img src={s.media} alt="" className="max-h-48 rounded-xl mt-6" />}
                </div>
                <div className="flex items-center gap-4 mt-6">
                  <button onClick={() => setSlideIndex(Math.max(0, slideIndex - 1))} className="w-10 h-10 rounded-xl bg-navy-900 border border-slate-800 text-white flex items-center justify-center hover:bg-slate-800 transition">◀</button>
                  <span className="text-sm text-slate-500 font-mono">{slideIndex + 1} / {slides.length}</span>
                  <button onClick={() => setSlideIndex(Math.min(slides.length - 1, slideIndex + 1))} className="w-10 h-10 rounded-xl bg-navy-900 border border-slate-800 text-white flex items-center justify-center hover:bg-slate-800 transition">▶</button>
                </div>
              </div>
            ) : <div className="flex items-center justify-center h-full text-slate-600">No slides to display</div>;
          })()}
        </div>

        {/* ===== AI PANEL ===== */}
        {sidePanel === 'ai' && (
          <aside className="w-[380px] border-l border-slate-800/50 bg-navy-900/40 flex flex-col shrink-0 z-40">
            <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
              <h3 className="font-display text-lg gradient-text-purple">✨ AI Assistant</h3>
              <button onClick={() => setSidePanel('none')} className="text-slate-600 hover:text-white transition text-sm">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-2">Quick Actions {selectedNode ? `• ${selectedNode.data.title}` : '(select a node)'}</p>
              {([
                { action: 'expand' as AIAction, icon: '🧠', label: 'Expand Topic', desc: 'Generate subtopics' },
                { action: 'explain' as AIAction, icon: '📖', label: 'Explain', desc: 'Detailed explanation' },
                { action: 'quiz' as AIAction, icon: '❓', label: 'Quiz Me', desc: 'MCQ questions' },
                { action: 'mnemonic' as AIAction, icon: '🔑', label: 'Mnemonic', desc: 'Memory aids' },
                { action: 'clinical' as AIAction, icon: '🏥', label: 'Clinical Pearls', desc: 'Key clinical points' },
                { action: 'differential' as AIAction, icon: '🔬', label: 'Differentials', desc: 'DDx framework' },
                { action: 'pharmacology' as AIAction, icon: '💊', label: 'Pharmacology', desc: 'Drug details' },
                { action: 'connections' as AIAction, icon: '🔗', label: 'Connections', desc: 'Related topics' },
                { action: 'simplify' as AIAction, icon: '✂️', label: 'Simplify', desc: 'Break it down' },
                { action: 'mindmap' as AIAction, icon: '🗺️', label: 'Full Map', desc: 'Generate entire map' },
              ]).map(item => (
                <button key={item.action} onClick={() => callAI(item.action)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-navy-950/60 border border-slate-800 hover:border-violet-500/30 hover:bg-violet-500/5 transition text-left">
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-white">{item.label}</div>
                    <div className="text-[11px] text-slate-500">{item.desc}</div>
                  </div>
                </button>
              ))}

              {/* AI Result */}
              {aiLoading && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-navy-950/60 border border-slate-800">
                  <div className="w-5 h-5 border-2 border-slate-700 border-t-violet-500 rounded-full animate-spin" />
                  <span className="text-sm text-slate-500">AI is thinking...</span>
                </div>
              )}

              {aiResult && !aiLoading && (
                <div className="p-4 rounded-xl bg-navy-950/60 border border-slate-800">
                  {aiStructured && Array.isArray(aiStructured) && (
                    <>
                      <p className="text-xs text-slate-500 mb-2">Generated {aiStructured.length} items:</p>
                      <div className="space-y-1 mb-3">
                        {aiStructured.map((item: any, i: number) => (
                          <div key={i} className="text-xs text-slate-300">
                            <strong className="text-white">{item.title || item.diagnosis}</strong>
                            {(item.desc || item.connection || item.key_features) && ` — ${item.desc || item.connection || item.key_features}`}
                          </div>
                        ))}
                      </div>
                      <button onClick={() => applyAINodes(aiStructured)}
                        className="w-full py-2 bg-brand-500 text-navy-950 font-semibold rounded-lg text-xs hover:bg-brand-400 transition">
                        ➕ Add All to Map
                      </button>
                    </>
                  )}
                  {aiStructured && !Array.isArray(aiStructured) && aiStructured.children && (
                    <>
                      <p className="text-xs text-slate-500 mb-2">Generated map: {aiStructured.title}</p>
                      <button onClick={() => applyAIMap(aiStructured)}
                        className="w-full py-2 bg-brand-500 text-navy-950 font-semibold rounded-lg text-xs hover:bg-brand-400 transition">
                        🗺 Build Mind Map
                      </button>
                    </>
                  )}
                  {aiStructured?.questions && (
                    <div className="space-y-3">
                      {aiStructured.questions.map((q: any, i: number) => (
                        <div key={i} className="text-xs">
                          <p className="text-white font-medium mb-1">Q{i+1}: {q.question}</p>
                          {q.options?.map((o: string, j: number) => (
                            <p key={j} className={`pl-3 ${j === q.correctIndex ? 'text-brand-400 font-medium' : 'text-slate-500'}`}>{o}</p>
                          ))}
                          {q.explanation && <p className="text-slate-600 mt-1 italic">{q.explanation}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  {!aiStructured && (
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{aiResult}</pre>
                  )}
                </div>
              )}
            </div>

            {/* Custom prompt */}
            <div className="p-4 border-t border-slate-800/50 flex gap-2">
              <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                placeholder="Ask anything about medicine..."
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); callAI('custom', aiPrompt); setAiPrompt(''); } }}
                className="flex-1 bg-navy-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none resize-none focus:border-violet-500/50 transition" rows={2} />
              <button onClick={() => { callAI('custom', aiPrompt); setAiPrompt(''); }}
                className="w-10 bg-gradient-to-r from-violet-600 to-pink-600 rounded-xl text-white flex items-center justify-center hover:opacity-90 transition text-sm">→</button>
            </div>
          </aside>
        )}

        {/* ===== PROPERTIES PANEL ===== */}
        {sidePanel === 'properties' && selectedNode && (
          <aside className="w-[320px] border-l border-slate-800/50 bg-navy-900/40 flex flex-col shrink-0 z-40">
            <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Node Properties</h3>
              <button onClick={() => setSidePanel('none')} className="text-slate-600 hover:text-white transition text-sm">✕</button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-[10px] text-slate-600 uppercase tracking-wider block mb-1">Title</label>
                <input value={editTitle} onChange={e => { setEditTitle(e.target.value); updateNodeData(selectedId!, { title: e.target.value }); }}
                  className="w-full bg-navy-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-500/50" />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 uppercase tracking-wider block mb-1">Notes</label>
                <textarea value={editDesc} onChange={e => { setEditDesc(e.target.value); updateNodeData(selectedId!, { content: e.target.value }); }}
                  className="w-full bg-navy-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white outline-none resize-none focus:border-brand-500/50" rows={4} />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 uppercase tracking-wider block mb-2">Attachments</label>
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-800 hover:border-cyan-500/30 cursor-pointer text-xs text-slate-500 hover:text-cyan-400 transition">
                    🖼 Image <input type="file" accept="image/*" onChange={e => handleMediaUpload(e, 'image')} className="hidden" />
                  </label>
                  <label className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-800 hover:border-cyan-500/30 cursor-pointer text-xs text-slate-500 hover:text-cyan-400 transition">
                    🎵 Audio <input type="file" accept="audio/*" onChange={e => handleMediaUpload(e, 'audio')} className="hidden" />
                  </label>
                </div>
                {selectedNode.data.media.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {selectedNode.data.media.map(m => (
                      <div key={m.id} className="flex items-center gap-2 text-xs text-slate-400 p-2 rounded-lg bg-navy-950/50 border border-slate-800/50">
                        <span>{m.type === 'image' ? '🖼' : '🎵'}</span>
                        <span className="truncate flex-1">{m.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
