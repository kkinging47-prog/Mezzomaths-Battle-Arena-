import './bece-admin.css'

const STORE_KEY = 'mezzo_bece_admin_bank'
const YEAR_KEY = 'mezzo_bece_admin_year_filter'
const yearOptions = ['All', ...Array.from({ length: Math.max(1, new Date().getFullYear() - 1989) }, (_, i) => String(new Date().getFullYear() - i)), 'Sample']
let queued = false
let editingId = ''

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback }
}
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
function uid() { return `bece_${Date.now()}_${Math.random().toString(16).slice(2)}` }
function bank() { return readJson(STORE_KEY, []) }
function saveBank(list) { saveJson(STORE_KEY, list); window.dispatchEvent(new CustomEvent('beceAdminBankUpdated')) }
function selectedYear() { return localStorage.getItem(YEAR_KEY) || 'All' }
function setSelectedYear(year) { localStorage.setItem(YEAR_KEY, year || 'All') }
function yearSelect(name, selected, id = '') { return `<select ${id ? `id="${id}"` : ''} name="${name}">${yearOptions.map(y => `<option value="${escapeHtml(y)}" ${String(y) === String(selected) ? 'selected' : ''}>${escapeHtml(y)}</option>`).join('')}</select>` }
function optionSelect(selected) { return ['A','B','C','D'].map(v => `<option value="${v}" ${v === selected ? 'selected' : ''}>${v}</option>`).join('') }
function normalise(row = {}) {
  const options = row.options || [row.option_a, row.option_b, row.option_c, row.option_d]
  return {
    id: row.id || uid(),
    year: String(row.year || row.bece_year || 'Sample'),
    type: row.type || row.mode || 'pastStyle',
    topic: row.topic || 'General BECE',
    q: row.q || row.question || row.question_text || '',
    options: [options[0] || '', options[1] || '', options[2] || '', options[3] || ''],
    answer: String(row.answer || row.correct_answer || 'A').toUpperCase().slice(0, 1),
    explanation: row.explanation || ''
  }
}
function filteredBank() {
  const y = selectedYear()
  const list = bank().map(normalise)
  return y === 'All' ? list : list.filter(q => String(q.year) === String(y))
}
function panelHtml() {
  const all = bank().map(normalise)
  const visible = filteredBank()
  const edit = editingId ? all.find(q => q.id === editingId) : null
  const yearValue = edit?.year || (selectedYear() === 'All' ? String(new Date().getFullYear()) : selectedYear())
  return `<section class="bece-admin-panel glass-card" data-bece-admin-panel="true">
    <div class="bece-admin-head"><div><span>📘 BECE Question Bank Admin</span><h2>Upload, Edit, Delete & Select Year</h2><p>Manage BECE Past Questions and Sample BECE Practice Questions by year. Uploaded questions will appear on the BECE Practice page.</p></div><div class="bece-admin-count"><strong>${all.length}</strong><small>Total BECE questions</small></div></div>
    <div class="bece-admin-tools"><label><span>Filter / Select Year</span>${yearSelect('year_filter', selectedYear(), 'beceAdminYearFilter')}</label><label class="file-upload-label"><span>Upload CSV or JSON</span><input id="beceUploadFile" type="file" accept=".csv,.json,application/json,text/csv"></label><button class="btn btn-blue" type="button" data-bece-download-template="true">Download CSV Template</button><button class="btn btn-danger" type="button" data-bece-clear-filter="true">Show All</button></div>
    <form id="beceAdminQuestionForm" class="bece-admin-form"><input type="hidden" name="id" value="${escapeHtml(edit?.id || '')}"><label><span>BECE Year</span>${yearSelect('year', yearValue)}</label><label><span>Question Type</span><select name="type"><option value="pastStyle" ${edit?.type !== 'samples' ? 'selected' : ''}>BECE Past Questions Practice</option><option value="samples" ${edit?.type === 'samples' ? 'selected' : ''}>Sample BECE Practice Questions</option></select></label><label><span>Topic</span><input name="topic" value="${escapeHtml(edit?.topic || '')}" placeholder="e.g. Percentages" required></label><label class="wide"><span>Question</span><textarea name="q" required placeholder="Type the BECE question here">${escapeHtml(edit?.q || '')}</textarea></label>${['A','B','C','D'].map((letter, i) => `<label><span>Option ${letter}</span><input name="option_${letter.toLowerCase()}" value="${escapeHtml(edit?.options?.[i] || '')}" required></label>`).join('')}<label><span>Correct Answer</span><select name="answer">${optionSelect(edit?.answer || 'A')}</select></label><label class="wide"><span>Explanation</span><textarea name="explanation" placeholder="Short solution / explanation">${escapeHtml(edit?.explanation || '')}</textarea></label><button class="btn btn-gold wide" type="submit">${edit ? 'Update BECE Question' : 'Add BECE Question'}</button>${edit ? '<button class="btn btn-ghost wide" type="button" data-bece-cancel-edit="true">Cancel Edit</button>' : ''}</form>
    <div class="bece-admin-note"><b>CSV format:</b> year,type,topic,question,option_a,option_b,option_c,option_d,correct_answer,explanation. Use type <b>pastStyle</b> for BECE Past Questions or <b>samples</b> for Sample BECE Practice Questions.</div>
    <div class="bece-admin-list">${visible.slice(0, 120).map(q => `<article><div><strong>${escapeHtml(q.year)} • ${escapeHtml(q.topic)}</strong><span>${escapeHtml(q.q)}</span><small>${q.type === 'samples' ? 'Sample BECE Practice' : 'BECE Past Questions'} • Answer ${escapeHtml(q.answer)}</small></div><div><button class="btn btn-blue btn-small" type="button" data-bece-edit="${escapeHtml(q.id)}">Edit</button><button class="btn btn-danger btn-small" type="button" data-bece-delete="${escapeHtml(q.id)}">Delete</button></div></article>`).join('') || '<p class="bece-admin-empty">No BECE questions found for this year. Upload or add questions above.</p>'}</div>
  </section>`
}
function installPanel() {
  const admin = document.querySelector('.admin-screen')
  if (!admin || !admin.querySelector('.question-manager')) return
  const old = admin.querySelector('[data-bece-admin-panel]')
  if (old) old.outerHTML = panelHtml()
  else admin.insertAdjacentHTML('beforeend', panelHtml())
}
function queueInstall() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; installPanel() })
}
function formPayload(form) {
  const f = Object.fromEntries(new FormData(form).entries())
  return normalise({ id: f.id || uid(), year: f.year, type: f.type, topic: f.topic, q: f.q, options: [f.option_a, f.option_b, f.option_c, f.option_d], answer: f.answer, explanation: f.explanation })
}
function saveQuestion(form) {
  const item = formPayload(form)
  const list = bank().map(normalise)
  const idx = list.findIndex(q => q.id === item.id)
  if (idx >= 0) list[idx] = item
  else list.unshift(item)
  editingId = ''
  saveBank(list)
  installPanel()
}
function deleteQuestion(id) {
  if (!confirm('Delete this BECE question?')) return
  saveBank(bank().map(normalise).filter(q => q.id !== id))
  if (editingId === id) editingId = ''
  installPanel()
}
function csvRows(text) {
  const rows = []
  let row = [], value = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1]
    if (c === '"' && quoted && next === '"') { value += '"'; i++ }
    else if (c === '"') quoted = !quoted
    else if (c === ',' && !quoted) { row.push(value); value = '' }
    else if ((c === '\n' || c === '\r') && !quoted) { if (value || row.length) { row.push(value); rows.push(row); row = []; value = '' } }
    else value += c
  }
  if (value || row.length) { row.push(value); rows.push(row) }
  return rows.filter(r => r.some(cell => String(cell).trim()))
}
function importCsv(text) {
  const rows = csvRows(text)
  const headers = rows.shift().map(h => h.trim().toLowerCase())
  return rows.map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] || '']))).map(normalise).filter(q => q.q && q.options.every(Boolean))
}
async function handleUpload(file) {
  if (!file) return
  const text = await file.text()
  let imported = []
  if (file.name.toLowerCase().endsWith('.json')) {
    const data = JSON.parse(text)
    imported = Array.isArray(data) ? data.map(normalise) : []
  } else imported = importCsv(text)
  if (!imported.length) { alert('No valid BECE questions found in the file.'); return }
  saveBank([...imported, ...bank().map(normalise)])
  alert(`${imported.length} BECE question(s) uploaded successfully.`)
  installPanel()
}
function downloadTemplate() {
  const csv = 'year,type,topic,question,option_a,option_b,option_c,option_d,correct_answer,explanation\n2026,pastStyle,Percentages,"A book costs GHS 80. It is sold at a discount of 10%. What is the discount?",GHS 4,GHS 8,GHS 10,GHS 72,B,"10% of 80 = 8."\n'
  const blob = new Blob([csv], { type: 'text/csv' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'bece-question-upload-template.csv'
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

document.addEventListener('submit', event => {
  if (event.target?.id === 'beceAdminQuestionForm') {
    event.preventDefault()
    event.stopImmediatePropagation()
    saveQuestion(event.target)
  }
}, true)

document.addEventListener('click', event => {
  const edit = event.target.closest('[data-bece-edit]')
  if (edit) { editingId = edit.dataset.beceEdit; installPanel(); return }
  const del = event.target.closest('[data-bece-delete]')
  if (del) { deleteQuestion(del.dataset.beceDelete); return }
  if (event.target.closest('[data-bece-cancel-edit]')) { editingId = ''; installPanel(); return }
  if (event.target.closest('[data-bece-download-template]')) { downloadTemplate(); return }
  if (event.target.closest('[data-bece-clear-filter]')) { setSelectedYear('All'); installPanel(); return }
}, true)

document.addEventListener('change', event => {
  if (event.target?.id === 'beceAdminYearFilter') { setSelectedYear(event.target.value); installPanel() }
  if (event.target?.id === 'beceUploadFile') handleUpload(event.target.files?.[0])
})

const observer = new MutationObserver(queueInstall)
observer.observe(document.body, { childList: true, subtree: true, attributes: false })
window.addEventListener('load', queueInstall)
window.addEventListener('beceAdminBankUpdated', queueInstall)
setTimeout(queueInstall, 500)
