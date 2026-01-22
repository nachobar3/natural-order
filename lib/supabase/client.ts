import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // During SSR/prerendering, return a dummy that won't be used
  if (typeof window === 'undefined') {
    // Return a proxy that throws helpful errors if accidentally used during SSR
    return new Proxy({} as ReturnType<typeof createBrowserClient>, {
      get() {
        throw new Error('Supabase client cannot be used during server-side rendering')
      }
    })
  }

  // Singleton pattern for browser
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  return client
}
