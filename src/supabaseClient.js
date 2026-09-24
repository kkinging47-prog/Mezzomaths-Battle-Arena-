import { createClient } from '@supabase/supabase-js'

const cleanEnv = value => String(value || '').trim()
const placeholder = value => !value || /your-|project-ref|anon-key|publishable-key/i.test(value)

export const supabaseUrl = cleanEnv(import.meta.env.VITE_SUPABASE_URL)
export const supabaseAnonKey = cleanEnv(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)

export const supabaseConfig = {
  url: supabaseUrl,
  key: supabaseAnonKey,
  hasUrl: Boolean(supabaseUrl),
  hasKey: Boolean(supabaseAnonKey),
  validUrl: /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(supabaseUrl),
  urlLooksLikePlaceholder: placeholder(supabaseUrl),
  keyLooksLikePlaceholder: placeholder(supabaseAnonKey),
  maskedUrl: supabaseUrl ? supabaseUrl.replace(/^https:\/\/([a-z0-9]{4})[a-z0-9-]+/i, 'https://$1••••') : 'missing',
  maskedKey: supabaseAnonKey ? `${supabaseAnonKey.slice(0, 8)}••••${supabaseAnonKey.slice(-6)}` : 'missing'
}

export const isSupabaseConfigured = Boolean(
  supabaseConfig.hasUrl &&
  supabaseConfig.hasKey &&
  supabaseConfig.validUrl &&
  !supabaseConfig.urlLooksLikePlaceholder &&
  !supabaseConfig.keyLooksLikePlaceholder
)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null

export async function checkSupabaseConnection() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: false,
      message: 'The online service is temporarily unavailable. Please try again shortly.',
      config: supabaseConfig
    }
  }
  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`
      }
    })
    if (!response.ok && ![401, 403, 404].includes(response.status)) {
      return { ok: false, message: 'The online service is temporarily unavailable. Please try again shortly.', config: supabaseConfig }
    }
    return { ok: true, message: 'Online services are available.', config: supabaseConfig }
  } catch (error) {
    return {
      ok: false,
      message: 'The online service is temporarily unavailable. Check your internet connection and try again.',
      config: supabaseConfig
    }
  }
}
