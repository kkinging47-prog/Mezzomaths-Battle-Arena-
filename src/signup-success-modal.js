import './signup-success-modal.css'

let lastProfileKey = ''
let pendingSignup = false

function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])) }
function profile() { try { return JSON.parse(localStorage.getItem('mezzo_profile') || '{}') } catch { return {} } }
function showSignupSuccess(message, profileData = profile()) {
  document.querySelector('[data-signup-success-modal]')?.remove()
  document.body.insertAdjacentHTML('beforeend', `<div class="signup-success-backdrop" data-signup-success-modal="true"><section class="signup-success-card"><button type="button" data-close-signup-success="true">×</button><div class="signup-success-icon">🎉</div><h2>Account Created Successfully</h2><p>${escapeHtml(message || 'Your Mezzo Maths account has been created successfully.')}</p><div class="signup-success-meta"><strong>${escapeHtml(profileData.full_name || profileData.email || 'New User')}</strong><span>${escapeHtml(profileData.role || 'student')} • ${escapeHtml(profileData.class_level || 'Class not set')}</span></div><button type="button" class="btn btn-gold" data-close-signup-success="true">Continue</button></section></div>`)
}

document.addEventListener('submit', event => {
  if (event.target?.id === 'signupForm') pendingSignup = true
}, true)

window.addEventListener('mezzoProfileUpdated', event => {
  const p = event.detail || profile()
  const key = `${p.email}|${p.role}|${p.full_name}`
  if (!pendingSignup || key === lastProfileKey) return
  pendingSignup = false
  lastProfileKey = key
  setTimeout(() => showSignupSuccess('Your account is ready. You can now use the dashboard and your progress will be saved when the database is connected.', p), 120)
})

document.addEventListener('click', event => {
  if (!event.target.closest('[data-close-signup-success]')) return
  event.preventDefault()
  document.querySelector('[data-signup-success-modal]')?.remove()
}, true)
