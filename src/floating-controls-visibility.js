import './floating-controls-visibility.css'

let queued = false
let revealTimer = null

function isHomeScreen() {
  return Boolean(document.querySelector('.home-screen'))
}

function isActiveGameMode() {
  return Boolean(
    document.querySelector('.quiz-layout, .bece-live, .smart-live-board, .prep-question-card, .battle-screen, .solo-screen, .smartboard-screen, .bece-page:not(.home-screen), .prep-app')
  )
}

function shouldTemporarilyShow() {
  return Boolean(
    document.querySelector('.result-card, .smart-result-wrap, .bece-result, .prep-result, .subscription-gate-overlay, .bece-correction-overlay')
  )
}

function setModeClasses() {
  const home = isHomeScreen()
  const game = isActiveGameMode()
  document.body.classList.toggle('floating-controls-home', home)
  document.body.classList.toggle('floating-controls-game', !home && game)
  document.body.classList.toggle('floating-controls-normal', !home && !game)
  if (home) document.body.classList.remove('floating-controls-temporary')
  if (!home && shouldTemporarilyShow()) revealTemporarily()
}

function revealTemporarily(ms = 3200) {
  if (isHomeScreen()) return
  document.body.classList.add('floating-controls-temporary')
  clearTimeout(revealTimer)
  revealTimer = setTimeout(() => {
    if (!isHomeScreen()) document.body.classList.remove('floating-controls-temporary')
  }, ms)
}

function queueSync() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => {
    queued = false
    setModeClasses()
  })
}

document.addEventListener('click', event => {
  if (event.target.closest('.reward-mini-dock,.sound-toggle')) revealTemporarily(4200)
}, true)

window.addEventListener('mezzoRewardEarned', () => revealTemporarily(4200))
window.addEventListener('load', queueSync)
const observer = new MutationObserver(queueSync)
observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: false })
setTimeout(queueSync, 300)
