let fixingAnswer = false

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback }
}
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }

function fixLatestBeceAnswer(button) {
  if (fixingAnswer) return
  fixingAnswer = true
  setTimeout(() => {
    fixingAnswer = false
    const card = button.closest('.bece-question-card')
    if (!card) return
    const question = card.querySelector('h2')?.textContent?.trim() || ''
    const topic = card.querySelector('.bece-meta span')?.textContent?.trim() || 'BECE Practice'
    const selected = button.dataset.beceAnswer || ''
    const selectedText = button.querySelector('span')?.textContent?.trim() || ''
    const correctAnswer = card.dataset.correctAnswer || card.querySelector('.bece-correct')?.dataset.beceAnswer || ''
    const correctText = card.dataset.correctText || card.querySelector('.bece-correct span')?.textContent?.trim() || ''
    const mode = document.querySelector('.bece-side div:nth-child(3) strong')?.textContent?.trim() || 'BECE Practice'
    const correct = selected === correctAnswer
    const rows = readJson('mezzo_bece_detailed_answers', [])
    const matchIndex = rows.findIndex(row => row.question === question && row.selected === selected)
    const item = { topic, question, selected, selectedText, correctAnswer, correctText, correct, mode, date: new Date().toISOString() }
    if (matchIndex >= 0) rows[matchIndex] = { ...rows[matchIndex], ...item }
    else rows.unshift(item)
    saveJson('mezzo_bece_detailed_answers', rows.slice(0, 1000))
  }, 280)
}

document.addEventListener('click', event => {
  const answer = event.target.closest('[data-bece-answer]')
  if (answer) fixLatestBeceAnswer(answer)
}, true)
