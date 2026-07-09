import { supabase } from './supabaseClient.js'
import './online-matchmaking.css'

const CLIENT_KEY = 'mezzo_match_client_id'
let allowNextBattleClick = false
let scanning = false

function clientId() {
  let id = sessionStorage.getItem(CLIENT_KEY)
  if (!id) {
    id = `player_${Date.now()}_${Math.random().toString(16).slice(2)}`
    sessionStorage.setItem(CLIENT_KEY, id)
  }
  return id
}
function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function profile() { return readJson('mezzo_profile', {}) || {} }
function valueOf(id, fallback = '') { return document.getElementById(id)?.value || fallback }
function matchKey() {
  return [valueOf('battleClass', 'Grade 4'), valueOf('battleCurriculum', 'GES'), valueOf('battleTopic', 'Multiplication by 4 (2 Digits)')].join('|')
}
function showOverlay() {
  closeOverlay()
  document.body.insertAdjacentHTML('beforeend', `<div class="matchmaking-overlay" role="dialog" aria-modal="true"><section class="matchmaking-card"><div class="scanner-ring"><span>⚔️</span></div><h2>Scanning for Online Participant</h2><p>Looking for another learner practising the same class, curriculum and topic...</p><div class="scan-steps"><span class="active">Checking online queue</span><span>Matching topic</span><span>Preparing arena</span></div><small>If no live learner is found, you will automatically be paired with MathBot.</small></section></div>`)
}
function closeOverlay() { document.querySelector('.matchmaking-overlay')?.remove() }
function updateOverlay(message, ok = false) {
  const card = document.querySelector('.matchmaking-card')
  if (!card) return
  card.querySelector('p').textContent = message
  card.classList.toggle('matched', ok)
}
async function supabaseScan() {
  if (!supabase) return null
  const p = profile()
  const now = new Date().toISOString()
  const expires = new Date(Date.now() + 45_000).toISOString()
  const key = matchKey()
  const row = {
    client_id: clientId(),
    match_key: key,
    student_name: p.full_name || p.email || 'Online Student',
    class_level: valueOf('battleClass', 'Grade 4'),
    curriculum: valueOf('battleCurriculum', 'GES'),
    topic: valueOf('battleTopic', 'Multiplication by 4 (2 Digits)'),
    status: 'waiting',
    updated_at: now,
    expires_at: expires
  }
  try {
    await supabase.from('battle_match_queue').upsert(row, { onConflict: 'client_id' })
    const started = Date.now()
    while (Date.now() - started < 8000) {
      const { data, error } = await supabase
        .from('battle_match_queue')
        .select('*')
        .eq('match_key', key)
        .eq('status', 'waiting')
        .neq('client_id', clientId())
        .gt('expires_at', new Date().toISOString())
        .limit(1)
      if (!error && data?.length) {
        const peer = data[0]
        await supabase.from('battle_match_queue').update({ status: 'matched', updated_at: new Date().toISOString() }).in('client_id', [clientId(), peer.client_id])
        return peer.student_name || 'Online Participant'
      }
      await new Promise(resolve => setTimeout(resolve, 1200))
      await supabase.from('battle_match_queue').update({ updated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 45_000).toISOString() }).eq('client_id', clientId())
    }
  } catch {
    return null
  }
  return null
}
async function localDemoScan() {
  await new Promise(resolve => setTimeout(resolve, 5200))
  return null
}
function continueBattle(asBot, opponentName = '') {
  const select = document.getElementById('battleOpponent')
  if (select) select.value = asBot ? 'Bot' : 'Online Participant'
  if (opponentName) localStorage.setItem('mezzo_last_online_opponent', opponentName)
  allowNextBattleClick = true
  closeOverlay()
  const button = document.getElementById('startBattle2') || document.getElementById('startBattle')
  if (button) button.click()
}
async function runMatchmaking() {
  if (scanning) return
  scanning = true
  showOverlay()
  let peer = await supabaseScan()
  if (!peer) peer = await localDemoScan()
  if (peer) {
    updateOverlay(`Matched with ${peer}. Starting online 1v1...`, true)
    setTimeout(() => { scanning = false; continueBattle(false, peer) }, 900)
  } else {
    updateOverlay('No live learner found right now. Pairing you with MathBot...', false)
    setTimeout(() => { scanning = false; continueBattle(true) }, 1100)
  }
}

document.addEventListener('click', event => {
  const online = event.target.closest('#startBattle, #startBattle2')
  if (!online) return
  if (allowNextBattleClick) { allowNextBattleClick = false; return }
  event.preventDefault()
  event.stopImmediatePropagation()
  runMatchmaking()
}, true)
