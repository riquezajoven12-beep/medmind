// ============================================
// Global State Store — Zustand
// ============================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Profile, MindMap, MindMapNode, MindMapEdge, ViewMode, AIAction, Folder } from '@/types';

// ---- Auth Store ----
interface AuthState {
  user: Profile | null;
  isLoading: boolean;
  setUser: (user: Profile | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools((set) => ({
    user: null,
    isLoading: true,
    setUser: (user) => set({ user }),
    setLoading: (isLoading) => set({ isLoading }),
  }), { name: 'auth-store' })
);

// ---- Map Editor Store ----
interface MapEditorState {
  // Current map
  currentMap: MindMap | null;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  
  // Selection
  selectedNodeId: string | null;
  selectedNodes: string[];
  
  // View
  viewMode: ViewMode;
  sidePanel: 'none' | 'ai' | 'properties' | 'media' | 'history';
  
  // Canvas
  zoom: number;
  panX: number;
  panY: number;
  
  // History
  undoStack: string[];
  redoStack: string[];
  
  // Saving
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  
  // Actions
  setCurrentMap: (map: MindMap | null) => void;
  setNodes: (nodes: MindMapNode[]) => void;
  setEdges: (edges: MindMapEdge[]) => void;
  addNode: (node: MindMapNode) => void;
  updateNode: (id: string, data: Partial<MindMapNode['data']>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setSidePanel: (panel: MapEditorState['sidePanel']) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  saveSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  markDirty: () => void;
  markSaved: () => void;
}

export const useMapStore = create<MapEditorState>()(
  devtools((set, get) => ({
    currentMap: null,
    nodes: [],
    edges: [],
    selectedNodeId: null,
    selectedNodes: [],
    viewMode: 'mindmap',
    sidePanel: 'none',
    zoom: 1,
    panX: 0,
    panY: 0,
    undoStack: [],
    redoStack: [],
    isDirty: false,
    isSaving: false,
    lastSaved: null,
    
    setCurrentMap: (map) => {
      if (map) {
        set({
          currentMap: map,
          nodes: map.canvas_data.nodes,
          edges: map.canvas_data.edges,
          zoom: map.canvas_data.viewport.zoom,
          panX: map.canvas_data.viewport.x,
          panY: map.canvas_data.viewport.y,
        });
      } else {
        set({ currentMap: null, nodes: [], edges: [] });
      }
    },
    
    setNodes: (nodes) => set({ nodes, isDirty: true }),
    setEdges: (edges) => set({ edges, isDirty: true }),
    
    addNode: (node) => {
      const { nodes, edges, selectedNodeId } = get();
      const newNodes = [...nodes, node];
      const newEdges = node.parentId
        ? [...edges, {
            id: `e-${node.parentId}-${node.id}`,
            source: node.parentId,
            target: node.id,
            type: 'smoothstep' as const,
            animated: false,
            style: { stroke: node.data.color || '#06d6a0', strokeWidth: 2 },
          }]
        : edges;
      set({ nodes: newNodes, edges: newEdges, isDirty: true });
    },
    
    updateNode: (id, data) => {
      const { nodes } = get();
      set({
        nodes: nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n),
        isDirty: true,
      });
    },
    
    deleteNode: (id) => {
      const { nodes, edges } = get();
      // Recursively find all descendants
      const toDelete = new Set<string>();
      const findDescendants = (parentId: string) => {
        toDelete.add(parentId);
        nodes.filter(n => n.parentId === parentId).forEach(n => findDescendants(n.id));
      };
      findDescendants(id);
      
      set({
        nodes: nodes.filter(n => !toDelete.has(n.id)),
        edges: edges.filter(e => !toDelete.has(e.source) && !toDelete.has(e.target)),
        selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
        isDirty: true,
      });
    },
    
    selectNode: (id) => set({ selectedNodeId: id }),
    setViewMode: (viewMode) => set({ viewMode }),
    setSidePanel: (sidePanel) => set({ sidePanel }),
    setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(3, zoom)) }),
    setPan: (panX, panY) => set({ panX, panY }),
    
    saveSnapshot: () => {
      const { nodes, edges, undoStack } = get();
      const snapshot = JSON.stringify({ nodes, edges });
      set({
        undoStack: [...undoStack.slice(-49), snapshot],
        redoStack: [],
      });
    },
    
    undo: () => {
      const { undoStack, redoStack, nodes, edges } = get();
      if (undoStack.length < 1) return;
      const current = JSON.stringify({ nodes, edges });
      const prev = JSON.parse(undoStack[undoStack.length - 1]);
      set({
        nodes: prev.nodes,
        edges: prev.edges,
        undoStack: undoStack.slice(0, -1),
        redoStack: [...redoStack, current],
        isDirty: true,
      });
    },
    
    redo: () => {
      const { undoStack, redoStack, nodes, edges } = get();
      if (redoStack.length < 1) return;
      const current = JSON.stringify({ nodes, edges });
      const next = JSON.parse(redoStack[redoStack.length - 1]);
      set({
        nodes: next.nodes,
        edges: next.edges,
        undoStack: [...undoStack, current],
        redoStack: redoStack.slice(0, -1),
        isDirty: true,
      });
    },
    
    markDirty: () => set({ isDirty: true }),
    markSaved: () => set({ isDirty: false, isSaving: false, lastSaved: new Date() }),
  }), { name: 'map-editor-store' })
);

// ---- Dashboard Store ----
interface DashboardState {
  maps: MindMap[];
  folders: Folder[];
  searchQuery: string;
  selectedFolder: string | null;
  sortBy: 'recent' | 'name' | 'created';
  isLoading: boolean;
  setMaps: (maps: MindMap[]) => void;
  setFolders: (folders: Folder[]) => void;
  setSearchQuery: (query: string) => void;
  setSelectedFolder: (folderId: string | null) => void;
  setSortBy: (sort: DashboardState['sortBy']) => void;
  setLoading: (loading: boolean) => void;
}

export const useDashboardStore = create<DashboardState>()(
  devtools((set) => ({
    maps: [],
    folders: [],
    searchQuery: '',
    selectedFolder: null,
    sortBy: 'recent',
    isLoading: true,
    setMaps: (maps) => set({ maps }),
    setFolders: (folders) => set({ folders }),
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    setSelectedFolder: (selectedFolder) => set({ selectedFolder }),
    setSortBy: (sortBy) => set({ sortBy }),
    setLoading: (isLoading) => set({ isLoading }),
  }), { name: 'dashboard-store' })
);
