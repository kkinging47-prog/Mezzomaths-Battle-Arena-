import './admin-system-health.css'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

let queued = false
let running = false
let latestResults = []

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function profile() { return readJson('mezzo_profile', {}) || {} }
function isAdmin() { return profile().role === 'admin' }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])) }
function statusIcon(status) { return status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌' }
function result(name, status, details) { return { name, status, details } }
function count(selector) { return document.querySelectorAll(selector).length }
function localStorageWorks() {
  try {
    const key = 'mezzo_health_test'
    localStorage.setItem(key, 'ok')
    const ok = localStorage.getItem(key) === 'ok'
    localStorage.removeItem(key)
    return ok
  } catch { return false }
}
function appScriptsLoaded() {
  const scripts = [...document.querySelectorAll('script[type="module"]')].map(s => s.getAttribute('src') || '')
  const required = ['main.jsx','admin-staff-branding-enhancer.js','admin-control-hub-enhancer.js','teacher-classroom-tools-enhancer.js','course-lms-complete-enhancer.js','bece-practice-enhancer.js','bece-admin-enhancer.js','subscription-gate-enhancer.js','brain-test-enhancer.js']
  const missing = required.filter(item => !scripts.some(src => src.includes(item)))
  return missing.length ? result('Module scripts', 'fail', `Missing: ${missing.join(', ')}`) : result('Module scripts', 'pass', `${required.length} key modules are loaded in index.html.`)
}
async function databaseCheck() {
  if (!isSupabaseConfigured || !supabase) return result('Supabase database', 'warn', 'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not configured in this build.')
  try {
    const { data, error } = await supabase.from('question_bank').select('id,class_level,topic').limit(1)
    if (error) return result('Supabase database', 'fail', error.message)
    return result('Supabase database', 'pass', `Connected. question_bank query returned ${data?.length || 0} row(s).`)
  } catch (error) {
    return result('Supabase database', 'fail', error.message || 'Database check failed.')
  }
}
async function apiCheck() {
  const endpoints = ['/api/paystack-initialize', '/api/paystack-verify', '/api/send-welcome-email']
  const checks = await Promise.all(endpoints.map(async endpoint => {
    try {
      const res = await fetch(endpoint, { method: 'GET' })
      return `${endpoint}: HTTP ${res.status}`
    } catch (error) {
      return `${endpoint}: unavailable`
    }
  }))
  const allUnavailable = checks.every(x => x.includes('unavailable'))
  return result('API endpoints', allUnavailable ? 'warn' : 'pass', checks.join(' • '))
}
function buttonCheck() {
  const checks = [
    ['Home', '[data-target="home"]'],
    ['Smart Board', '[data-target="smartboard"]'],
    ['Online/Battle', '[data-target="battle"], [data-start-bot], #startBattle, #startBattle2'],
    ['Solo/Daily', '[data-target="solo"], [data-start-daily]'],
    ['Dashboard', '[data-target="dashboard"]'],
    ['Login/Signup', '[data-target="auth"]'],
    ['Leaderboards', '[data-target="leaderboard"]'],
    ['BECE Practice', '[data-bece-page]'],
    ['Teacher Tools', '[data-teacher-tools-page]'],
    ['Course Sessions', '[data-courses-page]'],
    ['Brain Test', '[data-brain-test-page]'],
    ['Admin Control Hub', '[data-admin-control-hub]']
  ]
  const found = checks.map(([name, selector]) => [name, count(selector)])
  const missing = found.filter(([, n]) => !n).map(([name]) => name)
  return missing.length ? result('Buttons/navigation', 'warn', `Missing or not currently visible: ${missing.join(', ')}. Some buttons only appear on their specific pages.`) : result('Buttons/navigation', 'pass', 'Main navigation and feature buttons are visible on the current screen.')
}
function adminPanelCheck() {
  const panels = [
    ['Admin Settings', '[data-admin-brand-staff-panel]'],
    ['Course Builder', '[data-course-admin-panel], #courseAdminForm'],
    ['Coupons & Grants', '.course-commerce-admin, #courseCouponForm, #courseGrantForm'],
    ['Workbook Questions', '[data-workbook-seed-summary], [data-exact-workbook-importer]'],
    ['BECE Bank', '[data-bece-admin-panel]'],
    ['System Health', '[data-system-health-panel]']
  ]
  const missing = panels.filter(([, selector]) => !count(selector)).map(([name]) => name)
  return missing.length ? result('Admin sections', 'warn', `Not visible yet: ${missing.join(', ')}. Open Admin first or click the related Admin Control Centre button.`) : result('Admin sections', 'pass', 'All key admin sections are present on the Admin page.')
}
function storageCheck() {
  const bank = readJson('mezzo_question_bank', [])
  const bece = readJson('mezzo_bece_admin_bank', [])
  const logo = localStorage.getItem('mezzo_custom_logo') || ''
  return localStorageWorks() ? result('Browser storage', 'pass', `Storage works. Local bank: ${bank.length} question(s), BECE bank: ${bece.length}, logo: ${logo ? 'saved' : 'not saved yet'}.`) : result('Browser storage', 'fail', 'Browser storage is blocked or full.')
}
function linkCheck() {
  const links = [...document.querySelectorAll('a[href]')]
  const bad = links.filter(a => !/^(https?:|mailto:|tel:|#|\/)/.test(a.getAttribute('href') || '')).map(a => a.getAttribute('href'))
  return bad.length ? result('Links', 'warn', `Unusual links found: ${bad.slice(0, 6).join(', ')}`) : result('Links', 'pass', `${links.length} visible link(s) have valid URL formats.`)
}
async function runChecks() {
  if (running) return
  running = true
  renderPanel(true)
  latestResults = [
    result('App root', document.getElementById('root') ? 'pass' : 'fail', document.getElementById('root') ? 'Root element is present.' : 'Root element is missing.'),
    appScriptsLoaded(),
    buttonCheck(),
    adminPanelCheck(),
    storageCheck(),
    linkCheck(),
    await databaseCheck(),
    await apiCheck()
  ]
  running = false
  renderPanel(false)
}
function panelHtml(loading = false) {
  const results = loading ? [result('System check', 'warn', 'Running checks...')] : latestResults
  return `<section class="system-health-panel glass-card" data-system-health-panel="true">
    <div class="system-health-head"><div><span>🩺 Admin System Health Check</span><h2>Buttons, Pages, Links & Database</h2><p>Run this after every Vercel deployment to confirm the main app sections and Supabase connection.</p></div><button class="btn btn-gold" type="button" data-run-system-health="true">${loading ? 'Checking...' : 'Run System Check'}</button></div>
    <div class="system-health-grid">${results.map(item => `<article class="${item.status}"><strong>${statusIcon(item.status)} ${escapeHtml(item.name)}</strong><p>${escapeHtml(item.details)}</p></article>`).join('')}</div>
    <p class="system-health-note">This is an in-app smoke test. For a full browser click-through test, open the live Vercel URL and use this panel while logged in as Admin.</p>
  </section>`
}
function renderPanel(loading = false) {
  const admin = document.querySelector('.admin-screen')
  if (!admin) return
  const old = admin.querySelector('[data-system-health-panel]')
  if (old) old.outerHTML = panelHtml(loading)
  else admin.insertAdjacentHTML('afterbegin', panelHtml(loading))
}
function addHubButton() {
  if (!isAdmin()) return
  const hub = document.querySelector('[data-admin-control-hub] .admin-control-grid')
  if (!hub || hub.querySelector('[data-system-health-open]')) return
  hub.insertAdjacentHTML('beforeend', `<button type="button" class="admin-control-card system-health-card" data-system-health-open="true"><b>🩺</b><span>System Health Check</span><small>Check buttons, pages, links, storage, APIs and database.</small></button>`)
}
function sync() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; addHubButton() })
}

document.addEventListener('click', event => {
  if (event.target.closest('[data-system-health-open]')) {
    event.preventDefault()
    renderPanel(false)
    setTimeout(runChecks, 80)
    document.querySelector('[data-system-health-panel]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }
  if (event.target.closest('[data-run-system-health]')) {
    event.preventDefault()
    runChecks()
  }
}, true)

const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false })
window.addEventListener('load', sync)
window.addEventListener('storage', sync)
setTimeout(sync, 350)
