import './subscription-gate.css'
import './school-subscription.css'

const PLANS = [
  { id: 'weekly-starter', category: 'individual', name: 'Weekly Starter', price: 10, period: 'week', tag: 'Low entry', desc: 'Best for students who want to try premium practice for one week.', features: ['Unlimited daily practice', 'Solo practice', 'Basic rewards'] },
  { id: 'monthly-student', category: 'individual', name: 'Student Monthly', price: 35, period: 'month', tag: 'Most flexible', desc: 'Affordable monthly access for regular learners.', features: ['All practice modes', 'Battle modes', 'Badges and progress'] },
  { id: 'term-pass', category: 'individual', name: 'Term Pass', price: 90, period: 'term', tag: 'Best value', desc: 'Covers one school term at a lower effective monthly rate.', features: ['Full student access', 'Mezzopedia prep', 'Topic progress map'] },
  { id: 'annual-champion', category: 'individual', name: 'Annual Champion', price: 300, period: 'year', tag: 'Save more', desc: 'Full-year access for committed learners and contest preparation.', features: ['All features', 'Champion badges', 'Long-term progress'] },
  { id: 'school-starter-50', category: 'school', name: 'School Starter', price: 750, period: 'month', tag: '1-50 students', student_range: '1-50 students', desc: 'For small schools, clubs or a single class using Mezzo Maths.', features: ['Up to 50 student accounts', 'Teacher dashboard', 'Class progress reports', 'Course access'] },
  { id: 'school-growth-150', category: 'school', name: 'School Growth', price: 1800, period: 'month', tag: '51-150 students', student_range: '51-150 students', desc: 'For growing schools that want several classes connected.', features: ['Up to 150 student accounts', 'Multiple teacher views', 'BECE and course reports', 'Priority onboarding'] },
  { id: 'school-pro-300', category: 'school', name: 'School Pro', price: 3000, period: 'month', tag: '151-300 students', student_range: '151-300 students', desc: 'For medium schools running Mezzo Maths across departments.', features: ['Up to 300 student accounts', 'Department/class reports', 'Smart Board contests', 'Admin analytics'] },
  { id: 'school-premium-500', category: 'school', name: 'School Premium', price: 4500, period: 'month', tag: '301-500 students', student_range: '301-500 students', desc: 'For large schools needing broad access and stronger reporting.', features: ['Up to 500 student accounts', 'Full school analytics', 'Teacher/staff controls', 'Premium support'] },
  { id: 'school-enterprise-1000', category: 'school', name: 'School Enterprise', price: 7500, period: 'month', tag: '501-1000 students', student_range: '501-1000 students', desc: 'For large campuses and school groups with many learners.', features: ['Up to 1000 student accounts', 'Multi-class reporting', 'Bulk onboarding support', 'Custom review meetings'] }
]

