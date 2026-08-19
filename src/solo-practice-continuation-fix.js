let advanceTimer = null

function questionSignature() {
  const card = document.querySelector('.solo-screen .question-card')
  if (!card) return ''
  const progress = card.querySelector('.question-meta span')?.textContent?.trim() || ''
  const question = card.querySelector('h2')?.textContent?.trim() || ''
  return `${progress}|${question}`
}

function clearAdvance() {
  if (advanceTimer) clearTimeout(advanceTimer)
  advanceTimer = null
}

function scheduleAdvance() {
  clearAdvance()
  const answeredQuestion = questionSignature()
  if (!answeredQuestion) return

  advanceTimer = setTimeout(() => {
    advanceTimer = null
    if (questionSignature() !== answeredQuestion) return
    const next = document.getElementById('nextSolo')
    if (next && !next.disabled) next.click()
  }, 2300)
}

document.addEventListener('click', event => {
  if (event.target.closest('[data-solo-answer]')) {
    setTimeout(scheduleAdvance, 120)
    return
  }
  if (event.target.closest('#nextSolo') || event.target.closest('[data-target], [data-courses-page], [data-bece-page]')) clearAdvance()
}, true)

window.addEventListener('pagehide', clearAdvance)
