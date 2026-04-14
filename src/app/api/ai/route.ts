// ============================================
// AI API Route — /api/ai
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { processAIRequest, checkAILimit } from '@/lib/ai';
import type { AIRequest } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile for rate limiting
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, ai_queries_today, ai_queries_reset_at')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check rate limit
    const limit = checkAILimit(profile.subscription_tier, profile.ai_queries_today);
    if (!limit.allowed) {
      return NextResponse.json({
        error: 'AI query limit reached',
        limit: limit.limit,
        remaining: 0,
        tier: profile.subscription_tier,
      }, { status: 429 });
    }

    // Parse request
    const body: AIRequest = await req.json();
    if (!body.action || !body.topic) {
      return NextResponse.json({ error: 'Missing action or topic' }, { status: 400 });
    }

    // Process AI request
    const result = await processAIRequest(body);

    // Increment usage counter
    await supabase
      .from('profiles')
      .update({ ai_queries_today: profile.ai_queries_today + 1 })
      .eq('id', user.id);

    // Log to history
    await supabase.from('ai_history').insert({
      user_id: user.id,
      map_id: body.mapId || null,
      action: body.action,
      prompt: body.customPrompt || body.topic,
      response: result.content,
      node_context: body.nodeId || null,
      tokens_used: result.tokensUsed,
      model: result.model,
    });

    return NextResponse.json({
      ...result,
      remaining: limit.remaining - 1,
    });
  } catch (error: any) {
    console.error('AI API error:', error);
    return NextResponse.json(
      { error: error.message || 'AI request failed' },
      { status: 500 }
    );
  }
}