let modalOpen = false
let syncQueued = false
let paymentBusy = false

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function profile() { return readJson('mezzo_profile', null) || {} }
function stats() { return readJson('mezzo_player_stats', {}) || {} }
function isSignedIn() { const p = profile(); return Boolean(p.email || p.full_name || p.role) }
function isSubscribed() { const sub = readJson('mezzo_subscription', null); return Boolean(sub?.active && (!sub.expires_at || new Date(sub.expires_at) > new Date())) }
function trialStatus() { const trial = readJson('mezzo_trial_extension', null); return trial?.active && trial?.expires_at && new Date(trial.expires_at) > new Date() ? trial : null }
function hasTrialExtension() { return Boolean(trialStatus()) }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
function levelReached() { const s = stats(); return Number(s.level || 1) >= 3 || Number(s.completedSets || 0) >= 3 }
function closeSubscriptionModal() { document.querySelector('.subscription-gate-overlay')?.remove(); modalOpen = false }
function goToDashboard() { closeSubscriptionModal(); const dashboard = document.querySelector('[data-target="dashboard"]'); if (dashboard) dashboard.click(); else window.dispatchEvent(new CustomEvent('mezzoNavigateDashboard')) }
function extendTrialAndDashboard() {
  const now = new Date()
  const existing = trialStatus()
  const base = existing ? new Date(existing.expires_at) : now
  base.setDate(base.getDate() + 7)
  saveJson('mezzo_trial_extension', { active: true, extended_at: now.toISOString(), expires_at: base.toISOString(), reason: 'subscription_not_ready' })
  showToast(`Trial extended for 7 more days. Valid until ${base.toLocaleDateString()}.`)
  goToDashboard()
}
function planById(id) { return PLANS.find(plan => plan.id === id) || PLANS[1] }
function addMonths(date, months) { const d = new Date(date); d.setMonth(d.getMonth() + months); return d.toISOString() }
function periodToExpiry(period) { if (period === 'week') { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString() } if (period === 'term') return addMonths(new Date(), 3); if (period === 'year') return addMonths(new Date(), 12); return addMonths(new Date(), 1) }
function showToast(message) { const old = document.querySelector('.subscription-toast'); if (old) old.remove(); const node = document.createElement('div'); node.className = 'subscription-toast'; node.textContent = message; document.body.appendChild(node); setTimeout(() => node.remove(), 4500) }
function planCard(plan, index) { return `<button class="subscription-plan ${plan.category === 'school' ? 'school-plan' : ''} ${index === 2 || plan.id === 'school-growth-150' ? 'featured' : ''}" data-subscribe-plan="${plan.id}">
  <span class="plan-tag">${escapeHtml(plan.tag)}</span>
  <h3>${escapeHtml(plan.name)}</h3>
  <div class="plan-price"><small>GHS</small><strong>${plan.price.toLocaleString()}</strong><em>/${escapeHtml(plan.period)}</em></div>
  ${plan.student_range ? `<div class="student-range-pill">👥 ${escapeHtml(plan.student_range)}</div>` : ''}
  <p>${escapeHtml(plan.desc)}</p>
  <ul>${plan.features.map(feature => `<li>✓ ${escapeHtml(feature)}</li>`).join('')}</ul>
  <b>${plan.category === 'school' ? 'Subscribe school plan →' : 'Pay with Visa/Card or MoMo →'}</b>
</button>` }
function planSection(title, subtitle, category) {
  const plans = PLANS.filter(plan => plan.category === category)
  return `<section class="subscription-plan-section ${category}-plan-section"><div class="subscription-section-head"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(subtitle)}</p></div><div class="subscription-grid ${category}-subscription-grid">${plans.map(planCard).join('')}</div></section>`
}
function trialNoteHtml() {
  const trial = trialStatus()
  return trial ? `<div class="subscription-trial-note"><strong>Trial active:</strong> Your extended trial is valid until ${new Date(trial.expires_at).toLocaleDateString()}. You can still choose a subscription plan anytime.</div>` : `<div class="subscription-trial-note"><strong>Not ready?</strong> Extend your free trial for 7 more days and return to your dashboard.</div>`
}
function subscriptionModalHtml() { return `<div class="subscription-gate-overlay" role="dialog" aria-modal="true" aria-label="Subscription plans">
  <section class="subscription-gate-card school-subscription-card">
    <button class="subscription-close" type="button" aria-label="Close">×</button>
    <div class="subscription-head"><div><span class="sub-kicker">🔓 Premium unlock</span><h2>Choose your Mezzo Maths plan</h2><p>Subscribe as an individual learner or choose a school package based on the number of students you want to enrol.</p></div><div class="sub-lock">🏆</div></div>
    ${planSection('Individual Student Plans', 'For single learners, parents and contest preparation.', 'individual')}
    ${planSection('Special School Subscription Plans', 'For schools, learning centres and grouped student access. Select the range that matches your student population.', 'school')}
    <div class="school-custom-note"><strong>More than 1,000 students?</strong> Contact Mezzo Maths for a custom institutional package, onboarding and reporting support.</div>
    <div class="subscription-note"><strong>Payments:</strong> Checkout is prepared for Paystack Ghana so parents/schools can pay with Visa/Card or Mobile Money. Add your Paystack secret key in Vercel to activate live payments.</div>
    ${trialNoteHtml()}
    <div class="subscription-later-row"><button class="btn btn-blue" type="button" data-extend-trial="true">Extend Trial 7 More Days</button><button class="btn btn-ghost" type="button" data-subscription-later="true">Not ready yet — go to Dashboard</button></div>
  </section>
</div>` }
function showSubscriptionModal(force = false) {
  if (modalOpen || isSubscribed()) return
  if (!force && hasTrialExtension()) return
  if (!force && !levelReached()) return
  modalOpen = true
  document.body.insertAdjacentHTML('beforeend', subscriptionModalHtml())
}
function installPlanButton() {
  const home = document.querySelector('.home-screen')
  if (home && !home.querySelector('.subscription-promo-banner')) {
    home.insertAdjacentHTML('beforeend', `<section class="subscription-promo-banner glass-card"><div><span>💳 Premium Access</span><h2>Subscription Plans</h2><p>Unlock individual or school access with student-range packages and Mobile Money/Card payments.</p></div><button class="btn btn-gold" data-open-subscriptions="true">View Plans</button></section>`)
  }
}
async function startPayment(planId) {
  if (paymentBusy) return
  const plan = planById(planId)
  const p = profile()
  if (!isSignedIn() || !p.email) {
    showToast('Please sign up or sign in with an email before paying.')
    closeSubscriptionModal()
    document.querySelector('[data-target="auth"]')?.click()
    return
  }
  paymentBusy = true
  showToast(`Starting payment for ${plan.name}...`)
  try {
    const res = await fetch('/api/paystack-initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: plan.id, email: p.email, name: p.full_name || p.email, callback_url: window.location.origin + window.location.pathname })
    })
    const data = await res.json()
    if (!res.ok || !data?.authorization_url) throw new Error(data?.error || 'Payment initialization failed')
    window.location.href = data.authorization_url
  } catch (error) {
    showToast(`${error.message}. You can extend your trial for 7 more days.`)
    const row = document.querySelector('.subscription-later-row')
    if (row && !row.querySelector('[data-payment-failed-trial]')) row.insertAdjacentHTML('afterbegin', '<button class="btn btn-blue" type="button" data-extend-trial="true" data-payment-failed-trial="true">Payment failed — Extend Trial 7 Days</button>')
  } finally {
    paymentBusy = false
  }
}
async function verifyPaymentFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const reference = params.get('reference') || params.get('trxref')
  if (!reference || sessionStorage.getItem(`verified_${reference}`)) return
  sessionStorage.setItem(`verified_${reference}`, '1')
  try {
    const res = await fetch(`/api/paystack-verify?reference=${encodeURIComponent(reference)}`)
    const data = await res.json()
    if (!res.ok || data.status !== 'success') throw new Error(data.error || 'Payment could not be verified')
    const plan = planById(data.plan_id)
    saveJson('mezzo_subscription', { active: true, plan_id: plan.id, plan_name: plan.name, amount: plan.price, category: plan.category, student_range: plan.student_range || '', reference, paid_at: new Date().toISOString(), expires_at: periodToExpiry(plan.period) })
    localStorage.removeItem('mezzo_trial_extension')
    showToast(`Subscription active: ${plan.name}`)
    window.history.replaceState({}, document.title, window.location.pathname)
  } catch (error) {
    showToast(`${error.message}. You can extend your trial for 7 more days.`)
  }
}
function checkGate() { if (!isSubscribed() && !hasTrialExtension() && levelReached()) showSubscriptionModal(false) }
function queueSync() { if (syncQueued) return; syncQueued = true; requestAnimationFrame(() => { syncQueued = false; installPlanButton(); checkGate() }) }

document.addEventListener('click', event => {
  const open = event.target.closest('[data-open-subscriptions]')
  if (open) { event.preventDefault(); event.stopImmediatePropagation(); showSubscriptionModal(true); return }
  const plan = event.target.closest('[data-subscribe-plan]')
  if (plan) { event.preventDefault(); event.stopImmediatePropagation(); startPayment(plan.dataset.subscribePlan); return }
  if (event.target.closest('[data-extend-trial]')) { event.preventDefault(); event.stopImmediatePropagation(); extendTrialAndDashboard(); return }
  if (event.target.closest('[data-subscription-later]')) { event.preventDefault(); event.stopImmediatePropagation(); extendTrialAndDashboard(); return }
  if (event.target.closest('.subscription-close')) { event.preventDefault(); event.stopImmediatePropagation(); extendTrialAndDashboard(); return }
}, true)

window.addEventListener('mezzoOpenSubscriptions', () => showSubscriptionModal(true))
const observer = new MutationObserver(queueSync)
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false })
window.addEventListener('load', () => { verifyPaymentFromUrl(); queueSync() })
window.addEventListener('storage', queueSync)
setTimeout(() => { verifyPaymentFromUrl(); queueSync() }, 350)
