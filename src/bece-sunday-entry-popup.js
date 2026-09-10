import './bece-sunday-entry-popup.css'

const POPUP_KEY = 'mezzo_bece_sunday_entry_popup_seen'
let ticker = null

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]))
}

function trialWindow(now = new Date()) {
  const day = now.getUTCDay()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 18, 0, 0))
  start.setUTCDate(start.getUTCDate() + ((7 - day) % 7))
  const end = new Date(start)
  end.setUTCHours(20, 0, 0, 0)

  if (day === 0 && now >= start && now < end) {
    return { open: true, start, end, ms: end - now }
  }

  if (now >= end || (day === 0 && now >= end)) start.setUTCDate(start.getUTCDate() + 7)
  return { open: false, start, end, ms: start - now }
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (days) return `${days}d ${hours}h ${minutes}m`
  return `${hours}h ${minutes}m ${seconds}s`
}

function countdownText() {
  const windowInfo = trialWindow()
  return {
    label: windowInfo.open ? 'Window closes in' : 'Next test opens in',
    time: formatDuration(windowInfo.ms),
    open: windowInfo.open
  }
}

function closePopup() {
  document.querySelector('[data-bece-sunday-entry-popup]')?.remove()
  if (ticker) clearInterval(ticker)
  ticker = null
}

function logoHtml() {
  let customLogo = ''
  try { customLogo = localStorage.getItem('mezzo_custom_logo') || '' } catch {}
  if (customLogo) return `<img src="${escapeHtml(customLogo)}" alt="Mezzo Maths logo" />`
  return '<span class="sunday-popup-logo-mark">M</span><strong>Mezzo Maths</strong>'
}

function html() {
  const count = countdownText()
  return `<div class="sunday-entry-backdrop" data-bece-sunday-entry-popup="true" role="dialog" aria-modal="true" aria-label="Free Sunday BECE Special Test">
    <section class="sunday-entry-modal">
      <button class="sunday-entry-close" type="button" aria-label="Close Sunday BECE special test popup" data-sunday-entry-close="true">×</button>
      <div class="sunday-entry-top">
        <div class="sunday-entry-logo">${logoHtml()}</div>
        <span class="sunday-entry-pill">${count.open ? '🟢 Open now' : '⏳ Opens every Sunday'}</span>
      </div>
      <div class="sunday-entry-body">
        <div class="sunday-entry-copy">
          <span class="sunday-entry-kicker">Free national practice window</span>
          <h2>Sunday BECE Special Test</h2>
          <p>Grade 9, JHS 3 and Basic 9 candidates can take <b>40 BECE objective questions</b> every Sunday evening, compare scores on the weekly leaderboard, and receive a progress report with AI-style performance analysis.</p>
          <div class="sunday-entry-time"><span>Every Sunday</span><strong>6:00 PM – 8:00 PM</strong><em>Ghana time</em></div>
        </div>
        <div class="sunday-entry-panel">
          <small data-sunday-entry-count-label>${escapeHtml(count.label)}</small>
          <strong data-sunday-entry-countdown>${escapeHtml(count.time)}</strong>
          <span>Score • Time • Progress • Confidence</span>
        </div>
      </div>
      <div class="sunday-entry-benefits">
        <span>✅ Free registration</span>
        <span>🏆 Weekly leaderboard</span>
        <span>📊 Instant progress report</span>
        <span>🧠 AI analysis</span>
      </div>
      <div class="sunday-entry-actions">
        <button class="btn btn-gold sunday-entry-primary" type="button" data-bece-sunday-open="true" data-sunday-entry-go="true">Go to Sunday Test Page</button>
        <button class="btn btn-ghost sunday-entry-secondary" type="button" data-sunday-entry-close="true">Browse Homepage</button>
      </div>
      <a class="sunday-entry-link" href="https://play.mezzomaths.org" target="_blank" rel="noreferrer">play.mezzomaths.org</a>
    </section>
  </div>`
}

function refreshCountdown() {
  const modal = document.querySelector('[data-bece-sunday-entry-popup]')
  if (!modal) return
  const count = countdownText()
  const label = modal.querySelector('[data-sunday-entry-count-label]')
  const timer = modal.querySelector('[data-sunday-entry-countdown]')
  if (label) label.textContent = count.label
  if (timer) timer.textContent = count.time
}

function shouldShow() {
  if (sessionStorage.getItem(POPUP_KEY)) return false
  if (document.querySelector('[data-bece-sunday-entry-popup]')) return false
  if (document.querySelector('.bece-sunday-page')) return false
  return true
}

function showPopup() {
  if (!shouldShow()) return
  sessionStorage.setItem(POPUP_KEY, 'yes')
  document.body.insertAdjacentHTML('beforeend', html())
  ticker = setInterval(refreshCountdown, 1000)
}

document.addEventListener('click', event => {
  if (event.target.closest('[data-sunday-entry-close]')) {
    event.preventDefault()
    closePopup()
    return
  }
  if (event.target.closest('[data-sunday-entry-go]')) {
    setTimeout(closePopup, 50)
  }
}, true)

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closePopup()
})

window.addEventListener('load', () => setTimeout(showPopup, 900))
setTimeout(showPopup, 1500)
