// ============================================
// Stripe Webhook - /api/stripe/webhook
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase-server';
import type Stripe from 'stripe';

const relevantEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
]);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (!relevantEvents.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (userId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0]?.price.id;

          // Determine tier from price ID
          let tier = 'pro';
          if (priceId === process.env.STRIPE_PRICE_TEAM_MONTHLY || priceId === process.env.STRIPE_PRICE_TEAM_YEARLY) {
            tier = 'team';
          }

          await supabase
            .from('profiles')
            .update({
              stripe_customer_id: customerId,
              subscription_tier: tier,
              subscription_status: subscription.status,
              subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', userId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id;

        let tier = 'pro';
        if (priceId === process.env.STRIPE_PRICE_TEAM_MONTHLY || priceId === process.env.STRIPE_PRICE_TEAM_YEARLY) {
          tier = 'team';
        }

        await supabase
          .from('profiles')
          .update({
            subscription_tier: tier,
            subscription_status: subscription.status,
            subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled',
            subscription_period_end: null,
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await supabase
          .from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', customerId);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
