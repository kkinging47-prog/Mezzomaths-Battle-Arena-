import './quiz-fit.css'

let syncQueued = false

function syncFeedbackState() {
  document.querySelectorAll('.explanation-card').forEach(card => {
    const text = card.textContent || ''
    const wrong = /not correct|wrong|incorrect/i.test(text)
    const correct = /correct!/i.test(text) && !wrong
    card.dataset.feedback = wrong ? 'wrong' : correct ? 'correct' : 'neutral'
    const banner = card.querySelector('.result-banner')
    if (banner) banner.dataset.feedback = card.dataset.feedback
  })
}

function syncQuestionSizing() {
  document.querySelectorAll('.question-card h2').forEach(title => {
    const len = title.textContent.trim().length
    title.dataset.longQuestion = len > 70 ? 'true' : 'false'
    title.dataset.veryLongQuestion = len > 120 ? 'true' : 'false'
  })
}

function queueSync() {
  if (syncQueued) return
  syncQueued = true
  requestAnimationFrame(() => {
    syncQueued = false
    syncFeedbackState()
    syncQuestionSizing()
  })
}

const observer = new MutationObserver(queueSync)
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false })
window.addEventListener('load', queueSync)
setTimeout(queueSync, 250)
