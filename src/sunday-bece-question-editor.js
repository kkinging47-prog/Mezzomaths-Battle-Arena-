import './sunday-bece-question-editor.css'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

const BUCKET = 'bece-question-images'
const EDITOR_KEY = 'mezzo_sunday_bece_editor_cache'
const TOPICS = ['BECE Exam Practice', 'Algebra', 'Geometry', 'Statistics', 'Number', 'Fractions', 'Percentages', 'Measurement', 'Aptitude & Mental Reasoning', 'General Practice']
const YEARS = ['2027 Prep', '2026', '2025', '2024', '2023', '2022', 'Sample']
const TYPES = ['Sunday Special', 'Past Question', 'Sample Question', 'Revision Drill']
const SYMBOL_GROUPS = [
  ['Powers', ['²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', '⁰', '⁻¹', 'x²', 'x³', '( )²', '( )³']],
  ['Roots', ['√', '∛', '√□', '√( )', '±√', '√x', '√(a² + b²)']],
  ['Fractions', ['½', '⅓', '⅔', '¼', '¾', '⅕', '⅖', '⅗', '⅘', '⅛', '⅜', '⅝', '⅞', 'a⁄b']],
  ['Operators', ['×', '÷', '−', '±', '≤', '≥', '≠', '≈', '∝', '%', ':', '∴']],
  ['Geometry', ['°', '∠', '△', '□', '▭', '∥', '⊥', 'π', 'θ', 'cm²', 'm²', 'cm³', 'm³']],
  ['Sets/Data', ['∈', '∉', '⊂', '⊆', '∪', '∩', '∅', '∑', 'x̄', '→']]
]
let activeTextarea = null
let selectedId = null
let cachedQuestions = []
let busy = false
let queued = false

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback }
}
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function profile() { return readJson('mezzo_profile', {}) || {} }
function isTrustedEditor() { return ['admin', 'mezzo_staff'].includes(String(profile().role || '').toLowerCase()) }
function optionHtml(list, selected = '') {
  return list.map(item => `<option value="${esc(item)}" ${item === selected ? 'selected' : ''}>${esc(item)}</option>`).join('')
}
function toast(message, type = 'info') {
  document.querySelector('.sunday-editor-toast')?.remove()
  document.body.insertAdjacentHTML('beforeend', `<div class="sunday-editor-toast ${type}">${esc(message)}</div>`)
  setTimeout(() => document.querySelector('.sunday-editor-toast')?.remove(), 5600)
}
function normalize(q = {}) {
  return {
    id: q.id || '',
    year: q.year || '2027 Prep',
    type: q.type || 'Sunday Special',
    topic: q.topic || 'BECE Exam Practice',
    curriculum_strand: q.curriculum_strand || q.topic_area || '',
    difficulty: q.difficulty || 'Easy',
    status: q.status || 'Published',
    question_text: q.question_text || q.question || q.q || '',
    question_image_url: q.question_image_url || q.image_url || '',
    option_a: q.option_a || q.a || '',
    option_b: q.option_b || q.b || '',
    option_c: q.option_c || q.c || '',
    option_d: q.option_d || q.d || '',
    option_a_image_url: q.option_a_image_url || '',
    option_b_image_url: q.option_b_image_url || '',
    option_c_image_url: q.option_c_image_url || '',
    option_d_image_url: q.option_d_image_url || '',
    correct_answer: String(q.correct_answer || q.answer || 'A').toUpperCase().slice(0, 1),
    explanation: q.explanation || '',
    updated_at: q.updated_at || q.created_at || ''
  }
}
function currentForm() { return document.getElementById('sundayBeceQuestionEditorForm') }
function formData() {
  const form = currentForm()
  return form ? Object.fromEntries(new FormData(form).entries()) : {}
}
function currentQuestion() { return selectedId ? cachedQuestions.find(q => q.id === selectedId) : null }
function symbolButtons() {
  return SYMBOL_GROUPS.map(([group, symbols]) => `<div class="symbol-group"><strong>${esc(group)}</strong><div>${symbols.map(symbol => `<button type="button" data-insert-math-symbol="${esc(symbol)}">${esc(symbol)}</button>`).join('')}</div></div>`).join('')
}
function editorHtml() {
  const q = currentQuestion() || normalize({})
  return `<section class="sunday-question-editor glass-card" data-sunday-question-editor="true">
    <div class="sunday-editor-head">
      <div>
        <span>✍️ Sunday BECE Question Editor</span>
        <h2>Edit Questions, Maths Symbols and Images</h2>
        <p>Use this editor for Sunday BECE Special questions with square roots, powers, fractions, geometry signs and image-based questions. Changes save to Supabase <b>bece_question_bank</b>.</p>
      </div>
      <div class="sunday-editor-actions">
        <button class="btn btn-blue" type="button" data-sunday-load-questions="true">Load Sunday Questions</button>
        <button class="btn btn-gold" type="button" data-sunday-new-question="true">New Question</button>
      </div>
    </div>
    <div class="sunday-editor-layout">
      <aside class="sunday-question-list" data-sunday-question-list>
        <div class="list-filter"><input type="search" placeholder="Search question, topic or year" data-sunday-question-search></div>
        <p>Load questions to edit uploaded Sunday BECE questions.</p>
      </aside>
      <form class="sunday-editor-form" id="sundayBeceQuestionEditorForm">
        <input type="hidden" name="id" value="${esc(q.id)}">
        <div class="sunday-form-grid">
          <label><span>Year / Set</span><select name="year">${optionHtml(YEARS, q.year)}</select></label>
          <label><span>Question Type</span><select name="type">${optionHtml(TYPES, q.type)}</select></label>
          <label><span>Topic</span><select name="topic">${optionHtml(TOPICS, q.topic)}</select></label>
          <label><span>Difficulty</span><select name="difficulty">${optionHtml(['Easy', 'Medium', 'Hard'], q.difficulty)}</select></label>
          <label><span>Status</span><select name="status">${optionHtml(['Published', 'Draft', 'Archived'], q.status)}</select></label>
          <label><span>Correct Answer</span><select name="correct_answer">${optionHtml(['A', 'B', 'C', 'D'], q.correct_answer)}</select></label>
        </div>
        <div class="math-symbol-toolbar" data-math-symbol-toolbar>${symbolButtons()}</div>
        <div class="math-tools-row">
          <button class="btn btn-blue btn-small" type="button" data-clean-math-symbols="true">Clean Maths Symbols</button>
          <button class="btn btn-ghost btn-small" type="button" data-preview-sunday-question="true">Preview</button>
          <small>Click inside any text box, then choose a symbol.</small>
        </div>
        <label class="wide"><span>Question Text</span><textarea name="question_text" class="math-editor-field" rows="5" required>${esc(q.question_text)}</textarea></label>
        ${imageField('Question Image', 'question_image_url', q.question_image_url)}
        <div class="option-editor-grid">
          ${['a', 'b', 'c', 'd'].map(letter => optionBlock(letter, q)).join('')}
        </div>
        <label class="wide"><span>Explanation / Solution</span><textarea name="explanation" class="math-editor-field" rows="4">${esc(q.explanation)}</textarea></label>
        <div class="sunday-editor-save-row">
          <button class="btn btn-gold" type="submit">${q.id ? 'Update Question' : 'Save New Question'}</button>
          ${q.id ? '<button class="btn btn-danger" type="button" data-archive-sunday-question="true">Archive Question</button>' : ''}
        </div>
        <section class="sunday-live-preview light-card" data-sunday-editor-preview>${previewHtml(q)}</section>
      </form>
    </div>
  </section>`
}
function optionBlock(letter, q) {
  const key = `option_${letter}`
  const imageKey = `option_${letter}_image_url`
  return `<article class="option-edit-card"><label><span>Option ${letter.toUpperCase()}</span><textarea name="${key}" class="math-editor-field" rows="2">${esc(q[key])}</textarea></label>${imageField(`Option ${letter.toUpperCase()} Image`, imageKey, q[imageKey])}</article>`
}
function imageField(label, name, value = '') {
  return `<div class="image-edit-row"><label><span>${esc(label)} URL</span><input name="${esc(name)}" value="${esc(value)}" placeholder="Paste image URL or upload image below"></label><label class="image-upload-label"><span>Upload</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" data-image-field="${esc(name)}"></label>${value ? `<img src="${esc(value)}" alt="${esc(label)} preview">` : '<em>No image</em>'}</div>`
}
function previewHtml(q) {
  const options = ['a', 'b', 'c', 'd'].map(letter => ({ letter: letter.toUpperCase(), text: q[`option_${letter}`], image: q[`option_${letter}_image_url`] }))
  return `<div class="preview-head"><span>${esc(q.year)} • ${esc(q.type)} • ${esc(q.topic)}</span><b>Answer ${esc(q.correct_answer)}</b></div><h3>${esc(q.question_text || 'Question preview will appear here')}</h3>${q.question_image_url ? `<img class="question-preview-image" src="${esc(q.question_image_url)}" alt="Question image">` : ''}<div class="preview-options">${options.map(o => `<article><strong>${o.letter}</strong><span>${esc(o.text || 'Option text')}</span>${o.image ? `<img src="${esc(o.image)}" alt="Option ${o.letter} image">` : ''}</article>`).join('')}</div>${q.explanation ? `<p><b>Explanation:</b> ${esc(q.explanation)}</p>` : ''}`
}
function renderList(list = cachedQuestions) {
  const box = document.querySelector('[data-sunday-question-list]')
  if (!box) return
  const term = String(document.querySelector('[data-sunday-question-search]')?.value || '').toLowerCase()
  const visible = list.filter(q => `${q.question_text} ${q.topic} ${q.year}`.toLowerCase().includes(term)).slice(0, 80)
  box.innerHTML = `<div class="list-filter"><input type="search" placeholder="Search question, topic or year" data-sunday-question-search value="${esc(term)}"></div>${visible.length ? visible.map(q => `<button type="button" class="question-list-item ${q.id === selectedId ? 'active' : ''}" data-edit-sunday-question="${esc(q.id)}"><strong>${esc(q.question_text.slice(0, 100))}</strong><small>${esc(q.year)} • ${esc(q.topic)} • ${esc(q.status)} • Answer ${esc(q.correct_answer)}</small>${q.question_image_url ? '<em>🖼️ Image</em>' : ''}</button>`).join('') : '<p>No Sunday BECE questions found yet.</p>'}`
}
function installPanel() {
  if (!isTrustedEditor()) return
  const admin = document.querySelector('.admin-screen')
  if (admin?.querySelector('[data-admin-dashboard]')) {
    admin.querySelector('[data-sunday-question-editor]')?.remove()
    return
  }
  if (!admin || admin.querySelector('[data-sunday-question-editor]')) return
  const anchor = admin.querySelector('[data-topic-question-uploader]') || admin.querySelector('.question-manager') || admin.firstElementChild
  anchor?.insertAdjacentHTML('afterend', editorHtml())
  loadQuestions(false)
}
async function loadQuestions(showToast = true) {
  if (!supabase || !isSupabaseConfigured) {
    cachedQuestions = readJson(EDITOR_KEY, []).map(normalize)
    renderList()
    if (showToast) toast('Supabase is not configured. Showing local editor cache only.', 'warn')
    return
  }
  const { data, error } = await supabase
    .from('bece_question_bank')
    .select('*')
    .neq('status', 'Archived')
    .order('updated_at', { ascending: false })
    .limit(500)
  if (error) { toast(`Could not load Sunday questions: ${error.message}`, 'error'); return }
  cachedQuestions = (data || []).map(normalize)
  saveJson(EDITOR_KEY, cachedQuestions)
  renderList()
  if (showToast) toast(`${cachedQuestions.length} Sunday BECE question(s) loaded.`, 'success')
}
function insertAtCursor(textarea, symbol) {
  if (!textarea) textarea = currentForm()?.querySelector('[name="question_text"]')
  if (!textarea) return
  textarea.focus()
  const start = textarea.selectionStart || 0
  const end = textarea.selectionEnd || 0
  const before = textarea.value.slice(0, start)
  const after = textarea.value.slice(end)
  textarea.value = `${before}${symbol}${after}`
  const pos = start + symbol.length
  textarea.setSelectionRange(pos, pos)
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}
function cleanMathText(value = '') {
  return String(value)
    .replace(/\^2\b/g, '²')
    .replace(/\^3\b/g, '³')
    .replace(/\^4\b/g, '⁴')
    .replace(/sqrt\s*\(/gi, '√(')
    .replace(/sqrt\s+/gi, '√')
    .replace(/cube\s*root\s*\(/gi, '∛(')
    .replace(/<=/g, '≤')
    .replace(/>=/g, '≥')
    .replace(/!=/g, '≠')
    .replace(/\+-/g, '±')
    .replace(/\s+x\s+/gi, ' × ')
    .replace(/\b1\/2\b/g, '½')
    .replace(/\b1\/3\b/g, '⅓')
    .replace(/\b2\/3\b/g, '⅔')
    .replace(/\b1\/4\b/g, '¼')
    .replace(/\b3\/4\b/g, '¾')
}
function cleanAllMathFields() {
  currentForm()?.querySelectorAll('.math-editor-field').forEach(field => { field.value = cleanMathText(field.value) })
  updatePreview()
  toast('Maths symbols cleaned into Unicode form.', 'success')
}
function updatePreview() {
  const preview = document.querySelector('[data-sunday-editor-preview]')
  if (!preview) return
  preview.innerHTML = previewHtml(normalize(formData()))
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
async function uploadImage(file, field) {
  if (!file) return ''
  if (file.size > 5 * 1024 * 1024) throw new Error('Image is too large. Use an image below 5MB.')
  if (!supabase || !isSupabaseConfigured) return await fileToDataUrl(file)
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')
  const path = `sunday-bece/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${Math.random().toString(16).slice(2)}-${field}-${safeName}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data?.publicUrl || ''
}
async function handleImageInput(input) {
  try {
    const field = input.dataset.imageField
    const file = input.files?.[0]
    if (!field || !file) return
    toast('Uploading question image…', 'info')
    const url = await uploadImage(file, field)
    const target = currentForm()?.querySelector(`[name="${CSS.escape(field)}"]`)
    if (target) target.value = url
    updatePreview()
    toast('Image added to the question editor.', 'success')
  } catch (error) {
    toast(`Image upload failed: ${error.message}`, 'error')
  }
}
function payload() {
  const f = normalize(formData())
  return {
    year: f.year,
    type: f.type,
    topic: f.topic,
    curriculum_strand: f.curriculum_strand || f.topic,
    difficulty: f.difficulty,
    status: f.status,
    question_text: f.question_text,
    question_image_url: f.question_image_url || null,
    option_a: f.option_a,
    option_b: f.option_b,
    option_c: f.option_c,
    option_d: f.option_d,
    option_a_image_url: f.option_a_image_url || null,
    option_b_image_url: f.option_b_image_url || null,
    option_c_image_url: f.option_c_image_url || null,
    option_d_image_url: f.option_d_image_url || null,
    correct_answer: f.correct_answer,
    explanation: f.explanation || null,
    updated_at: new Date().toISOString()
  }
}
async function saveQuestion() {
  if (busy) return
  busy = true
  try {
    if (!supabase || !isSupabaseConfigured) { toast('Supabase is not configured. Add environment variables before saving.', 'error'); return }
    const data = payload()
    if (!data.question_text || !data.option_a || !data.option_b || !data.option_c || !data.option_d) {
      toast('Question and all four options are required.', 'error')
      return
    }
    const id = formData().id || selectedId
    let result
    if (id) result = await supabase.from('bece_question_bank').update(data).eq('id', id).select().single()
    else result = await supabase.from('bece_question_bank').insert(data).select().single()
    if (result.error) throw result.error
    selectedId = result.data.id
    await loadQuestions(false)
    const panel = document.querySelector('[data-sunday-question-editor]')
    if (panel) panel.outerHTML = editorHtml()
    renderList()
    toast('Sunday BECE question saved with maths symbols and images.', 'success')
  } catch (error) {
    toast(`Save failed: ${error.message}`, 'error')
  } finally { busy = false }
}
async function archiveQuestion() {
  if (!selectedId || !supabase) return
  if (!confirm('Archive this Sunday BECE question? It will no longer appear in the public trial.')) return
  const { error } = await supabase.from('bece_question_bank').update({ status: 'Archived', updated_at: new Date().toISOString() }).eq('id', selectedId)
  if (error) { toast(`Archive failed: ${error.message}`, 'error'); return }
  selectedId = null
  await loadQuestions(false)
  const panel = document.querySelector('[data-sunday-question-editor]')
  if (panel) panel.outerHTML = editorHtml()
  renderList()
  toast('Question archived.', 'success')
}
function selectQuestion(id) {
  selectedId = id
  const panel = document.querySelector('[data-sunday-question-editor]')
  if (panel) panel.outerHTML = editorHtml()
  renderList()
}
function newQuestion() {
  selectedId = null
  const panel = document.querySelector('[data-sunday-question-editor]')
  if (panel) panel.outerHTML = editorHtml()
  renderList()
}
function scheduleInstall() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; installPanel() })
}

document.addEventListener('focusin', event => {
  if (event.target?.classList?.contains('math-editor-field')) activeTextarea = event.target
})
document.addEventListener('input', event => {
  if (event.target?.matches?.('#sundayBeceQuestionEditorForm textarea, #sundayBeceQuestionEditorForm input[name$="_url"], #sundayBeceQuestionEditorForm select')) updatePreview()
  if (event.target?.matches?.('[data-sunday-question-search]')) renderList()
})
document.addEventListener('change', event => {
  if (event.target?.matches?.('[data-image-field]')) handleImageInput(event.target)
})
document.addEventListener('submit', event => {
  if (event.target?.id !== 'sundayBeceQuestionEditorForm') return
  event.preventDefault()
  saveQuestion()
}, true)
document.addEventListener('click', event => {
  const symbol = event.target.closest('[data-insert-math-symbol]')?.dataset.insertMathSymbol
  if (symbol) { event.preventDefault(); insertAtCursor(activeTextarea, symbol); return }
  const editId = event.target.closest('[data-edit-sunday-question]')?.dataset.editSundayQuestion
  if (editId) { event.preventDefault(); selectQuestion(editId); return }
  if (event.target.closest('[data-sunday-load-questions]')) { event.preventDefault(); loadQuestions(true); return }
  if (event.target.closest('[data-sunday-new-question]')) { event.preventDefault(); newQuestion(); return }
  if (event.target.closest('[data-clean-math-symbols]')) { event.preventDefault(); cleanAllMathFields(); return }
  if (event.target.closest('[data-preview-sunday-question]')) { event.preventDefault(); updatePreview(); return }
  if (event.target.closest('[data-archive-sunday-question]')) { event.preventDefault(); archiveQuestion(); return }
}, true)

window.addEventListener('load', () => setTimeout(scheduleInstall, 1200))
window.addEventListener('mezzoProfileUpdated', scheduleInstall)
new MutationObserver(scheduleInstall).observe(document.documentElement, { childList: true, subtree: true })
