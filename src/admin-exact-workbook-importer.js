import './admin-exact-workbook-importer.css'
import { supabase } from './supabaseClient.js'

const BANK_KEY = 'mezzo_question_bank'
let queued = false
let lastImport = []

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])) }
function uid() { return `exact_workbook_${Date.now()}_${Math.random().toString(16).slice(2)}` }
function toast(message) { document.querySelector('.exact-workbook-toast')?.remove(); document.body.insertAdjacentHTML('beforeend', `<div class="exact-workbook-toast">${escapeHtml(message)}</div>`); setTimeout(() => document.querySelector('.exact-workbook-toast')?.remove(), 5200) }
function bank() { return readJson(BANK_KEY, []) }
function saveBank(list) { saveJson(BANK_KEY, list) }
function option(letter, row) { return row[`option_${letter}`] || row[`option${letter}`] || row[`option ${letter.toUpperCase()}`] || row[letter.toUpperCase()] || '' }
function toNumber(value) { const n = Number(String(value ?? '').replace(/,/g, '').trim()); return Number.isFinite(n) ? n : null }
function normalize(row = {}) {
  const question = row.question_text || row.question || row.q || row.Question || ''
  const classLevel = row.class_level || row.class || row.grade || row.level || 'Grade 9'
  const topic = row.topic || row.Topic || 'Mezzo Workbook Topic'
  const answer = String(row.correct_answer || row.answer || row.Answer || '').toUpperCase().slice(0, 1)
  const numeric = row.numeric_answer || row.numeric || row.answer_value || ''
  return {
    id: row.id || uid(),
    class_level: classLevel,
    curriculum: row.curriculum || 'GES',
    term: row.term || '',
    topic,
    topic_area: row.topic_area || topic,
    topic_sublevel: row.topic_sublevel || 'Exact Mezzo Workbook 2025',
    difficulty: Number(row.difficulty || 2),
    question_text: question,
    numeric_answer: numeric === '' ? toNumber(row.answer || row.correct_value) : toNumber(numeric),
    option_a: option('a', row) || row.option_a || '',
    option_b: option('b', row) || row.option_b || '',
    option_c: option('c', row) || row.option_c || '',
    option_d: option('d', row) || row.option_d || '',
    correct_answer: ['A','B','C','D'].includes(answer) ? answer : (numeric !== '' ? 'B' : 'A'),
    explanation: row.explanation || row.solution || row.workings || '',
    page_number: row.page || row.page_number || '',
    workbook_year: row.workbook_year || '2025',
    source_type: 'workbook_exact',
    workbook_source: row.workbook_source || 'Mezzo Maths Workbook 2025',
    ai_generated: false,
    workbook_seeded: false,
    is_active: true
  }
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
  if (rows.length < 2) return []
  const headers = rows.shift().map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  return rows.map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] || '']))).map(normalize).filter(q => q.question_text)
}
function importJson(text) {
  const data = JSON.parse(text)
  const rows = Array.isArray(data) ? data : (Array.isArray(data.questions) ? data.questions : [])
  return rows.map(normalize).filter(q => q.question_text)
}
function templateCsv() {
  return 'class_level,curriculum,term,topic,topic_area,question_text,numeric_answer,option_a,option_b,option_c,option_d,correct_answer,explanation,page_number\nGrade 9,GES,Term 1,General Multiplication,General Multiplication,"27 × 48",1296,1286,1296,1306,1396,B,"27 × 48 = 1296",12\n'
}
function downloadTemplate() {
  const blob = new Blob([templateCsv()], { type: 'text/csv' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'mezzo-exact-workbook-question-template.csv'
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}
async function handleFile(file) {
  if (!file) return
  const text = await file.text()
  try {
    lastImport = file.name.toLowerCase().endsWith('.json') ? importJson(text) : importCsv(text)
  } catch (error) {
    toast(`Import failed: ${error.message}`)
    return
  }
  if (!lastImport.length) return toast('No valid workbook questions found. Use the CSV template format.')
  const existing = bank()
  const signatures = new Set(existing.map(q => `${q.class_level}|${q.topic}|${q.question_text}`))
  const clean = lastImport.filter(q => !signatures.has(`${q.class_level}|${q.topic}|${q.question_text}`))
  saveBank([...clean, ...existing])
  updatePanel(true)
  toast(`${clean.length} exact workbook questions imported locally. Use Replace in Database to remove generated samples for that class/topic.`)
}
function selectedClassTopic() {
  const cls = document.getElementById('exactWorkbookClass')?.value || lastImport[0]?.class_level || 'Grade 9'
  const topic = document.getElementById('exactWorkbookTopic')?.value || lastImport[0]?.topic || ''
  return { cls, topic }
}
async function replaceDatabaseTopic() {
  if (!supabase) return toast('Supabase is not configured. Import is saved locally only.')
  const { cls, topic } = selectedClassTopic()
  const exact = bank().filter(q => q.source_type === 'workbook_exact' && q.class_level === cls && (!topic || q.topic === topic))
  if (!exact.length) return toast('No exact workbook questions found locally for the selected class/topic.')
  if (!confirm(`This will delete existing DB questions for ${cls}${topic ? ` / ${topic}` : ''} and insert ${exact.length} exact workbook questions. Continue?`)) return
  let del = supabase.from('question_bank').delete().eq('class_level', cls)
  if (topic) del = del.eq('topic', topic)
  const { error: delError } = await del
  if (delError) return toast(`Delete failed: ${delError.message}`)
  const payload = exact.map(q => ({
    class_level: q.class_level,
    curriculum: q.curriculum || 'GES',
    topic: q.topic,
    topic_area: q.topic_area || q.topic,
    topic_sublevel: q.topic_sublevel || 'Exact Mezzo Workbook 2025',
    difficulty: Number(q.difficulty || 2),
    question_text: q.question_text,
    numeric_answer: q.numeric_answer === '' || q.numeric_answer === undefined ? null : q.numeric_answer,
    option_a: q.option_a || '',
    option_b: q.option_b || '',
    option_c: q.option_c || '',
    option_d: q.option_d || '',
    correct_answer: q.correct_answer || 'A',
    explanation: q.explanation || '',
    ai_generated: false,
    is_active: true,
    source_type: 'workbook_exact',
    workbook_source: q.workbook_source || 'Mezzo Maths Workbook 2025',
    workbook_year: q.workbook_year || '2025',
    workbook_page: q.page_number ? String(q.page_number) : null
  }))
  const { error } = await supabase.from('question_bank').insert(payload)
  if (error) return toast(`Database insert failed: ${error.message}`)
  toast(`${payload.length} exact workbook questions replaced in database for ${cls}${topic ? ` / ${topic}` : ''}.`)
}
function clearGeneratedLocal() {
  const { cls, topic } = selectedClassTopic()
  const before = bank()
  const after = before.filter(q => !(q.class_level === cls && (!topic || q.topic === topic) && q.source_type !== 'workbook_exact'))
  saveBank(after)
  updatePanel(true)
  toast(`Removed ${before.length - after.length} generated/sample local questions for ${cls}${topic ? ` / ${topic}` : ''}.`)
}
function classes() { return [...new Set(bank().map(q => q.class_level).filter(Boolean))].sort() }
function topicsFor(cls) { return [...new Set(bank().filter(q => q.class_level === cls).map(q => q.topic).filter(Boolean))].sort() }
function panelHtml() {
  const exact = bank().filter(q => q.source_type === 'workbook_exact')
  const clsList = classes().length ? classes() : ['Grade 9']
  const cls = document.getElementById('exactWorkbookClass')?.value || clsList[0]
  const topicList = topicsFor(cls)
  return `<section class="exact-workbook-panel glass-card" data-exact-workbook-panel="true">
    <div class="exact-workbook-head"><div><span>📚 Exact Workbook Question Bank</span><h2>Use Real Mezzo Workbook Questions</h2><p>The generated starter questions are only placeholders. Upload the real workbook questions here, then replace generated DB questions for that class/topic.</p></div><strong>${exact.length}</strong></div>
    <div class="exact-workbook-actions">
      <label><span>Upload Exact Questions CSV/JSON</span><input type="file" id="exactWorkbookUpload" accept=".csv,.json,application/json,text/csv"></label>
      <label><span>Class</span><select id="exactWorkbookClass">${clsList.map(c => `<option value="${escapeHtml(c)}" ${c === cls ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}</select></label>
      <label><span>Topic</span><select id="exactWorkbookTopic"><option value="">All topics in class</option>${topicList.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('')}</select></label>
      <button class="btn btn-blue" type="button" data-download-exact-template="true">Download Template</button>
      <button class="btn btn-danger" type="button" data-clear-generated-local="true">Remove Local Generated for Topic</button>
      <button class="btn btn-gold" type="button" data-replace-db-topic="true">Replace in Database</button>
    </div>
    <div class="exact-workbook-note"><b>Recommended flow:</b> Upload exact workbook questions → choose class/topic → Remove Local Generated → Replace in Database. After this, Solo, Battle and Smart Board will pull real workbook questions instead of placeholders.</div>
    <div class="exact-workbook-list">${exact.slice(0, 20).map(q => `<article><strong>${escapeHtml(q.class_level)} • ${escapeHtml(q.topic)}</strong><span>${escapeHtml(q.question_text)}</span><small>${escapeHtml(q.workbook_source || 'Mezzo Workbook')} ${q.page_number ? `• Page ${escapeHtml(q.page_number)}` : ''}</small></article>`).join('') || '<p>No exact workbook questions imported yet.</p>'}</div>
  </section>`
}
function installPanel(force = false) {
  const admin = document.querySelector('.admin-screen')
  if (!admin) return
  const old = admin.querySelector('[data-exact-workbook-panel]')
  if (old && !force) return
  if (old) old.outerHTML = panelHtml()
  else {
    const workbookSummary = admin.querySelector('[data-workbook-seed-summary]')
    if (workbookSummary) workbookSummary.insertAdjacentHTML('afterend', panelHtml())
    else admin.insertAdjacentHTML('beforeend', panelHtml())
  }
}
function updatePanel(force = false) { installPanel(force) }
function sync() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; installPanel(false) })
}

document.addEventListener('change', event => {
  if (event.target?.id === 'exactWorkbookUpload') handleFile(event.target.files?.[0])
  if (event.target?.id === 'exactWorkbookClass') updatePanel(true)
})
document.addEventListener('click', event => {
  if (event.target.closest('[data-download-exact-template]')) downloadTemplate()
  if (event.target.closest('[data-clear-generated-local]')) clearGeneratedLocal()
  if (event.target.closest('[data-replace-db-topic]')) replaceDatabaseTopic()
}, true)

const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, attributes: false })
window.addEventListener('load', sync)
window.addEventListener('storage', sync)
setTimeout(sync, 600)
