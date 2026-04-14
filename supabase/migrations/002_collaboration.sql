-- ============================================
-- MEDMIND — Migration 002: Collaboration & Realtime
-- ============================================

-- RPC function to safely add a collaborator
CREATE OR REPLACE FUNCTION add_map_collaborator(p_map_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.maps
  SET shared_with = array_append(
    CASE WHEN shared_with IS NULL THEN '{}' ELSE shared_with END,
    p_user_id
  )
  WHERE id = p_map_id
  AND NOT (shared_with @> ARRAY[p_user_id]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to remove a collaborator
CREATE OR REPLACE FUNCTION remove_map_collaborator(p_map_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.maps
  SET shared_with = array_remove(shared_with, p_user_id)
  WHERE id = p_map_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Collaboration Activity Log
-- ============================================
CREATE TABLE IF NOT EXISTS public.collab_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id UUID NOT NULL REFERENCES public.maps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL,               -- 'joined', 'left', 'edited', 'added_node', 'deleted_node'
  details JSONB DEFAULT '{}',         -- action-specific data
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collab_activity_map ON public.collab_activity(map_id);
CREATE INDEX idx_collab_activity_user ON public.collab_activity(user_id);
CREATE INDEX idx_collab_activity_time ON public.collab_activity(created_at DESC);

ALTER TABLE public.collab_activity ENABLE ROW LEVEL SECURITY;

-- Anyone who can view the map can see activity
CREATE POLICY "Map members can view activity" ON public.collab_activity
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.maps m
      WHERE m.id = map_id
      AND (m.user_id = auth.uid() OR auth.uid() = ANY(m.shared_with) OR m.is_public = true)
    )
  );

CREATE POLICY "Users can log own activity" ON public.collab_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Map Comments (for collaboration)
-- ============================================
CREATE TABLE IF NOT EXISTS public.map_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id UUID NOT NULL REFERENCES public.maps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  node_id TEXT,                       -- optional: attached to specific node
  
  content TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  
  parent_comment_id UUID REFERENCES public.map_comments(id) ON DELETE CASCADE,  -- threading
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_map ON public.map_comments(map_id);
CREATE INDEX idx_comments_node ON public.map_comments(map_id, node_id);

ALTER TABLE public.map_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Map members can view comments" ON public.map_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.maps m
      WHERE m.id = map_id
      AND (m.user_id = auth.uid() OR auth.uid() = ANY(m.shared_with) OR m.is_public = true)
    )
  );

CREATE POLICY "Map members can create comments" ON public.map_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.maps m
      WHERE m.id = map_id
      AND (m.user_id = auth.uid() OR auth.uid() = ANY(m.shared_with))
    )
  );

CREATE POLICY "Comment owners can update" ON public.map_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Comment owners can delete" ON public.map_comments
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Shared Map View for read-only access via token
-- ============================================
CREATE OR REPLACE FUNCTION get_shared_map(p_share_token TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  canvas_data JSONB,
  node_count INTEGER,
  owner_name TEXT,
  owner_avatar TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.title,
    m.description,
    m.canvas_data,
    m.node_count,
    p.full_name AS owner_name,
    p.avatar_url AS owner_avatar,
    m.created_at
  FROM public.maps m
  JOIN public.profiles p ON m.user_id = p.id
  WHERE m.share_token = p_share_token
  AND (m.is_public = true OR m.shared_with IS NOT NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Enable Realtime for relevant tables
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.maps;
ALTER PUBLICATION supabase_realtime ADD TABLE public.map_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_activity;

-- ============================================
-- Update maps RLS to allow shared users to update
-- ============================================
CREATE POLICY "Collaborators can update shared maps" ON public.maps
  FOR UPDATE USING (auth.uid() = ANY(shared_with));

-- Grant read on shared maps  
CREATE POLICY "Collaborators can view shared maps detail" ON public.maps
  FOR SELECT USING (auth.uid() = ANY(shared_with));
