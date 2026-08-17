import './centered-answer-feedback.css'

let lastKey = ''
let closeTimer = null

function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])) }
function activePractice() { return document.querySelector('.question-card, .bece-question-card') }
function selectedResultFromPage() {
  const card = activePractice()
  if (!card) return null
  const selected = card.querySelector('.answer-card.correct, .answer-card.wrong, [data-bece-answer].bece-correct, [data-bece-answer].bece-wrong, [data-bece-answer].bece-selected')
  const isCorrect = Boolean(card.querySelector('.answer-card.correct, [data-bece-answer].bece-correct'))
  const isWrong = Boolean(card.querySelector('.answer-card.wrong, [data-bece-answer].bece-wrong'))
  const banner = document.querySelector('.result-banner strong, .bece-feedback strong')?.textContent || ''
  const explanation = document.querySelector('.explanation-card p, .bece-feedback p')?.textContent || ''
  const correctAnswer = card.dataset.correctAnswer || document.querySelector('.result-banner span')?.textContent || ''
  if (!selected && !banner) return null
  const correct = isCorrect || /correct/i.test(banner) && !/not correct/i.test(banner)
  const wrong = isWrong || /not correct|wrong/i.test(banner)
  return { correct: correct && !wrong, title: correct && !wrong ? 'Correct!' : 'Not correct', explanation, correctAnswer }
}
function showFeedback() {
  const result = selectedResultFromPage()
  if (!result) return
  const key = `${result.title}|${result.explanation}|${result.correctAnswer}`
  if (key === lastKey) return
  lastKey = key
  document.querySelector('[data-centered-answer-feedback]')?.remove()
  document.body.insertAdjacentHTML('beforeend', `<div class="centered-answer-backdrop" data-centered-answer-feedback="true"><section class="centered-answer-card ${result.correct ? 'correct' : 'wrong'}"><button type="button" class="centered-answer-close" data-close-centered-answer="true">×</button><div class="centered-answer-icon">${result.correct ? '✅' : '❌'}</div><h3>${escapeHtml(result.title)}</h3>${result.correctAnswer ? `<p class="centered-answer-correct">${escapeHtml(result.correctAnswer)}</p>` : ''}${result.explanation ? `<p>${escapeHtml(result.explanation)}</p>` : '<p>Review the method, then continue to the next question.</p>'}</section></div>`)
  clearTimeout(closeTimer)
  closeTimer = setTimeout(() => document.querySelector('[data-centered-answer-feedback]')?.remove(), 1800)
}
function hideOriginalInlineFeedback() {
  document.querySelectorAll('.explanation-card, .bece-feedback').forEach(card => card.classList.add('inline-feedback-compact-hidden'))
}
function sync() {
  hideOriginalInlineFeedback()
  if (document.querySelector('.answer-card.correct, .answer-card.wrong, [data-bece-answer].bece-correct, [data-bece-answer].bece-wrong, [data-bece-answer].bece-selected, .bece-feedback, .explanation-card')) showFeedback()
}

document.addEventListener('click', event => {
  if (event.target.closest('[data-close-centered-answer]')) { event.preventDefault(); document.querySelector('[data-centered-answer-feedback]')?.remove(); return }
  if (event.target.closest('[data-solo-answer], [data-battle-answer], [data-bece-answer]')) setTimeout(sync, 80)
  if (event.target.closest('#nextSolo, #nextBattle, [data-next-bece]')) { lastKey = ''; document.querySelector('[data-centered-answer-feedback]')?.remove() }
}, true)

const observer = new MutationObserver(() => requestAnimationFrame(sync))
observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
setTimeout(sync, 500)
