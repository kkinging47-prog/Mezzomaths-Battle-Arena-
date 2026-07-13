import './mezzo-topic-area-mapper.css'

const TOPIC_AREA_VERSION = 'mezzo-topic-area-map-v2'
const BANK_KEY = 'mezzo_question_bank'
let queued = false

const TOPIC_AREA_MAP = {
  // KG and early numeracy
  'Identify and Count': 'Counting & Number Recognition',
  'Count and recognize': 'Counting & Number Recognition',
  'Numbers before and after': 'Number Order & Sequence',
  'Multiply and Color': 'Early Multiplication Readiness',
  'Number Identification': 'Counting & Number Recognition',
  'Finger Counting': 'Counting & Number Recognition',
  'Counting Numbers': 'Counting & Number Recognition',
  'Count and Color': 'Counting & Number Recognition',
  'Count, Color and Match': 'Counting & Number Recognition',
  'Adding with Objects': 'Concrete Addition',
  'Addition using objects': 'Concrete Addition',
  'Add and Color': 'Concrete Addition',
  'Trace and Add': 'Concrete Addition',
  'Adding with Numbers': 'Addition',
  'Addition of Single Digits': 'Single Digit Addition',
  'Complete the patterns': 'Patterns & Sequences',
  'Subtraction Number Stories': 'Subtraction Word Problems',
  'Take Away': 'Concrete Subtraction',
  'Class Activities': 'Class Activities',

  // Addition and subtraction
  'Addition Worksheet': 'Addition',
  'Addition Table (SD)': 'Single Digit Addition',
  'Subtraction of numbers (SD)': 'Single Digit Subtraction',
  'Subtraction Worksheets': 'Subtraction',
  'Addition of numbers (2d + 1)': 'Two Digit Addition',
  'Addition of numbers (2d + 2)': 'Two Digit Addition',
  'Addition Table (2d + 1)': 'Two Digit Addition',
  'Addition Table (2d + 2)': 'Two Digit Addition',
  'Addition of numbers': 'Addition',
  'Addition of Numbers': 'Addition',
  'Addition & Subtraction of Numbers': 'Addition & Subtraction',
  'Addition & Subtraction of No’s': 'Addition & Subtraction',
  'Addition & Subtraction of No’s': 'Addition & Subtraction',
  'Addition & Subtraction of numbers': 'Addition & Subtraction',
  'Addition and Subtraction of Numbers': 'Addition & Subtraction',
  'Addition and Subtraction of numbers': 'Addition & Subtraction',
  'Subtraction of Numbers': 'Subtraction',
  'Subtraction of numbers': 'Subtraction',
  'Subtraction of numbers (2d – 1)': 'Two Digit Subtraction',
  'Fast Track Subtraction': 'Fast Track Subtraction',
  'Fast track subtraction': 'Fast Track Subtraction',
  'Doubling (SD)': 'Doubling',
  'Doubling (2D)': 'Doubling',
  'Consecutive Numbers (3 & 4)': 'Consecutive Number Addition',
  'Addition of consecutive no’s (5 & 6)': 'Consecutive Number Addition',

  // Multiplication
  'Multiplication Table': 'Multiplication Tables',
  'Multiplication Table (1 – 5)': 'Multiplication Tables',
  'Multiplication Table (1 – 6)': 'Multiplication Tables',
  'Multiplication Table (1 – 7)': 'Multiplication Tables',
  'Multiplication Table (1 – 9)': 'Multiplication Tables',
  'Multiplication table (1 - 12)': 'Multiplication Tables',
  'Multiplication table (2 – 12)': 'Multiplication Tables',
  'Multiplication Circles': 'Multiplication Models',
  'Multiplication Worksheet': 'Multiplication Practice',
  'Multiplication Worksheets': 'Multiplication Practice',
  'Multiplication Trials': 'Multiplication Practice',
  'Multiplying Trials': 'Multiplication Practice',
  'Multiplication by Two (2)': 'Multiplication by 2',
  'Multiplication by 2': 'Multiplication by 2',
  'Multiplication by 4 (2 Digits)': 'Multiplication by 4',
  'Multiplication by four (4)': 'Multiplication by 4',
  'Multiplication by 5': 'Multiplication by 5',
  'Multiplicatoin by five (5)': 'Multiplication by 5',
  'Multiplication by Ten (10)': 'Multiplication by 10',
  'Multiplication by ten (10)': 'Multiplication by 10',
  'Multiplication by 9': 'Multiplication by 9',
  'Multiplication by nine (9)': 'Multiplication by 9',
  'Multiplication by 11': 'Multiplication by 11',
  'Multiplication by 11 (2 & 3 dw)': 'Multiplication by 11',
  'Multiplication by 11 (2 & 3 dwc)': 'Multiplication by 11',
  'Multiplication by 11 (2dwoc)': 'Multiplication by 11',
  'Multiplication by 22': 'Multiplication by 22',
  'Multiplication by 0.5': 'Multiplication by 0.5',
  'Multiplication by 50': 'Multiplication by 50',
  'Multiplication by 500': 'Multiplication by 500',
  'Graphical multiplication (1 x 1)': 'Graphical Multiplication',
  'Graphical Mult. (1x1,1x2)': 'Graphical Multiplication',
  'Graphical Multiplication': 'Graphical Multiplication',
  'Lattice Multiplication': 'Lattice Multiplication',
  'General Multiplication': 'General Multiplication',
  'Multiplying no.s ending with 0': 'Multiplying Numbers Ending with 0',
  'Multiplying no’s ending with 0': 'Multiplying Numbers Ending with 0',
  'Multiplying numbers ending with 0': 'Multiplying Numbers Ending with 0',
  'Multiplying no’s ending with 1': 'Multiplying Numbers Ending with 1',
  'Multiplying numbers ending with 1': 'Multiplying Numbers Ending with 1',
  'Multiplying no’s between 10 & 20': 'Multiplying Numbers between 10 and 20',
  'Multiplying numbers between 10 & 20': 'Multiplying Numbers between 10 and 20',
  'Multiplying no’s between 100 & 110': 'Multiplying Numbers between 100 and 110',
  'Multiplying no.s between 100 & 110': 'Multiplying Numbers between 100 and 110',
  'Multiplying No’s close to 100': 'Multiplying Numbers close to 100',
  'Multiplying numbers close to 100': 'Multiplying Numbers close to 100',
  'Multiplying No’s with a difference of 2': 'Multiplying Numbers with Difference of 2',
  'Multiplying no’s with a difference of 2': 'Multiplying Numbers with Difference of 2',
  'Multiplying no’s ending with 5': 'Multiplying Numbers Ending with 5',
  'Multiplying numbers ending with 5': 'Multiplying Numbers Ending with 5',
  'Mezzoscopic zeros': 'Mezzoscopic Multiplication by Zeros',
  'Mezzoscopic ones': 'Mezzoscopic Multiplication by Ones',
  'Mezzoscopic Fives': 'Mezzoscopic Multiplication by Fives',
  'Mezzoscopic Tens and Ones': 'Mezzoscopic Tens and Ones',

  // Division and sharing
  'Division by 0.5': 'Division by 0.5',
  'Division by ten (10)': 'Division by 10',
  'Division by twenty – five (25)': 'Division by 25',
  'Division by 2': 'Division by 2',
  'Division by 5': 'Division by 5',
  'Division by 9': 'Division by 9',
  'Division by 50': 'Division by 50',
  'Division by 500': 'Division by 500',
  'General Division': 'General Division',
  'Sharing in ten’s': 'Sharing / Division by 10',
  'Sharing in two’s': 'Sharing / Division by 2',
  'Sharing in twos (2)': 'Sharing / Division by 2',
  'Sharing in nines (9)': 'Sharing / Division by 9',
  'Sharing in fives (5)': 'Sharing / Division by 5',

  // Squaring and powers
  'Squaring no’s ending with 0': 'Squaring Numbers Ending with 0',
  'Squaring No’s Ending With 0': 'Squaring Numbers Ending with 0',
  'Squaring no’s ending with 1': 'Squaring Numbers Ending with 1',
  'Squaring No’s Ending With 1': 'Squaring Numbers Ending with 1',
  'Squaring no’s ending with 4': 'Squaring Numbers Ending with 4',
  'Squaring no’s ending with 5': 'Squaring Numbers Ending with 5',
  'Squaring No’s Ending With 5': 'Squaring Numbers Ending with 5',
  'Squaring no’s between 30 & 50': 'Squaring Numbers between 30 and 50',
  'Squaring No’s between 30 & 50': 'Squaring Numbers between 30 and 50',
  'Squaring no’s between 50 & 70': 'Squaring Numbers between 50 and 70',
  'Squaring No’s between 50 & 70': 'Squaring Numbers between 50 and 70',
  'General Squaring': 'General Squaring',
  'Powers of Ten': 'Powers of Ten',

  // Other areas
  'Fractions': 'Fractions',
  'Comparing Fractions': 'Comparing Fractions',
  'Percentages': 'Percentages',
  'Divisibility Test (2,3 & 4)': 'Divisibility Tests',
  'Divisibility Rules ( 5 – 8)': 'Divisibility Rules',
  'Divisibility Rules ( 5 – 10)': 'Divisibility Rules',
  'Divisibility Test (2 – 12)': 'Divisibility Tests',
  'Calculation of Time': 'Time Calculation',
  'Maths word problems': 'Maths Word Problems',
  'Understanding Word Problems': 'Understanding Word Problems',
  'Maths Worksheets': 'Mixed Maths Worksheet',
  'Maths worksheet': 'Mixed Maths Worksheet',
  'Summary Worksheet': 'Summary Worksheet',
  'Summary Worksheet & Sample B.E.C.E': 'Summary Worksheet & BECE Sample',
  'Summary Worksheet & BECE Sample Questions': 'Summary Worksheet & BECE Sample',
  'Mezzo Friendly B.E.C.E sample': 'Mezzo Friendly BECE Sample',
  'Investigating Pattern': 'Investigating Patterns',
  'Investigating Patterns': 'Investigating Patterns'
}

