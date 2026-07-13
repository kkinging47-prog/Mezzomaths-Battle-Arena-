import './admin-workbook-question-selector-fix.css'

const WORKBOOK_TOPICS_FALLBACK = {
  'KG1': ['Identify and Count', 'Count and recognize', 'Numbers before and after', 'Multiply and Color', 'Number Identification', 'Finger Counting', 'Counting Numbers', 'Count and Color', 'Multiplication Table', 'Adding with Objects', 'Trace and Add'],
  'KG2': ['Count, Color and Match', 'Numbers Before and After', 'Multiplication Table (1 – 5)', 'Multiplication Trials', 'Adding with Numbers', 'Class Activities', 'Multiplication Table (1 – 7)', 'Addition using objects', 'Add and Color', 'Addition of Single Digits', 'Complete the patterns', 'Multiplying Trials', 'Subtraction Number Stories', 'Take Away'],
  'Grade 1': ['Addition Worksheet', 'Addition Table (SD)', 'Multiplication Table (1 – 6)', 'Multiplication Circles', 'Multiplication Worksheet', 'Investigating Pattern', 'Multiplication Table (1 – 9)', 'Subtraction of numbers (SD)', 'Subtraction Worksheets', 'Multiplication table (1 - 12)', 'Addition of numbers (2d + 1)', 'Subtraction of numbers', 'Doubling (SD)', 'Investigating Patterns', 'Maths Worksheets'],
  'Grade 2': ['Addition & Subtraction of Numbers', 'Addition of numbers (2d + 1)', 'Multiplication by 2', 'Subtraction of numbers (2d – 1)', 'Graphical multiplication (1 x 1)', 'Multiplication Table', 'Investigating Patterns', 'Addition of Numbers', 'Graphical Mult. (1x1,1x2)', 'Addition Table (2d + 1)', 'Doubling (2D)', 'Multiplication by 11 (2dwoc)', 'Multiplication Trials', 'Multiplication table (2 – 12)', 'Addition of numbers (2d + 2)', 'Addition Table (2d + 2)', 'Multiplication by 11'],
  'Grade 3': ['Addition of numbers', 'Subtraction of Numbers', 'Multiplication by Two (2)', 'Multiplication by Ten (10)', 'Multiplying no.s ending with 0', 'Graphical Multiplication', 'Summary Worksheet', 'Subtraction of numbers', 'Sharing in ten’s', 'Sharing in two’s', 'Lattice Multiplication', 'Comparing Fractions', 'Addition & Subtraction of No’s', 'Multiplication by 11', 'Multiplying no’s ending with 1', 'Calculation of Time', 'Investigating Patterns'],
  'Grade 4': ['Addition & Subtraction of No’s', 'Multiplication by 11 (2 & 3 dw)', 'Multiplication by 11 (2 & 3 dwc)', 'Multiplication by 0.5', 'Division by 0.5', 'Multiplication by 4 (2 Digits)', 'Multiplication by 5', 'Multiplication by 9', 'Multiplication by 10', 'Fast Track Subtraction', 'Consecutive Numbers (3 & 4)', 'Mezzoscopic zeros', 'Mezzoscopic ones', 'Mezzoscopic Fives', 'Multiplying numbers ending with 5', 'Maths word problems'],
  'Grade 5': ['Addition & Subtraction of No’s', 'Multiplying no’s ending with 0', 'Multiplying no’s ending with 1', 'Sharing in twos (2)', 'Sharing in nines (9)', 'Squaring no’s ending with 5', 'Squaring no’s ending with 4', 'Multiplying no’s between 100 & 110', 'Addition of consecutive no’s (5 & 6)', 'Divisibility Test (2,3 & 4)', 'Multiplying No’s close to 100', 'Multiplication by 22', 'Divisibility Rules ( 5 – 8)', 'Multiplication by four (4)', 'Multiplication by 0.5', 'Division by 0.5', 'Powers of Ten'],
  'Grade 6': ['Addition & Subtraction of No’s', 'Multiplication by 11', 'Squaring no’s ending with 0', 'Squaring no’s ending with 1', 'Sharing in fives (5)', 'Multiplication by nine (9)', 'Summary Worksheet', 'Multiplying no’s between 10 & 20', 'Fast Track Subtraction', 'Multiplicatoin by five (5)', 'Squaring no’s between 30 & 50', 'Multiplying No’s with a difference of 2', 'Multiplication by ten (10)', 'Division by ten (10)', 'Squaring no’s between 50 & 70', 'Division by twenty – five (25)', 'Summary Worksheet & Sample B.E.C.E'],
  'Grade 7': ['Addition and Subtraction of Numbers', 'Squaring No’s Ending With 0', 'Squaring No’s Ending With 1', 'Squaring No’s Ending With 5', 'Percentages', 'Mezzoscopic Tens and Ones', 'Multiplying by 9', 'Summary Worksheet', 'Division by 5', 'Division by 50', 'Division by 500', 'Multiplying numbers ending with 0', 'Multiplying numbers ending with 1', 'Multiplying by 22', 'Division by 2', 'Multiplication by 5', 'Multiplication by 50', 'Multiplication by 500', 'Division by 9', 'Divisibility Rules ( 5 – 10)', 'Summary Worksheet & BECE Sample Questions'],
  'Grade 8': ['Understanding Word Problems', 'Addition & Subtraction of numbers', 'Multiplying no.s between 100 & 110', 'Mezzoscopic Tens and Ones', 'Percentages', 'Squaring No’s between 30 & 50', 'Multiplying no’s with a difference of 2', 'Summary Worksheet', 'Addition and Subtraction of Numbers', 'Multiplying numbers between 10 & 20', 'Squaring No’s between 50 & 70', 'Multiplying numbers close to 100', 'Fast track subtraction', 'Fractions', 'Divisibility Test (2 – 12)', 'General Multiplication', 'General Division', 'General Squaring', 'Mezzo Friendly B.E.C.E sample'],
  'Grade 9': ['BECE Exam Practice', 'Algebra', 'Geometry', 'Statistics', 'Aptitude & Mental Reasoning', 'General Multiplication', 'General Division', 'General Squaring', 'Divisibility Rules', 'Maths Worksheets Trials'],
  'SHS 1': ['Surds & Indices', 'Sets & Logic', 'Linear & Quadratic Equations', 'Coordinate Geometry', 'Statistics'],
  'SHS 2': ['Functions & Graphs', 'Trigonometry', 'Sequences & Series', 'Probability', 'Vectors & Mensuration'],
  'SHS 3': ['WASSCE Practice', 'Advanced Algebra', 'Calculus Foundations', 'Statistics', 'Vectors & Trigonometry']
}
const ALL_CLASS_LEVELS = Object.keys(WORKBOOK_TOPICS_FALLBACK)
const SKILL_OPTIONS = ['Class topic', 'Easy', 'Medium', 'Difficult', 'Advanced', '1 digit × 1 digit', '2 digit × 1 digit', '2 digit × 2 digit']
let queued = false

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function topicsMap() { return { ...WORKBOOK_TOPICS_FALLBACK, ...readJson('mezzo_workbook_topics_by_level', {}) } }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])) }
function optionHtml(items, selected = '') { return items.map(item => `<option value="${escapeHtml(item)}" ${item === selected ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('') }
function inferTopicArea(topic = '') {
  const t = String(topic).toLowerCase()
  if (t.includes('addition') && t.includes('subtraction')) return 'Addition & Subtraction'
  if (t.includes('word problem')) return 'Word Problems'
  if (t.includes('fraction')) return 'Fractions'
  if (t.includes('percent')) return 'Percentages'
  if (t.includes('divisibility')) return 'Divisibility'
  if (t.includes('division') || t.includes('sharing')) return 'Division'
  if (t.includes('subtraction') || t.includes('subtract') || t.includes('fast track')) return 'Subtraction'
  if (t.includes('add') || t.includes('consecutive')) return 'Addition'
  if (t.includes('squar') || t.includes('square')) return 'Squaring'
  if (t.includes('algebra')) return 'Algebra'
  if (t.includes('geometry')) return 'Geometry'
  if (t.includes('statistic') || t.includes('data')) return 'Statistics'
  if (t.includes('multip') || t.includes('mult') || t.includes('lattice') || t.includes('doubling') || t.includes('mezzoscopic')) return 'Multiplication'
  return 'General Practice'
}
function setOptions(select, list, selected) {
  if (!select) return
  const current = selected || select.value || list[0]
  const chosen = list.includes(current) ? current : list[0]
  const next = optionHtml(list, chosen)
  if (select.innerHTML !== next) select.innerHTML = next
  select.value = chosen
}
function syncTopicArea(form, topic) {
  if (!form) return
  const area = inferTopicArea(topic)
  form.querySelectorAll('input[name="topic_area_display"], input[readonly]').forEach(input => {
    const label = input.closest('label')?.textContent?.toLowerCase() || ''
    if (input.name === 'topic_area_display' || label.includes('topic area')) input.value = area
  })
  const hidden = form.querySelector('input[name="topic_area"]')
  if (hidden) hidden.value = area
}
function topicListFor(level) {
  const map = topicsMap()
  return map[level] || WORKBOOK_TOPICS_FALLBACK[level] || ['Addition', 'Subtraction', 'Multiplication', 'Division', 'Fractions', 'Word Problems']
}
function pairIds(levelId, topicId) {
  const level = document.getElementById(levelId)
  const topic = document.getElementById(topicId)
  if (!level || !topic) return
  setOptions(level, ALL_CLASS_LEVELS, level.value || 'Grade 4')
  setOptions(topic, topicListFor(level.value), topic.value)
  syncTopicArea(level.closest('form'), topic.value)
}
function cleanSkillSelects() {
  document.querySelectorAll('#aiGenerateForm select[name="topic_sublevel"], #adminQuestionForm select[name="topic_sublevel"]').forEach(select => setOptions(select, SKILL_OPTIONS, select.value || 'Class topic'))
  document.querySelectorAll('label.field-group').forEach(label => {
    const text = label.querySelector('span')?.textContent?.trim().toLowerCase()
    const select = label.querySelector('select')
    if (text === 'skill level' && select) setOptions(select, SKILL_OPTIONS, select.value || 'Class topic')
  })
}
function addAdminNote() {
  const form = document.getElementById('aiGenerateForm')
  if (!form || form.querySelector('[data-workbook-selector-fixed]')) return
  form.insertAdjacentHTML('afterbegin', `<div class="admin-workbook-selector-note" data-workbook-selector-fixed="true"><strong>Workbook question generator fixed:</strong> choose a class level first, then the Topic From Mezzo Book will load only the matching workbook topics for that class.</div>`)
}
function syncAdminQuestionSelectors() {
  pairIds('adminLevel', 'adminTopic')
  pairIds('manualLevel', 'manualTopic')
  cleanSkillSelects()
  addAdminNote()
}
function handleChange(event) {
  const target = event.target
  if (!target?.matches?.('#adminLevel, #manualLevel, #adminTopic, #manualTopic')) return
  event.stopImmediatePropagation()
  if (target.id === 'adminLevel') pairIds('adminLevel', 'adminTopic')
  if (target.id === 'manualLevel') pairIds('manualLevel', 'manualTopic')
  if (target.id === 'adminTopic') syncTopicArea(document.getElementById('aiGenerateForm'), target.value)
  if (target.id === 'manualTopic') syncTopicArea(document.getElementById('adminQuestionForm'), target.value)
}
function sync() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; syncAdminQuestionSelectors() })
}

document.addEventListener('change', handleChange, true)
const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false })
window.addEventListener('load', sync)
window.addEventListener('storage', sync)
setTimeout(sync, 350)
