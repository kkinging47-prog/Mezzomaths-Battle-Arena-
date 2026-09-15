import './sunday-bece-editor-permissions.css'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

const BUCKET = 'bece-question-images'
const PROFILE_KEY = 'mezzo_profile'
const ADMIN_ROOT = '[data-sunday-editor-admin-root]'
const EDITOR_ROOT = '[data-sunday-editor-root]'
const QUESTIONS = [
  'id','year','type','topic','topic_area','curriculum_strand','difficulty','status','question_text','question_image_url',
  'option_a','option_b','option_c','option_d','option_a_image_url','option_b_image_url','option_c_image_url','option_d_image_url',
  'correct_answer','explanation','source_name','source_page','math_format','editor_notes','updated_at','created_at'
].join(',')
const SYMBOL_GROUPS = [
  ['Powers', ['²','³','⁴','⁵','⁶','⁷','⁸','⁹','x²','x³','( )²','( )³']],
  ['Roots', ['√','∛','√( )','√x','±√','√(a² + b²)']],
  ['Fractions', ['½','⅓','⅔','¼','¾','⅕','⅖','⅗','⅘','⅛','⅜','⅝','⅞','a⁄b']],
  ['Operators', ['×','÷','−','±','≤','≥','≠','≈','%','∝','∴']],
  ['Geometry', ['°','∠','△','□','▭','∥','⊥','π','θ','cm²','m²','cm³','m³']],
  ['Sets/Data', ['∈','∉','⊂','⊆','∪','∩','∅','∑','x̄','→']]
]
const TOPICS = ['BECE Exam Practice','Algebra','Geometry','Statistics','Number','Fractions','Percentages','Measurement','Aptitude & Mental Reasoning','General Practice']
const YEARS = ['2027 Prep','2026','2025','2024','2023','2022','Sample']
const TYPES = ['Sunday Special','Past Question','Sample Question','Revision Drill']
const DIFFICULTY = ['Easy','Medium','Hard']
const STATUS = ['Published','Draft','Archived']
let canEdit = false
let isAdmin = false
let checked = false
let activeInput = null
let questions = []
let editors = []
let selectedId = ''
let queued = false
let saving = false

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function profile() { return readJson(PROFILE_KEY, {}) || {} }
function optionHtml(list, selected = '') { return list.map(x => `<option value="${esc(x)}" ${x === selected ? 'selected' : ''}>${esc(x)}</option>`).join('') }
function toast(message, type = 'info') {
  document.querySelector('.sunday-editor-permission-toast')?.remove()
  document.body.insertAdjacentHTML('beforeend', `<div class="sunday-editor-permission-toast ${type}">${esc(message)}</div>`)
  setTimeout(() => document.querySelector('.sunday-editor-permission-toast')?.remove(), 5600)
}
function localAdminGuess() { return String(profile().role || '').toLowerCase() === 'admin' }
function normalise(q = {}) {
  return {
    id: q.id || '', year: q.year || '2027 Prep', type: q.type || 'Sunday Special', topic: q.topic || 'BECE Exam Practice',
    topic_area: q.topic_area || q.curriculum_strand || q.topic || 'BECE Exam Practice', curriculum_strand: q.curriculum_strand || q.topic_area || q.topic || '',
    difficulty: q.difficulty || 'Easy', status: q.status || 'Published', question_text: q.question_text || '', question_image_url: q.question_image_url || '',
    option_a: q.option_a || '', option_b: q.option_b || '', option_c: q.option_c || '', option_d: q.option_d || '',
    option_a_image_url: q.option_a_image_url || '', option_b_image_url: q.option_b_image_url || '', option_c_image_url: q.option_c_image_url || '', option_d_image_url: q.option_d_image_url || '',
    correct_answer: String(q.correct_answer || 'A').toUpperCase().slice(0,1), explanation: q.explanation || '', source_name: q.source_name || 'Sunday BECE Special',
    source_page: q.source_page || '', math_format: q.math_format || 'unicode', editor_notes: q.editor_notes || '', updated_at: q.updated_at || q.created_at || ''
  }
}
async function checkAccess(force = false) {
  if (checked && !force) return { canEdit, isAdmin }
  checked = true
  canEdit = false
  isAdmin = false
  if (!supabase || !isSupabaseConfigured) return { canEdit, isAdmin }
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) return { canEdit, isAdmin }
    const admin = await supabase.rpc('is_sunday_bece_admin')
    const manage = await supabase.rpc('can_manage_sunday_bece_questions')
    isAdmin = Boolean(admin.data) || localAdminGuess()
    canEdit = Boolean(manage.data) || isAdmin
  } catch (error) {
    console.warn('Sunday editor permission check failed:', error?.message || error)
    isAdmin = localAdminGuess()
    canEdit = isAdmin
  }
  window.__mezzoSundayBeceCanEdit = canEdit
  window.__mezzoSundayBeceIsAdmin = isAdmin
  return { canEdit, isAdmin }
}
function removeLegacyEditor() {
  document.querySelectorAll('[data-sunday-question-editor]').forEach(el => {
    if (!el.hasAttribute('data-permission-safe-editor')) el.remove()
  })
}
function symbolsHtml() {
  return `<div class="sunday-special-toolbar"><strong>Maths Symbols Toolbar</strong><div class="sunday-symbol-groups">${SYMBOL_GROUPS.map(([name, list]) => `<div class="sunday-symbol-group"><span>${esc(name)}</span><div>${list.map(s => `<button type="button" data-sunday-insert-symbol="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>`).join('')}</div><div class="sunday-special-actions"><button type="button" class="btn btn-blue btn-small" data-sunday-clean-math="true">Clean Maths Symbols</button><button type="button" class="btn btn-ghost btn-small" data-sunday-preview="true">Refresh Preview</button></div></div>`
}
function assignmentHtml() {
  if (!isAdmin) return ''
  return `<section class="sunday-editor-permission-panel glass-card" data-sunday-editor-admin-root="true">
    <div class="sunday-editor-permission-head"><div><span>🔐 Admin Only</span><h2>Assign Sunday BECE Question Editors</h2><p>Only admin can appoint editors. Teachers, tutors or staff must be assigned here before they can add or edit Sunday BECE Special questions.</p></div><button class="btn btn-blue" type="button" data-refresh-sunday-editors="true">Refresh Editors</button></div>
    <div class="sunday-editor-permission-grid"><label><span>Editor Email</span><input id="sundayEditorEmail" type="email" placeholder="editor@example.com"></label><label class="wide"><span>Notes / Scope</span><textarea id="sundayEditorNotes" placeholder="Example: Can edit BECE 2027 Algebra and Geometry questions"></textarea></label></div>
    <div class="sunday-editor-permission-actions"><button class="btn btn-gold" type="button" data-assign-sunday-editor="true">Assign Editor</button></div>
    <div class="sunday-editor-list" data-sunday-editor-list>${editorsHtml()}</div>
  </section>`
}
function editorsHtml() {
  if (!editors.length) return '<p class="sunday-editor-lock">No assigned editors yet. Add an editor by email after the person has created an account.</p>'
  return editors.map(e => `<article class="sunday-editor-row"><div><strong>${esc(e.email)}</strong><small>${esc(e.notes || 'No notes')} ${e.assigned_at ? '• Assigned ' + new Date(e.assigned_at).toLocaleDateString() : ''}</small></div><div><em class="${esc(e.status)}">${esc(e.status)}</em>${e.status === 'active' ? `<button class="btn btn-danger btn-small" type="button" data-revoke-sunday-editor="${esc(e.email)}">Revoke</button>` : ''}</div></article>`).join('')
}
function imagePreview(q) {
  const items = [
    ['Question', q.question_image_url], ['A', q.option_a_image_url], ['B', q.option_b_image_url], ['C', q.option_c_image_url], ['D', q.option_d_image_url]
  ].filter(([, url]) => url)
  if (!items.length) return '<p>No images attached yet.</p>'
  return `<div class="sunday-special-image-grid">${items.map(([label, url]) => `<div class="sunday-special-image-card"><img src="${esc(url)}" alt="${esc(label)} image"><b>${esc(label)}</b></div>`).join('')}</div>`
}
function previewHtml(q) {
  return `<div class="sunday-special-preview-question">${esc(q.question_text || 'Question preview will appear here.')}</div>${q.question_image_url ? `<div class="sunday-special-image-card"><img src="${esc(q.question_image_url)}" alt="Question image"><b>Question Image</b></div>` : ''}<div class="sunday-special-preview-options"><span>A. ${esc(q.option_a || '')}</span><span>B. ${esc(q.option_b || '')}</span><span>C. ${esc(q.option_c || '')}</span><span>D. ${esc(q.option_d || '')}</span></div>`
}
function editorFormHtml() {
  const q = normalise(questions.find(x => x.id === selectedId) || {})
  return `<section class="sunday-special-admin-editor glass-card" data-sunday-editor-root="true" data-permission-safe-editor="true">
    <div class="sunday-special-editor-head"><div><span>${isAdmin ? 'Admin + Assigned Editors' : 'Assigned Editor'}</span><h2>Sunday BECE Special Question Editor</h2><p>Add and edit BECE questions with original maths symbols, powers, roots, fractions and diagrams. Image questions and image options are supported.</p></div><button class="btn btn-blue" type="button" data-load-sunday-questions="true">Load Questions</button></div>
    <form id="sundaySpecialQuestionForm" class="sunday-special-form-grid">
      <input type="hidden" name="id" value="${esc(q.id)}">
      <label><span>Year</span><select name="year">${optionHtml(YEARS, q.year)}</select></label>
      <label><span>Type</span><select name="type">${optionHtml(TYPES, q.type)}</select></label>
      <label><span>Topic</span><select name="topic">${optionHtml(TOPICS, q.topic)}</select></label>
      <label><span>Topic Area / Strand</span><input name="topic_area" value="${esc(q.topic_area)}"></label>
      <label><span>Difficulty</span><select name="difficulty">${optionHtml(DIFFICULTY, q.difficulty)}</select></label>
      <label><span>Status</span><select name="status">${optionHtml(STATUS, q.status)}</select></label>
      ${symbolsHtml()}
      <label class="full"><span>Question Text</span><textarea name="question_text" data-sunday-math-field="true" required>${esc(q.question_text)}</textarea></label>
      <label><span>Option A</span><textarea name="option_a" data-sunday-math-field="true">${esc(q.option_a)}</textarea></label>
      <label><span>Option B</span><textarea name="option_b" data-sunday-math-field="true">${esc(q.option_b)}</textarea></label>
      <label><span>Option C</span><textarea name="option_c" data-sunday-math-field="true">${esc(q.option_c)}</textarea></label>
      <label><span>Option D</span><textarea name="option_d" data-sunday-math-field="true">${esc(q.option_d)}</textarea></label>
      <label><span>Correct Answer</span><select name="correct_answer">${optionHtml(['A','B','C','D'], q.correct_answer)}</select></label>
      <label><span>Source Page / Paper</span><input name="source_page" value="${esc(q.source_page)}" placeholder="e.g. 2024 Paper 1 Q12"></label>
      <label class="full"><span>Explanation / Solution</span><textarea name="explanation" data-sunday-math-field="true">${esc(q.explanation)}</textarea></label>
      <label><span>Question Image URL</span><input name="question_image_url" value="${esc(q.question_image_url)}" placeholder="Paste image URL or upload below"></label>
      <label><span>Upload Question Image</span><input type="file" name="question_image_file" accept="image/*,.svg"></label>
      <label><span>Option A Image URL</span><input name="option_a_image_url" value="${esc(q.option_a_image_url)}"></label>
      <label><span>Upload A Image</span><input type="file" name="option_a_image_file" accept="image/*,.svg"></label>
      <label><span>Option B Image URL</span><input name="option_b_image_url" value="${esc(q.option_b_image_url)}"></label>
      <label><span>Upload B Image</span><input type="file" name="option_b_image_file" accept="image/*,.svg"></label>
      <label><span>Option C Image URL</span><input name="option_c_image_url" value="${esc(q.option_c_image_url)}"></label>
      <label><span>Upload C Image</span><input type="file" name="option_c_image_file" accept="image/*,.svg"></label>
      <label><span>Option D Image URL</span><input name="option_d_image_url" value="${esc(q.option_d_image_url)}"></label>
      <label><span>Upload D Image</span><input type="file" name="option_d_image_file" accept="image/*,.svg"></label>
      <label class="full"><span>Editor Notes</span><textarea name="editor_notes">${esc(q.editor_notes)}</textarea></label>
      <div class="sunday-special-image-preview"><strong>Current Images</strong>${imagePreview(q)}</div>
      <div class="sunday-special-live-preview" data-sunday-live-preview><strong>Live Preview</strong>${previewHtml(q)}</div>
      <div class="sunday-special-actions full"><button class="btn btn-gold" type="submit">${q.id ? 'Save Edited Question' : 'Add New Question'}</button><button class="btn btn-blue" type="button" data-new-sunday-question="true">New Question</button>${q.id ? '<button class="btn btn-danger" type="button" data-archive-sunday-question="true">Archive Question</button>' : ''}</div>
    </form>
    <div class="sunday-special-filter"><input id="sundayQuestionSearch" placeholder="Search loaded questions"><select id="sundayStatusFilter">${optionHtml(['All','Published','Draft','Archived'], 'All')}</select><button class="btn btn-ghost" type="button" data-load-sunday-questions="true">Refresh List</button></div>
    <div class="sunday-special-question-list" data-sunday-question-list>${questionsHtml()}</div>
  </section>`
}
function questionsHtml() {
  if (!questions.length) return '<p class="sunday-editor-lock">No questions loaded yet. Click Load Questions.</p>'
  const search = String(document.getElementById('sundayQuestionSearch')?.value || '').toLowerCase()
  const status = document.getElementById('sundayStatusFilter')?.value || 'All'
  const visible = questions.filter(q => (status === 'All' || q.status === status) && (!search || `${q.question_text} ${q.topic} ${q.year}`.toLowerCase().includes(search)))
  return visible.map(q => `<article class="sunday-special-question-row"><div><strong>${esc(q.year)} • ${esc(q.topic)} • ${esc(q.status)}</strong><p>${esc(q.question_text).slice(0, 180)}${q.question_text.length > 180 ? '…' : ''}</p><small>Answer ${esc(q.correct_answer)}${q.question_image_url ? ' • Has question image' : ''}${q.option_a_image_url || q.option_b_image_url || q.option_c_image_url || q.option_d_image_url ? ' • Has option images' : ''}</small></div><button class="btn btn-blue btn-small" type="button" data-edit-sunday-question="${esc(q.id)}">Edit</button></article>`).join('') || '<p>No matching questions.</p>'
}
function shellHtml() {
  return `<main class="app-shell"><section class="app-frame"><nav class="screen-tabs"><div class="brand-chip"><span class="brand-crown">♛</span><div><strong>MEZZO</strong><small>Sunday BECE Editor</small></div></div><div class="tab-scroll"><button class="screen-tab" data-target="home">🏠 Home</button><button class="screen-tab" data-target="dashboard">📊 Dashboard</button>${isAdmin ? '<button class="screen-tab" data-target="admin">🛠️ Admin</button>' : ''}</div></nav><section class="screen admin-screen" data-sunday-editor-page="true">${assignmentHtml()}${editorFormHtml()}</section></section></main>`
}
function installDashboardButton() {
  if (!canEdit) return
  const dash = document.querySelector('.dashboard-screen .dashboard-hero, .dashboard-screen')
  if (!dash || document.querySelector('[data-open-sunday-editor]')) return
  dash.insertAdjacentHTML('beforeend', `<div class="sunday-editor-permission-panel"><div class="sunday-editor-permission-head"><div><span>Sunday BECE Editor Access</span><h2>Question Editor Available</h2><p>You have permission to add or edit Sunday BECE Special questions.</p></div><button class="btn btn-gold" type="button" data-open-sunday-editor="true">Open Sunday BECE Editor</button></div></div>`)
}
function renderAdminSections() {
  removeLegacyEditor()
  const adminScreen = document.querySelector('.admin-screen')
  if (!adminScreen) return
  let mount = document.querySelector('[data-sunday-permission-mount]')
  if (!mount) {
    const anchor = adminScreen.querySelector('[data-system-health-panel]') || adminScreen.firstElementChild
    anchor?.insertAdjacentHTML('afterend', '<div data-sunday-permission-mount></div>')
    mount = document.querySelector('[data-sunday-permission-mount]')
  }
  if (!mount) return
  if (!canEdit) {
    mount.innerHTML = localAdminGuess() ? '<section class="sunday-editor-lock">Sunday BECE editor is waiting for Supabase permission check. Make sure you are logged in as admin.</section>' : ''
    return
  }
  mount.innerHTML = `${assignmentHtml()}${editorFormHtml()}`
}
function refreshPreview() {
  const form = document.getElementById('sundaySpecialQuestionForm')
  const box = document.querySelector('[data-sunday-live-preview]')
  if (!form || !box) return
  const f = Object.fromEntries(new FormData(form).entries())
  box.innerHTML = `<strong>Live Preview</strong>${previewHtml(normalise(f))}`
}
function cleanMathText(text = '') {
  return String(text)
    .replace(/sqrt\s*\(/gi, '√(')
    .replace(/cuberoot\s*\(/gi, '∛(')
    .replace(/\^2\b/g, '²')
    .replace(/\^3\b/g, '³')
    .replace(/\^4\b/g, '⁴')
    .replace(/\<=/g, '≤')
    .replace(/\>=/g, '≥')
    .replace(/!=/g, '≠')
    .replace(/\+-/g, '±')
    .replace(/\b1\/2\b/g, '½')
    .replace(/\b1\/3\b/g, '⅓')
    .replace(/\b2\/3\b/g, '⅔')
    .replace(/\b1\/4\b/g, '¼')
    .replace(/\b3\/4\b/g, '¾')
    .replace(/\*/g, '×')
}
function cleanMathFields() {
  document.querySelectorAll('[data-sunday-math-field]').forEach(field => { field.value = cleanMathText(field.value) })
  refreshPreview()
}
function insertAtCursor(el, text) {
  if (!el) return
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? el.value.length
  el.value = `${el.value.slice(0, start)}${text}${el.value.slice(end)}`
  el.focus()
  const pos = start + text.length
  try { el.setSelectionRange(pos, pos) } catch {}
  refreshPreview()
}
async function loadEditors() {
  if (!isAdmin || !supabase) return
  const { data, error } = await supabase.from('sunday_bece_question_editors').select('*').order('updated_at', { ascending: false }).limit(100)
  if (error) { toast(`Could not load editors: ${error.message}`, 'error'); return }
  editors = data || []
  document.querySelector('[data-sunday-editor-list]') && (document.querySelector('[data-sunday-editor-list]').innerHTML = editorsHtml())
}
async function assignEditor() {
  const email = document.getElementById('sundayEditorEmail')?.value?.trim().toLowerCase()
  const notes = document.getElementById('sundayEditorNotes')?.value || ''
  if (!email) { toast('Enter the editor email address.', 'warn'); return }
  const { error } = await supabase.rpc('assign_sunday_bece_question_editor', { p_email: email, p_notes: notes })
  if (error) { toast(error.message, 'error'); return }
  toast('Editor assigned successfully.', 'success')
  document.getElementById('sundayEditorEmail').value = ''
  document.getElementById('sundayEditorNotes').value = ''
  await loadEditors()
}
async function revokeEditor(email) {
  const { error } = await supabase.rpc('revoke_sunday_bece_question_editor', { p_email: email })
  if (error) { toast(error.message, 'error'); return }
  toast('Editor access revoked.', 'success')
  await loadEditors()
}
async function loadQuestions() {
  if (!canEdit || !supabase) return
  const { data, error } = await supabase.from('bece_question_bank').select(QUESTIONS).order('updated_at', { ascending: false }).limit(300)
  if (error) { toast(`Could not load Sunday BECE questions: ${error.message}`, 'error'); return }
  questions = (data || []).map(normalise)
  document.querySelector('[data-sunday-question-list]') && (document.querySelector('[data-sunday-question-list]').innerHTML = questionsHtml())
}
async function uploadImage(form, fileField, urlField) {
  const currentUrl = String(form.get(urlField) || '').trim()
  const file = form.get(fileField)
  if (!file || !file.name) return currentUrl
  if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} is larger than 5MB.`)
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+/, '')
  const path = `questions/${Date.now()}-${Math.random().toString(16).slice(2)}-${safeName}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type || 'image/png' })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data?.publicUrl || currentUrl
}
async function saveQuestion(event) {
  event.preventDefault()
  if (saving) return
  saving = true
  try {
    if (!canEdit) throw new Error('You are not assigned to edit Sunday BECE questions.')
    const formEl = event.target
    const form = new FormData(formEl)
    const id = String(form.get('id') || '').trim()
    const payload = {
      year: String(form.get('year') || '2027 Prep'),
      type: String(form.get('type') || 'Sunday Special'),
      topic: String(form.get('topic') || 'BECE Exam Practice'),
      topic_area: String(form.get('topic_area') || form.get('topic') || 'BECE Exam Practice'),
      curriculum_strand: String(form.get('topic_area') || form.get('topic') || ''),
      difficulty: String(form.get('difficulty') || 'Easy'),
      status: String(form.get('status') || 'Published'),
      question_text: cleanMathText(form.get('question_text') || ''),
      option_a: cleanMathText(form.get('option_a') || ''),
      option_b: cleanMathText(form.get('option_b') || ''),
      option_c: cleanMathText(form.get('option_c') || ''),
      option_d: cleanMathText(form.get('option_d') || ''),
      correct_answer: String(form.get('correct_answer') || 'A').toUpperCase().slice(0,1),
      explanation: cleanMathText(form.get('explanation') || ''),
      question_image_url: await uploadImage(form, 'question_image_file', 'question_image_url'),
      option_a_image_url: await uploadImage(form, 'option_a_image_file', 'option_a_image_url'),
      option_b_image_url: await uploadImage(form, 'option_b_image_file', 'option_b_image_url'),
      option_c_image_url: await uploadImage(form, 'option_c_image_file', 'option_c_image_url'),
      option_d_image_url: await uploadImage(form, 'option_d_image_file', 'option_d_image_url'),
      source_name: 'Sunday BECE Special',
      source_page: String(form.get('source_page') || ''),
      math_format: 'unicode',
      editor_notes: String(form.get('editor_notes') || ''),
      updated_at: new Date().toISOString()
    }
    if (!payload.question_text || !payload.option_a || !payload.option_b || !payload.option_c || !payload.option_d) throw new Error('Question text and all four options are required.')
    let result
    if (id) result = await supabase.from('bece_question_bank').update(payload).eq('id', id).select(QUESTIONS).single()
    else {
      const { data: userData } = await supabase.auth.getUser()
      result = await supabase.from('bece_question_bank').insert({ ...payload, created_by: userData?.user?.id || null }).select(QUESTIONS).single()
    }
    if (result.error) throw result.error
    selectedId = result.data?.id || id
    toast(id ? 'Question updated successfully.' : 'New Sunday BECE question added.', 'success')
    await loadQuestions()
    renderAdminSections()
  } catch (error) {
    toast(error.message || 'Question could not be saved.', 'error')
  } finally { saving = false }
}
async function archiveQuestion() {
  if (!selectedId) return
  const { error } = await supabase.from('bece_question_bank').update({ status: 'Archived', updated_at: new Date().toISOString() }).eq('id', selectedId)
  if (error) { toast(error.message, 'error'); return }
  toast('Question archived.', 'success')
  selectedId = ''
  await loadQuestions()
  renderAdminSections()
}
async function openEditorPage() {
  await checkAccess(true)
  if (!canEdit) { toast('Only admin or assigned editors can open the Sunday BECE question editor.', 'error'); return }
  document.getElementById('root').innerHTML = shellHtml()
  await loadEditors()
  await loadQuestions()
}
async function boot() {
  await checkAccess()
  removeLegacyEditor()
  if (!canEdit) return
  installDashboardButton()
  renderAdminSections()
  await loadEditors()
  if (document.querySelector(EDITOR_ROOT)) await loadQuestions()
}
function scheduleBoot() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; boot() })
}

document.addEventListener('focusin', event => {
  if (event.target?.matches?.('[data-sunday-math-field], textarea, input[type="text"]')) activeInput = event.target
})

document.addEventListener('input', event => {
  if (event.target?.closest?.('#sundaySpecialQuestionForm')) refreshPreview()
  if (event.target?.id === 'sundayQuestionSearch' || event.target?.id === 'sundayStatusFilter') {
    document.querySelector('[data-sunday-question-list]') && (document.querySelector('[data-sunday-question-list]').innerHTML = questionsHtml())
  }
})

document.addEventListener('click', async event => {
  const symbol = event.target.closest('[data-sunday-insert-symbol]')?.dataset?.sundayInsertSymbol
  if (symbol) { event.preventDefault(); insertAtCursor(activeInput || document.querySelector('[name="question_text"]'), symbol); return }
  if (event.target.closest('[data-sunday-clean-math]')) { event.preventDefault(); cleanMathFields(); return }
  if (event.target.closest('[data-sunday-preview]')) { event.preventDefault(); refreshPreview(); return }
  if (event.target.closest('[data-open-sunday-editor]')) { event.preventDefault(); await openEditorPage(); return }
  if (event.target.closest('[data-refresh-sunday-editors]')) { event.preventDefault(); await loadEditors(); return }
  if (event.target.closest('[data-assign-sunday-editor]')) { event.preventDefault(); await assignEditor(); return }
  const revoke = event.target.closest('[data-revoke-sunday-editor]')?.dataset?.revokeSundayEditor
  if (revoke) { event.preventDefault(); await revokeEditor(revoke); return }
  if (event.target.closest('[data-load-sunday-questions]')) { event.preventDefault(); await loadQuestions(); return }
  if (event.target.closest('[data-new-sunday-question]')) { event.preventDefault(); selectedId = ''; renderAdminSections(); return }
  const editId = event.target.closest('[data-edit-sunday-question]')?.dataset?.editSundayQuestion
  if (editId) { event.preventDefault(); selectedId = editId; renderAdminSections(); return }
  if (event.target.closest('[data-archive-sunday-question]')) { event.preventDefault(); await archiveQuestion(); return }
}, true)

document.addEventListener('submit', event => {
  if (event.target?.id === 'sundaySpecialQuestionForm') saveQuestion(event)
}, true)

window.addEventListener('load', () => setTimeout(boot, 1300))
window.addEventListener('mezzoProfileUpdated', () => { checked = false; scheduleBoot() })
new MutationObserver(scheduleBoot).observe(document.documentElement, { childList: true, subtree: true })
setTimeout(boot, 1800)
