const LETTERS = ['A', 'B', 'C', 'D']
let queued = false

function hashText(text = '') {
  let hash = 0
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0
  return Math.abs(hash)
}
function shuffleBySeed(list, seed) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280
    const j = seed % (i + 1)
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}
function getBankCorrect(question) {
  try {
    const bank = JSON.parse(localStorage.getItem('mezzo_question_bank') || '[]')
    const found = bank.find(q => String(q.question_text || '').trim() === question)
    return found?.correct_answer || found?.answer || ''
  } catch { return '' }
}
function textOfButton(button, type) {
  if (type === 'bece') return button.querySelector('span')?.textContent?.trim() || button.textContent.trim()
  return button.querySelector('strong')?.textContent?.trim() || button.textContent.trim()
}
function setButton(button, type, displayLetter, originalLetter, displayText) {
  if (type === 'bece') {
    const label = button.querySelector('b')
    const text = button.querySelector('span')
    if (label) label.textContent = displayLetter
    if (text) text.textContent = displayText
    button.dataset.beceAnswer = originalLetter
  } else {
    const label = button.querySelector('span')
    const text = button.querySelector('strong')
    if (label) label.textContent = displayLetter
    if (text) text.textContent = displayText
    if (button.dataset.soloAnswer !== undefined) button.dataset.soloAnswer = originalLetter
    if (button.dataset.battleAnswer !== undefined) button.dataset.battleAnswer = originalLetter
  }
  button.dataset.visibleLetter = displayLetter
  button.dataset.originalLetter = originalLetter
}
function selectedOriginal(buttons) {
  const selected = buttons.find(btn => btn.classList.contains('correct') || btn.classList.contains('wrong') || btn.classList.contains('bece-correct') || btn.classList.contains('bece-wrong') || btn.classList.contains('bece-selected'))
  return selected?.dataset.soloAnswer || selected?.dataset.battleAnswer || selected?.dataset.beceAnswer || ''
}
function applySelectedClasses(buttons, chosenOriginal, correctOriginal, type) {
  if (!chosenOriginal) return
  buttons.forEach(btn => {
    btn.classList.remove('correct', 'wrong', 'bece-correct', 'bece-wrong', 'bece-selected')
    if (btn.dataset.originalLetter !== chosenOriginal) return
    if (chosenOriginal === correctOriginal) btn.classList.add(type === 'bece' ? 'bece-correct' : 'correct')
    else btn.classList.add(type === 'bece' ? 'bece-wrong' : 'wrong')
  })
}
function randomizeCard(card, type) {
  const question = (type === 'bece' ? card.querySelector('h2') : card.querySelector('h2'))?.textContent?.trim() || ''
  if (!question) return
  const optionSelector = type === 'bece' ? '[data-bece-answer]' : '[data-solo-answer],[data-battle-answer]'
  const buttons = Array.from(card.querySelectorAll(optionSelector))
  if (buttons.length !== 4) return
  const seed = hashText(question)
  const signature = `${question}-${seed}`
  if (card.dataset.optionRandomized === signature) return

  const beforeSelected = selectedOriginal(buttons)
  const originalOptions = Object.fromEntries(buttons.map(btn => {
    const letter = btn.dataset.soloAnswer || btn.dataset.battleAnswer || btn.dataset.beceAnswer
    return [letter, textOfButton(btn, type)]
  }))
  const correctOriginal = type === 'bece' ? (card.dataset.correctAnswer || 'B') : (getBankCorrect(question) || 'B')
  const correctText = originalOptions[correctOriginal] || originalOptions.B || ''
  const correctDisplay = LETTERS[seed % 4]
  const wrongOriginals = LETTERS.filter(letter => letter !== correctOriginal)
  const wrongDisplays = shuffleBySeed(LETTERS.filter(letter => letter !== correctDisplay), seed + 11)
  const displayMap = { [correctDisplay]: { original: correctOriginal, text: correctText } }
  wrongDisplays.forEach((display, index) => {
    const original = wrongOriginals[index] || wrongOriginals[0]
    displayMap[display] = { original, text: originalOptions[original] || `Option ${display}` }
  })

  buttons.forEach(button => {
    const display = button.dataset.visibleLetter || (button.querySelector(type === 'bece' ? 'b' : 'span')?.textContent?.trim()) || 'A'
    const item = displayMap[display] || displayMap.A
    setButton(button, type, display, item.original, item.text)
  })
  applySelectedClasses(buttons, beforeSelected, correctOriginal, type)
  const answerBadge = document.querySelector('.result-banner span')
  if (answerBadge && answerBadge.textContent.includes('Answer:')) answerBadge.textContent = `Answer: ${correctDisplay}`
  card.dataset.optionRandomized = signature
  card.dataset.visibleCorrectAnswer = correctDisplay
}
function randomizeAll() {
  document.querySelectorAll('.question-card').forEach(card => randomizeCard(card, 'practice'))
  document.querySelectorAll('.bece-question-card').forEach(card => randomizeCard(card, 'bece'))
}
function queueRandomize() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => {
    queued = false
    randomizeAll()
  })
}

document.addEventListener('click', event => {
  const answer = event.target.closest('[data-solo-answer],[data-battle-answer],[data-bece-answer]')
  if (answer) answer.dataset.clickedVisibleLetter = answer.dataset.visibleLetter || ''
}, true)

const observer = new MutationObserver(queueRandomize)
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false })
window.addEventListener('load', queueRandomize)
setTimeout(queueRandomize, 300)
