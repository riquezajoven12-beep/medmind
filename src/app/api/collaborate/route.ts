// ============================================
// Collaborate API — /api/collaborate
// Manage sharing, invitations, and permissions
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

// GET — Get collaborators for a map
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get('mapId');
  if (!mapId) return NextResponse.json({ error: 'mapId required' }, { status: 400 });

  // Get map and verify ownership
  const { data: map } = await supabase
    .from('maps')
    .select('id, user_id, shared_with, is_public, share_token')
    .eq('id', mapId)
    .single();

  if (!map) return NextResponse.json({ error: 'Map not found' }, { status: 404 });

  // Must be owner or collaborator
  const isOwner = map.user_id === user.id;
  const isCollaborator = (map.shared_with || []).includes(user.id);
  if (!isOwner && !isCollaborator && !map.is_public) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Get collaborator profiles
  const collaboratorIds = map.shared_with || [];
  let collaborators: any[] = [];
  
  if (collaboratorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, specialty')
      .in('id', collaboratorIds);
    collaborators = profiles || [];
  }

  // Get owner profile
  const { data: owner } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .eq('id', map.user_id)
    .single();

  return NextResponse.json({
    owner,
    collaborators,
    isPublic: map.is_public,
    shareToken: isOwner ? map.share_token : null,
    permission: isOwner ? 'owner' : 'editor',
  });
}

// POST — Add/remove collaborator, toggle public
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { mapId, action, email, userId: targetUserId } = body;

  if (!mapId || !action) {
    return NextResponse.json({ error: 'mapId and action required' }, { status: 400 });
  }

  // Verify map ownership
  const { data: map } = await supabase
    .from('maps')
    .select('id, user_id, shared_with, is_public')
    .eq('id', mapId)
    .eq('user_id', user.id)
    .single();

  if (!map) return NextResponse.json({ error: 'Map not found or not owned by you' }, { status: 404 });

  // Check team plan for collaboration
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  if (profile?.subscription_tier !== 'team' && action !== 'toggle_public') {
    return NextResponse.json({
      error: 'Real-time collaboration requires a Team plan',
      upgrade: true,
    }, { status: 403 });
  }

  switch (action) {
    case 'invite': {
      // Find user by email
      let resolvedUserId = targetUserId;
      if (email && !resolvedUserId) {
        const { data: targetProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email.trim().toLowerCase())
          .single();

        if (!targetProfile) {
          return NextResponse.json({ error: 'User not found. They need a MedMind account.' }, { status: 404 });
        }
        resolvedUserId = targetProfile.id;
      }

      if (!resolvedUserId) {
        return NextResponse.json({ error: 'Email or userId required' }, { status: 400 });
      }

      // Don't add owner
      if (resolvedUserId === user.id) {
        return NextResponse.json({ error: 'You already own this map' }, { status: 400 });
      }

      // Add to shared_with
      const existing = map.shared_with || [];
      if (existing.includes(resolvedUserId)) {
        return NextResponse.json({ error: 'User already has access' }, { status: 400 });
      }

      const { error } = await supabase
        .from('maps')
        .update({ shared_with: [...existing, resolvedUserId] })
        .eq('id', mapId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, message: 'Collaborator added' });
    }

    case 'remove': {
      const removeId = targetUserId;
      if (!removeId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

      const existing = map.shared_with || [];
      const { error } = await supabase
        .from('maps')
        .update({ shared_with: existing.filter((id: string) => id !== removeId) })
        .eq('id', mapId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, message: 'Collaborator removed' });
    }

    case 'toggle_public': {
      const { error } = await supabase
        .from('maps')
        .update({ is_public: !map.is_public })
        .eq('id', mapId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, isPublic: !map.is_public });
    }

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}
