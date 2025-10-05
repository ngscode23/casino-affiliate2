import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createClient() {
	// Используйте NEXT_PUBLIC_* чтобы клиент был доступен в браузере (client component)
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL
	const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

	if (!url || !key) {
		throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
	}

	return createSupabaseClient(url, key)
}
