import './home-bece-card.css'

let queued = false

function beceCardHtml() {
  return `<button class="home-mode-card game-mode-card mode-bece bece-home-card" data-bece-page="true">
    <i class="mode-shine"></i>
    <div class="mode-top"><span class="mode-icon">📘</span><em>BECE Ready</em></div>
    <h3>BECE Practice</h3>
    <p>Practise BECE past-style and sample questions with progress tracking and downloadable AI reports.</p>
    <div class="reward-pill">📊 AI report</div>
    <strong>START BECE PRACTICE →</strong>
  </button>`
}

function findBotCard(grid) {
  return Array.from(grid.querySelectorAll('.home-mode-card,.game-mode-card')).find(card => {
    const text = (card.textContent || '').toLowerCase()
    return card.matches('[data-start-bot]') || text.includes('compete with bot') || text.includes('mathbot') || text.includes('battle mathbot')
  })
}

function installBeceHomeCard() {
  const grid = document.querySelector('.home-screen .home-mode-grid')
  if (!grid) return
  let bece = grid.querySelector('.bece-home-card')
  const bot = findBotCard(grid)
  if (!bece) {
    if (bot) bot.insertAdjacentHTML('beforebegin', beceCardHtml())
    else grid.insertAdjacentHTML('beforeend', beceCardHtml())
    bece = grid.querySelector('.bece-home-card')
  }
  if (bece && bot && bece.nextElementSibling !== bot) grid.insertBefore(bece, bot)
  if (bot && bece && bot !== grid.lastElementChild) grid.appendChild(bot)
}

function queueInstall() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => {
    queued = false
    installBeceHomeCard()
  })
}

const observer = new MutationObserver(queueInstall)
observer.observe(document.body, { childList: true, subtree: true, attributes: false })
window.addEventListener('load', queueInstall)
setTimeout(queueInstall, 300)
