import './bece-sunday-hardening.css'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

const CANDIDATE_KEY = 'mezzo_bece_sunday_candidate'
const ATTEMPT_APPROVAL_MS = 7000
let approving = false
let queued = false

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))
}
function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback }
}
function weekStartIso(date = new Date()) {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - d.getUTCDay())
  return d.toISOString().slice(0, 10)
}
function fmt(seconds = 0) {
  const s = Math.max(0, Number(seconds || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return h ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`
}
function toast(message, type = 'warn') {
  document.querySelector('.bece-hardening-toast')?.remove()
  document.body.insertAdjacentHTML('beforeend', `<div class="bece-hardening-toast ${type}">${esc(message)}</div>`)
  setTimeout(() => document.querySelector('.bece-hardening-toast')?.remove(), 5200)
}
async function hasDatabaseAttempt(contact) {
  if (!supabase || !isSupabaseConfigured || !contact) return false
  const { data, error } = await supabase.rpc('has_bece_sunday_attempt', {
    p_contact: contact,
    p_week_start: weekStartIso()
  })
  if (error) {
    console.warn('Sunday duplicate attempt check skipped:', error.message)
    return false
  }
  return Boolean(data)
}
async function publicLeaderboard() {
  if (!supabase || !isSupabaseConfigured) return []
  try {
    const rpc = await supabase.rpc('get_bece_sunday_public_leaderboard', {
      p_week_start: weekStartIso(),
      p_limit: 20
    })
    if (!rpc.error && Array.isArray(rpc.data)) return rpc.data
  } catch {}
  try {
    const { data, error } = await supabase
      .from('bece_sunday_trial_public_leaderboard')
      .select('full_name,school_name,region,score,total,percent,time_taken_seconds,week_start,created_at')
      .eq('week_start', weekStartIso())
      .order('score', { ascending: false })
      .order('time_taken_seconds', { ascending: true })
      .limit(20)
    return error ? [] : data || []
  } catch { return [] }
}
function leaderboardHtml(rows) {
  return `<section class="sunday-board glass-card" data-sunday-leaderboard data-safe-public-leaderboard="true"><div class="sunday-board-head"><div><span>🏆 Weekly Leaderboard</span><h2>Score + Time Ranking</h2><p class="safe-leaderboard-note">Public view protects privacy: only name, school, region, score and time are shown.</p></div><small>Week of ${weekStartIso()}</small></div>${rows.length ? rows.map((r, i) => `<div class="sunday-rank"><b>${i + 1}</b><span><strong>${esc(r.full_name || 'Candidate')}</strong><small>${esc(r.school_name || '')} • ${esc(r.region || '')}</small></span><em>${Number(r.score || 0)}/${Number(r.total || 40)}</em><small>${fmt(r.time_taken_seconds)}</small></div>`).join('') : '<p>No results yet this week.</p>'}</section>`
}
async function refreshLeaderboard() {
  const board = document.querySelector('[data-sunday-leaderboard]')
  if (!board) return
  const rows = await publicLeaderboard()
  if (rows.length || board.hasAttribute('data-safe-public-leaderboard')) board.outerHTML = leaderboardHtml(rows)
}
function updatePublicWording() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT
      return /1,560|1560|1,520|1520|1,480|1480/.test(node.nodeValue || '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
    }
  })
  const nodes = []
  while (walker.nextNode()) nodes.push(walker.currentNode)
  nodes.forEach(node => {
    node.nodeValue = node.nodeValue
      .replace(/about\s*1,560|≈\s*1,560|1,560|1560/gi, 'about 1,500+')
      .replace(/about\s*1,520|1,520|1520/gi, 'about 1,500+')
      .replace(/about\s*1,480|1,480|1480/gi, 'about 1,500+')
  })
  document.querySelectorAll('[data-bece-sunday-banner], .sunday-entry-modal, .sunday-hero').forEach(box => {
    if (box.querySelector('[data-bece-1500-note]')) return
    const target = box.querySelector('p') || box
    target.insertAdjacentHTML('afterend', '<p class="bece-1500-note" data-bece-1500-note>With one 40-question set each week, candidates can solve up to about <b>1,500+ BECE objective questions</b> before BECE 2027.</p>')
  })
}
function run() {
  updatePublicWording()
  refreshLeaderboard()
}
function scheduleRun() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; run() })
}

document.addEventListener('click', async event => {
  const startButton = event.target.closest('[data-bece-sunday-start]')
  if (!startButton) return
  if (Date.now() - Number(window.__mezzoSundayAttemptApprovedAt || 0) < ATTEMPT_APPROVAL_MS) return
  if (approving) { event.preventDefault(); event.stopImmediatePropagation(); return }

  event.preventDefault()
  event.stopImmediatePropagation()
  approving = true

  const candidate = readJson(CANDIDATE_KEY, null)
  if (!candidate?.contact) {
    approving = false
    toast('Register with phone number or email before starting the Sunday BECE trial.', 'error')
    return
  }

  const alreadyAttempted = await hasDatabaseAttempt(candidate.contact)
  if (alreadyAttempted) {
    approving = false
    toast('This candidate has already taken this week’s Sunday BECE trial. One official attempt is allowed per week.', 'warn')
    const reportButton = document.querySelector('[data-bece-sunday-report]')
    if (reportButton) reportButton.click()
    return
  }

  window.__mezzoSundayAttemptApprovedAt = Date.now()
  approving = false
  startButton.click()
}, true)

window.addEventListener('load', () => setTimeout(run, 1200))
window.addEventListener('mezzoProfileUpdated', scheduleRun)
new MutationObserver(scheduleRun).observe(document.documentElement, { childList: true, subtree: true })
setInterval(refreshLeaderboard, 30000)
