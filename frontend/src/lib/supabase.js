import { createClient } from '@supabase/supabase-js'
import { isNativeApp } from './platform'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase frontend env vars:', {
    VITE_SUPABASE_URL: Boolean(supabaseUrl),
    VITE_SUPABASE_ANON_KEY: Boolean(supabaseAnonKey),
  })
  throw new Error('Missing Supabase frontend env vars. Check frontend/.env.local or frontend/.env and restart Vite.')
}

// PKCE works on web and is required for the native deep-link OAuth flow.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'pkce' },
})

// Deep-link target registered in AndroidManifest.xml / iOS Info.plist.
// Must also be whitelisted in Supabase → Auth → URL Configuration → Redirect URLs.
export const NATIVE_REDIRECT_URL = 'com.skorbits.foodvault://auth-callback'

export const signInWithGoogle = async () => {
  if (isNativeApp()) {
    // Google blocks OAuth inside webviews — open the system browser instead,
    // then the deep link brings the auth code back into the app (see App.jsx).
    const { Browser } = await import('@capacitor/browser')
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: NATIVE_REDIRECT_URL, skipBrowserRedirect: true },
    })
    if (error) throw error
    await Browser.open({ url: data.url })
    return
  }
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
}

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()
