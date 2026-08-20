import './admin-workspace-organizer.css'

const SECTIONS = [
  { key: 'overview', icon: '▦', label: 'Overview', description: 'Admin summary and shortcuts' },
  { key: 'questions', icon: '✦', label: 'Questions', description: 'Generate, upload and manage questions' },
  { key: 'junior', icon: '★', label: 'Junior', description: 'KG–Grade 2 questions and classroom tools' },
  { key: 'courses', icon: '▤', label: 'Courses', description: 'Course builder, access and analytics' },
  { key: 'impact', icon: '◉', label: 'Donor Impact', description: 'Reach, equity and learning outcomes' },
  { key: 'bece', icon: '◎', label: 'BECE', description: 'BECE bank and assessment settings' },
  { key: 'people', icon: '♙', label: 'Staff & Brand', description: 'Branding and staff permissions' },
  { key: 'system', icon: '◈', label: 'System', description: 'Readiness and database checks' }
]

const SELECTORS = {
  questions: [
    '#aiGenerateForm', '#adminQuestionForm', '.question-manager', '[data-workbook-seed-summary]',
    '[data-exact-workbook-importer]', '[data-admin-topic-uploader]', '[data-excel-question-upload]',
    '[data-workbook-question-selector]', '.workbook-seed-summary', '.excel-question-upload-panel'
  ],
  junior: ['[data-junior-admin]'],
  courses: [
    '[data-course-admin-panel]', '.course-admin-panel', '#courseAdminForm', '.course-commerce-admin',
    '.course-analytics-panel', '#courseCouponForm', '#courseGrantForm'
  ],
  impact: ['[data-donor-impact-dashboard]'],
  bece: ['[data-bece-admin-panel]', '.bece-admin-panel', '[data-bece-settings-panel]', '.bece-settings-panel'],
  people: ['[data-admin-brand-staff-panel]', '.admin-brand-staff-panel', '[data-learner-intelligence-admin]'],
  system: ['[data-admin-health-panel]', '.admin-health-panel', '[data-production-readiness]', '.production-readiness-panel']
}

let active = 'overview'
let queued = false

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function isAdmin() { return (readJson('mezzo_profile', {}) || {}).role === 'admin' }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])) }
function uniqueNodes(selectors, root) {
  const nodes = []
  selectors.forEach(selector => root.querySelectorAll(selector).forEach(node => { if (!nodes.includes(node)) nodes.push(node) }))
  return nodes.filter(node => !nodes.some(parent => parent !== node && parent.contains(node)))
}
function sectionCount(key, root) { return key === 'overview' ? SECTIONS.length - 1 : uniqueNodes(SELECTORS[key] || [], root).length }
function workspaceHtml(root) {
  return `<section class="admin-workspace" data-admin-workspace="true">
    <header class="admin-workspace-head"><div><span>ADMIN WORKSPACE</span><h2>Control Centre</h2><p>Choose one area and work without scrolling through unrelated tools.</p></div><div class="admin-workspace-user"><b>Administrator</b><small>Full workspace access</small></div></header>
    <nav class="admin-workspace-tabs" aria-label="Admin sections">${SECTIONS.map(item => `<button type="button" data-admin-workspace-tab="${item.key}" class="${active === item.key ? 'active' : ''}"><i>${item.icon}</i><span>${escapeHtml(item.label)}</span><small>${sectionCount(item.key, root)}</small></button>`).join('')}</nav>
    <section class="admin-workspace-overview" data-admin-workspace-overview="true"><div class="admin-overview-intro"><span>WORKSPACE OVERVIEW</span><h3>What would you like to manage?</h3><p>Open a focused section below. Your other admin tools stay organised and out of the way.</p></div><div class="admin-overview-grid">${SECTIONS.filter(item => item.key !== 'overview').map(item => `<button type="button" data-admin-workspace-tab="${item.key}"><i>${item.icon}</i><div><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.description)}</span></div><b>Open →</b></button>`).join('')}</div></section>
  </section>`
}
function classify(root) {
  root.querySelectorAll('[data-admin-workspace-group]').forEach(node => node.removeAttribute('data-admin-workspace-group'))
  Object.entries(SELECTORS).forEach(([group, selectors]) => uniqueNodes(selectors, root).forEach(node => node.dataset.adminWorkspaceGroup = group))
}
function applyActive(root) {
  root.dataset.adminWorkspaceActive = active
  root.querySelectorAll('[data-admin-workspace-tab]').forEach(button => button.classList.toggle('active', button.dataset.adminWorkspaceTab === active))
  root.querySelectorAll('[data-admin-workspace-group]').forEach(panel => {
    const visible = active !== 'overview' && panel.dataset.adminWorkspaceGroup === active
    panel.classList.toggle('admin-workspace-panel-hidden', !visible)
    panel.setAttribute('aria-hidden', visible ? 'false' : 'true')
  })
  const overview = root.querySelector('[data-admin-workspace-overview]')
  if (overview) overview.hidden = active !== 'overview'
}
function install() {
  const root = document.querySelector('.admin-screen')
  if (!root || !isAdmin()) return
  root.querySelector('[data-admin-control-hub]')?.classList.add('admin-legacy-hub-hidden')
  if (!root.querySelector('[data-admin-workspace]')) {
    const hero = root.querySelector('.dashboard-hero') || root.firstElementChild
    if (hero) hero.insertAdjacentHTML('afterend', workspaceHtml(root))
  }
  classify(root)
  applyActive(root)
}
function queueInstall() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; install() })
}

document.addEventListener('click', event => {
  const tab = event.target.closest('[data-admin-workspace-tab]')
  if (!tab) return
  event.preventDefault()
  active = tab.dataset.adminWorkspaceTab || 'overview'
  install()
  document.querySelector('[data-admin-workspace]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}, true)

const observer = new MutationObserver(queueInstall)
observer.observe(document.body, { childList: true, subtree: true, attributes: false })
window.addEventListener('load', queueInstall)
window.addEventListener('storage', queueInstall)
setTimeout(queueInstall, 450)
