import './admin-control-hub.css'

let queued = false
let activePanel = 'overview'

const HUB_BUTTONS = [
  { key: 'settings', icon: '⚙️', title: 'Admin Settings', desc: 'Logo, branding and Mezzo Staff access controls' },
  { key: 'course-builder', icon: '🎓', title: 'Course Builder', desc: 'Create and manage self-taught courses' },
  { key: 'coupons-grants', icon: '🎟️', title: 'Coupons & Grants', desc: 'Create coupons and grant course access' },
  { key: 'workbook-questions', icon: '📚', title: 'Mezzo Workbook Questions 2025', desc: 'Workbook topics and seeded questions' },
  { key: 'teacher-dashboard', icon: '👩🏾‍🏫', title: 'Teacher Dashboard', desc: 'Teacher classroom tools and generators' },
  { key: 'bece-bank', icon: '📘', title: 'BECE Question Bank', desc: 'Upload, edit and manage BECE questions' }
]

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function profile() { return readJson('mezzo_profile', {}) || {} }
function isAdmin() { return profile().role === 'admin' }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])) }
function hubHtml() {
  return `<section class="admin-control-hub glass-card" data-admin-control-hub="true">
    <div class="admin-control-head"><div><span>🛠️ Admin Control Centre</span><h2>Choose Admin Area</h2><p>Select a button below to jump directly to the exact admin page or section you want to manage.</p></div><strong>${HUB_BUTTONS.length}</strong></div>
    <div class="admin-control-grid">${HUB_BUTTONS.map(item => `<button type="button" class="admin-control-card ${activePanel === item.key ? 'active' : ''}" data-admin-hub-target="${item.key}"><b>${item.icon}</b><span>${escapeHtml(item.title)}</span><small>${escapeHtml(item.desc)}</small></button>`).join('')}</div>
    <div class="admin-control-status" data-admin-control-status="true">${statusText(activePanel)}</div>
  </section>`
}
function statusText(key) {
  const found = HUB_BUTTONS.find(item => item.key === key)
  return found ? `Showing: ${found.title}` : 'Select a section to manage.'
}
function installHub() {
  const admin = document.querySelector('.admin-screen')
  if (!admin || !isAdmin()) return
  const existing = admin.querySelector('[data-admin-control-hub]')
  if (existing) {
    existing.querySelectorAll('[data-admin-hub-target]').forEach(btn => btn.classList.toggle('active', btn.dataset.adminHubTarget === activePanel))
    const status = existing.querySelector('[data-admin-control-status]')
    if (status) status.textContent = statusText(activePanel)
    return
  }
  const hero = admin.querySelector('.dashboard-hero') || admin.firstElementChild
  if (hero) hero.insertAdjacentHTML('afterend', hubHtml())
  else admin.insertAdjacentHTML('afterbegin', hubHtml())
}
function ensureAdminPage() {
  const admin = document.querySelector('.admin-screen')
  if (admin) return true
  document.querySelector('[data-target="admin"]')?.click()
  return false
}
function highlight(section) {
  if (!section) return
  section.classList.add('admin-hub-highlight')
  setTimeout(() => section.classList.remove('admin-hub-highlight'), 2600)
}
function scrollToSection(selectorList, label) {
  const selectors = Array.isArray(selectorList) ? selectorList : [selectorList]
  let section = null
  for (const selector of selectors) {
    section = document.querySelector(selector)
    if (section) break
  }
  if (!section) {
    toast(`${label} is still loading. Try the button again in a moment.`)
    return
  }
  section.scrollIntoView({ behavior: 'smooth', block: 'start' })
  highlight(section)
}
function toast(message) {
  document.querySelector('.admin-hub-toast')?.remove()
  document.body.insertAdjacentHTML('beforeend', `<div class="admin-hub-toast">${escapeHtml(message)}</div>`)
  setTimeout(() => document.querySelector('.admin-hub-toast')?.remove(), 4200)
}
function openAdminTarget(key) {
  activePanel = key
  if (key === 'teacher-dashboard') {
    document.querySelector('[data-teacher-tools-page]')?.click()
    toast('Opening Teacher Dashboard tools.')
    return
  }
  const ready = ensureAdminPage()
  const delay = ready ? 100 : 700
  setTimeout(() => {
    installHub()
    if (key === 'settings') scrollToSection(['[data-admin-brand-staff-panel]', '.admin-brand-staff-panel'], 'Admin Settings')
    if (key === 'course-builder') scrollToSection(['[data-course-admin-panel]', '#courseAdminForm', '.course-admin-panel'], 'Course Builder')
    if (key === 'coupons-grants') scrollToSection(['.course-commerce-admin', '#courseCouponForm', '#courseGrantForm'], 'Coupons and Grants')
    if (key === 'workbook-questions') scrollToSection(['[data-workbook-seed-summary]', '.question-manager'], 'Mezzo Workbook Questions 2025')
    if (key === 'bece-bank') scrollToSection(['[data-bece-admin-panel]', '.bece-admin-panel'], 'BECE Question Bank')
  }, delay)
}
function sync() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; installHub() })
}

document.addEventListener('click', event => {
  const btn = event.target.closest('[data-admin-hub-target]')
  if (!btn) return
  event.preventDefault()
  event.stopImmediatePropagation()
  openAdminTarget(btn.dataset.adminHubTarget)
}, true)

const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false })
window.addEventListener('load', sync)
window.addEventListener('storage', sync)
setTimeout(sync, 350)
