import './mobile-auth-role-fix.css'

const ROLES = [
  ['student', 'Student', '🎓'],
  ['teacher', 'Teacher', '👩🏾‍🏫'],
  ['mezzo_staff', 'Mezzo Staff', '🧑🏾‍💼'],
  ['admin', 'Admin', '🛠️']
]

let queued = false

function roleLabel(value) {
  return ROLES.find(([role]) => role === value)?.[1] || 'Student'
}

function makeRolePicker(select) {
  if (!select || select.dataset.rolePickerReady === 'true') return
  select.dataset.rolePickerReady = 'true'
  select.classList.add('native-role-select-hidden')
  const wrap = document.createElement('div')
  wrap.className = 'auth-role-picker'
  wrap.dataset.rolePicker = 'true'
  wrap.innerHTML = `<div class="role-picker-title">Choose account type</div><div class="role-chip-grid">${ROLES.map(([value, label, icon]) => `<button type="button" class="role-chip ${select.value === value ? 'active' : ''}" data-auth-role-choice="${value}"><span>${icon}</span><strong>${label}</strong></button>`).join('')}</div><small class="role-picker-current">Selected: ${roleLabel(select.value || 'student')}</small>`
  select.closest('label')?.insertAdjacentElement('afterend', wrap)
}

function syncPicker(select) {
  const picker = select.closest('form')?.querySelector('[data-role-picker]')
  if (!picker) return
  picker.querySelectorAll('[data-auth-role-choice]').forEach(btn => btn.classList.toggle('active', btn.dataset.authRoleChoice === select.value))
  const current = picker.querySelector('.role-picker-current')
  if (current) current.textContent = `Selected: ${roleLabel(select.value || 'student')}`
}

function installRolePickers() {
  document.querySelectorAll('#loginForm select[name="role"], #signupForm select[name="role"]').forEach(select => {
    makeRolePicker(select)
    syncPicker(select)
  })
}

function queueInstall() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => {
    queued = false
    installRolePickers()
  })
}

document.addEventListener('click', event => {
  const chip = event.target.closest('[data-auth-role-choice]')
  if (!chip) return
  event.preventDefault()
  const form = chip.closest('form')
  const select = form?.querySelector('select[name="role"]')
  if (!select) return
  select.value = chip.dataset.authRoleChoice
  select.dispatchEvent(new Event('change', { bubbles: true }))
  syncPicker(select)
}, true)

document.addEventListener('change', event => {
  if (event.target?.matches?.('#loginForm select[name="role"], #signupForm select[name="role"]')) syncPicker(event.target)
})

const observer = new MutationObserver(queueInstall)
observer.observe(document.body, { childList: true, subtree: true, attributes: false })
window.addEventListener('load', queueInstall)
setTimeout(queueInstall, 350)
