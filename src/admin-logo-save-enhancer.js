import './admin-logo-save.css'

const LOGO_KEY = 'mezzo_custom_logo'
const PENDING_KEY = 'mezzo_pending_logo_preview'
let queued = false

function readProfile() { try { return JSON.parse(localStorage.getItem('mezzo_profile') || '{}') } catch { return {} } }
function isAdmin() { return readProfile().role === 'admin' }
function toast(message) {
  document.querySelector('.logo-save-toast')?.remove()
  document.body.insertAdjacentHTML('beforeend', `<div class="logo-save-toast">${message}</div>`)
  setTimeout(() => document.querySelector('.logo-save-toast')?.remove(), 4200)
}
function logoData() { return localStorage.getItem(LOGO_KEY) || '' }
function applyLogoNow() {
  const logo = logoData()
  if (!logo) return
  document.querySelectorAll('.brand-crown, .logo-lockup span').forEach(mark => {
    mark.classList.add('custom-logo-mark')
    mark.innerHTML = `<img src="${logo}" alt="Mezzo logo" class="custom-logo-img">`
  })
  document.querySelectorAll('[data-live-logo-preview]').forEach(box => { box.innerHTML = `<img src="${logo}" alt="Saved logo">` })
}
function enhanceLogoPanel() {
  if (!isAdmin()) return
  const panel = document.querySelector('[data-admin-brand-staff-panel]')
  const file = panel?.querySelector('#mezzoLogoUpload')
  if (!panel || !file || panel.querySelector('[data-save-custom-logo]')) return
  const article = file.closest('article')
  const current = logoData()
  article?.insertAdjacentHTML('beforeend', `
    <div class="logo-save-preview" data-live-logo-preview>${current ? `<img src="${current}" alt="Saved logo">` : '<span>No saved logo yet</span>'}</div>
    <button class="btn btn-gold" type="button" data-save-custom-logo="true">Save Logo</button>
    <p class="logo-save-note">Choose the logo file, then click <b>Save Logo</b>. The saved logo will replace the crown/logo marks across the app.</p>
  `)
}
function sync() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; enhanceLogoPanel(); applyLogoNow() })
}

document.addEventListener('change', event => {
  if (event.target?.id !== 'mezzoLogoUpload') return
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const data = String(reader.result || '')
    localStorage.setItem(PENDING_KEY, data)
    document.querySelectorAll('[data-live-logo-preview]').forEach(box => { box.innerHTML = `<img src="${data}" alt="Logo preview">` })
    toast('Logo selected. Click Save Logo to apply it.')
  }
  reader.readAsDataURL(file)
}, true)

document.addEventListener('click', event => {
  if (!event.target.closest('[data-save-custom-logo]')) return
  event.preventDefault()
  const pending = localStorage.getItem(PENDING_KEY)
  const currentFile = document.querySelector('#mezzoLogoUpload')?.files?.[0]
  if (pending) {
    localStorage.setItem(LOGO_KEY, pending)
    localStorage.removeItem(PENDING_KEY)
    applyLogoNow()
    toast('Logo saved and applied across the app.')
    return
  }
  if (currentFile) {
    const reader = new FileReader()
    reader.onload = () => { localStorage.setItem(LOGO_KEY, String(reader.result || '')); applyLogoNow(); toast('Logo saved and applied across the app.') }
    reader.readAsDataURL(currentFile)
    return
  }
  if (logoData()) { applyLogoNow(); toast('Saved logo reapplied across the app.'); return }
  toast('Please choose a logo file first.')
}, true)

const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false })
window.addEventListener('load', sync)
window.addEventListener('storage', sync)
setTimeout(sync, 350)
