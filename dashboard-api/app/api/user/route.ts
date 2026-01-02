import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const GET = requireAuth(async (request, user) => {
  try {
    // Get user with subscription info
    const { data: userData, error } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        subscriptions (
          status,
          tier,
          seats
        ),
        team_members (
          team_id,
          role,
          teams (
            id,
            name
          )
        )
      `)
      .eq('id', user.id)
      .single();

    if (error) throw error;

    const subscription = (userData as any).subscriptions?.[0];
    const teamMember = (userData as any).team_members?.[0];

    return NextResponse.json({
      id: userData.id,
      email: userData.email,
      tier: userData.tier,
      teamId: teamMember?.team_id,
      isTeamAdmin: teamMember?.role === 'admin',
      stripeCustomerId: userData.stripe_customer_id,
      subscriptionStatus: subscription?.status,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch user' },
      { status: 500 }
    );
  }
});
