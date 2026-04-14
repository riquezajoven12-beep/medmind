// ============================================
// Real-Time Collaboration Hook — Supabase Realtime
// ============================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { MindMapNode } from '@/types';

export interface Collaborator {
  id: string;
  name: string;
  avatar: string | null;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedNodeId: string | null;
  lastSeen: number;
}

interface CollabEvent {
  type: 'node_add' | 'node_update' | 'node_delete' | 'node_move' | 'cursor_move' | 'selection_change';
  userId: string;
  payload: any;
  timestamp: number;
}

const COLLABORATOR_COLORS = [
  '#06d6a0', '#00b4d8', '#7c3aed', '#f72585', '#fbbf24',
  '#ef4444', '#10b981', '#6366f1', '#ec4899', '#f97316',
];

export function useCollaboration(mapId: string, userId: string, userName: string, userAvatar: string | null) {
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [collaborators, setCollaborators] = useState<Map<string, Collaborator>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const cursorThrottle = useRef<number>(0);

  // Assign a stable color based on userId
  const myColor = COLLABORATOR_COLORS[
    userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % COLLABORATOR_COLORS.length
  ];

  // ---- Connect to channel ----
  useEffect(() => {
    const channel = supabase.channel(`map:${mapId}`, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: userId },
      },
    });

    // Presence: track who's in the map
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const collabs = new Map<string, Collaborator>();

      Object.entries(state).forEach(([key, presences]) => {
        if (key === userId) return;
        const latest = (presences as any[])[0];
        if (latest) {
          collabs.set(key, {
            id: key,
            name: latest.name || 'Anonymous',
            avatar: latest.avatar || null,
            color: latest.color || '#06d6a0',
            cursor: latest.cursor || null,
            selectedNodeId: latest.selectedNodeId || null,
            lastSeen: Date.now(),
          });
        }
      });

      setCollaborators(collabs);
    });

    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      if (key === userId) return;
      const p = newPresences[0] as any;
      setCollaborators(prev => {
        const next = new Map(prev);
        next.set(key, {
          id: key,
          name: p.name || 'Anonymous',
          avatar: p.avatar || null,
          color: p.color || '#06d6a0',
          cursor: null,
          selectedNodeId: null,
          lastSeen: Date.now(),
        });
        return next;
      });
    });

    channel.on('presence', { event: 'leave' }, ({ key }) => {
      setCollaborators(prev => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    });

    // Broadcast: receive node operations
    channel.on('broadcast', { event: 'collab' }, ({ payload }: { payload: CollabEvent }) => {
      if (payload.userId === userId) return;
      handleRemoteEvent(payload);
    });

    // Subscribe
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        await channel.track({
          name: userName,
          avatar: userAvatar,
          color: myColor,
          cursor: null,
          selectedNodeId: null,
          online_at: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [mapId, userId, userName, userAvatar]);

  // ---- Remote event handler (to be connected to store) ----
  const remoteEventHandlers = useRef<{
    onNodeAdd?: (node: MindMapNode) => void;
    onNodeUpdate?: (id: string, data: Partial<MindMapNode['data']>) => void;
    onNodeDelete?: (id: string) => void;
    onNodeMove?: (id: string, position: { x: number; y: number }) => void;
  }>({});

  function setRemoteHandlers(handlers: typeof remoteEventHandlers.current) {
    remoteEventHandlers.current = handlers;
  }

  function handleRemoteEvent(event: CollabEvent) {
    switch (event.type) {
      case 'node_add':
        remoteEventHandlers.current.onNodeAdd?.(event.payload.node);
        break;
      case 'node_update':
        remoteEventHandlers.current.onNodeUpdate?.(event.payload.id, event.payload.data);
        break;
      case 'node_delete':
        remoteEventHandlers.current.onNodeDelete?.(event.payload.id);
        break;
      case 'node_move':
        remoteEventHandlers.current.onNodeMove?.(event.payload.id, event.payload.position);
        break;
      case 'cursor_move':
        setCollaborators(prev => {
          const next = new Map(prev);
          const c = next.get(event.userId);
          if (c) next.set(event.userId, { ...c, cursor: event.payload.position, lastSeen: Date.now() });
          return next;
        });
        break;
      case 'selection_change':
        setCollaborators(prev => {
          const next = new Map(prev);
          const c = next.get(event.userId);
          if (c) next.set(event.userId, { ...c, selectedNodeId: event.payload.nodeId, lastSeen: Date.now() });
          return next;
        });
        break;
    }
  }

  // ---- Broadcast local events ----
  const broadcast = useCallback((event: Omit<CollabEvent, 'userId' | 'timestamp'>) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'collab',
      payload: { ...event, userId, timestamp: Date.now() },
    });
  }, [userId]);

  const broadcastNodeAdd = useCallback((node: MindMapNode) => {
    broadcast({ type: 'node_add', payload: { node } });
  }, [broadcast]);

  const broadcastNodeUpdate = useCallback((id: string, data: Partial<MindMapNode['data']>) => {
    broadcast({ type: 'node_update', payload: { id, data } });
  }, [broadcast]);

  const broadcastNodeDelete = useCallback((id: string) => {
    broadcast({ type: 'node_delete', payload: { id } });
  }, [broadcast]);

  const broadcastNodeMove = useCallback((id: string, position: { x: number; y: number }) => {
    broadcast({ type: 'node_move', payload: { id, position } });
  }, [broadcast]);

  const broadcastCursor = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - cursorThrottle.current < 50) return; // throttle to 20fps
    cursorThrottle.current = now;
    broadcast({ type: 'cursor_move', payload: { position: { x, y } } });
  }, [broadcast]);

  const broadcastSelection = useCallback((nodeId: string | null) => {
    broadcast({ type: 'selection_change', payload: { nodeId } });
    channelRef.current?.track({
      name: userName,
      avatar: userAvatar,
      color: myColor,
      selectedNodeId: nodeId,
      online_at: new Date().toISOString(),
    });
  }, [broadcast, userName, userAvatar, myColor]);

  return {
    collaborators: Array.from(collaborators.values()),
    isConnected,
    myColor,
    setRemoteHandlers,
    broadcastNodeAdd,
    broadcastNodeUpdate,
    broadcastNodeDelete,
    broadcastNodeMove,
    broadcastCursor,
    broadcastSelection,
  };
}
