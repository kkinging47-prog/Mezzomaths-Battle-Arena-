import './bot-battle-reliability.css'

let launching = false
let attempts = 0

function toast(message) {
  document.querySelector('.bot-battle-toast')?.remove()
  document.body.insertAdjacentHTML('beforeend', `<div class="bot-battle-toast">${String(message).replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]))}</div>`)
  setTimeout(() => document.querySelector('.bot-battle-toast')?.remove(), 4200)
}
function setBotAndStart() {
  const opponent = document.getElementById('battleOpponent')
  if (opponent) {
    opponent.value = 'Bot'
    opponent.dispatchEvent(new Event('change', { bubbles: true }))
  }
  const start = document.getElementById('startBattle2') || document.getElementById('startBotBattle') || document.getElementById('startBattle')
  if (start && !document.querySelector('.battle-screen .question-card')) {
    start.click()
    return true
  }
  return Boolean(document.querySelector('.battle-screen .question-card'))
}
function launchBotBattle() {
  if (launching) return
  launching = true
  attempts = 0
  toast('Opening Compete With Bot...')
  document.querySelector('[data-target="battle"]')?.click()
  const timer = setInterval(() => {
    attempts += 1
    if (setBotAndStart() || attempts > 8) {
      clearInterval(timer)
      launching = false
      if (attempts > 8 && !document.querySelector('.battle-screen .question-card')) toast('Bot battle could not start. Please check that questions exist for the selected topic.')
    }
  }, 220)
}

document.addEventListener('click', event => {
  const target = event.target.closest('[data-start-bot], #startBotBattle')
  const cardText = event.target.closest('.home-mode-card, .game-mode-card, button')?.textContent?.toLowerCase() || ''
  if (!target && !cardText.includes('compete with bot') && !cardText.includes('battle mathbot')) return
  event.preventDefault()
  event.stopImmediatePropagation()
  launchBotBattle()
}, true)
