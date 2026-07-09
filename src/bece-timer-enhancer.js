import './bece-timer.css'

const TIMER_KEY = 'mezzo_bece_timer_session'
const STANDARD_SECONDS = 60 * 60
let timerInterval = null
let resultSavedFor = ''

function readJson(key, fallback, storage = localStorage) {
  try { return JSON.parse(storage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback }
}
function saveJson(key, value, storage = localStorage) { storage.setItem(key, JSON.stringify(value)) }
function formatTime(seconds = 0) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}
function questionMeta() {
  const text = document.querySelector('.bece-question-card .bece-meta strong')?.textContent || ''
  const match = text.match(/Q\s*(\d+)\s*\/\s*(\d+)/i)
  return { number: match ? Number(match[1]) : 0, total: match ? Number(match[2]) : 10, text }
}
function activeSession() { return readJson(TIMER_KEY, null, sessionStorage) }
function createSession(type = 'BECE Practice') {
  const meta = questionMeta()
  const data = { id: `bece_time_${Date.now()}`, type, started_at: Date.now(), standard_seconds: STANDARD_SECONDS, total_questions: meta.total || 10, completed: false }
  saveJson(TIMER_KEY, data, sessionStorage)
  resultSavedFor = ''
  return data
}
function ensureSession() {
  let data = activeSession()
  if (!data || data.completed) data = createSession()
  return data
}
function elapsedSeconds(data = activeSession()) { return data?.started_at ? Math.floor((Date.now() - data.started_at) / 1000) : 0 }
function assessment(seconds) {
  if (seconds <= STANDARD_SECONDS * 0.75) return 'Excellent speed'
  if (seconds <= STANDARD_SECONDS) return 'Within standard time'
  return 'Above standard time'
}
function timerHtml(data) {
  const elapsed = elapsedSeconds(data)
  const remaining = STANDARD_SECONDS - elapsed
  return `<div class="bece-timer-card ${remaining < 0 ? 'over-time' : ''}" data-bece-timer-card="true"><span>⏱️</span><strong data-bece-time-used>${formatTime(elapsed)}</strong><small>Used of 60:00 standard</small><em data-bece-time-note>${assessment(elapsed)}</em></div>`
}
function installTimer() {
  const side = document.querySelector('.bece-live .bece-side')
  if (!side) { stopTimer(); return }
  const data = ensureSession()
  if (!side.querySelector('[data-bece-timer-card]')) side.insertAdjacentHTML('afterbegin', timerHtml(data))
  updateTimer()
  if (!timerInterval) timerInterval = setInterval(updateTimer, 1000)
}
function stopTimer() {
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = null
}
function updateTimer() {
  const card = document.querySelector('[data-bece-timer-card]')
  const data = activeSession()
  if (!card || !data) return
  const elapsed = elapsedSeconds(data)
  card.classList.toggle('over-time', elapsed > STANDARD_SECONDS)
  const used = card.querySelector('[data-bece-time-used]')
  const note = card.querySelector('[data-bece-time-note]')
  if (used) used.textContent = formatTime(elapsed)
  if (note) note.textContent = assessment(elapsed)
}
function updateLatestAnswerWithTime(button) {
  const data = activeSession()
  if (!data) return
  setTimeout(() => {
    const question = button.closest('.bece-question-card')?.querySelector('h2')?.textContent?.trim() || ''
    const selected = button.dataset.beceAnswer || ''
    const rows = readJson('mezzo_bece_detailed_answers', [])
    const idx = rows.findIndex(row => row.question === question && row.selected === selected)
    if (idx >= 0) {
      rows[idx] = { ...rows[idx], elapsed_seconds: elapsedSeconds(data), standard_seconds: STANDARD_SECONDS, time_status: assessment(elapsedSeconds(data)) }
      saveJson('mezzo_bece_detailed_answers', rows)
    }
  }, 520)
}
function saveResultTime() {
  const result = document.querySelector('.bece-result')
  const data = activeSession()
  if (!result || !data || data.completed || resultSavedFor === data.id) return
  const elapsed = elapsedSeconds(data)
  const history = readJson('mezzo_bece_history', [])
  if (history.length) {
    history[0] = { ...history[0], time_spent_seconds: elapsed, standard_seconds: STANDARD_SECONDS, time_status: assessment(elapsed), time_used_percent: Math.round((elapsed / STANDARD_SECONDS) * 100), completed_at: new Date().toISOString() }
    saveJson('mezzo_bece_history', history)
  }
  data.completed = true
  data.time_spent_seconds = elapsed
  data.time_status = assessment(elapsed)
  saveJson(TIMER_KEY, data, sessionStorage)
  resultSavedFor = data.id
  stopTimer()
  if (!result.querySelector('.bece-time-result')) {
    const remaining = STANDARD_SECONDS - elapsed
    result.querySelector('.bece-ai-note')?.insertAdjacentHTML('afterend', `<div class="bece-time-result"><strong>Time Used: ${formatTime(elapsed)}</strong><span>Standard: 60:00 • ${assessment(elapsed)}${remaining >= 0 ? ` • ${formatTime(remaining)} remaining` : ` • ${formatTime(Math.abs(remaining))} over`}</span></div>`)
  }
}
function syncTimer() {
  if (document.querySelector('.bece-live .bece-side')) installTimer()
  saveResultTime()
}

document.addEventListener('click', event => {
  const start = event.target.closest('[data-start-bece]')
  if (start) createSession(start.dataset.startBece || 'BECE Practice')
  const answer = event.target.closest('[data-bece-answer]')
  if (answer) updateLatestAnswerWithTime(answer)
}, true)

const observer = new MutationObserver(() => requestAnimationFrame(syncTimer))
observer.observe(document.body, { childList: true, subtree: true, attributes: false })
window.addEventListener('load', syncTimer)
setTimeout(syncTimer, 350)
