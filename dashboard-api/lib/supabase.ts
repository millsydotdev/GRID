import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Lazy initialization to avoid build-time errors
let _supabaseAdmin: SupabaseClient | null = null;
let _supabase: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!SUPABASE_URL) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
  }

  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return _supabaseAdmin;
}

function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!SUPABASE_ANON_KEY) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  return _supabase;
}

// Export getters instead of instances
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabaseAdmin()[prop as keyof SupabaseClient];
  },
});

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabase()[prop as keyof SupabaseClient];
  },
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          tier: 'community' | 'pro' | 'enterprise';
          api_key_hash: string;
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      teams: {
        Row: {
          id: string;
          name: string;
          owner_user_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['teams']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['teams']['Insert']>;
      };
      team_members: {
        Row: {
          team_id: string;
          user_id: string;
          role: 'admin' | 'member';
          joined_at: string;
        };
        Insert: Omit<Database['public']['Tables']['team_members']['Row'], 'joined_at'>;
        Update: Partial<Database['public']['Tables']['team_members']['Insert']>;
      };
      enterprise_configs: {
        Row: {
          user_id: string;
          mcp_json: {
            servers: Record<string, unknown>;
            inputs: unknown[];
          };
          provider_settings: Record<string, unknown>;
          version: number;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['enterprise_configs']['Row'], 'updated_at'>;
        Update: Partial<Database['public']['Tables']['enterprise_configs']['Insert']>;
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_subscription_id: string | null;
          tier: 'pro' | 'enterprise';
          status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
          seats: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['subscriptions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>;
      };
      repositories: {
        Row: {
          id: string;
          name: string;
          url: string;
          owner_id: string;
          is_private: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['repositories']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['repositories']['Insert']>;
      };
    };
  };
};
