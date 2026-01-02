import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { supabaseAdmin } from './supabase';

export interface AuthenticatedUser {
  id: string;
  email: string;
  tier: 'community' | 'pro' | 'enterprise';
  teamId?: string;
  isTeamAdmin?: boolean;
}

/**
 * Hash API key using SHA-256
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Generate new API key
 */
export function generateApiKey(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const hex = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `grid_${hex}`;
}

/**
 * Authenticate request with Bearer token (API key)
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const apiKey = authHeader.substring(7); // Remove 'Bearer '
  const apiKeyHash = hashApiKey(apiKey);

  // Look up user by API key hash
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select(`
      id,
      email,
      tier,
      team_members!inner (
        team_id,
        role
      )
    `)
    .eq('api_key_hash', apiKeyHash)
    .single();

  if (error || !user) {
    return null;
  }

  // Get team info if user is in a team
  const userData = user as unknown as {
    id: string;
    email: string;
    tier: 'community' | 'pro' | 'enterprise';
    team_members?: Array<{
      team_id: string;
      role: 'admin' | 'member';
    }>;
  };
  const teamMember = userData.team_members?.[0];

  return {
    id: userData.id,
    email: userData.email,
    tier: userData.tier,
    teamId: teamMember?.team_id,
    isTeamAdmin: teamMember?.role === 'admin',
  };
}

/**
 * Require authentication middleware
 */
export function requireAuth(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    const user = await authenticateRequest(request);

    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid or missing API key',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return handler(request, user);
  };
}

/**
 * Require specific tier
 */
export function requireTier(
  tiers: ('community' | 'pro' | 'enterprise')[],
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>
) {
  return requireAuth(async (request, user) => {
    if (!tiers.includes(user.tier)) {
      return new Response(
        JSON.stringify({
          error: 'Forbidden',
          message: `This feature requires ${tiers.join(' or ')} tier`,
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return handler(request, user);
  });
}

/**
 * Create audit log entry
 */
export async function createAuditLog(params: {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  changes?: Record<string, unknown>;
  request?: NextRequest;
}) {
  const { userId, action, resourceType, resourceId, changes, request } = params;

  const ipAddress = request?.headers.get('x-forwarded-for')?.split(',')[0] || request?.headers.get('x-real-ip') || null;
  const userAgent = request?.headers.get('user-agent') || null;

  await supabaseAdmin.from('audit_logs').insert({
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    changes,
    ip_address: ipAddress,
    user_agent: userAgent,
  });
}
