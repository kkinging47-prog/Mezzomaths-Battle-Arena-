import { supabase } from './supabaseClient.js'

const TOPIC_AREAS = ['Multiplication', 'Division', 'Addition', 'Subtraction']
const SKILL_LEVELS = ['Easy', 'Medium', 'Difficult', 'Advanced']
const ROLE_OPTIONS = [['student', 'Student'], ['teacher', 'Teacher'], ['admin', 'Admin']]
const FALLBACK_TOPICS = ['Addition', 'Subtraction', 'Multiplication', 'Division', 'Squaring', 'Fractions', 'Percentages', 'Word Problems', 'Algebra', 'Geometry', 'Statistics']
let syncQueued = false
let saving = false

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function escapeHtml(value = '') { return String(value).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
function optionHtml(list, selected) { return list.map(item => `<option value="${escapeHtml(item)}" ${item === selected ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('') }
function currentProfile() { return readJson('mezzo_profile', null) || {} }
function currentRole() { return currentProfile().role || 'student' }
function isAdminRole() { return currentRole() === 'admin' }
function toast(message) { const old = document.querySelector('.role-admin-toast'); if (old) old.remove(); const node = document.createElement('div'); node.className = 'role-admin-toast'; node.textContent = message; document.body.appendChild(node); setTimeout(() => node.remove(), 4200) }
function difficultyNumber(skill = 'Easy') { return { Easy: 1, Medium: 2, Difficult: 3, Advanced: 4 }[skill] || 1 }
function createSelectLabel(labelText, name, options, selected, extra = '') { const label = document.createElement('label'); label.className = `field-group ${extra}`.trim(); label.innerHTML = `<span>${labelText}</span><select name="${name}">${optionHtml(options, selected)}</select>`; return label }
function topicListFromForm(form) { const topicSelect = form?.querySelector('select[name="topic"], #adminTopic, #manualTopic'); const options = Array.from(topicSelect?.options || []).map(o => o.value).filter(Boolean); return options.length ? options : FALLBACK_TOPICS }

function enforceTopicAreaSelect(form, selected = 'Multiplication') {
  if (!form) return
  const existingSelect = form.querySelector('select[name="topic_area"]')
  if (existingSelect) {
    const current = TOPIC_AREAS.includes(existingSelect.value) ? existingSelect.value : selected
    const desired = optionHtml(TOPIC_AREAS, current)
    if (existingSelect.innerHTML !== desired) existingSelect.innerHTML = desired
    const label = existingSelect.closest('label')
    if (label?.querySelector('span')) label.querySelector('span').textContent = 'Topic Area'
  }
  const badLabels = Array.from(form.querySelectorAll('label')).filter(label => /auto-matched topic area/i.test(label.textContent || '') || label.querySelector('[name="topic_area_display"]'))
  badLabels.forEach(label => {
    const value = label.querySelector('input,select')?.value || selected
    const current = TOPIC_AREAS.includes(value) ? value : selected
    label.replaceWith(createSelectLabel('Topic Area', 'topic_area', TOPIC_AREAS, current, 'topic-area-select-label'))
  })
  form.querySelectorAll('input[type="hidden"][name="topic_area"], input[name="topic_area_display"]').forEach(el => el.remove())
  if (!form.querySelector('select[name="topic_area"]')) {
    const topic = form.querySelector('select[name="topic"]')?.closest('label') || form.firstElementChild
    const label = createSelectLabel('Topic Area', 'topic_area', TOPIC_AREAS, selected, 'topic-area-select-label')
    topic?.insertAdjacentElement('afterend', label)
  }
}
function enhanceSkillLevel(form, selected = 'Easy') {
  if (!form) return
  let select = form.querySelector('select[name="topic_sublevel"]')
  if (!select) {
    const area = form.querySelector('select[name="topic_area"]')?.closest('label')
    const label = createSelectLabel('Skill Level', 'topic_sublevel', SKILL_LEVELS, selected, 'manual-skill-label')
    if (area) area.insertAdjacentElement('afterend', label)
    return
  }
  const current = SKILL_LEVELS.includes(select.value) ? select.value : selected
  const desired = optionHtml(SKILL_LEVELS, current)
  if (select.innerHTML !== desired) select.innerHTML = desired
  const label = select.closest('label')
  if (label?.querySelector('span')) label.querySelector('span').textContent = 'Skill Level'
}
function enhanceAdminForms() {
  const aiForm = document.getElementById('aiGenerateForm')
  if (aiForm) {
    enforceTopicAreaSelect(aiForm, 'Multiplication')
    enhanceSkillLevel(aiForm, 'Easy')
    const topicLabel = aiForm.querySelector('#adminTopic')?.closest('label')
    if (topicLabel?.querySelector('span')) topicLabel.querySelector('span').textContent = 'Topic From Mezzo Book'
  }
  const manualForm = document.getElementById('adminQuestionForm')
  if (manualForm) {
    enforceTopicAreaSelect(manualForm, 'Multiplication')
    enhanceSkillLevel(manualForm, 'Easy')
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
  const adminButton = document.querySelector('[data-target="admin"], [data-teacher-page]')
  if (!adminButton) return
  const admin = isAdminRole()
  if (admin) { adminButton.setAttribute('data-target', 'admin'); adminButton.removeAttribute('data-teacher-page'); adminButton.innerHTML = '<span>🛠️</span>Admin'; adminButton.dataset.roleButton = 'admin' }
  else { adminButton.removeAttribute('data-target'); adminButton.dataset.teacherPage = 'true'; adminButton.innerHTML = '<span>👩🏾‍🏫</span>Teacher Dashboard'; adminButton.dataset.roleButton = 'teacher' }
}
function hideNonSmartboardAutoMatch() { const battleAuto = document.getElementById('battleTopicArea'); const label = battleAuto?.closest('label'); if (label) label.style.display = 'none' }
function makeQuestion({ class_level, curriculum, topic, topic_area, topic_sublevel, index }) {
  const base = 6 + index; let a = base + Math.floor(Math.random() * 10); let b = 2 + Math.floor(Math.random() * 9); let answer = a * b; let symbol = '×'
  if (topic_area === 'Addition') { symbol = '+'; answer = a + b }
  if (topic_area === 'Subtraction') { a += 20; symbol = '−'; answer = a - b }
  if (topic_area === 'Division') { answer = a; b = Math.max(2, b); a = answer * b; symbol = '÷' }
  const word = index % 3 === 2
  const question_text = word ? topic_area === 'Division' ? `A teacher shares ${a} items equally among ${b} learners. How many does each learner get?` : topic_area === 'Addition' ? `A class had ${a} books and received ${b} more. How many books are there now?` : topic_area === 'Subtraction' ? `There were ${a} chairs. ${b} were moved away. How many chairs remained?` : `There are ${a} groups with ${b} learners in each group. How many learners are there?` : `${a} ${symbol} ${b}`
  return { class_level, curriculum, topic, topic_area, topic_sublevel, difficulty: difficultyNumber(topic_sublevel), question_text, numeric_answer: answer, option_a: String(answer - 1), option_b: String(answer), option_c: String(answer + 1), option_d: String(answer + 2), correct_answer: 'B', explanation: `The correct answer is ${answer}.`, ai_generated: true, is_active: true }
}
function dbPayload(q) { return { class_level: q.class_level, curriculum: q.curriculum, topic: q.topic, topic_area: q.topic_area, topic_sublevel: q.topic_sublevel || 'Easy', difficulty: difficultyNumber(q.topic_sublevel), question_text: q.question_text, numeric_answer: q.numeric_answer === '' || q.numeric_answer === null || q.numeric_answer === undefined ? null : Number(q.numeric_answer), option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, correct_answer: q.correct_answer || 'B', explanation: q.explanation || '', ai_generated: Boolean(q.ai_generated), is_active: true } }
async function handleGenerate(form) {
  const f = Object.fromEntries(new FormData(form).entries()); const count = Number(f.count || 10); const topicArea = f.topic_area || 'Multiplication'; const skill = f.topic_sublevel || 'Easy'; const questions = Array.from({ length: count }, (_, index) => makeQuestion({ ...f, topic_area: topicArea, topic_sublevel: skill, index })); const list = readJson('mezzo_question_bank', []); saveJson('mezzo_question_bank', [...questions, ...list])
  if (supabase) { const { error } = await supabase.from('question_bank').insert(questions.map(dbPayload)); if (error) toast(`${count} questions generated locally, but database save failed: ${error.message}`); else toast(`${count} ${skill} questions saved under ${topicArea}.`) } else toast(`${count} ${skill} questions generated locally under ${topicArea}.`)
  setTimeout(() => document.querySelector('[data-target="admin"]')?.click(), 100)
}
async function handleManualSave(form) {
  const f = Object.fromEntries(new FormData(form).entries()); const list = readJson('mezzo_question_bank', []); const idx = f.editing_index === '' ? -1 : Number(f.editing_index); const existing = idx >= 0 ? list[idx] : null
  const item = { ...existing, class_level: f.class_level, curriculum: f.curriculum, topic: f.topic, topic_area: f.topic_area || 'Multiplication', topic_sublevel: f.topic_sublevel || 'Easy', difficulty: difficultyNumber(f.topic_sublevel), numeric_answer: f.numeric_answer ? Number(f.numeric_answer) : null, question_text: f.question_text, option_a: f.option_a, option_b: f.option_b, option_c: f.option_c, option_d: f.option_d, correct_answer: f.correct_answer, explanation: f.explanation, ai_generated: false, is_active: true }
  if (supabase) { const payload = dbPayload(item); const result = item.id ? await supabase.from('question_bank').update(payload).eq('id', item.id).select().single() : await supabase.from('question_bank').insert(payload).select().single(); if (result.error) toast(`Database save failed: ${result.error.message}`); else { if (idx >= 0) list[idx] = result.data; else list.unshift(result.data); saveJson('mezzo_question_bank', list); toast(item.id ? 'Question updated in database.' : 'Question saved in database.') } } else { if (idx >= 0) list[idx] = item; else list.unshift(item); saveJson('mezzo_question_bank', list); toast('Question saved locally.') }
  setTimeout(() => document.querySelector('[data-target="admin"]')?.click(), 100)
}
function historyRows() { return readJson('mezzo_practice_history', []) }
function teacherMetrics() { const p = currentProfile(); const h = historyRows(); const attempts = h.length; const topics = {}; h.forEach(row => { topics[row.topic] ||= { total: 0, count: 0, best: 0 }; const pct = row.total ? Math.round((row.score / row.total) * 100) : 0; topics[row.topic].total += pct; topics[row.topic].count += 1; topics[row.topic].best = Math.max(topics[row.topic].best, pct) }); const arr = Object.entries(topics).map(([topic,v]) => ({ topic, avg: Math.round(v.total / v.count), best: v.best })); return { p, h, attempts, active: Math.max(1, new Set(h.map(x => x.student)).size), strong: arr.sort((a,b)=>b.best-a.best)[0]?.topic || 'Multiplication', weak: arr.sort((a,b)=>a.avg-b.avg)[0]?.topic || 'Word Problems' } }
function renderTeacherPage() { const m = teacherMetrics(); document.getElementById('root').innerHTML = `<main class="app-shell"><section class="app-frame"><nav class="screen-tabs teacher-page-nav"><div class="brand-chip"><span class="brand-crown">♛</span><div><strong>MEZZO</strong><small>Maths Battle Arena</small></div></div><div class="tab-scroll"><button class="screen-tab" data-target="home"><span>🏟️</span>Home</button><button class="screen-tab" data-target="smartboard"><span>📺</span>Smart Board 1v1</button><button class="screen-tab active" data-teacher-page="true"><span>👩🏾‍🏫</span>Teacher Dashboard</button><button class="screen-tab" data-target="auth"><span>🔐</span>Login / Sign Up</button></div></nav><section class="teacher-own-page glass-card"><div class="teacher-head"><div><span class="mini-kicker">👩🏾‍🏫 Teacher Dashboard</span><h1>Teacher Performance Centre</h1><p>Track students, attempts, topic strengths, weak areas and recent practice activity.</p></div><button class="btn btn-gold" data-export-teacher-report="true">Download CSV Report</button></div><div class="teacher-metrics"><div><strong>${m.active}</strong><span>Active students</span></div><div><strong>${m.attempts}</strong><span>Total attempts</span></div><div><strong>${escapeHtml(m.strong)}</strong><span>Strong topic</span></div><div><strong>${escapeHtml(m.weak)}</strong><span>Weak topic</span></div></div><div class="teacher-grid"><article><h3>Students Needing Help</h3><p>⚠️ Give extra support in <b>${escapeHtml(m.weak)}</b></p><p>Use short direct questions before word problems.</p></article><article><h3>Best Performer</h3><p>🏅 ${escapeHtml(m.p.full_name || 'Student Champion')}</p><p>Use this student for peer support or board demonstration.</p></article><article><h3>Recent Attempts</h3>${m.h.slice(0,8).map(h => `<p>${escapeHtml(h.student)} — ${escapeHtml(h.topic)} — ${h.score}/${h.total}</p>`).join('') || '<p>No practice history yet.</p>'}</article></div></section></section></main>` }
function exportTeacherReport() { const h = historyRows(); const rows = [['Student','School','Class','Location','Mode','Topic','Score','Total','Date'], ...h.map(x => [x.student,x.school,x.classLevel,x.location,x.mode,x.topic,x.score,x.total,x.date])]; const csv = rows.map(row => row.map(cell => `"${String(cell || '').replaceAll('"','""')}"`).join(',')).join('\n'); const blob = new Blob([csv], { type: 'text/csv' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `mezzo-teacher-report-${Date.now()}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000) }
function syncAll() { if (syncQueued) return; syncQueued = true; requestAnimationFrame(() => { syncQueued = false; syncAuthRoles(); syncNavRoleButton(); enhanceAdminForms(); hideNonSmartboardAutoMatch() }) }

document.addEventListener('click', event => { if (event.target.closest('[data-teacher-page]')) { event.preventDefault(); event.stopImmediatePropagation(); renderTeacherPage(); return } if (event.target.closest('[data-export-teacher-report]')) exportTeacherReport() }, true)
document.addEventListener('submit', event => { const form = event.target; if (form?.id === 'aiGenerateForm') { event.preventDefault(); event.stopImmediatePropagation(); if (!saving) { saving = true; handleGenerate(form).finally(() => { saving = false }) } } if (form?.id === 'adminQuestionForm') { event.preventDefault(); event.stopImmediatePropagation(); if (!saving) { saving = true; handleManualSave(form).finally(() => { saving = false }) } } }, true)
document.addEventListener('submit', event => { const form = event.target; if (form?.id !== 'signupForm') return; const role = new FormData(form).get('role'); setTimeout(() => { if (role === 'admin') document.querySelector('[data-target="admin"]')?.click(); if (role === 'teacher') renderTeacherPage() }, 120) })

const observer = new MutationObserver(syncAll)
observer.observe(document.body, { childList: true, subtree: true, attributes: false })
window.addEventListener('load', syncAll)
window.addEventListener('storage', syncAll)
setTimeout(syncAll, 250)
