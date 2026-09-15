import './role-safe-signup-handler.css'
import { supabase, isSupabaseConfigured, checkSupabaseConnection, supabaseConfig } from './supabaseClient.js'

const PROFILE_KEY = 'mezzo_profile'
const ADMIN_EMAILS = new Set([
  'hayfordevans@gmail.com',
  ...(String(import.meta.env.VITE_MEZZO_ADMIN_EMAILS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean))
])
let busy = false

function esc(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])) }
function toast(message, type = 'info') {
  document.querySelector('.role-safe-signup-toast')?.remove()
  document.body.insertAdjacentHTML('beforeend', `<div class="role-safe-signup-toast ${type}">${esc(message)}</div>`)
  setTimeout(() => document.querySelector('.role-safe-signup-toast')?.remove(), 6200)
}
function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  window.dispatchEvent(new CustomEvent('mezzoProfileUpdated', { detail: profile }))
}
function normaliseRole(value, email) {
  const role = String(value || 'student').trim().toLowerCase().replace(/\s+/g, '_')
  if (role === 'admin') return ADMIN_EMAILS.has(String(email || '').toLowerCase()) ? 'admin' : 'student'
  if (['student', 'teacher', 'mezzo_staff'].includes(role)) return role
  if (role.includes('teacher')) return 'teacher'
  if (role.includes('staff') || role.includes('tutor') || role.includes('mezzo')) return 'mezzo_staff'
  return 'student'
}
function ageFromDob(dob) {
  if (!dob) return null
  const today = new Date(), born = new Date(dob)
  let age = today.getFullYear() - born.getFullYear()
  const m = today.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age -= 1
  return Number.isFinite(age) ? age : null
}
function profileFromFields(fields, user, fallback = {}) {
  const email = String(fields.email || user?.email || fallback.email || '').trim().toLowerCase()
  const role = normaliseRole(fields.role || fallback.role || user?.user_metadata?.role, email)
  const dob = fields.date_of_birth || fields.dob || fallback.date_of_birth || user?.user_metadata?.date_of_birth || null
  return {
    id: user?.id || fallback.id,
    full_name: fields.full_name || fields.name || fallback.full_name || user?.user_metadata?.full_name || email.split('@')[0] || 'Mezzo User',
    email,
    date_of_birth: dob || null,
    age: ageFromDob(dob),
    school_name: fields.school_name || fields.school || fallback.school_name || user?.user_metadata?.school_name || '',
    location: fields.location || fallback.location || user?.user_metadata?.location || '',
    region: fields.region || fallback.region || user?.user_metadata?.region || '',
    class_level: fields.class_level || fallback.class_level || user?.user_metadata?.class_level || 'Grade 4',
    curriculum: fields.curriculum || fallback.curriculum || user?.user_metadata?.curriculum || 'GES',
    academic_term: fields.academic_term || fallback.academic_term || user?.user_metadata?.academic_term || 'Term 1',
    role,
    approval_status: role === 'mezzo_staff' ? 'pending' : 'approved',
    avatar_url: user?.user_metadata?.avatar_url || fallback.avatar_url || null,
    updated_at: new Date().toISOString()
  }
}
async function ensureReachable() {
  if (!supabase || !isSupabaseConfigured) {
    toast('Signup is not connected to Supabase. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel, then redeploy.', 'error')
    return false
  }
  const check = await checkSupabaseConnection()
  if (!check.ok) {
    toast(`Signup cannot reach Supabase: ${check.message} Current URL: ${supabaseConfig.maskedUrl}.`, 'error')
    return false
  }
  return true
}
async function createAccount(fields) {
  const response = await fetch('/api/create-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields)
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'The account could not be created.')
  return result
}
async function fetchProfile(user) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (error) throw error
  return data
}
async function upsertProfile(profile) {
  const { data, error } = await supabase.from('profiles').upsert(profile, { onConflict: 'id' }).select().single()
  if (error) throw error
  return data || profile
}
async function signUpWithRole(form) {
  if (busy) return
  busy = true
  try {
    if (!(await ensureReachable())) return
    const fields = Object.fromEntries(new FormData(form).entries())
    const email = String(fields.email || '').trim().toLowerCase()
    const password = String(fields.password || '')
    if (!email || !email.includes('@')) { toast('Enter a valid email address.', 'error'); return }
    if (password.length < 6) { toast('Password must be at least 6 characters.', 'error'); return }

    fields.email = email
    fields.role = normaliseRole(fields.role, email)

    if (String(Object.fromEntries(new FormData(form).entries()).role || '').toLowerCase() === 'admin' && fields.role !== 'admin') {
      toast('Admin accounts are protected. This signup will be saved as a student unless the account is manually approved as admin.', 'warn')
    } else {
      toast(`Creating ${fields.role.replace('_', ' ')} account…`, 'info')
    }

    const created = await createAccount({ ...fields, password })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    const profile = await fetchProfile(data.user) || await upsertProfile(profileFromFields(fields, data.user, created.user || {}))
    const wantedRole = normaliseRole(fields.role, email)
    const merged = { ...profile, role: profile.role || wantedRole }
    saveProfile(merged)

    if (merged.role === 'mezzo_staff' && merged.approval_status !== 'approved') {
      await supabase.auth.signOut()
      localStorage.removeItem(PROFILE_KEY)
      toast('Your Mezzo Staff account was saved and is awaiting administrator approval.', 'warn')
      document.querySelector('[data-target="auth"]')?.click()
      return
    }

    toast(`Account created and saved as ${merged.role.replace('_', ' ')}.`, 'success')
    document.querySelector(`[data-target="${merged.role === 'admin' ? 'admin' : 'dashboard'}"]`)?.click()
  } catch (error) {
    toast(`Signup failed: ${error.message || error}`, 'error')
  } finally {
    busy = false
  }
}

document.addEventListener('submit', event => {
  if (event.target?.id !== 'signupForm') return
  event.preventDefault()
  event.stopImmediatePropagation()
  signUpWithRole(event.target)
}, true)
