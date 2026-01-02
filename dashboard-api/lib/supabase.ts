/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
}

// Service role client (full access, use with caution)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Anon client (RLS enforced)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
          mcp_json: any;
          provider_settings: any;
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
