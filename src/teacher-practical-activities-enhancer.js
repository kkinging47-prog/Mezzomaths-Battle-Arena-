import './teacher-practical-activities.css'

let queued = false

const ACTIVITY_KEYWORDS = {
  fraction: ['fraction strips', 'paper folding', 'sharing oranges/circles', 'fraction wall'],
  percent: ['discount cards', 'market price tags', 'hundred grid', 'shopping receipt'],
  algebra: ['number cards', 'mystery box', 'balance scale drawing', 'pattern table'],
  equation: ['number cards', 'mystery box', 'balance scale drawing', 'pattern table'],
  data: ['class survey', 'tally chart', 'bar graph cards', 'sticky notes'],
  graph: ['class survey', 'tally chart', 'bar graph cards', 'sticky notes'],
  shape: ['paper cut-outs', 'classroom objects', 'geoboard/geodot paper', 'ruler'],
  geometry: ['paper cut-outs', 'classroom objects', 'geoboard/geodot paper', 'ruler'],
  measurement: ['ruler', 'string', 'water bottles', 'weighing scale'],
  area: ['square grid paper', 'ruler', 'tiles', 'cut-out rectangles'],
  volume: ['cups', 'containers', 'water', 'measuring cylinder'],
  time: ['clock face', 'timetable cards', 'daily routine cards'],
  money: ['paper money', 'price tags', 'market role-play cards'],
  multiplication: ['array cards', 'bottle tops', 'counters', 'multiplication grid'],
  division: ['counters', 'paper plates', 'grouping mats', 'bottle tops'],
  subtraction: ['counters', 'number line', 'shopping change cards'],
  addition: ['counters', 'place value chart', 'base-ten blocks'],
  place: ['place value chart', 'base-ten blocks', 'abacus drawing', 'digit cards'],
  rounding: ['number line', 'place value chart', 'rounding ladder cards'],
  ratio: ['coloured beads', 'recipe cards', 'mixture cups'],
  probability: ['coins', 'dice', 'coloured balls', 'spinner'],
  pattern: ['number cards', 'shape cards', 'beads', 'tables']
}

