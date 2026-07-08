import { supabase } from './supabaseClient.js'

const TOPIC_AREAS = ['Addition', 'Subtraction', 'Addition & Subtraction', 'Multiplication', 'Division', 'Squaring', 'Fractions', 'Percentages', 'Divisibility', 'Word Problems', 'Algebra', 'Geometry', 'Statistics', 'Aptitude & Mental Reasoning', 'Worksheet', 'General Practice']
const SKILL_LEVELS = ['Easy', 'Medium', 'Difficult', 'Advanced']
const ROLE_OPTIONS = [
  ['student', 'Student'],
  ['teacher', 'Teacher'],
  ['admin', 'Admin']
]
const FALLBACK_TOPICS = ['Addition', 'Subtraction', 'Multiplication', 'Division', 'Squaring', 'Fractions', 'Percentages', 'Word Problems', 'Algebra', 'Geometry', 'Statistics']
let syncQueued = false
let saving = false

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback }
}
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
function optionHtml(list, selected) { return list.map(item => `<option value="${escapeHtml(item)}" ${item === selected ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('') }
function currentProfile() { return readJson('mezzo_profile', null) || {} }
function currentRole() { return currentProfile().role || 'student' }
function isAdminRole() { return currentRole() === 'admin' }
function toast(message) {
  const old = document.querySelector('.role-admin-toast')
  if (old) old.remove()
  const node = document.createElement('div')
  node.className = 'role-admin-toast'
  node.textContent = message
  document.body.appendChild(node)
  setTimeout(() => node.remove(), 4200)
}
function topicListFromForm(form) {
  const topicSelect = form?.querySelector('select[name="topic"], #adminTopic, #manualTopic')
  const options = Array.from(topicSelect?.options || []).map(o => o.value).filter(Boolean)
  return options.length ? options : FALLBACK_TOPICS
}
function replaceWithTopicAreaSelect(inputOrLabel, selected = 'Multiplication') {
  const label = inputOrLabel?.closest?.('label') || inputOrLabel
  if (!label || label.dataset.topicAreaEnhanced === 'true') return
  label.dataset.topicAreaEnhanced = 'true'
  label.classList.add('topic-area-select-label')
  label.innerHTML = `<span>Topic Area</span><select name="topic_area" data-admin-topic-area="true">${optionHtml(TOPIC_AREAS, selected)}</select>`
}
function enhanceSkillLevel(form, selected = 'Easy') {
  const select = form?.querySelector('select[name="topic_sublevel"]')
  if (!select) return
  const label = select.closest('label')
  if (label) label.querySelector('span') && (label.querySelector('span').textContent = 'Skill Level')
  const current = SKILL_LEVELS.includes(select.value) ? select.value : selected
  if (select.dataset.skillEnhanced === 'true' && select.value === current) return
  select.dataset.skillEnhanced = 'true'
  select.innerHTML = optionHtml(SKILL_LEVELS, current)
}
function addManualSkillLevel(form) {
  if (!form || form.querySelector('[name="topic_sublevel"]')) return
  const topicAreaLabel = form.querySelector('.topic-area-select-label')
  const label = document.createElement('label')
  label.className = 'field-group manual-skill-label'
  label.innerHTML = `<span>Skill Level</span><select name="topic_sublevel">${optionHtml(SKILL_LEVELS, 'Easy')}</select>`
  if (topicAreaLabel) topicAreaLabel.insertAdjacentElement('afterend', label)
  else form.prepend(label)
}
function enhanceAdminForms() {
  const aiForm = document.getElementById('aiGenerateForm')
  if (aiForm) {
    const display = aiForm.querySelector('[name="topic_area_display"]')
    if (display) replaceWithTopicAreaSelect(display, display.value || 'Multiplication')
    const hidden = aiForm.querySelector('input[type="hidden"][name="topic_area"]')
    if (hidden) hidden.remove()
    enhanceSkillLevel(aiForm, 'Easy')
    const topicLabel = aiForm.querySelector('#adminTopic')?.closest('label')
    if (topicLabel?.querySelector('span')) topicLabel.querySelector('span').textContent = 'Topic From Book'
  }
  const manualForm = document.getElementById('adminQuestionForm')
  if (manualForm) {
    const readonlyArea = Array.from(manualForm.querySelectorAll('label')).find(label => label.textContent.includes('Auto-Matched Topic Area'))
    if (readonlyArea) replaceWithTopicAreaSelect(readonlyArea, 'Multiplication')
    addManualSkillLevel(manualForm)
    const topicLabel = manualForm.querySelector('#manualTopic')?.closest('label')
    if (topicLabel?.querySelector('span')) topicLabel.querySelector('span').textContent = 'Topic From Book'
  }
}
function syncAuthRoles() {
  document.querySelectorAll('#signupForm select[name="role"], #loginForm select[name="role"]').forEach(select => {
    const current = select.value || 'student'
    const desired = ROLE_OPTIONS.map(([value,label]) => `<option value="${value}" ${value === current ? 'selected' : ''}>${label}</option>`).join('')
    if (select.innerHTML !== desired) select.innerHTML = desired
    const label = select.closest('label')
    if (label?.querySelector('span')) label.querySelector('span').textContent = 'Account Type'
  })
}
function syncNavRoleButton() {
  const adminButton = document.querySelector('[data-target="admin"]')
  if (!adminButton) return
  const admin = isAdminRole()
  const wanted = admin ? '<span>🛠️</span>Admin' : '<span>👩🏾‍🏫</span>Teacher Dashboard'
  if (adminButton.innerHTML !== wanted) adminButton.innerHTML = wanted
  adminButton.dataset.roleButton = admin ? 'admin' : 'teacher'
}
function hideNonSmartboardAutoMatch() {
  const battleAuto = document.getElementById('battleTopicArea')
  const label = battleAuto?.closest('label')
  if (label) label.style.display = 'none'
}
function difficultyNumber(skill = 'Easy') {
  return { Easy: 1, Medium: 2, Difficult: 3, Advanced: 4 }[skill] || 1
}
function makeQuestion({ class_level, curriculum, topic, topic_area, topic_sublevel, index }) {
  const base = 6 + index
  let a = base + Math.floor(Math.random() * 10)
  let b = 2 + Math.floor(Math.random() * 9)
  let answer = a * b
  let symbol = '×'
  if (topic_area.includes('Addition')) { symbol = '+'; answer = a + b }
  if (topic_area === 'Subtraction') { a += 20; symbol = '−'; answer = a - b }
  if (topic_area === 'Division' || topic_area === 'Divisibility') { answer = a; b = Math.max(2, b); a = answer * b; symbol = '÷' }
  if (topic_area === 'Squaring') { b = 2; symbol = '²'; answer = a * a }
  const word = index % 3 === 2 || topic_area === 'Word Problems'
  const question_text = word
    ? topic_area === 'Division' ? `A teacher shares ${a} items equally among ${b} learners. How many does each learner get?`
    : topic_area === 'Addition' || topic_area === 'Addition & Subtraction' ? `A class had ${a} books and received ${b} more. How many books are there now?`
    : topic_area === 'Subtraction' ? `There were ${a} chairs. ${b} were moved away. How many chairs remained?`
    : topic_area === 'Squaring' ? `A square has side ${a} cm. What is its area?`
    : `Solve this ${topic_area} word problem using ${a} and ${b}. What is the answer?`
    : symbol === '²' ? `${a}²` : `${a} ${symbol} ${b}`
  return {
    class_level,
    curriculum,
    topic,
    topic_area,
    topic_sublevel,
    difficulty: difficultyNumber(topic_sublevel),
    question_text,
    numeric_answer: answer,
    option_a: String(answer - 1),
    option_b: String(answer),
    option_c: String(answer + 1),
    option_d: String(answer + 2),
    correct_answer: 'B',
    explanation: `The correct answer is ${answer}.`,
    ai_generated: true,
    is_active: true
  }
}
function dbPayload(q) {
  return {
    class_level: q.class_level,
    curriculum: q.curriculum,
    topic: q.topic,
    topic_area: q.topic_area,
    topic_sublevel: q.topic_sublevel || 'Easy',
    difficulty: difficultyNumber(q.topic_sublevel),
    question_text: q.question_text,
    numeric_answer: q.numeric_answer === '' || q.numeric_answer === null || q.numeric_answer === undefined ? null : Number(q.numeric_answer),
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_answer: q.correct_answer || 'B',
    explanation: q.explanation || '',
    ai_generated: Boolean(q.ai_generated),
    is_active: true
  }
}
async function handleGenerate(form) {
  const f = Object.fromEntries(new FormData(form).entries())
  const count = Number(f.count || 10)
  const topicArea = f.topic_area || 'Multiplication'
  const skill = f.topic_sublevel || 'Easy'
  const questions = Array.from({ length: count }, (_, index) => makeQuestion({ ...f, topic_area: topicArea, topic_sublevel: skill, index }))
  const list = readJson('mezzo_question_bank', [])
  saveJson('mezzo_question_bank', [...questions, ...list])
  if (supabase) {
    const { error } = await supabase.from('question_bank').insert(questions.map(dbPayload))
    if (error) toast(`${count} questions generated locally, but database save failed: ${error.message}`)
    else toast(`${count} ${skill} questions saved under ${topicArea}.`)
  } else toast(`${count} ${skill} questions generated locally under ${topicArea}.`)
  setTimeout(() => document.querySelector('[data-target="admin"]')?.click(), 100)
}
async function handleManualSave(form) {
  const f = Object.fromEntries(new FormData(form).entries())
  const list = readJson('mezzo_question_bank', [])
  const idx = f.editing_index === '' ? -1 : Number(f.editing_index)
  const existing = idx >= 0 ? list[idx] : null
  const item = {
    ...existing,
    class_level: f.class_level,
    curriculum: f.curriculum,
    topic: f.topic,
    topic_area: f.topic_area || 'General Practice',
    topic_sublevel: f.topic_sublevel || 'Easy',
    difficulty: difficultyNumber(f.topic_sublevel),
    numeric_answer: f.numeric_answer ? Number(f.numeric_answer) : null,
    question_text: f.question_text,
    option_a: f.option_a,
    option_b: f.option_b,
    option_c: f.option_c,
    option_d: f.option_d,
    correct_answer: f.correct_answer,
    explanation: f.explanation,
    ai_generated: false,
    is_active: true
  }
  if (supabase) {
    const payload = dbPayload(item)
    const result = item.id ? await supabase.from('question_bank').update(payload).eq('id', item.id).select().single() : await supabase.from('question_bank').insert(payload).select().single()
    if (result.error) toast(`Database save failed: ${result.error.message}`)
    else {
      if (idx >= 0) list[idx] = result.data
      else list.unshift(result.data)
      saveJson('mezzo_question_bank', list)
      toast(item.id ? 'Question updated in database.' : 'Question saved in database.')
    }
  } else {
    if (idx >= 0) list[idx] = item
    else list.unshift(item)
    saveJson('mezzo_question_bank', list)
    toast('Question saved locally.')
  }
  setTimeout(() => document.querySelector('[data-target="admin"]')?.click(), 100)
}
function syncAll() {
  if (syncQueued) return
  syncQueued = true
  requestAnimationFrame(() => {
    syncQueued = false
    syncAuthRoles()
    syncNavRoleButton()
    enhanceAdminForms()
    hideNonSmartboardAutoMatch()
  })
}

document.addEventListener('click', event => {
  const adminTarget = event.target.closest('[data-target="admin"]')
  if (adminTarget && !isAdminRole()) {
    event.preventDefault()
    event.stopImmediatePropagation()
    const dash = document.querySelector('[data-target="dashboard"]')
    if (dash) dash.click()
    toast('Teacher Dashboard opened. Admin settings are available only after Admin login/sign up.')
  }
}, true)

document.addEventListener('submit', event => {
  const form = event.target
  if (form?.id === 'aiGenerateForm') {
    event.preventDefault()
    event.stopImmediatePropagation()
    if (!saving) { saving = true; handleGenerate(form).finally(() => { saving = false }) }
  }
  if (form?.id === 'adminQuestionForm') {
    event.preventDefault()
    event.stopImmediatePropagation()
    if (!saving) { saving = true; handleManualSave(form).finally(() => { saving = false }) }
  }
}, true)

document.addEventListener('submit', event => {
  const form = event.target
  if (form?.id !== 'signupForm') return
  const role = new FormData(form).get('role')
  setTimeout(() => {
    if (role === 'admin') document.querySelector('[data-target="admin"]')?.click()
    if (role === 'teacher') document.querySelector('[data-target="dashboard"]')?.click()
  }, 120)
})

const observer = new MutationObserver(syncAll)
observer.observe(document.body, { childList: true, subtree: true, attributes: false })
window.addEventListener('load', syncAll)
window.addEventListener('storage', syncAll)
setTimeout(syncAll, 250)