function normalize(value = '') { return String(value).toLowerCase().replace(/[’']/g, '').replace(/[–—-]/g, '-').replace(/\s+/g, ' ').trim() }
const NORMALIZED = Object.fromEntries(Object.entries(TOPIC_AREA_MAP).map(([topic, area]) => [normalize(topic), area]))
function areaForTopic(topic = '') {
  const exact = NORMALIZED[normalize(topic)]
  if (exact) return exact
  const t = normalize(topic)
  if (t.includes('word problem')) return 'Maths Word Problems'
  if (t.includes('fraction')) return 'Fractions'
  if (t.includes('percent')) return 'Percentages'
  if (t.includes('divisibility')) return 'Divisibility Tests'
  if (t.includes('division') || t.includes('sharing')) return 'Division'
  if (t.includes('subtraction') || t.includes('subtract')) return 'Subtraction'
  if (t.includes('addition') || t.includes('add') || t.includes('doubling') || t.includes('consecutive')) return 'Addition'
  if (t.includes('squar')) return 'Squaring'
  if (t.includes('multip') || t.includes('mezzoscopic') || t.includes('lattice') || t.includes('graphical')) return 'Multiplication'
  if (t.includes('pattern')) return 'Patterns'
  if (t.includes('time')) return 'Time'
  if (t.includes('count') || t.includes('number')) return 'Counting & Number Recognition'
  return 'Mezzo Book General Practice'
}
function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function patchBank() {
  const bank = readJson(BANK_KEY, [])
  if (!Array.isArray(bank) || !bank.length) return
  let changed = false
  const updated = bank.map(q => {
    if (!q?.topic) return q
    const area = areaForTopic(q.topic)
    if (q.topic_area === area) return q
    changed = true
    return { ...q, topic_area: area, mezzo_topic_area: area }
  })
  if (changed || localStorage.getItem(TOPIC_AREA_VERSION) !== 'done') {
    saveJson(BANK_KEY, updated)
    localStorage.setItem(TOPIC_AREA_VERSION, 'done')
  }
}
function updateTopicAreaFields() {
  document.querySelectorAll('select[name="topic"], #adminTopic, #manualTopic, #soloTopic, #battleTopic, #smartTopic').forEach(select => {
    const area = areaForTopic(select.value)
    const form = select.closest('form, section, article')
    form?.querySelectorAll('input[name="topic_area"], input[name="topic_area_display"], input[readonly]').forEach(input => {
      const label = input.closest('label')?.textContent?.toLowerCase() || ''
      if (input.name === 'topic_area' || input.name === 'topic_area_display' || label.includes('topic area') || input.id?.toLowerCase().includes('topicarea')) input.value = area
    })
    if (form && !form.querySelector('[data-mezzo-topic-area-badge]')) {
      const field = select.closest('label') || select
      field.insertAdjacentHTML('afterend', `<div class="mezzo-topic-area-badge" data-mezzo-topic-area-badge="true">Topic Area: <strong>${area}</strong></div>`)
    } else {
      const badge = form?.querySelector('[data-mezzo-topic-area-badge] strong')
      if (badge) badge.textContent = area
    }
  })
  document.querySelectorAll('.bank-row small').forEach(small => {
    const parts = small.textContent.split('•').map(x => x.trim())
    if (parts.length < 3) return
    const topic = parts[2]
    const area = areaForTopic(topic)
    if (!small.querySelector('[data-area-fixed]')) small.innerHTML = small.innerHTML.replace(/•\s*(Multiplication|Division|Addition|Subtraction|Fractions|Percentages|General Practice|Worksheet|Squaring|Word Problems|Divisibility|Algebra|Geometry|Statistics|Addition &amp; Subtraction)\s*•/i, `• <span data-area-fixed="true">${area}</span> •`)
  })
}
function sync() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; patchBank(); updateTopicAreaFields() })
}

document.addEventListener('change', event => {
  if (event.target?.matches?.('select[name="topic"], #adminTopic, #manualTopic, #soloTopic, #battleTopic, #smartTopic')) setTimeout(sync, 30)
}, true)

document.addEventListener('submit', event => {
  const form = event.target
  if (!form || (form.id !== 'adminQuestionForm' && form.id !== 'aiGenerateForm')) return
  const topic = new FormData(form).get('topic')
  const area = areaForTopic(topic)
  form.querySelectorAll('input[name="topic_area"], input[name="topic_area_display"]').forEach(input => { input.value = area })
}, true)

const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false })
window.addEventListener('load', sync)
window.addEventListener('storage', sync)
setTimeout(sync, 350)
