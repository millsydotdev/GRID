/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

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

    const teamMember = (user as any).team_members?.[0];

    return NextResponse.json({
      id: user.id,
      email: user.email,
      tier: user.tier,
      teamId: teamMember?.team_id,
      isTeamAdmin: teamMember?.role === 'admin',
      stripeCustomerId: user.stripe_customer_id,
    });
  } catch (error) {
    console.error('Validate error:', error);
    return NextResponse.json(
      { error: 'Bad Request', message: 'Invalid request body' },
      { status: 400 }
    );
  }
}
