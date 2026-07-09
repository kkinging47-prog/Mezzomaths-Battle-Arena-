import './subscription-button.css'

let queued = false

function installSubscriptionButtons() {
  document.querySelectorAll('.tab-scroll').forEach(nav => {
    if (!nav.querySelector('[data-subscription-nav-button]')) {
      const btn = document.createElement('button')
      btn.className = 'screen-tab subscription-nav-button'
      btn.type = 'button'
      btn.dataset.openSubscriptions = 'true'
      btn.dataset.subscriptionNavButton = 'true'
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

const observer = new MutationObserver(queueInstall)
observer.observe(document.body, { childList: true, subtree: true, attributes: false })
window.addEventListener('load', queueInstall)
setTimeout(queueInstall, 300)
