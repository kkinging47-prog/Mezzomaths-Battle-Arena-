import { supabase, isSupabaseConfigured } from './supabaseClient.js'

function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])) }
function icon(status) { return status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌' }
async function tableCheck(table, label) {
  if (!supabase) return { label, status: 'warn', detail: 'Supabase not configured.' }
  try {
    const { data, error } = await supabase.from(table).select('*').limit(1)
    if (error) return { label, status: 'fail', detail: error.message }
    return { label, status: 'pass', detail: `${table} is reachable. Sample rows returned: ${data?.length || 0}.` }
  } catch (error) {
    return { label, status: 'fail', detail: error.message || 'Check failed.' }
  }
}
async function authCheck() {
  if (!isSupabaseConfigured || !supabase) return { label: 'Supabase Auth', status: 'warn', detail: 'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing.' }
  const { data } = await supabase.auth.getSession()
  return data?.session?.user
    ? { label: 'Supabase Auth', status: 'pass', detail: `Signed in as ${data.session.user.email}.` }
    : { label: 'Supabase Auth', status: 'warn', detail: 'No live user session yet. Create/login with a real Supabase account.' }
}
function render(results) {
  const host = document.querySelector('[data-system-health-panel]')
  if (!host) return
  host.querySelector('[data-production-live-readiness]')?.remove()
  host.insertAdjacentHTML('beforeend', `<section class="production-live-readiness" data-production-live-readiness="true"><h3>Full-Scale Live Readiness</h3><div class="system-health-grid">${results.map(r => `<article class="${r.status}"><strong>${icon(r.status)} ${escapeHtml(r.label)}</strong><p>${escapeHtml(r.detail)}</p></article>`).join('')}</div><p class="system-health-note">For launch, all database table checks should pass after running migration 013 and signing in with a live Supabase account.</p></section>`)
}
async function runLiveReadiness() {
  const results = [await authCheck()]
  for (const [table, label] of [['profiles','Profiles / Logins'], ['question_bank','Question Bank'], ['game_score_records','Score Records'], ['user_progress_snapshots','Progress Snapshots'], ['practice_sessions','Practice Sessions']]) results.push(await tableCheck(table, label))
  render(results)
}

document.addEventListener('click', event => {
  if (event.target.closest('[data-run-system-health], [data-system-health-open]')) setTimeout(runLiveReadiness, 1200)
}, true)
window.addEventListener('mezzoCloudSyncComplete', () => setTimeout(runLiveReadiness, 400))
setTimeout(() => { if (document.querySelector('[data-system-health-panel]')) runLiveReadiness() }, 1200)
