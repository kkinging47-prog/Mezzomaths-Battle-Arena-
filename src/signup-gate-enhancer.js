import './signup-gate.css'

let modalOpen = false
let gateShownThisSession = false
let syncQueued = false

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback }
}
function isSignedIn() {
  const profile = readJson('mezzo_profile', null)
  return Boolean(profile && (profile.email || profile.full_name || profile.role === 'admin' || profile.role === 'teacher'))
}
function currentQuestionNumber() {
  const metaText = document.querySelector('.question-meta')?.textContent || ''
  const prepText = document.querySelector('.prep-topbar span')?.textContent || ''
  const smartText = document.querySelector('.smart-meta')?.textContent || ''
  const standard = metaText.match(/Q\s*(\d+)\s*\//i)
  if (standard) return Number(standard[1])
  const prep = prepText.match(/Q\s*(\d+)\s*\//i)
  if (prep) return Number(prep[1])
  const smart = smartText.match(/Round\s*(\d+)/i)
  if (smart) return Number(smart[1])
  return 0
}
function modeName() {
  if (document.querySelector('.prep-app')) return 'Mezzopedia Prep'
  if (document.querySelector('.smartboard-screen')) return 'Smart Board 1v1'
  if (document.querySelector('.battle-screen')) return 'Battle Mode'
  if (document.querySelector('.solo-screen')) return 'Practice Mode'
  return 'Mezzo Maths Battle Arena'
}
function closeModal() {
  document.querySelector('.signup-gate-overlay')?.remove()
  modalOpen = false
}
function openAuth(mode = 'signup') {
  localStorage.setItem('mezzo_auth_preferred_mode', mode)
  closeModal()
  const tab = document.querySelector('[data-target="auth"]')
  if (tab) tab.click()
  setTimeout(() => {
    const switcher = document.querySelector(`[data-auth-mode="${mode}"]`)
    if (switcher) switcher.click()
  }, 150)
}
function modalHtml() {
  return `<div class="signup-gate-overlay" role="dialog" aria-modal="true" aria-label="Sign up prompt">
    <section class="signup-gate-card">
      <button class="signup-gate-close" type="button" aria-label="Close">×</button>
      <div class="signup-gate-icon">🔐</div>
      <span class="signup-gate-kicker">You have completed 10 questions</span>
      <h2>Save your progress and continue learning</h2>
      <p>You have reached the free practice checkpoint in <strong>${modeName()}</strong>. Sign up or sign in to keep your XP, coins, badges, scores, topic progress and leaderboard records.</p>
      <div class="signup-gate-benefits">
        <div><b>⚡ XP</b><small>Keep rewards</small></div>
        <div><b>🏆 Badges</b><small>Unlock trophies</small></div>
        <div><b>📊 Progress</b><small>Track topics</small></div>
      </div>
      <div class="signup-gate-actions">
        <button class="btn btn-gold" type="button" data-gate-auth="signup">Create Account</button>
        <button class="btn btn-primary" type="button" data-gate-auth="login">Sign In</button>
      </div>
    </section>
  </div>`
}
function showGate() {
  if (isSignedIn() || modalOpen || gateShownThisSession) return
  gateShownThisSession = true
  modalOpen = true
  document.body.insertAdjacentHTML('beforeend', modalHtml())
}
function checkGate() {
  if (isSignedIn() || modalOpen || gateShownThisSession) return
  const q = currentQuestionNumber()
  if (q >= 10) showGate()
}
function queueCheck() {
  if (syncQueued) return
  syncQueued = true
  requestAnimationFrame(() => {
    syncQueued = false
    checkGate()
  })
}

document.addEventListener('click', event => {
  const auth = event.target.closest('[data-gate-auth]')
  if (auth) { openAuth(auth.dataset.gateAuth); return }
  if (event.target.closest('.signup-gate-close')) { closeModal(); return }
  const answerClick = event.target.closest('[data-solo-answer], [data-battle-answer], [data-prep-answer], [data-submit-smart]')
  if (answerClick) setTimeout(checkGate, 180)
}, true)

const observer = new MutationObserver(queueCheck)
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false })
window.addEventListener('load', queueCheck)
setTimeout(queueCheck, 300)
