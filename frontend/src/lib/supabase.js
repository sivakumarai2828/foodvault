import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase frontend env vars:', {
    VITE_SUPABASE_URL: Boolean(supabaseUrl),
    VITE_SUPABASE_ANON_KEY: Boolean(supabaseAnonKey),
  })
  throw new Error('Missing Supabase frontend env vars. Check frontend/.env.local or frontend/.env and restart Vite.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()
