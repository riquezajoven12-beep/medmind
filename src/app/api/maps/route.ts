// ============================================
// Maps CRUD API — /api/maps
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

// GET — List user's maps
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get('folder');
  const search = searchParams.get('q');
  const sort = searchParams.get('sort') || 'recent';

  let query = supabase
    .from('maps')
    .select('id, title, description, cover_color, icon, tags, is_favorite, node_count, last_edited_at, created_at, folder_id')
    .eq('user_id', user.id);

  if (folderId) query = query.eq('folder_id', folderId);
  if (search) query = query.ilike('title', `%${search}%`);

  switch (sort) {
    case 'name': query = query.order('title', { ascending: true }); break;
    case 'created': query = query.order('created_at', { ascending: false }); break;
    default: query = query.order('last_edited_at', { ascending: false });
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// POST — Create new map
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check map limit for free tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, maps_created')
    .eq('id', user.id)
    .single();

  if (profile?.subscription_tier === 'free' && (profile?.maps_created || 0) >= 5) {
    return NextResponse.json({ error: 'Map limit reached. Upgrade to Pro for unlimited maps.' }, { status: 403 });
  }

  const body = await req.json();
  const { data, error } = await supabase
    .from('maps')
    .insert({
      user_id: user.id,
      title: body.title || 'Untitled Map',
      description: body.description || null,
      cover_color: body.cover_color || '#06d6a0',
      icon: body.icon || '🧠',
      canvas_data: body.canvas_data || {
        nodes: [{
          id: 'root-1',
          type: 'root',
          position: { x: 400, y: 300 },
          data: {
            title: body.title || 'Central Topic',
            content: '',
            level: 0,
            color: '#06d6a0',
            icon: null,
            collapsed: false,
            media: [],
            aiGenerated: false,
            tags: [],
            style: {},
          },
          parentId: null,
        }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      folder_id: body.folder_id || null,
      tags: body.tags || [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Increment map count
  await supabase
    .from('profiles')
    .update({ maps_created: (profile?.maps_created || 0) + 1 })
    .eq('id', user.id);

  return NextResponse.json(data);
}

// PATCH — Update map
export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'Map ID required' }, { status: 400 });

  const updateData: any = { last_edited_at: new Date().toISOString() };
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.canvas_data !== undefined) {
    updateData.canvas_data = body.canvas_data;
    updateData.node_count = body.canvas_data?.nodes?.length || 0;
  }
  if (body.is_favorite !== undefined) updateData.is_favorite = body.is_favorite;
  if (body.is_public !== undefined) updateData.is_public = body.is_public;
  if (body.tags !== undefined) updateData.tags = body.tags;
  if (body.folder_id !== undefined) updateData.folder_id = body.folder_id;
  if (body.cover_color !== undefined) updateData.cover_color = body.cover_color;
  if (body.icon !== undefined) updateData.icon = body.icon;

  const { data, error } = await supabase
    .from('maps')
    .update(updateData)
    .eq('id', body.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — Delete map
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get('id');
  if (!mapId) return NextResponse.json({ error: 'Map ID required' }, { status: 400 });

  const { error } = await supabase
    .from('maps')
    .delete()
    .eq('id', mapId)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
