import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { stripe, PRICE_IDS } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const checkoutSchema = z.object({
  tier: z.enum(['pro', 'enterprise']),
  seats: z.number().min(1).optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export const POST = requireAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { tier, seats = 1, successUrl, cancelUrl } = checkoutSchema.parse(body);

    // Get or create Stripe customer
    let customerId = user.id; // Temporary, will be replaced with actual Stripe customer ID

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (userData?.stripe_customer_id) {
      customerId = userData.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });

      customerId = customer.id;

      // Update user with Stripe customer ID
      await supabaseAdmin
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Create checkout session
    const priceId = PRICE_IDS[tier];
    const quantity = tier === 'enterprise' ? seats : 1;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: user.id,
        tier,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          tier,
        },
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
});
