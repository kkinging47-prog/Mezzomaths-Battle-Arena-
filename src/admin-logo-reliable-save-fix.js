const LOGO_KEY = 'mezzo_custom_logo'
const PENDING_KEY = 'mezzo_pending_logo_preview'
let queued = false
let lastSelectedFileName = ''

function toast(message) {
  document.querySelector('.logo-save-toast')?.remove()
  document.body.insertAdjacentHTML('beforeend', `<div class="logo-save-toast">${String(message).replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]))}</div>`)
  setTimeout(() => document.querySelector('.logo-save-toast')?.remove(), 4500)
}
function readLogo() { return localStorage.getItem(LOGO_KEY) || '' }
function updatePreviews(dataUrl, pending = false) {
  document.querySelectorAll('[data-live-logo-preview]').forEach(box => {
    box.innerHTML = dataUrl ? `<img src="${dataUrl}" alt="${pending ? 'Logo preview' : 'Saved logo'}">` : '<span>No saved logo yet</span>'
  })
}
function applyLogo(dataUrl = readLogo()) {
  if (!dataUrl) return
  document.querySelectorAll('.brand-crown, .logo-lockup span').forEach(mark => {
    mark.classList.add('custom-logo-mark')
    mark.innerHTML = `<img src="${dataUrl}" alt="Mezzo logo" class="custom-logo-img">`
  })
  updatePreviews(dataUrl, false)
}
function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = String(reader.result || '')
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
async function compressLogo(file) {
  const img = await fileToImage(file)
  const maxSide = 520
  const scale = Math.min(1, maxSide / Math.max(img.width || maxSide, img.height || maxSide))
  const width = Math.max(1, Math.round((img.width || maxSide) * scale))
  const height = Math.max(1, Math.round((img.height || maxSide) * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  let dataUrl = canvas.toDataURL(type, 0.82)
  if (dataUrl.length > 650000) dataUrl = canvas.toDataURL('image/jpeg', 0.72)
  if (dataUrl.length > 650000) dataUrl = canvas.toDataURL('image/jpeg', 0.58)
  return dataUrl
}
async function handleLogoSelection(input) {
  const file = input?.files?.[0]
  if (!file) return
  lastSelectedFileName = file.name || 'selected logo'
  if (!file.type.startsWith('image/')) { toast('Please select an image file for the logo.'); return }
  try {
    const dataUrl = await compressLogo(file)
    try {
      localStorage.setItem(PENDING_KEY, dataUrl)
      updatePreviews(dataUrl, true)
      toast(`Logo selected: ${lastSelectedFileName}. Click Save Logo to apply it.`)
    } catch (error) {
      localStorage.removeItem(PENDING_KEY)
      toast('Logo is still too large to save. Please choose a smaller logo image.')
    }
  } catch (error) {
    toast('Could not read that logo image. Please try a PNG or JPG file.')
  }
}
function savePendingLogo() {
  const pending = localStorage.getItem(PENDING_KEY)
  if (!pending) {
    const fileInput = document.getElementById('mezzoLogoUpload')
    if (fileInput?.files?.[0]) { handleLogoSelection(fileInput); setTimeout(savePendingLogo, 500); return }
    if (readLogo()) { applyLogo(); toast('Saved logo reapplied.'); return }
    toast('Please choose a logo file first, then click Save Logo.')
    return
  }
  try {
    localStorage.setItem(LOGO_KEY, pending)
    localStorage.removeItem(PENDING_KEY)
    applyLogo(pending)
    toast('Logo saved successfully and applied across the app.')
  } catch (error) {
    toast('Logo could not be saved because browser storage is full. Use a smaller logo image.')
  }
}
function enhancePanel() {
  const panel = document.querySelector('[data-admin-brand-staff-panel]')
  const upload = panel?.querySelector('#mezzoLogoUpload')
  if (!panel || !upload) return
  const saveBtn = panel.querySelector('[data-save-custom-logo]')
  if (saveBtn) saveBtn.textContent = 'Save Logo'
  upload.closest('label')?.querySelector('span') && (upload.closest('label').querySelector('span').textContent = 'Choose Logo File')
  if (!panel.querySelector('[data-logo-save-helper]')) {
    upload.closest('article')?.insertAdjacentHTML('beforeend', '<p class="logo-save-note" data-logo-save-helper="true"><b>Important:</b> choose the logo image first, then click <b>Save Logo</b>. The app compresses the logo before saving so it works on mobile and desktop.</p>')
  }
}
function sync() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; enhancePanel(); applyLogo() })
}

document.addEventListener('change', event => {
  if (event.target?.id !== 'mezzoLogoUpload') return
  event.preventDefault()
  event.stopImmediatePropagation()
  handleLogoSelection(event.target)
}, true)

document.addEventListener('click', event => {
  if (!event.target.closest('[data-save-custom-logo]')) return
  event.preventDefault()
  event.stopImmediatePropagation()
  savePendingLogo()
}, true)

const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false })
window.addEventListener('load', sync)
window.addEventListener('storage', sync)
setTimeout(sync, 350)
