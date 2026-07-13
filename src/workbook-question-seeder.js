const WORKBOOK_VERSION = '2025-workbook-topics-v1'
const BANK_KEY = 'mezzo_question_bank'
const SEEDED_KEY = 'mezzo_workbook_seed_version'

const WORKBOOK_TOPICS = {
  'KG1': ['Identify and Count', 'Count and recognize', 'Numbers before and after', 'Multiply and Color', 'Number Identification', 'Finger Counting', 'Counting Numbers', 'Count and Color', 'Multiplication Table', 'Adding with Objects', 'Trace and Add'],
  'KG2': ['Count, Color and Match', 'Numbers Before and After', 'Multiplication Table (1 – 5)', 'Multiplication Trials', 'Adding with Numbers', 'Class Activities', 'Multiplication Table (1 – 7)', 'Addition using objects', 'Add and Color', 'Addition of Single Digits', 'Complete the patterns', 'Multiplying Trials', 'Subtraction Number Stories', 'Take Away'],
  'Grade 1': ['Addition Worksheet', 'Addition Table (SD)', 'Multiplication Table (1 – 6)', 'Multiplication Circles', 'Multiplication Worksheet', 'Investigating Pattern', 'Multiplication Table (1 – 9)', 'Subtraction of numbers (SD)', 'Subtraction Worksheets', 'Multiplication table (1 - 12)', 'Addition of numbers (2d + 1)', 'Subtraction of numbers', 'Doubling (SD)', 'Investigating Patterns', 'Maths Worksheets'],
  'Grade 2': ['Addition & Subtraction of Numbers', 'Addition of numbers (2d + 1)', 'Multiplication by 2', 'Subtraction of numbers (2d – 1)', 'Graphical multiplication (1 x 1)', 'Multiplication Table', 'Investigating Patterns', 'Addition of Numbers', 'Graphical Mult. (1x1,1x2)', 'Addition Table (2d + 1)', 'Doubling (2D)', 'Multiplication by 11 (2dwoc)', 'Multiplication Trials', 'Multiplication table (2 – 12)', 'Addition of numbers (2d + 2)', 'Addition Table (2d + 2)', 'Multiplication by 11'],
  'Grade 3': ['Addition of numbers', 'Subtraction of Numbers', 'Multiplication by Two (2)', 'Multiplication by Ten (10)', 'Multiplying no.s ending with 0', 'Graphical Multiplication', 'Summary Worksheet', 'Subtraction of numbers', 'Sharing in ten’s', 'Sharing in two’s', 'Lattice Multiplication', 'Comparing Fractions', 'Addition & Subtraction of No’s', 'Multiplication by 11', 'Multiplying no’s ending with 1', 'Calculation of Time', 'Investigating Patterns'],
  'Grade 4': ['Addition & Subtraction of No’s', 'Multiplication by 11 (2 & 3 dw)', 'Multiplication by 11 (2 & 3 dwc)', 'Multiplication by 0.5', 'Division by 0.5', 'Multiplication by 4 (2 Digits)', 'Multiplication by 5', 'Multiplication by 9', 'Multiplication by 10', 'Fast Track Subtraction', 'Consecutive Numbers (3 & 4)', 'Mezzoscopic zeros', 'Mezzoscopic ones', 'Mezzoscopic Fives', 'Multiplying numbers ending with 5', 'Maths word problems'],
  'Grade 5': ['Addition & Subtraction of No’s', 'Multiplying no’s ending with 0', 'Multiplying no’s ending with 1', 'Sharing in twos (2)', 'Sharing in nines (9)', 'Squaring no’s ending with 5', 'Squaring no’s ending with 4', 'Multiplying no’s between 100 & 110', 'Addition of consecutive no’s (5 & 6)', 'Divisibility Test (2,3 & 4)', 'Multiplying No’s close to 100', 'Multiplication by 22', 'Divisibility Rules ( 5 – 8)', 'Multiplication by four (4)', 'Multiplication by 0.5', 'Division by 0.5', 'Powers of Ten'],
  'Grade 6': ['Addition & Subtraction of No’s', 'Multiplication by 11', 'Squaring no’s ending with 0', 'Squaring no’s ending with 1', 'Sharing in fives (5)', 'Multiplication by nine (9)', 'Summary Worksheet', 'Multiplying no’s between 10 & 20', 'Fast Track Subtraction', 'Multiplicatoin by five (5)', 'Squaring no’s between 30 & 50', 'Multiplying No’s with a difference of 2', 'Multiplication by ten (10)', 'Division by ten (10)', 'Squaring no’s between 50 & 70', 'Division by twenty – five (25)', 'Summary Worksheet & Sample B.E.C.E'],
  'Grade 7': ['Addition and Subtraction of Numbers', 'Squaring No’s Ending With 0', 'Squaring No’s Ending With 1', 'Squaring No’s Ending With 5', 'Percentages', 'Mezzoscopic Tens and Ones', 'Multiplying by 9', 'Summary Worksheet', 'Division by 5', 'Division by 50', 'Division by 500', 'Multiplying numbers ending with 0', 'Multiplying numbers ending with 1', 'Multiplying by 22', 'Division by 2', 'Multiplication by 5', 'Multiplication by 50', 'Multiplication by 500', 'Division by 9', 'Divisibility Rules ( 5 – 10)', 'Summary Worksheet & BECE Sample Questions'],
  'Grade 8': ['Understanding Word Problems', 'Addition & Subtraction of numbers', 'Multiplying no.s between 100 & 110', 'Mezzoscopic Tens and Ones', 'Percentages', 'Squaring No’s between 30 & 50', 'Multiplying no’s with a difference of 2', 'Summary Worksheet', 'Addition and Subtraction of Numbers', 'Multiplying numbers between 10 & 20', 'Squaring No’s between 50 & 70', 'Multiplying numbers close to 100', 'Fast track subtraction', 'Fractions', 'Divisibility Test (2 – 12)', 'General Multiplication', 'General Division', 'General Squaring', 'Mezzo Friendly B.E.C.E sample']
}

