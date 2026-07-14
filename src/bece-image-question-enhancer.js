import './bece-image-question.css'

const STORE_KEY = 'mezzo_bece_admin_bank'
let queued = false

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])) }
function uid() { return `bece_${Date.now()}_${Math.random().toString(16).slice(2)}` }
function optionSelect(selected = 'A') { return ['A','B','C','D'].map(v => `<option value="${v}" ${v === selected ? 'selected' : ''}>${v}</option>`).join('') }
function toast(message) { document.querySelector('.bece-image-toast')?.remove(); document.body.insertAdjacentHTML('beforeend', `<div class="bece-image-toast">${escapeHtml(message)}</div>`); setTimeout(() => document.querySelector('.bece-image-toast')?.remove(), 4200) }
function normalise(row = {}) {
  const options = row.options || [row.option_a, row.option_b, row.option_c, row.option_d]
  const imageOptions = row.option_image_urls || [row.option_a_image_url, row.option_b_image_url, row.option_c_image_url, row.option_d_image_url]
  return {
    ...row,
    id: row.id || uid(),
    year: String(row.year || row.bece_year || 'Sample'),
    type: row.type || row.mode || 'pastStyle',
    topic: row.topic || 'General BECE',
    q: row.q || row.question || row.question_text || '',
    question_image_url: row.question_image_url || row.image_url || '',
    options: [options?.[0] || '', options?.[1] || '', options?.[2] || '', options?.[3] || ''],
    option_image_urls: [imageOptions?.[0] || '', imageOptions?.[1] || '', imageOptions?.[2] || '', imageOptions?.[3] || ''],
    answer: String(row.answer || row.correct_answer || 'A').toUpperCase().slice(0, 1),
    explanation: row.explanation || ''
  }
}
async function fileToDataUrl(file) {
  if (!file) return ''
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => resolve('')
    reader.readAsDataURL(file)
  })
}
function enhanceAdminForm() {
  const form = document.getElementById('beceAdminQuestionForm')
  if (!form || form.querySelector('[data-bece-image-fields]')) return
  const id = form.querySelector('input[name="id"]')?.value || ''
  const edit = id ? readJson(STORE_KEY, []).map(normalise).find(q => q.id === id) : null
  const afterQuestion = form.querySelector('textarea[name="q"]')?.closest('label')
  afterQuestion?.insertAdjacentHTML('afterend', `
    <section class="bece-image-fields wide" data-bece-image-fields="true">
      <h3>Question Image / Diagram</h3>
      <div class="bece-image-row"><label><span>Upload Question Image</span><input type="file" id="beceQuestionImageFile" accept="image/*"></label><label><span>Or Paste Question Image URL</span><input id="beceQuestionImageUrl" value="${escapeHtml(edit?.question_image_url || '')}" placeholder="https://..."></label></div>
      <div class="bece-image-preview" id="beceQuestionImagePreview">${edit?.question_image_url ? `<img src="${edit.question_image_url}" alt="Question image">` : '<span>No question image selected</span>'}</div>
    </section>
  `)
  const optionD = form.querySelector('input[name="option_d"]')?.closest('label')
  optionD?.insertAdjacentHTML('afterend', `
    <section class="bece-image-fields wide" data-bece-option-image-fields="true">
      <h3>Option Images</h3>
      <p>Use these where BECE options are diagrams, shapes, graphs or picture choices. Text options can still be typed above.</p>
      ${['A','B','C','D'].map((letter, i) => `<div class="bece-option-image-row"><strong>${letter}</strong><input type="file" id="beceOption${letter}ImageFile" accept="image/*"><input id="beceOption${letter}ImageUrl" value="${escapeHtml(edit?.option_image_urls?.[i] || '')}" placeholder="Option ${letter} image URL"><div class="bece-option-thumb" id="beceOption${letter}Preview">${edit?.option_image_urls?.[i] ? `<img src="${edit.option_image_urls[i]}" alt="Option ${letter}">` : ''}</div></div>`).join('')}
    </section>
  `)
  form.querySelector('button[type="submit"]')?.insertAdjacentHTML('beforebegin', `<button class="btn btn-blue wide" type="button" data-save-bece-with-images="true">Save BECE Question With Images</button>`)
}
async function saveWithImages() {
  const form = document.getElementById('beceAdminQuestionForm')
  if (!form) return
  const f = Object.fromEntries(new FormData(form).entries())
  const qImageFile = document.getElementById('beceQuestionImageFile')?.files?.[0]
  const qImage = await fileToDataUrl(qImageFile) || document.getElementById('beceQuestionImageUrl')?.value || ''
  const optionImages = []
  for (const letter of ['A','B','C','D']) {
    const file = document.getElementById(`beceOption${letter}ImageFile`)?.files?.[0]
    optionImages.push(await fileToDataUrl(file) || document.getElementById(`beceOption${letter}ImageUrl`)?.value || '')
  }
  const item = normalise({
    id: f.id || uid(),
    year: f.year,
    type: f.type,
    topic: f.topic,
    q: f.q,
    options: [f.option_a, f.option_b, f.option_c, f.option_d],
    answer: f.answer,
    explanation: f.explanation,
    question_image_url: qImage,
    option_image_urls: optionImages,
    option_a_image_url: optionImages[0],
    option_b_image_url: optionImages[1],
    option_c_image_url: optionImages[2],
    option_d_image_url: optionImages[3]
  })
  const list = readJson(STORE_KEY, []).map(normalise)
  const idx = list.findIndex(q => q.id === item.id)
  if (idx >= 0) list[idx] = item
  else list.unshift(item)
  saveJson(STORE_KEY, list)
  window.dispatchEvent(new CustomEvent('beceAdminBankUpdated'))
  toast('BECE question saved with image support.')
}
function previewFileOrUrl(fileInputId, urlInputId, previewId) {
  const file = document.getElementById(fileInputId)?.files?.[0]
  const url = document.getElementById(urlInputId)?.value || ''
  if (file) {
    const reader = new FileReader()
    reader.onload = () => { document.getElementById(previewId).innerHTML = `<img src="${reader.result}" alt="Preview">` }
    reader.readAsDataURL(file)
  } else if (url) document.getElementById(previewId).innerHTML = `<img src="${escapeHtml(url)}" alt="Preview">`
}
function findRawQuestionByText(text) {
  const clean = String(text || '').trim()
  return readJson(STORE_KEY, []).map(normalise).find(q => q.q === clean)
}
function injectBecePracticeImages() {
  const card = document.querySelector('.bece-question-card')
  const questionTitle = card?.querySelector('h2')
  if (!card || !questionTitle || card.querySelector('[data-bece-question-image-display]')) return
  const raw = findRawQuestionByText(questionTitle.textContent)
  if (!raw) return
  if (raw.question_image_url) questionTitle.insertAdjacentHTML('afterend', `<div class="bece-question-image-display" data-bece-question-image-display="true"><img src="${raw.question_image_url}" alt="BECE question diagram"></div>`)
  const optionButtons = [...card.querySelectorAll('[data-bece-answer]')]
  optionButtons.forEach((btn, i) => {
    const img = raw.option_image_urls?.[i]
    if (!img || btn.querySelector('.bece-option-image-display')) return
    btn.insertAdjacentHTML('beforeend', `<img class="bece-option-image-display" src="${img}" alt="Option ${String.fromCharCode(65 + i)} image">`)
  })
}
function sync() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; enhanceAdminForm(); injectBecePracticeImages() })
}

document.addEventListener('click', event => {
  if (event.target.closest('[data-save-bece-with-images]')) { event.preventDefault(); saveWithImages(); return }
}, true)

document.addEventListener('change', event => {
  const id = event.target?.id || ''
  if (id === 'beceQuestionImageFile' || id === 'beceQuestionImageUrl') previewFileOrUrl('beceQuestionImageFile', 'beceQuestionImageUrl', 'beceQuestionImagePreview')
  for (const letter of ['A','B','C','D']) if (id === `beceOption${letter}ImageFile` || id === `beceOption${letter}ImageUrl`) previewFileOrUrl(`beceOption${letter}ImageFile`, `beceOption${letter}ImageUrl`, `beceOption${letter}Preview`)
}, true)

window.addEventListener('beceAdminBankUpdated', sync)
const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false })
window.addEventListener('load', sync)
setTimeout(sync, 350)
