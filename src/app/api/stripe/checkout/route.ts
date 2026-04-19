// ============================================
// Stripe Checkout - /api/stripe/checkout
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { createCheckoutSession, getOrCreateCustomer, createCustomerPortalSession } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { priceId, action } = await req.json();
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  // Manage billing portal
  if (action === 'portal' && profile.stripe_customer_id) {
    const session = await createCustomerPortalSession(
      profile.stripe_customer_id,
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    );
    return NextResponse.json({ url: session.url });
  }

  // Create or get Stripe customer
  const customer = await getOrCreateCustomer(
    profile.email,
    user.id,
    profile.full_name || undefined
  );

  // Save customer ID
  if (!profile.stripe_customer_id) {
    await supabase.from('profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', user.id);
  }

  // Create checkout session
  const session = await createCheckoutSession({
    customerId: customer.id,
    priceId,
    userId: user.id,
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
    cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
  });

  return NextResponse.json({ url: session.url });
}
