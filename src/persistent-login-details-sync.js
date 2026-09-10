import './persistent-login-details-sync.css'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

const PROFILE_KEY = 'mezzo_profile'
const SYNCED_KEY = 'mezzo_profile_last_database_sync'
const ADMIN_EMAILS = new Set([
  'hayfordevans@gmail.com',
  ...(String(import.meta.env.VITE_MEZZO_ADMIN_EMAILS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean))
])
let queued = false
let lastUserId = ''

function esc(v = '') { return String(v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])) }
function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function roleSafe(role, email) {
  const wanted = String(role || 'student').toLowerCase()
  const lower = String(email || '').toLowerCase()
  if (wanted === 'admin' && !ADMIN_EMAILS.has(lower)) return 'student'
  return ['student','teacher','mezzo_staff','admin'].includes(wanted) ? wanted : 'student'
}
function ageFromDob(dob) {
  if (!dob) return null
  const today = new Date(), born = new Date(dob)
  let age = today.getFullYear() - born.getFullYear()
  const m = today.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age -= 1
  return Number.isFinite(age) ? age : null
}
function formDetails() {
  const form = document.getElementById('signupForm') || document.getElementById('loginForm')
  if (!form) return {}
  try { return Object.fromEntries(new FormData(form).entries()) } catch { return {} }
}
function localProfile() { return readJson(PROFILE_KEY, {}) || {} }
function payloadFrom(user, extra = {}) {
  const local = localProfile()
  const meta = user?.user_metadata || {}
  const form = formDetails()
  const email = String(extra.email || form.email || local.email || user?.email || meta.email || '').trim().toLowerCase()
  const dob = extra.date_of_birth || form.date_of_birth || form.dob || local.date_of_birth || meta.date_of_birth || null
  return {
    id: user?.id || local.id,
    full_name: extra.full_name || form.full_name || form.name || local.full_name || local.name || meta.full_name || meta.name || email.split('@')[0] || 'Mezzo User',
    email,
    date_of_birth: dob || null,
    age: ageFromDob(dob),
    school_name: extra.school_name || form.school_name || form.school || local.school_name || local.school || meta.school_name || meta.school || '',
    location: extra.location || form.location || local.location || meta.location || '',
    class_level: extra.class_level || form.class_level || local.class_level || meta.class_level || 'Grade 4',
    curriculum: extra.curriculum || form.curriculum || local.curriculum || meta.curriculum || 'GES',
    role: roleSafe(extra.role || form.role || local.role || meta.role || 'student', email),
    avatar_url: extra.avatar_url || local.avatar_url || meta.avatar_url || null,
    phone_number: extra.phone_number || form.phone_number || form.phone || local.phone_number || local.phone || meta.phone_number || meta.phone || '',
    region: extra.region || form.region || local.region || meta.region || '',
    updated_at: new Date().toISOString()
  }
}
function toast(message, type = 'info') {
  document.querySelector('.profile-db-toast')?.remove()
  document.body.insertAdjacentHTML('beforeend', `<div class="profile-db-toast ${type}">${esc(message)}</div>`)
  setTimeout(() => document.querySelector('.profile-db-toast')?.remove(), 4800)
}
function activate(profile, source = 'database') {
  const clean = { ...localProfile(), ...profile, profile_loaded_from: source }
  saveJson(PROFILE_KEY, clean)
  localStorage.setItem(SYNCED_KEY, new Date().toISOString())
  window.dispatchEvent(new CustomEvent('mezzoProfileUpdated', { detail: clean }))
  window.dispatchEvent(new CustomEvent('mezzoDatabaseProfileLoaded', { detail: clean }))
  return clean
}
async function fetchProfile(user) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (error) throw error
  return data
}
async function upsertProfile(user, extra = {}) {
  const payload = payloadFrom(user, extra)
  if (!payload.id) return null
  const { data, error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select().single()
  if (error) throw error
  return data || payload
}
async function touchLogin() {
  try {
    const { data, error } = await supabase.rpc('touch_current_user_login')
    if (!error && data) return data
  } catch {}
  return null
}
async function retrieveAndApply(user, reason = 'login') {
  if (!supabase || !user) return
  try {
    let dbProfile = await fetchProfile(user)
    if (!dbProfile) dbProfile = await upsertProfile(user)
    if (reason === 'login') {
      const touched = await touchLogin()
      if (touched?.id) dbProfile = { ...dbProfile, ...touched }
    }
    const local = activate(dbProfile, 'supabase_database')
    if (reason === 'login') toast(`Profile loaded from database: ${local.email} • ${local.role}`, 'success')
    syncStatus()
  } catch (error) {
    toast(`Profile database sync failed: ${error.message}`, 'error')
  }
}
async function saveCurrentToDb(reason = 'manual') {
  if (!supabase || !isSupabaseConfigured) { toast('Supabase is not configured, so profile details cannot be saved to the database yet.', 'error'); return }
  const { data } = await supabase.auth.getUser()
  const user = data?.user
  if (!user) { toast('Log in first before saving profile details to the database.', 'error'); return }
  try {
    const saved = await upsertProfile(user, localProfile())
    activate(saved, 'supabase_database')
    toast(reason === 'manual' ? 'Login/profile details saved to database.' : 'Profile synced to database.', 'success')
  } catch (error) {
    toast(`Could not save profile details: ${error.message}`, 'error')
  }
}
function statusHtml(profile) {
  const synced = localStorage.getItem(SYNCED_KEY)
  return `<div class="profile-db-status" data-profile-db-status="true"><b>☁️ Database Profile</b><span>${profile?.email ? `${esc(profile.email)} • ${esc(profile.role || 'student')}` : 'Not loaded yet'}</span><small>${synced ? `Last sync: ${new Date(synced).toLocaleString()}` : 'Login details will load from Supabase after sign in.'}</small><button type="button" class="btn btn-blue btn-small" data-save-profile-database="true">Save Login Details to Database</button></div>`
}
function syncStatus() {
  const profile = localProfile()
  const host = document.querySelector('.dashboard-screen .dashboard-hero, .admin-screen .dashboard-hero, .auth-card, .auth-panel')
  if (!host) return
  const existing = host.querySelector('[data-profile-db-status]')
  if (existing) existing.outerHTML = statusHtml(profile)
  else host.insertAdjacentHTML('beforeend', statusHtml(profile))
}
async function bootstrap() {
  if (!supabase || !isSupabaseConfigured) return
  const { data } = await supabase.auth.getSession()
  const user = data?.session?.user
  if (user && user.id !== lastUserId) {
    lastUserId = user.id
    await retrieveAndApply(user, 'restore')
  }
}

if (supabase && isSupabaseConfigured) {
  supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user
    if (!user) return
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
      lastUserId = user.id
      setTimeout(() => retrieveAndApply(user, event === 'SIGNED_IN' ? 'login' : 'restore'), 250)
    }
  })
}

document.addEventListener('submit', event => {
  if (event.target?.id === 'signupForm') {
    try { sessionStorage.setItem('mezzo_pending_signup_profile', JSON.stringify(Object.fromEntries(new FormData(event.target).entries()))) } catch {}
  }
}, true)

document.addEventListener('click', event => {
  if (event.target.closest('[data-save-profile-database]')) { event.preventDefault(); saveCurrentToDb('manual') }
}, true)

window.addEventListener('mezzoProfileUpdated', () => {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; syncStatus() })
})
window.addEventListener('load', () => { bootstrap(); syncStatus() })
setTimeout(() => { bootstrap(); syncStatus() }, 700)
