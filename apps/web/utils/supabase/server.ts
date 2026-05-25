import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createServerSideClient = async () => {
  const cookieStore = await cookies();

  // Route through your internal Docker multi-tenant bridge gateway
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://supabase_kong_supply-chain-verifier:8000';
  
  // Pull the true secret orchestrator bypass string safely from the environment
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }

  return createServerClient(
    supabaseUrl,
    serviceRoleKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Safe fallback boundary execution block
          }
        },
      },
    }
  );
};