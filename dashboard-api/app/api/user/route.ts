import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const GET = requireAuth(async (_request, user) => {
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

    const data = userData as unknown as {
      id: string;
      email: string;
      tier: string;
      stripe_customer_id: string | null;
      subscriptions?: Array<{
        status: string;
        tier: string;
        seats: number;
      }>;
      team_members?: Array<{
        team_id: string;
        role: string;
        teams: {
          id: string;
          name: string;
        };
      }>;
    };
    const subscription = data.subscriptions?.[0];
    const teamMember = data.team_members?.[0];

    return NextResponse.json({
      id: data.id,
      email: data.email,
      tier: data.tier,
      teamId: teamMember?.team_id,
      isTeamAdmin: teamMember?.role === 'admin',
      stripeCustomerId: data.stripe_customer_id,
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
