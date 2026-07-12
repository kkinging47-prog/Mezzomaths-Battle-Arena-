import './admin-staff-branding.css'

const ROLE_OPTIONS = [['student', 'Student'], ['teacher', 'Teacher'], ['mezzo_staff', 'Mezzo Staff'], ['admin', 'Admin']]
const ACCESS_KEY = 'mezzo_staff_access'
const LOGO_KEY = 'mezzo_custom_logo'
const DEFAULT_ACCESS = { home: true, dashboard: true, leaderboard: true, smartboard: false, battle: false, solo: false, bece: false, prep: false, courses: true }
let queued = false

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function profile() { return readJson('mezzo_profile', null) || {} }
function isAdmin() { return profile().role === 'admin' }
function isStaff() { return profile().role === 'mezzo_staff' }
function staffAccess() { return { ...DEFAULT_ACCESS, ...readJson(ACCESS_KEY, DEFAULT_ACCESS) } }
function escapeHtml(value = '') { return String(value).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
function roleOptionsHtml(selected = 'student') { return ROLE_OPTIONS.map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`).join('') }
function toast(message) { const old = document.querySelector('.staff-admin-toast'); if (old) old.remove(); const node = document.createElement('div'); node.className = 'staff-admin-toast'; node.textContent = message; document.body.appendChild(node); setTimeout(() => node.remove(), 4200) }
function syncAuthRoleOptions() {
  document.querySelectorAll('#signupForm select[name="role"], #loginForm select[name="role"]').forEach(select => {
    const current = select.value || 'student'
    const next = roleOptionsHtml(current)
    if (select.innerHTML !== next) select.innerHTML = next
    const label = select.closest('label')?.querySelector('span')
    if (label) label.textContent = 'Account Type'
  })
  const loginTitle = document.querySelector('#loginForm h2')
  if (loginTitle) loginTitle.textContent = 'Login as Student, Staff or Admin'
  const signupTitle = document.querySelector('#signupForm h2')
  if (signupTitle) signupTitle.textContent = 'Student / Staff / Admin Sign Up'
}
function hideAdminNavButton() {
  document.querySelectorAll('[data-target="admin"], [data-role-button="admin"], [data-role-button="teacher"]').forEach(btn => {
    btn.classList.add('hidden-admin-nav-button')
    btn.setAttribute('aria-hidden', 'true')
    btn.tabIndex = -1
  })
}
function adminSettingsHtml() {
  const access = staffAccess()
  const logo = localStorage.getItem(LOGO_KEY) || ''
  const modes = [
    ['smartboard', 'Smart Board 1v1'],
    ['battle', 'Online 1v1 / Compete With Bot'],
    ['solo', 'Solo Practice / Daily Practice'],
    ['bece', 'BECE Practice'],
    ['courses', 'Course Sessions'],
    ['prep', 'Mezzopedia Prep'],
    ['leaderboard', 'Leaderboards']
  ]
  return `<section class="admin-brand-staff-panel glass-card" data-admin-brand-staff-panel="true">
    <div class="admin-brand-head"><div><span>⚙️ Admin Settings</span><h2>Branding & Mezzo Staff Access</h2><p>Upload the official logo and choose which game modes Mezzo Staff accounts can use.</p></div>${logo ? `<img src="${logo}" alt="Uploaded logo preview">` : '<div class="logo-preview-empty">Logo</div>'}</div>
    <div class="admin-settings-grid">
      <article><h3>Logo Upload</h3><p>Upload once and every Mezzo logo mark in the app will use it automatically.</p><label class="logo-upload-box"><input type="file" id="mezzoLogoUpload" accept="image/*"><span>📤 Upload Logo</span></label><button class="btn btn-ghost btn-small" type="button" data-clear-custom-logo="true">Remove Uploaded Logo</button></article>
      <article><h3>Mezzo Staff Game Access</h3><p>Staff can log in from Login / Sign Up, but can only open the modes selected here.</p><div class="staff-access-list">${modes.map(([key, label]) => `<label><input type="checkbox" data-staff-access-key="${key}" ${access[key] ? 'checked' : ''}> <span>${escapeHtml(label)}</span></label>`).join('')}</div><button class="btn btn-gold" type="button" data-save-staff-access="true">Save Staff Access</button></article>
    </div>
  </section>`
}
function installAdminSettingsPanel() {
  if (!isAdmin()) return
  const screen = document.querySelector('.admin-screen')
  if (!screen || screen.querySelector('[data-admin-brand-staff-panel]')) return
  const hero = screen.querySelector('.dashboard-hero')
  if (hero) hero.insertAdjacentHTML('afterend', adminSettingsHtml())
  else screen.insertAdjacentHTML('afterbegin', adminSettingsHtml())
}
function applyCustomLogo() {
  const logo = localStorage.getItem(LOGO_KEY)
  if (!logo) return
  document.querySelectorAll('.brand-crown, .logo-lockup span').forEach(mark => {
    if (mark.querySelector('img')?.src === logo) return
    mark.classList.add('custom-logo-mark')
    mark.innerHTML = `<img src="${logo}" alt="Mezzo logo" class="custom-logo-img">`
  })
}
function clearCustomLogo() {
  localStorage.removeItem(LOGO_KEY)
  document.querySelectorAll('.custom-logo-mark').forEach(mark => { mark.classList.remove('custom-logo-mark'); mark.textContent = '♛' })
  toast('Uploaded logo removed.')
}
function saveStaffAccessFromPanel() {
  const access = { ...DEFAULT_ACCESS }
  document.querySelectorAll('[data-staff-access-key]').forEach(input => { access[input.dataset.staffAccessKey] = Boolean(input.checked) })
  saveJson(ACCESS_KEY, access)
  toast('Mezzo Staff access settings saved.')
  enforceStaffAccess()
}
function modeFromElement(el) {
  if (!el) return ''
  if (el.closest('[data-courses-page], [data-open-course]')) return 'courses'
  if (el.closest('[data-prep-open], [data-prep-stage]')) return 'prep'
  if (el.closest('[data-bece-page], [data-start-bece], [data-bece-report-page]')) return 'bece'
  if (el.closest('[data-start-daily]')) return 'solo'
  if (el.closest('[data-start-bot], #startBotBattle, #startBattle, #startBattle2')) return 'battle'
  const target = el.closest('[data-target]')?.dataset.target
  if (['smartboard', 'battle', 'solo', 'leaderboard', 'dashboard', 'home'].includes(target)) return target
  const card = el.closest('.game-mode-card, .home-mode-card')
  const text = card?.textContent?.toLowerCase() || ''
  if (text.includes('course')) return 'courses'
  if (text.includes('bece')) return 'bece'
  if (text.includes('mezzopedia prep')) return 'prep'
  if (text.includes('smart board')) return 'smartboard'
  if (text.includes('bot') || text.includes('online')) return 'battle'
  if (text.includes('solo') || text.includes('daily')) return 'solo'
  return ''
}
function allowed(mode) { const access = staffAccess(); return !mode || access[mode] !== false }
function enforceStaffAccess() {
  if (!isStaff()) {
    document.querySelectorAll('.staff-mode-locked').forEach(el => { el.classList.remove('staff-mode-locked'); el.removeAttribute('aria-disabled'); el.removeAttribute('title') })
    return
  }
  const access = staffAccess()
  document.querySelectorAll('[data-target], [data-courses-page], [data-open-course], [data-prep-open], [data-bece-page], [data-start-bece], [data-start-bot], #startBotBattle, #startBattle, #startBattle2, [data-start-daily], .game-mode-card, .home-mode-card').forEach(el => {
    const mode = modeFromElement(el)
    if (!mode || access[mode] !== false) return
    el.classList.add('staff-mode-locked')
    el.setAttribute('aria-disabled', 'true')
    el.setAttribute('title', 'Locked by admin for Mezzo Staff')
  })
}
function syncAll() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => {
    queued = false
    syncAuthRoleOptions()
    hideAdminNavButton()
    installAdminSettingsPanel()
    applyCustomLogo()
    enforceStaffAccess()
  })
}

document.addEventListener('submit', event => {
  const form = event.target
  if (form?.id !== 'loginForm' && form?.id !== 'signupForm') return
  const role = new FormData(form).get('role')
  setTimeout(() => {
    if (role === 'admin') document.querySelector('[data-target="admin"]')?.click()
    if (role === 'mezzo_staff') { document.querySelector('[data-target="dashboard"]')?.click(); toast('Logged in as Mezzo Staff. Game access is controlled by admin.') }
    syncAll()
  }, 220)
}, true)

document.addEventListener('click', event => {
  if (event.target.closest('[data-save-staff-access]')) { event.preventDefault(); saveStaffAccessFromPanel(); return }
  if (event.target.closest('[data-clear-custom-logo]')) { event.preventDefault(); clearCustomLogo(); return }
  if (isStaff()) {
    const mode = modeFromElement(event.target)
    if (mode && !allowed(mode)) { event.preventDefault(); event.stopImmediatePropagation(); toast('This game mode is locked for Mezzo Staff. Ask the admin to allow access.'); return }
  }
}, true)

document.addEventListener('change', event => {
  if (event.target?.id === 'mezzoLogoUpload') {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { localStorage.setItem(LOGO_KEY, String(reader.result || '')); toast('Logo uploaded. App logo updated.'); syncAll() }
    reader.readAsDataURL(file)
  }
})

const observer = new MutationObserver(syncAll)
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false })
window.addEventListener('load', syncAll)
window.addEventListener('storage', syncAll)
setTimeout(syncAll, 350)
