import './production-auth-cloud-sync.css'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

const PROFILE_KEY = 'mezzo_profile'
const CLOUD_SIG_KEY = 'mezzo_cloud_sync_signatures'
const ADMIN_EMAILS = new Set([
  'hayfordevans@gmail.com',
  ...(String(import.meta.env.VITE_MEZZO_ADMIN_EMAILS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean))
])
const SYNC_KEYS = [
  'mezzo_smart_leaderboards',
  'mezzo_bece_history',
  'mezzo_brain_test_results',
  'mezzo_course_progress',
  'mezzo_course_enrollments',
  'mezzo_course_purchases',
  'mezzo_subscription',
  'mezzo_teacher_resources'
]
let queued = false
let syncTimer = null

function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])) }
function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function toast(message, type = 'info') {
  document.querySelector('.production-auth-toast')?.remove()
  document.body.insertAdjacentHTML('beforeend', `<div class="production-auth-toast ${type}">${escapeHtml(message)}</div>`)
  setTimeout(() => document.querySelector('.production-auth-toast')?.remove(), 5200)
}
function ageFromDob(dob) {
  if (!dob) return null
  const today = new Date(), born = new Date(dob)
  let age = today.getFullYear() - born.getFullYear()
  const m = today.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age -= 1
  return Number.isFinite(age) ? age : null
}
function cleanRole(role, email) {
  const wanted = String(role || 'student').toLowerCase()
  const lower = String(email || '').toLowerCase()
  if (wanted === 'admin' && !ADMIN_EMAILS.has(lower)) return 'student'
  if (['student', 'teacher', 'mezzo_staff', 'admin'].includes(wanted)) return wanted
  return 'student'
}
function profilePayload(formData = {}, user = null) {
  const email = String(formData.email || user?.email || '').trim().toLowerCase()
  const role = cleanRole(formData.role || user?.user_metadata?.role || 'student', email)
  const dob = formData.date_of_birth || formData.dob || user?.user_metadata?.date_of_birth || null
  return {
    id: user?.id,
    full_name: formData.full_name || formData.name || user?.user_metadata?.full_name || email.split('@')[0] || 'Mezzo User',
    email,
    date_of_birth: dob || null,
    age: ageFromDob(dob),
    school_name: formData.school_name || formData.school || user?.user_metadata?.school_name || '',
    location: formData.location || user?.user_metadata?.location || '',
    class_level: formData.class_level || user?.user_metadata?.class_level || 'Grade 4',
    curriculum: formData.curriculum || user?.user_metadata?.curriculum || 'GES',
    role,
    avatar_url: user?.user_metadata?.avatar_url || null
  }
}
async function upsertProfile(payload) {
  if (!supabase || !payload.id) return payload
  const { data, error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select().single()
  if (error) throw error
  return data || payload
}
function activateLocalProfile(profile) {
  saveJson(PROFILE_KEY, profile)
  window.dispatchEvent(new CustomEvent('mezzoProfileUpdated', { detail: profile }))
}
async function loadProfile(user) {
  if (!supabase || !user) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (error) throw error
  if (data) return data
  return await upsertProfile(profilePayload({}, user))
}
async function handleSignup(form) {
  if (!isSupabaseConfigured || !supabase) { toast('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before live launch.', 'error'); return false }
  const f = Object.fromEntries(new FormData(form).entries())
  const email = String(f.email || '').trim().toLowerCase()
  const password = String(f.password || '')
  if (!email || password.length < 6) { toast('Enter a valid email and a password of at least 6 characters.', 'error'); return false }
  const role = cleanRole(f.role, email)
  const metadata = { ...f, role }
  delete metadata.password
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: metadata } })
  if (error) { toast(`Signup failed: ${error.message}`, 'error'); return false }
  if (!data.session) { toast('Account created. Check email to confirm, then log in.', 'warn'); return true }
  const profile = await upsertProfile(profilePayload({ ...f, role }, data.user))
  activateLocalProfile(profile)
  toast(`Welcome ${profile.full_name}. Your account is now saved in Supabase.`, 'success')
  document.querySelector('[data-target="dashboard"]')?.click()
  queueCloudSync()
  return true
}
async function handleLogin(form) {
  if (!isSupabaseConfigured || !supabase) { toast('Supabase is not configured. This build cannot use live database login yet.', 'error'); return false }
  const f = Object.fromEntries(new FormData(form).entries())
  const email = String(f.email || '').trim().toLowerCase()
  const password = String(f.password || '')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) { toast(`Login failed: ${error.message}`, 'error'); return false }
  let profile = await loadProfile(data.user)
  const wantedRole = cleanRole(f.role || profile?.role, email)
  if (profile && wantedRole !== profile.role && (wantedRole !== 'admin' || ADMIN_EMAILS.has(email))) {
    profile = await upsertProfile({ ...profile, role: wantedRole })
  }
  activateLocalProfile(profile)
  toast(`Live login successful as ${profile.role}.`, 'success')
  document.querySelector(`[data-target="${profile.role === 'admin' ? 'admin' : 'dashboard'}"]`)?.click()
  queueCloudSync()
  return true
}
async function restoreSession() {
  if (!supabase) return
  const { data } = await supabase.auth.getSession()
  const user = data?.session?.user
  if (!user) return
  try {
    const profile = await loadProfile(user)
    activateLocalProfile(profile)
    queueCloudSync()
  } catch (error) {
    toast(`Profile sync warning: ${error.message}`, 'warn')
  }
}
async function logout() {
  if (supabase) await supabase.auth.signOut()
  localStorage.removeItem(PROFILE_KEY)
  toast('Signed out of live account.', 'success')
  document.querySelector('[data-target="home"]')?.click()
}
function signature(value) { try { return btoa(unescape(encodeURIComponent(JSON.stringify(value)))).slice(0, 5000) } catch { return String(Date.now()) } }
async function currentUser() { if (!supabase) return null; const { data } = await supabase.auth.getUser(); return data?.user || null }
async function saveSnapshot(user, key, payload) {
  const sigs = readJson(CLOUD_SIG_KEY, {})
  const sig = signature(payload)
  if (sigs[key] === sig) return
  const { error } = await supabase.from('user_progress_snapshots').upsert({ user_id: user.id, snapshot_key: key, payload, updated_at: new Date().toISOString() }, { onConflict: 'user_id,snapshot_key' })
  if (error) throw error
  sigs[key] = sig
  saveJson(CLOUD_SIG_KEY, sigs)
}
function scoreRowsFromKey(key, payload, profile) {
  const rows = []
  const common = { student_name: profile.full_name || profile.email || 'Student', school_name: profile.school_name || '', class_level: profile.class_level || '', curriculum: profile.curriculum || 'GES' }
  if (key === 'mezzo_bece_history' && Array.isArray(payload)) payload.slice(0, 10).forEach(item => rows.push({ ...common, mode: `BECE ${item.type || 'Practice'}`, topic: (item.weakTopics || [])[0] || 'BECE', score: Number(item.score || 0), total: Number(item.total || 0), percent: item.total ? Math.round((Number(item.score || 0) / Number(item.total)) * 100) : null, metadata: item, created_at: item.date || new Date().toISOString() }))
  if (key === 'mezzo_brain_test_results' && Array.isArray(payload)) payload.slice(0, 10).forEach(item => rows.push({ ...common, mode: 'Brain Test', topic: 'Brain Training', score: Number(item.score || 0), total: Number(item.total || 0), percent: Number(item.percent || 0), metadata: item, created_at: item.created_at || item.date || new Date().toISOString() }))
  if (key === 'mezzo_smart_leaderboards' && payload && typeof payload === 'object') Object.entries(payload).forEach(([scope, list]) => Array.isArray(list) && list.slice(0, 10).forEach(item => rows.push({ ...common, mode: `Smart Board ${scope}`, topic: item.topic || '', topic_area: item.topicArea || '', score: Number(item.score || 0), total: null, percent: null, metadata: item, created_at: item.date || new Date().toISOString() })))
  return rows
}
async function syncScores(user, key, payload, profile) {
  const rows = scoreRowsFromKey(key, payload, profile).map(row => ({ user_id: user.id, ...row }))
  if (!rows.length) return
  const sigs = readJson(`${CLOUD_SIG_KEY}_scores`, {})
  const toInsert = rows.filter(row => {
    const sig = signature(row)
    const id = `${key}_${sig}`
    if (sigs[id]) return false
    sigs[id] = true
    return true
  })
  if (!toInsert.length) return
  const { error } = await supabase.from('game_score_records').insert(toInsert)
  if (error) throw error
  saveJson(`${CLOUD_SIG_KEY}_scores`, sigs)
}
async function cloudSync() {
  if (!supabase) return
  const user = await currentUser()
  if (!user) return
  const profile = readJson(PROFILE_KEY, {})
  const statuses = []
  for (const key of SYNC_KEYS) {
    const raw = localStorage.getItem(key)
    if (!raw) continue
    try {
      const payload = JSON.parse(raw)
      await saveSnapshot(user, key, payload)
      await syncScores(user, key, payload, profile)
      statuses.push(key)
    } catch (error) {
      console.warn(`Cloud sync failed for ${key}`, error)
    }
  }
  if (statuses.length) window.dispatchEvent(new CustomEvent('mezzoCloudSyncComplete', { detail: statuses }))
}
function queueCloudSync() {
  clearTimeout(syncTimer)
  syncTimer = setTimeout(cloudSync, 900)
}
function patchLocalStorage() {
  if (window.__mezzoCloudSyncPatched) return
  window.__mezzoCloudSyncPatched = true
  const original = Storage.prototype.setItem
  Storage.prototype.setItem = function(key, value) {
    original.apply(this, arguments)
    if (SYNC_KEYS.includes(key)) queueCloudSync()
  }
}
function addLogoutAndStatus() {
  const profile = readJson(PROFILE_KEY, null)
  document.querySelectorAll('.tab-scroll').forEach(nav => {
    if (profile && !nav.querySelector('[data-live-logout]')) nav.insertAdjacentHTML('beforeend', '<button class="screen-tab live-logout-button" data-live-logout="true"><span>🚪</span>Logout</button>')
  })
  const dash = document.querySelector('.dashboard-screen .dashboard-hero, .admin-screen .dashboard-hero')
  if (dash && profile && !dash.querySelector('[data-live-account-status]')) dash.insertAdjacentHTML('beforeend', `<div class="live-account-status" data-live-account-status="true"><b>✅ Live database account</b><span>${escapeHtml(profile.email || '')} • ${escapeHtml(profile.role || 'student')}</span></div>`)
}
function sync() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; addLogoutAndStatus() })
}

document.addEventListener('submit', async event => {
  if (event.target?.id === 'signupForm') { event.preventDefault(); event.stopImmediatePropagation(); await handleSignup(event.target); return }
  if (event.target?.id === 'loginForm') { event.preventDefault(); event.stopImmediatePropagation(); await handleLogin(event.target); return }
}, true)

document.addEventListener('click', event => {
  if (event.target.closest('[data-live-logout]')) { event.preventDefault(); event.stopImmediatePropagation(); logout(); return }
}, true)

patchLocalStorage()
restoreSession()
setInterval(queueCloudSync, 45000)
window.addEventListener('online', queueCloudSync)
window.addEventListener('storage', queueCloudSync)
const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, attributes: false })
window.addEventListener('load', () => { sync(); queueCloudSync() })
setTimeout(() => { sync(); queueCloudSync() }, 600)
