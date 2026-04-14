-- ============================================
-- MEDMIND — Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- 1. USER PROFILES
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  specialty TEXT,                    -- e.g. 'Cardiology', 'General Practice'
  institution TEXT,                  -- med school or hospital
  year_of_study TEXT,                -- 'Year 1', 'Year 2', 'Resident', 'Attending'
  
  -- Subscription
  stripe_customer_id TEXT UNIQUE,
  subscription_tier TEXT NOT NULL DEFAULT 'free' 
    CHECK (subscription_tier IN ('free', 'pro', 'team')),
  subscription_status TEXT DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid')),
  subscription_period_end TIMESTAMPTZ,
  
  -- Usage tracking
  maps_created INTEGER DEFAULT 0,
  ai_queries_today INTEGER DEFAULT 0,
  ai_queries_reset_at DATE DEFAULT CURRENT_DATE,
  storage_used_bytes BIGINT DEFAULT 0,
  
  -- Preferences
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
  default_layout TEXT DEFAULT 'radial' CHECK (default_layout IN ('radial', 'tree', 'horizontal')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. MIND MAPS
-- ============================================
CREATE TABLE public.maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL DEFAULT 'Untitled Map',
  description TEXT,
  cover_color TEXT DEFAULT '#06d6a0',
  icon TEXT DEFAULT '🧠',
  
  -- Map data stored as JSONB for flexibility
  -- Structure: { nodes: [...], edges: [...], viewport: {...} }
  canvas_data JSONB DEFAULT '{"nodes":[],"edges":[],"viewport":{"x":0,"y":0,"zoom":1}}'::jsonb,
  
  -- Organization
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  is_template BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  
  -- Collaboration
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  shared_with UUID[] DEFAULT '{}',
  
  -- Metadata
  node_count INTEGER DEFAULT 0,
  last_edited_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. FOLDERS (for organizing maps)
-- ============================================
CREATE TABLE public.folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#7c3aed',
  icon TEXT DEFAULT '📁',
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add the foreign key to maps after folders exists
-- (already defined above with REFERENCES)

-- ============================================
-- 4. MAP NODES (for search & AI indexing)
-- ============================================
CREATE TABLE public.map_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id UUID NOT NULL REFERENCES public.maps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  node_id TEXT NOT NULL,          -- client-side node ID
  parent_node_id TEXT,            -- parent node reference
  
  title TEXT NOT NULL,
  content TEXT,                   -- description / notes
  level INTEGER DEFAULT 0,
  
  -- Media attachments
  media JSONB DEFAULT '[]'::jsonb,  -- [{type, url, name, size}]
  
  -- AI-generated metadata
  ai_summary TEXT,
  ai_tags TEXT[] DEFAULT '{}',
  
  -- Search
  search_vector TSVECTOR,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. MEDIA ATTACHMENTS
-- ============================================
CREATE TABLE public.media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  map_id UUID REFERENCES public.maps(id) ON DELETE CASCADE,
  
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,         -- 'image', 'audio', 'pdf', 'video'
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,      -- Supabase storage path
  public_url TEXT,
  
  -- Image-specific
  width INTEGER,
  height INTEGER,
  thumbnail_url TEXT,
  
  -- AI-extracted data
  ai_description TEXT,             -- AI-generated image description
  ocr_text TEXT,                   -- OCR from images/PDFs
  transcription TEXT,              -- Audio transcription
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. AI CONVERSATION HISTORY
-- ============================================
CREATE TABLE public.ai_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  map_id UUID REFERENCES public.maps(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL,            -- 'expand', 'explain', 'quiz', 'mnemonic', etc.
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  node_context TEXT,               -- which node was selected
  
  tokens_used INTEGER DEFAULT 0,
  model TEXT DEFAULT 'claude-sonnet-4-20250514',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. TEMPLATES (community + official)
-- ============================================
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,          -- 'anatomy', 'pharmacology', 'pathology', etc.
  specialty TEXT,
  
  canvas_data JSONB NOT NULL,
  preview_url TEXT,
  
  is_official BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  rating FLOAT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. STUDY SESSIONS (spaced repetition)
-- ============================================
CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  map_id UUID NOT NULL REFERENCES public.maps(id) ON DELETE CASCADE,
  
  quiz_data JSONB NOT NULL,        -- questions, answers, scores
  score FLOAT,
  duration_seconds INTEGER,
  nodes_reviewed INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_maps_user ON public.maps(user_id);
CREATE INDEX idx_maps_folder ON public.maps(folder_id);
CREATE INDEX idx_maps_tags ON public.maps USING GIN(tags);
CREATE INDEX idx_maps_updated ON public.maps(last_edited_at DESC);
CREATE INDEX idx_maps_public ON public.maps(is_public) WHERE is_public = true;
CREATE INDEX idx_maps_share_token ON public.maps(share_token);

CREATE INDEX idx_map_nodes_map ON public.map_nodes(map_id);
CREATE INDEX idx_map_nodes_search ON public.map_nodes USING GIN(search_vector);

CREATE INDEX idx_media_user ON public.media(user_id);
CREATE INDEX idx_media_map ON public.media(map_id);

CREATE INDEX idx_folders_user ON public.folders(user_id);
CREATE INDEX idx_folders_parent ON public.folders(parent_id);

CREATE INDEX idx_ai_history_user ON public.ai_history(user_id);
CREATE INDEX idx_ai_history_map ON public.ai_history(map_id);

CREATE INDEX idx_templates_category ON public.templates(category);
CREATE INDEX idx_templates_official ON public.templates(is_official);

-- ============================================
-- SEARCH VECTOR TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_node_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_node_search_vector
  BEFORE INSERT OR UPDATE OF title, content
  ON public.map_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_node_search_vector();

-- ============================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_maps_updated
  BEFORE UPDATE ON public.maps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- AI RATE LIMITING RESET
-- ============================================
CREATE OR REPLACE FUNCTION reset_ai_queries()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ai_queries_reset_at < CURRENT_DATE THEN
    NEW.ai_queries_today := 0;
    NEW.ai_queries_reset_at := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reset_ai_queries
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION reset_ai_queries();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Maps: owner access + shared + public
CREATE POLICY "Users can CRUD own maps" ON public.maps FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view shared maps" ON public.maps FOR SELECT USING (
  is_public = true OR auth.uid() = ANY(shared_with)
);

-- Folders: owner only
CREATE POLICY "Users can CRUD own folders" ON public.folders FOR ALL USING (auth.uid() = user_id);

-- Map nodes: through map ownership
CREATE POLICY "Users can CRUD own nodes" ON public.map_nodes FOR ALL USING (auth.uid() = user_id);

-- Media: owner only
CREATE POLICY "Users can CRUD own media" ON public.media FOR ALL USING (auth.uid() = user_id);

-- AI history: owner only
CREATE POLICY "Users can view own AI history" ON public.ai_history FOR ALL USING (auth.uid() = user_id);

-- Templates: anyone can read, creators can manage
CREATE POLICY "Anyone can view templates" ON public.templates FOR SELECT USING (true);
CREATE POLICY "Creators can manage templates" ON public.templates FOR ALL USING (auth.uid() = creator_id);

-- Study sessions: owner only
CREATE POLICY "Users can CRUD own sessions" ON public.study_sessions FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
        'application/pdf',
        'video/mp4', 'video/webm']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own media" ON storage.objects
  FOR SELECT USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own media" ON storage.objects
  FOR DELETE USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public media is viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

-- ============================================
-- SUBSCRIPTION TIER LIMITS (reference)
-- ============================================
-- Free:  5 maps, 10 AI queries/day, 50MB storage, no export to PDF
-- Pro:   unlimited maps, 100 AI queries/day, 5GB storage, all exports, templates
-- Team:  everything in Pro + collaboration, shared workspaces, admin panel
COMMENT ON TABLE public.profiles IS 'Free: 5 maps, 10 AI/day, 50MB | Pro: unlimited, 100 AI/day, 5GB | Team: Pro + collab';
