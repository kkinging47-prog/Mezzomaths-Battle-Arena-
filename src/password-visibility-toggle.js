import './password-visibility-toggle.css'

let queued = false

function enhancePassword(input) {
  if (!input || input.dataset.passwordVisibilityReady === 'true') return
  input.dataset.passwordVisibilityReady = 'true'
  input.setAttribute('autocomplete', input.closest('#signupForm') ? 'new-password' : 'current-password')
  const wrapper = document.createElement('div')
  wrapper.className = 'password-visibility-wrap'
  input.parentNode.insertBefore(wrapper, input)
  wrapper.appendChild(input)
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'password-visibility-btn'
  btn.dataset.togglePasswordVisibility = 'true'
  btn.setAttribute('aria-label', 'Show password')
  btn.innerHTML = '<span>👁️</span><b>Show</b>'
  wrapper.appendChild(btn)
}
function sync() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => {
    queued = false
    document.querySelectorAll('input[type="password"], input[data-password-visibility-ready="true"]').forEach(enhancePassword)
  })
}

document.addEventListener('click', event => {
  const btn = event.target.closest('[data-toggle-password-visibility]')
  if (!btn) return
  event.preventDefault()
  const input = btn.closest('.password-visibility-wrap')?.querySelector('input')
  if (!input) return
  const showing = input.type === 'text'
  input.type = showing ? 'password' : 'text'
  btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password')
  btn.innerHTML = showing ? '<span>👁️</span><b>Show</b>' : '<span>🙈</span><b>Hide</b>'
}, true)

const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['type'] })
window.addEventListener('load', sync)
setTimeout(sync, 350)