function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])) }
function formData() { const form = document.getElementById('teacherToolsForm'); return form ? Object.fromEntries(new FormData(form).entries()) : {} }
function topicText(f) { return `${f.topic || ''} ${f.sub_strand || ''} ${f.strand || ''}`.toLowerCase() }
function classBand(level = '') { if (/Primary [1-3]/.test(level)) return 'lower'; if (/Primary [4-6]/.test(level)) return 'upper'; return 'jhs' }
function activityMaterials(f) {
  const text = topicText(f)
  const found = []
  Object.entries(ACTIVITY_KEYWORDS).forEach(([key, list]) => { if (text.includes(key)) found.push(...list) })
  const base = found.length ? found : ['counters', 'number cards', 'graph sheet', 'Mezzo Maths workbook', 'board and marker']
  return [...new Set(base)].slice(0, 6)
}
function strandApproach(f) {
  const text = topicText(f)
  if (text.includes('data') || text.includes('graph')) return 'Learners collect real classroom data, organize it in a tally table, represent it visually and interpret the result using questions.'
  if (text.includes('shape') || text.includes('geometry') || text.includes('measurement') || text.includes('area') || text.includes('volume')) return 'Learners measure, draw, cut, compare and explain mathematical properties using real classroom objects before writing formulae or symbols.'
  if (text.includes('fraction') || text.includes('percent') || text.includes('ratio')) return 'Learners model the idea concretely using sharing, folding, grids or mixtures before converting it into numbers and solving problems.'
  if (text.includes('algebra') || text.includes('equation') || text.includes('pattern')) return 'Learners observe a pattern or hidden-number situation, make a rule, test the rule and explain the relationship in words and symbols.'
  return 'Learners begin with concrete objects and local examples, then move from drawings to number sentences and real-life problem solving.'
}
function practicalActivities(f) {
  const topic = f.topic || f.sub_strand || 'the topic'
  const band = classBand(f.class_level)
  const materials = activityMaterials(f)
  const group = band === 'lower' ? 'pairs or small groups of 3' : 'groups of 4 with roles: leader, recorder, materials manager and reporter'
  const support = band === 'lower' ? 'Use smaller numbers, pictures and oral responses for learners who need support.' : 'Give support cards with steps and give extension learners a real-life challenge question.'
  return [
    {
      title: 'Concrete Starter Activity',
      duration: '8–10 minutes',
      purpose: `Activate prior knowledge and connect ${topic} to real objects.`,
      steps: [
        `Give learners ${materials.slice(0, 3).join(', ')} and ask them to model one simple example on ${topic}.`,
        `Ask two learners to explain what they did using correct mathematical language.`,
        `Teacher records key vocabulary and corrects misconceptions immediately.`
      ]
    },
    {
      title: 'Guided Discovery Activity',
      duration: '15–20 minutes',
      purpose: `Let learners discover the rule or method for ${topic} through investigation.`,
      steps: [
        strandApproach(f),
        `Learners work in ${group} to solve two practical tasks before the teacher introduces the formal method.`,
        `Groups present their strategy; teacher compares strategies and highlights the standard curriculum method.`
      ]
    },
    {
      title: 'Collaborative Practice Activity',
      duration: '10–15 minutes',
      purpose: `Build fluency, communication and confidence through peer work.`,
      steps: [
        `Give each group a task card containing one direct question and one word problem on ${topic}.`,
        `Learners solve, check each other’s work and write one sentence explaining their method.`,
        `Teacher circulates with a checklist: correct method, correct answer, clear explanation and participation.`
      ]
    },
    {
      title: 'Real-Life Application Activity',
      duration: '8–12 minutes',
      purpose: `Help learners apply ${topic} to daily life.`,
      steps: [
        `Use a Ghanaian classroom/market/home example related to ${topic}.`,
        `Learners create one similar problem from their own environment and exchange it with a partner to solve.`,
        `Class discusses how the concept is useful outside school.`
      ]
    }
  ].map(activity => ({ ...activity, materials, support }))
}
function activitiesHtml(f) {
  const activities = practicalActivities(f)
  return `<section class="practical-activities-panel" data-practical-activities="true"><h2>Practical Curriculum-Aligned Activities</h2><p class="activity-intro">These activities are generated to make the lesson more practical, learner-centred and aligned with the selected class, strand, sub-strand and topic. Teacher should adjust numbers/materials to the class ability.</p><div class="activity-card-grid">${activities.map((activity, index) => `<article class="activity-card"><span>Activity ${index + 1} • ${escapeHtml(activity.duration)}</span><h3>${escapeHtml(activity.title)}</h3><p><strong>Purpose:</strong> ${escapeHtml(activity.purpose)}</p><p><strong>Suggested TLMs:</strong> ${escapeHtml(activity.materials.join(', '))}</p><ol>${activity.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol><p class="activity-support"><strong>Differentiation:</strong> ${escapeHtml(activity.support)}</p><p class="activity-assessment"><strong>Assessment evidence:</strong> Observe learner explanation, group participation, correct representation, correct solution and ability to connect the activity to real life.</p></article>`).join('')}</div></section>`
}
function injectActivityField() {
  const form = document.getElementById('teacherToolsForm')
  if (!form || form.querySelector('[data-practical-activity-setting]')) return
  const target = form.querySelector('.teacher-generate-grid') || form.lastElementChild
  target?.insertAdjacentHTML('beforebegin', `<label class="wide practical-activity-setting" data-practical-activity-setting="true"><span>Practical Activities</span><select name="activity_depth"><option value="standard">Standard practical activities</option><option value="low_resource">Low-resource classroom activities</option><option value="high_engagement">High-engagement group activities</option><option value="assessment_focused">Activities with assessment evidence</option></select><small>Generated outputs will include hands-on activities aligned with the selected topic, strand, sub-strand and curriculum method.</small></label>`)
}
function enhanceOutput() {
  const output = document.getElementById('teacherOutput')
  const doc = output?.querySelector('.teacher-output-doc')
  if (!doc || doc.querySelector('[data-practical-activities]')) return
  const f = formData()
  const phaseTable = doc.querySelector('.lesson-phase-table')
  if (phaseTable) phaseTable.insertAdjacentHTML('afterend', activitiesHtml(f))
  else doc.insertAdjacentHTML('beforeend', activitiesHtml(f))
}
function sync() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; injectActivityField(); enhanceOutput() })
}

document.addEventListener('click', event => {
  const generator = event.target.closest('[data-generate-teacher]')
  if (generator) setTimeout(enhanceOutput, 120)
}, true)

document.addEventListener('change', event => {
  if (event.target?.id === 'teacherClass' || event.target?.id === 'teacherStrand' || event.target?.id === 'teacherSubStrand' || event.target?.id === 'teacherTopic' || event.target?.name === 'activity_depth') setTimeout(enhanceOutput, 80)
})

const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false })
window.addEventListener('load', sync)
window.addEventListener('storage', sync)
setTimeout(sync, 350)
