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

function installBeceHomeCard() {
  const grid = document.querySelector('.home-screen .home-mode-grid')
  if (!grid || grid.querySelector('.bece-home-card')) return
  grid.insertAdjacentHTML('beforeend', beceCardHtml())
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
