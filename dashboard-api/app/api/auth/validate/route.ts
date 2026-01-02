import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hashApiKey } from '@/lib/auth';
import { z } from 'zod';

const validateSchema = z.object({
  apiKey: z.string().startsWith('grid_'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = validateSchema.parse(body);

    const apiKeyHash = hashApiKey(apiKey);

    // Look up user by API key hash
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        tier,
        stripe_customer_id,
        team_members (
          team_id,
          role,
          teams (
            id,
            name
          )
        )
      `)
      .eq('api_key_hash', apiKeyHash)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid API key' },
        { status: 401 }
      );
    }

    const userData = user as unknown as {
      id: string;
      email: string;
      tier: string;
      stripe_customer_id: string | null;
      team_members?: Array<{
        team_id: string;
        role: string;
        teams: {
          id: string;
          name: string;
        };
      }>;
    };
    const teamMember = userData.team_members?.[0];

    return NextResponse.json({
      id: userData.id,
      email: userData.email,
      tier: userData.tier,
      teamId: teamMember?.team_id,
      isTeamAdmin: teamMember?.role === 'admin',
      stripeCustomerId: userData.stripe_customer_id,
    });
  } catch (error) {
    console.error('Validate error:', error);
    return NextResponse.json(
      { error: 'Bad Request', message: 'Invalid request body' },
      { status: 400 }
    );
  }
}
