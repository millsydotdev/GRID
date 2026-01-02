import { NextResponse } from 'next/server';
import { requireAuth, createAuditLog } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const GET = requireAuth(async (_request, user) => {
  try {
    const { data: config, error } = await supabaseAdmin
      .from('enterprise_configs')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw error;
    }

    if (!config) {
      // Return default config if none exists
      return NextResponse.json({
        providerSettings: {},
        mcpConfig: { servers: {}, inputs: [] },
        updatedAt: Date.now(),
        version: 1,
      });
    }

    return NextResponse.json({
      providerSettings: config.provider_settings || {},
      mcpConfig: config.mcp_json || { servers: {}, inputs: [] },
      updatedAt: new Date(config.updated_at).getTime(),
      version: config.version,
    });
  } catch (error) {
    console.error('Get config error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch config' },
      { status: 500 }
    );
  }
});

export const PUT = requireAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { providerSettings, mcpConfig, version } = body;

    // Upsert configuration
    const { data, error } = await supabaseAdmin
      .from('enterprise_configs')
      .upsert(
        {
          user_id: user.id,
          provider_settings: providerSettings,
          mcp_json: mcpConfig,
          version: (version || 0) + 1,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) throw error;

    // Create audit log for Enterprise users
    if (user.tier === 'enterprise') {
      await createAuditLog({
        userId: user.id,
        action: 'UPDATE_CONFIG',
        resourceType: 'enterprise_config',
        resourceId: user.id,
        changes: { providerSettings, mcpConfig },
        request,
      });
    }

    return NextResponse.json({
      success: true,
      version: data.version,
    });
  } catch (error) {
    console.error('Update config error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update config' },
      { status: 500 }
    );
  }
});