const CLASS_LEVELS = Object.keys(WORKBOOK_TOPICS)
let queued = false

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function inferArea(topic = '') {
  const t = topic.toLowerCase()
  if (t.includes('word problem')) return 'Word Problems'
  if (t.includes('fraction')) return 'Fractions'
  if (t.includes('percent')) return 'Percentages'
  if (t.includes('divisibility')) return 'Divisibility'
  if (t.includes('division') || t.includes('sharing') || t.includes('take away')) return 'Division'
  if (t.includes('subtraction') || t.includes('subtract') || t.includes('fast track')) return 'Subtraction'
  if (t.includes('addition') || t.includes('add') || t.includes('consecutive') || t.includes('doubling') || t.includes('trace')) return 'Addition'
  if (t.includes('squar') || t.includes('power')) return 'Squaring'
  if (t.includes('multip') || t.includes('mult') || t.includes('lattice') || t.includes('mezzoscopic')) return 'Multiplication'
  if (t.includes('pattern')) return 'Patterns'
  if (t.includes('time')) return 'Time'
  if (t.includes('count') || t.includes('identify') || t.includes('finger') || t.includes('number identification')) return 'Counting'
  return 'General Practice'
}
function multiplierFor(topic = '') {
  const t = topic.toLowerCase()
  if (t.includes('0.5')) return 0.5
  if (t.includes('500')) return 500
  if (t.includes('50')) return 50
  if (t.includes('25')) return 25
  if (t.includes('22')) return 22
  if (t.includes('11')) return 11
  if (t.includes('10')) return 10
  if (t.includes('nine') || t.includes(' 9')) return 9
  if (t.includes('five') || t.includes(' 5')) return 5
  if (t.includes('four') || t.includes(' 4')) return 4
  if (t.includes('two') || t.includes(' 2')) return 2
  return 6
}
function answerValue(answer) { return typeof answer === 'number' && Math.abs(answer - Math.round(answer)) < 0.00001 ? Math.round(answer) : Number(answer.toFixed ? answer.toFixed(4) : answer) }
function optionSet(answer) {
  if (String(answer).toLowerCase() === 'yes' || String(answer).toLowerCase() === 'no') {
    return { option_a: 'Yes', option_b: 'No', option_c: 'Cannot tell', option_d: 'Only sometimes', correct_answer: String(answer).toLowerCase() === 'yes' ? 'A' : 'B' }
  }
  const numeric = Number(answer)
  const correct = answerValue(numeric)
  const values = [correct, answerValue(numeric + 1), answerValue(numeric - 1), answerValue(numeric + 2)]
  const unique = [...new Set(values.map(String))]
  while (unique.length < 4) unique.push(String(answerValue(numeric + unique.length + 2)))
  const letters = ['A', 'B', 'C', 'D']
  const rotated = unique.slice(0, 4)
  const correctIndex = Math.abs(String(correct).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 4
  const [first] = rotated.splice(0, 1)
  rotated.splice(correctIndex, 0, first)
  return { option_a: rotated[0], option_b: rotated[1], option_c: rotated[2], option_d: rotated[3], correct_answer: letters[correctIndex] }
}
function questionFor(level, topic, index) {
  const area = inferArea(topic)
  let question = ''
  let answer = 0
  const base = index + 2
  if (level.startsWith('KG') || area === 'Counting') {
    answer = level === 'KG2' ? base + 1 : base
    question = topic.toLowerCase().includes('before') ? `What number comes after ${answer - 1}?` : `Count the objects: if there are ${answer} objects, how many objects are there?`
  } else if (area === 'Addition') {
    const a = 10 + index * 7
    const b = 3 + index * 2
    question = topic.toLowerCase().includes('word') ? `Ama has ${a} counters and gets ${b} more. How many counters does she have now?` : `${a} + ${b}`
    answer = a + b
  } else if (area === 'Subtraction') {
    const a = 25 + index * 8
    const b = 7 + index
    question = topic.toLowerCase().includes('word') ? `A class had ${a} pencils and used ${b}. How many pencils are left?` : `${a} - ${b}`
    answer = a - b
  } else if (area === 'Multiplication') {
    const m = multiplierFor(topic)
    const a = topic.toLowerCase().includes('between 100') || topic.toLowerCase().includes('close to 100') ? 101 + index : 4 + index
    const b = topic.toLowerCase().includes('tens and ones') ? 29 + index : m
    question = `${a} × ${b}`
    answer = a * b
  } else if (area === 'Division') {
    const d = multiplierFor(topic)
    const answerSeed = 8 + index
    const dividend = answerValue(answerSeed * d)
    question = `${dividend} ÷ ${d}`
    answer = answerSeed
  } else if (area === 'Squaring') {
    const n = topic.toLowerCase().includes('50') ? 50 + index : topic.toLowerCase().includes('30') ? 30 + index : 10 + index
    question = `${n} × ${n}`
    answer = n * n
  } else if (area === 'Percentages') {
    const percent = 10 + index * 5
    const amount = 100 + index * 20
    question = `Find ${percent}% of ${amount}.`
    answer = answerValue((percent / 100) * amount)
  } else if (area === 'Fractions') {
    const denom = index + 2
    const num = index + 1
    const total = denom * 3
    question = `What is ${num}/${denom} of ${total}?`
    answer = answerValue((num / denom) * total)
  } else if (area === 'Divisibility') {
    const n = 12 + index * 3
    question = `Is ${n} divisible by 3?`
    answer = 'Yes'
  } else if (area === 'Patterns') {
    const start = index + 2
    question = `Complete the pattern: ${start}, ${start + 2}, ${start + 4}, ?`
    answer = start + 6
  } else if (area === 'Time') {
    const start = 2 + index
    question = `If a lesson starts at ${start}:00 and lasts 2 hours, what hour does it end?`
    answer = start + 2
  } else if (area === 'Word Problems') {
    const a = 18 + index * 4
    const b = 7 + index
    question = `Kofi had ${a} mangoes and gave ${b} to his friend. How many mangoes remained?`
    answer = a - b
  } else {
    const a = 10 + index
    const b = 4 + index
    question = `${a} + ${b}`
    answer = a + b
  }
  const options = optionSet(answer)
  const numericAnswer = String(answer).toLowerCase() === 'yes' || String(answer).toLowerCase() === 'no' ? null : Number(answer)
  return { class_level: level, curriculum: 'GES', topic, topic_area: area, topic_sublevel: 'Mezzo workbook 2025', difficulty: index < 2 ? 1 : 2, question_text: question, numeric_answer: numericAnswer, ...options, explanation: `${question} = ${answer}.`, ai_generated: false, is_active: true, workbook_seeded: true }
}
function buildWorkbookQuestions() {
  const questions = []
  for (const [level, topics] of Object.entries(WORKBOOK_TOPICS)) {
    topics.forEach(topic => {
      for (let index = 0; index < 8; index += 1) questions.push(questionFor(level, topic, index))
    })
  }
  return questions
}
function questionKey(q) { return `${q.class_level}|${q.curriculum}|${q.topic}|${q.question_text}` }
function seedWorkbookQuestions() {
  const existing = readJson(BANK_KEY, [])
  const merged = [...existing]
  const keys = new Set(existing.map(questionKey))
  let added = 0
  for (const question of buildWorkbookQuestions()) {
    const key = questionKey(question)
    if (keys.has(key)) continue
    keys.add(key)
    merged.push(question)
    added += 1
  }
  if (added || localStorage.getItem(SEEDED_KEY) !== WORKBOOK_VERSION) {
    saveJson(BANK_KEY, merged)
    saveJson('mezzo_workbook_topics_by_level', WORKBOOK_TOPICS)
    localStorage.setItem(SEEDED_KEY, WORKBOOK_VERSION)
  }
}
function addOptions(select, options) {
  const existing = new Set([...select.options].map(option => option.value))
  options.forEach(value => {
    if (existing.has(value)) return
    const option = document.createElement('option')
    option.value = value
    option.textContent = value
    select.appendChild(option)
  })
}
function levelForTopicSelect(select) {
  const map = { smartTopic: 'smartClass', soloTopic: 'soloClass', battleTopic: 'battleClass', adminTopic: 'adminLevel', manualTopic: 'manualLevel' }
  const id = map[select.id]
  if (id) return document.getElementById(id)?.value || ''
  const form = select.closest('form, section, article')
  return form?.querySelector('select[name="class_level"], #smartClass, #soloClass, #battleClass, #adminLevel, #manualLevel')?.value || ''
}
function syncWorkbookOptions() {
  document.querySelectorAll('select').forEach(select => {
    const label = select.closest('label')?.textContent?.toLowerCase() || ''
    const isClass = select.name === 'class_level' || ['smartClass', 'soloClass', 'battleClass', 'adminLevel', 'manualLevel', 'aClass', 'bClass'].includes(select.id) || label.includes('class') || label.includes('level')
    if (isClass) addOptions(select, CLASS_LEVELS)
    const isTopic = select.name === 'topic' || /topic/i.test(select.id) || label.includes('topic')
    if (isTopic) {
      const level = levelForTopicSelect(select)
      const topics = WORKBOOK_TOPICS[level] || []
      if (topics.length) addOptions(select, topics)
    }
  })
  const admin = document.querySelector('.admin-screen .question-manager')
  if (admin && !document.querySelector('[data-workbook-seed-summary]')) {
    const totalTopics = Object.values(WORKBOOK_TOPICS).reduce((sum, topics) => sum + topics.length, 0)
    admin.insertAdjacentHTML('afterend', `<section class="question-manager glass-card" data-workbook-seed-summary="true"><div class="section-row"><h3>Mezzo Workbook 2025 Questions Loaded</h3><span>${totalTopics} topics • ${buildWorkbookQuestions().length} starter questions</span></div><p class="auth-note">KG1 to Grade 8 workbook topics have been added to class/topic dropdowns and seeded into the local question bank. Use Sync Local Questions to Database when Supabase policies are ready.</p></section>`)
  }
}
function syncAll() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; seedWorkbookQuestions(); syncWorkbookOptions() })
}

seedWorkbookQuestions()
const observer = new MutationObserver(syncAll)
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false })
window.addEventListener('load', syncAll)
window.addEventListener('storage', syncAll)
setTimeout(syncAll, 300)
