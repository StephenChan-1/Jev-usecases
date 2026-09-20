import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ApiKeys } from './types.ts'

let client: SupabaseClient | null = null

export function configureDb(keys: ApiKeys): void {
  if (!keys.supabaseUrl || !keys.supabaseService) {
    throw Object.assign(
      new Error(
        'Add SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY to .env.local, then restart.',
      ),
      { status: 500 },
    )
  }
  client = createClient(keys.supabaseUrl, keys.supabaseService, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function db(): SupabaseClient {
  if (!client) {
    throw Object.assign(new Error('Database is not configured.'), { status: 500 })
  }
  return client
}
