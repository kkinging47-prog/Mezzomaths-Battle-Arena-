import './subscription-button.css'

let queued = false

function installSubscriptionButtons() {
  document.querySelectorAll('.tab-scroll').forEach(nav => {
    if (!nav.querySelector('[data-subscription-nav-button]')) {
      const btn = document.createElement('button')
      btn.className = 'screen-tab subscription-nav-button'
      btn.type = 'button'
      btn.setAttribute('data-open-subscriptions', 'true')
      btn.setAttribute('data-subscription-nav-button', 'true')
      btn.innerHTML = '<span>💳</span>Subscription'
      const auth = nav.querySelector('[data-target="auth"]')
      if (auth) auth.insertAdjacentElement('beforebegin', btn)
      else nav.appendChild(btn)
    }
  })

  const heroActions = document.querySelector('.home-screen .hero-actions')
  if (heroActions && !heroActions.querySelector('[data-subscription-hero-button]')) {
    heroActions.insertAdjacentHTML('beforeend', '<button class="btn btn-subscription" type="button" data-open-subscriptions="true" data-subscription-hero-button="true">💳 Subscription Plans</button>')
  }
}

function queueInstall() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => {
    queued = false
    installSubscriptionButtons()
  })
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-open-subscriptions], [data-subscription-nav-button], [data-subscription-hero-button]')
  if (!button) return
  event.preventDefault()
  window.dispatchEvent(new CustomEvent('mezzoOpenSubscriptions'))
}, true)

const observer = new MutationObserver(queueInstall)
observer.observe(document.body, { childList: true, subtree: true, attributes: false })
window.addEventListener('load', queueInstall)
setTimeout(queueInstall, 300)
