import './bece-correction.css'

let queued = false
let correctionOpen = false

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback }
}
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
function answers() { return readJson('mezzo_bece_detailed_answers', []) }
function uniqueLatestAnswers(limit = 20) {
  const seen = new Set()
  return answers()
    .filter(a => a.question)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .filter(a => {
      const key = a.question
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, limit)
}
function latestWrongAnswers() {
  return uniqueLatestAnswers(20).filter(a => !a.correct).slice(0, 10)
}
function optionLetters() { return ['A', 'B', 'C', 'D'] }
function buildOptions(row) {
  const correct = row.correctAnswer || ''
  const correctText = row.correctText || correct
  const selected = row.selected || ''
  const selectedText = row.selectedText || selected
  const out = {}
  if (selected) out[selected] = selectedText
  if (correct) out[correct] = correctText
  optionLetters().forEach(letter => { out[letter] ||= letter === correct ? correctText : `Option ${letter}` })
  return out
}
function wrongPanelHtml() {
  const wrong = latestWrongAnswers()
  const latest = uniqueLatestAnswers(20).slice(0, 10)
  const total = latest.length
  const wrongCount = wrong.length
  const corrected = latest.filter(a => a.corrected_after_review).length
  return `<section class="bece-wrong-review light-card" data-bece-wrong-review="true">
    <div class="wrong-review-head"><div><span>🧾 Answer Review</span><h2>Questions You Got Wrong</h2><p>${wrongCount ? `You missed ${wrongCount} question(s). Open each question, review it, and select the correct option again.` : 'Great work. No wrong questions were found in your latest BECE set.'}</p></div><div class="wrong-review-score"><strong>${Math.max(0, total - wrongCount)}/${total || 10}</strong><small>Latest set</small>${corrected ? `<em>${corrected} corrected</em>` : ''}</div></div>
    <div class="wrong-question-list">${wrong.length ? wrong.map((row, idx) => `<article><b>Q${idx + 1} • ${escapeHtml(row.topic || 'BECE')}</b><span>${escapeHtml(row.question || '')}</span><small>Your answer: ${escapeHtml(row.selectedText || row.selected || '')} • Correct answer: ${escapeHtml(row.correctText || row.correctAnswer || '')}</small><button class="btn btn-gold btn-small" data-correct-bece-question="${encodeURIComponent(row.question || '')}">Come Back & Correct</button></article>`).join('') : '<p class="no-wrong-msg">No wrong questions to review. Try another BECE set for more practice.</p>'}</div>
  </section>`
}
function installWrongPanel() {
  const result = document.querySelector('.bece-result')
  if (!result || result.querySelector('[data-bece-wrong-review]')) return
  result.insertAdjacentHTML('beforeend', wrongPanelHtml())
}
function openCorrection(question) {
  if (correctionOpen) return
  const row = answers().find(a => a.question === question && !a.correct) || answers().find(a => a.question === question)
  if (!row) return
  correctionOpen = true
  const options = buildOptions(row)
  document.body.insertAdjacentHTML('beforeend', `<div class="bece-correction-overlay" role="dialog" aria-modal="true">
    <section class="bece-correction-card">
      <button class="bece-correction-close" type="button" aria-label="Close">×</button>
      <span class="correction-kicker">🔁 Correct Your Mistake</span>
      <h2>${escapeHtml(row.question || '')}</h2>
      <div class="correction-options">${optionLetters().map(letter => `<button data-submit-correction="${letter}" data-question-key="${encodeURIComponent(row.question || '')}"><b>${letter}</b><span>${escapeHtml(options[letter])}</span></button>`).join('')}</div>
      <p class="correction-note">Previous answer: <b>${escapeHtml(row.selectedText || row.selected || '')}</b>. Select the right option to fix this question in your progress report.</p>
    </section>
  </div>`)
}
function closeCorrection() {
  document.querySelector('.bece-correction-overlay')?.remove()
  correctionOpen = false
}
function submitCorrection(letter, question) {
  const rows = answers()
  const index = rows.findIndex(a => a.question === question)
  if (index < 0) return
  const row = rows[index]
  const correct = letter === row.correctAnswer
  const button = document.querySelector(`[data-submit-correction="${letter}"]`)
  if (button) button.classList.add(correct ? 'correction-right' : 'correction-wrong')
  document.querySelectorAll('[data-submit-correction]').forEach(btn => {
    if (btn.dataset.submitCorrection === row.correctAnswer) btn.classList.add('correction-right')
    btn.disabled = true
  })
  if (correct) {
    rows[index] = {
      ...row,
      selected: row.correctAnswer,
      selectedText: row.correctText || row.correctAnswer,
      correct: true,
      corrected_after_review: true,
      corrected_at: new Date().toISOString()
    }
    saveJson('mezzo_bece_detailed_answers', rows)
    setTimeout(() => {
      closeCorrection()
      refreshWrongPanel()
    }, 700)
  } else {
    const card = document.querySelector('.bece-correction-card')
    if (card && !card.querySelector('.correction-error')) card.insertAdjacentHTML('beforeend', '<div class="correction-error">Not yet. Look at the highlighted correct option and try similar questions again.</div>')
  }
}
function refreshWrongPanel() {
  const old = document.querySelector('[data-bece-wrong-review]')
  if (old) old.outerHTML = wrongPanelHtml()
}
function addLiveChangeHint() {
  const feedback = document.querySelector('.bece-feedback.cumulative')
  if (!feedback || feedback.querySelector('[data-change-answer-note]')) return
  feedback.insertAdjacentHTML('beforeend', '<small data-change-answer-note class="change-answer-note">Need to change your answer? Use the final review to come back and correct any wrong question.</small>')
}
function queueSync() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => {
    queued = false
    installWrongPanel()
    addLiveChangeHint()
  })
}

document.addEventListener('click', event => {
  const open = event.target.closest('[data-correct-bece-question]')
  if (open) { event.preventDefault(); openCorrection(decodeURIComponent(open.dataset.correctBeceQuestion || '')); return }
  const correction = event.target.closest('[data-submit-correction]')
  if (correction) { event.preventDefault(); submitCorrection(correction.dataset.submitCorrection, decodeURIComponent(correction.dataset.questionKey || '')); return }
  if (event.target.closest('.bece-correction-close')) { closeCorrection(); return }
})

const observer = new MutationObserver(queueSync)
observer.observe(document.body, { childList: true, subtree: true, attributes: false })
window.addEventListener('load', queueSync)
setTimeout(queueSync, 350)
