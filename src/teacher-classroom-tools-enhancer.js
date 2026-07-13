import './teacher-classroom-tools.css'

const RESOURCE_KEY = 'mezzo_teacher_resources'
let queued = false
let currentOutput = null

const CLASSES = ['Primary 1','Primary 2','Primary 3','Primary 4','Primary 5','Primary 6','Basic 7','Basic 8','Basic 9','SHS 1','SHS 2','SHS 3']
const JHS_STRANDS = {
  'Number': ['Number and Numeration Systems', 'Number Operations', 'Fractions, Decimals and Percentages', 'Ratios and Proportion'],
  'Algebra': ['Patterns and Relations', 'Algebraic Expressions', 'Variables and Equations'],
  'Geometry and Measurement': ['Shapes and Space', 'Measurement', 'Position and Transformation'],
  'Handling Data': ['Data', 'Chance or Probability']
}
const PRIMARY_STRANDS = {
  'Number': ['Numbers and Numerals', 'Addition and Subtraction', 'Multiplication and Division', 'Fractions', 'Decimals and Percentages', 'Sets of Numbers'],
  'Shape and Space': ['Solid Shapes', 'Plane Shapes', 'Position', 'Number Plane'],
  'Measurement': ['Length', 'Mass/Weight', 'Capacity and Volume', 'Time and Money', 'Area and Volume'],
  'Collecting and Handling Data': ['Collecting Data', 'Representing Data', 'Interpreting Graphs', 'Chance'],
  'Problem Solving': ['Word Problems', 'Investigation with Numbers', 'Real-life Applications']
}
const COMPETENCIES = ['Critical Thinking and Problem Solving (CP)', 'Creativity and Innovation (CI)', 'Communication and Collaboration (CC)', 'Digital Literacy (DL)', 'Personal Development and Leadership (PL)', 'Cultural Identity and Global Citizenship (CG)']
const RESOURCES = ['Counters', 'Bundle and loose straws', 'Base ten blocks/cut squares', 'Fraction chart', 'Geodot paper', 'Number line', 'Graph sheet', 'Mezzo Maths workbook', 'Board and marker', 'Learner exercise books']

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function profile() { return readJson('mezzo_profile', {}) || {} }
function isTeacherOrAdmin() { return ['teacher', 'admin', 'mezzo_staff'].includes(profile().role) }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
function logoHtml() { const logo = localStorage.getItem('mezzo_custom_logo'); return logo ? `<img src="${logo}" alt="Mezzo logo">` : '♛' }
function optionHtml(items, selected = '') { return items.map(item => `<option value="${escapeHtml(item)}" ${item === selected ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('') }
function strandsFor(classLevel) { return String(classLevel).includes('Basic') || String(classLevel).includes('SHS') ? JHS_STRANDS : PRIMARY_STRANDS }
function subStrandsFor(classLevel, strand) { return strandsFor(classLevel)[strand] || [] }
function toast(message) { document.querySelector('.teacher-tools-toast')?.remove(); document.body.insertAdjacentHTML('beforeend', `<div class="teacher-tools-toast">${escapeHtml(message)}</div>`); setTimeout(() => document.querySelector('.teacher-tools-toast')?.remove(), 4200) }
function uid() { return `teacher_${Date.now()}_${Math.random().toString(16).slice(2)}` }
function teacherName() { return profile().full_name || 'Teacher' }
function activeClassDefault() { return profile().class_level?.replace('Grade ', 'Primary ') || 'Basic 7' }
function getFormData() { const form = document.getElementById('teacherToolsForm'); return form ? Object.fromEntries(new FormData(form).entries()) : {} }
function classBand(level) { if (/Primary [1-3]/.test(level)) return 'lowerPrimary'; if (/Primary [4-6]/.test(level)) return 'upperPrimary'; return 'jhs' }
function assessmentWeights(level) {
  if (classBand(level) === 'lowerPrimary') return { ku: 40, ak: 60, avps: 0, label: 'Primary 1–3: KU 40%, Application 60%' }
  if (classBand(level) === 'upperPrimary') return { ku: 30, ak: 70, avps: 0, label: 'Primary 4–6: KU 30%, Application 70%' }
  return { ku: 30, ak: 40, avps: 30, label: 'CCP/JHS: KU 30%, Application 40%, Attitudes/Values/Process Skills 30%' }
}
function normalizeTopic(topic = '') { return topic.trim() || 'Place Value and Number Operations' }
function sampleNumbers(seed = 1) { return [seed * 3 + 12, seed * 4 + 25, seed * 5 + 38, seed * 6 + 51] }
function topicExamples(topic, classLevel) {
  const t = normalizeTopic(topic).toLowerCase()
  const [a, b, c, d] = sampleNumbers(topic.length || 3)
  if (t.includes('fraction')) return [`Represent 3/4 using a shaded diagram.`, `Find 2/3 of ${c}.`, `Solve: 1/2 + 1/4.`, `A learner ate 2/5 of a cake. What fraction is left?`]
  if (t.includes('percent')) return [`Find 25% of ${c * 2}.`, `Convert 0.75 to a percentage.`, `A shirt costing GH₵${c} is reduced by 10%. Find the discount.`, `Write 3/5 as a percentage.`]
  if (t.includes('algebra') || t.includes('equation')) return [`Simplify: 3x + 2x.`, `Solve: x + ${a} = ${b}.`, `Write an expression for “${a} more than a number”.`, `If y = ${a}, find 2y + ${b}.`]
  if (t.includes('data') || t.includes('graph')) return [`Collect the favourite fruits of 10 learners and tally them.`, `Draw a bar graph from a simple tally table.`, `Find the mode of: 2, 3, 3, 4, 5.`, `Interpret a graph showing attendance from Monday to Friday.`]
  if (t.includes('shape') || t.includes('geometry') || t.includes('area')) return [`Identify three rectangles in the classroom.`, `Find the perimeter of a rectangle of length ${a} cm and width ${b} cm.`, `Draw and label a triangle.`, `Find the area of a rectangle ${a} cm by ${b} cm.`]
  if (t.includes('division')) return [`${c} ÷ ${a % 5 + 2}`, `Share ${d} counters equally among ${a % 6 + 2} learners.`, `Create a division story problem from ${c} ÷ ${a % 5 + 2}.`, `Compare two division sentences using >, < or =.`]
  if (t.includes('multip')) return [`${a} × ${a % 8 + 2}`, `${b} × 10`, `Use the doubling strategy to solve ${c} × 5.`, `A class has ${a} groups of ${a % 7 + 3}. How many learners altogether?`]
  return [`${a} + ${b}`, `${d} - ${a}`, `Round ${d * 1000 + c} to the nearest hundred.`, `Write ${d * 100 + b} in words.`]
}
function performanceIndicator(topic, classLevel) { return `Learners can demonstrate understanding of ${normalizeTopic(topic)} and apply it to solve classroom and real-life mathematical problems.` }
function contentStandard(strand, subStrand, classLevel) {
  const prefix = String(classLevel).includes('Basic') ? classLevel.replace('Basic ', 'B') : classLevel.replace('Primary ', 'P')
  return `${prefix}.${strand.slice(0, 1)}.${subStrand.slice(0, 1)}.1 Demonstrate understanding of ${subStrand.toLowerCase()} under ${strand.toLowerCase()} and apply it in problem solving.`
}
function indicator(strand, subStrand, topic, classLevel) { const prefix = String(classLevel).includes('Basic') ? classLevel.replace('Basic ', 'B') : classLevel.replace('Primary ', 'P'); return `${prefix}.${strand.slice(0, 1)}.${subStrand.slice(0, 1)}.1.1 Explore, model, explain and solve problems involving ${normalizeTopic(topic)}.` }
function phaseRows(f) {
  const examples = topicExamples(f.topic, f.class_level)
  return `<tr><th>PHASE 1: STARTER</th><td><p>Review learners’ previous knowledge using two quick oral questions and one practical problem related to ${escapeHtml(normalizeTopic(f.topic))}.</p><p>Share the performance indicator and success criteria with learners.</p><p>Diagnostic questions: ${escapeHtml(examples[0])}; ${escapeHtml(examples[1])}</p></td><td>Board, counters, learner responses</td></tr><tr><th>PHASE 2: NEW LEARNING</th><td><p>Use guided discovery: teacher demonstrates one worked example, then learners solve a similar task in pairs.</p><p>Scaffold learning from concrete materials to diagrams, then to symbolic mathematics.</p><p>Group activity: learners create and solve one real-life problem on ${escapeHtml(normalizeTopic(f.topic))}.</p><p>Differentiation: provide simpler numbers/support cards for learners who need support and extension challenge questions for fast learners.</p><p>Worked examples: ${escapeHtml(examples[2])}; ${escapeHtml(examples[3])}</p></td><td>${RESOURCES.slice(0, 6).join(', ')}</td></tr><tr><th>PHASE 3: REFLECTION</th><td><p>Use peer discussion and effective questioning to find out what learners have learnt.</p><p>Ask learners to write an exit ticket: “One thing I can now do…” and “One area I need help with…”.</p><p>Ask how the lesson can be used in daily life.</p></td><td>Exit cards, exercise books</td></tr>`
}
function lessonPlanHtml(f) {
  const standard = f.content_standard || contentStandard(f.strand, f.sub_strand, f.class_level)
  const ind = f.indicator || indicator(f.strand, f.sub_strand, f.topic, f.class_level)
  const perf = f.performance_indicator || performanceIndicator(f.topic, f.class_level)
  return `<article class="teacher-output-doc lesson-note-doc"><h1>Mathematics Lesson Note / Lesson Plan</h1><section class="lesson-note-grid"><div><b>Date:</b> ${escapeHtml(f.date || '')}</div><div><b>Period:</b> ${escapeHtml(f.period || '')}</div><div><b>Subject:</b> Mathematics</div><div><b>Duration:</b> ${escapeHtml(f.duration || '50 mins')}</div><div><b>Class:</b> ${escapeHtml(f.class_level)}</div><div><b>Class Size:</b> ${escapeHtml(f.class_size || '')}</div><div><b>Strand:</b> ${escapeHtml(f.strand)}</div><div><b>Sub-strand:</b> ${escapeHtml(f.sub_strand)}</div><div><b>Lesson:</b> ${escapeHtml(f.lesson_no || '1 of 1')}</div><div><b>References:</b> ${escapeHtml(f.reference || 'GES/NaCCA Mathematics Curriculum, Mezzo Maths Workbook')}</div></section><section class="lesson-note-grid two"><div><b>Content Standard:</b><br>${escapeHtml(standard)}</div><div><b>Indicator:</b><br>${escapeHtml(ind)}</div><div><b>Performance Indicator:</b><br>${escapeHtml(perf)}</div><div><b>Core Competencies:</b><br>${escapeHtml(f.core_competencies || 'CP, CC, CI')}</div><div><b>Keywords:</b><br>${escapeHtml(f.keywords || normalizeTopic(f.topic))}</div><div><b>Resources/TLMs:</b><br>${escapeHtml(f.resources || RESOURCES.slice(0, 5).join(', '))}</div></section><table class="lesson-phase-table"><thead><tr><th>Phase/Duration</th><th>Learners Activities</th><th>Resources</th></tr></thead><tbody>${phaseRows(f)}</tbody></table><section class="teacher-assessment-box"><h2>Assessment</h2><ol>${topicExamples(f.topic, f.class_level).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ol><h2>Homework</h2><p>${escapeHtml(homeworkText(f))}</p></section></article>`
}
function homeworkText(f) { return `Solve five questions on ${normalizeTopic(f.topic)} from your exercise book/workbook. Create one word problem and solve it using the method learnt in class.` }
function classworkHtml(f) {
  const items = topicExamples(f.topic, f.class_level)
  return `<article class="teacher-output-doc"><h1>Classwork Trial</h1><p><b>Class:</b> ${escapeHtml(f.class_level)} • <b>Topic:</b> ${escapeHtml(normalizeTopic(f.topic))}</p><ol>${Array.from({ length: Number(f.question_count || 10) }, (_, i) => `<li>${escapeHtml(items[i % items.length])}</li>`).join('')}</ol><p><b>Teacher instruction:</b> Let learners attempt individually first, then compare solutions in pairs before whole-class correction.</p></article>`
}
function homeworkHtml(f) { const items = topicExamples(f.topic, f.class_level); return `<article class="teacher-output-doc"><h1>Homework</h1><p><b>Class:</b> ${escapeHtml(f.class_level)} • <b>Topic:</b> ${escapeHtml(normalizeTopic(f.topic))}</p><ol>${Array.from({ length: Number(f.question_count || 10) }, (_, i) => `<li>${escapeHtml(items[(i + 1) % items.length])}</li>`).join('')}</ol><p><b>Parent/Guardian note:</b> Learners should show clear working and bring questions they found difficult to the next lesson.</p></article>` }
function examplesHtml(f) { const items = topicExamples(f.topic, f.class_level); return `<article class="teacher-output-doc"><h1>Worked Examples</h1><p><b>Topic:</b> ${escapeHtml(normalizeTopic(f.topic))}</p>${items.map((item, i) => `<section class="worked-example"><h2>Example ${i + 1}</h2><p><b>Question:</b> ${escapeHtml(item)}</p><p><b>Method:</b> Identify the known values, choose the correct operation or representation, solve step-by-step, and check if the answer is reasonable.</p><p><b>Teacher note:</b> Ask learners to explain the reasoning in their own words.</p></section>`).join('')}</article>` }
function assessmentHtml(f, kind = 'Mid-Term Test') {
  const count = Number(f.question_count || 30)
  const weights = assessmentWeights(f.class_level)
  const items = topicExamples(f.topic, f.class_level)
  const mcqCount = Math.round(count * 0.6)
  const sectionB = count - mcqCount
  return `<article class="teacher-output-doc exam-doc"><h1>${escapeHtml(kind)} - Mathematics</h1><section class="lesson-note-grid"><div><b>Class:</b> ${escapeHtml(f.class_level)}</div><div><b>Duration:</b> ${escapeHtml(f.exam_duration || '60 mins')}</div><div><b>Term:</b> ${escapeHtml(f.term || '')}</div><div><b>Topic/Strand:</b> ${escapeHtml(f.strand)} / ${escapeHtml(f.sub_strand)}</div><div><b>Assessment Weighting:</b> ${escapeHtml(weights.label)}</div><div><b>Total Marks:</b> ${escapeHtml(f.total_marks || '50')}</div></section><h2>Section A: Objective / Short Answer</h2><ol>${Array.from({ length: mcqCount }, (_, i) => `<li>${escapeHtml(items[i % items.length])} <br>A. ${i + 2} &nbsp; B. ${i + 3} &nbsp; C. ${i + 4} &nbsp; D. ${i + 5}</li>`).join('')}</ol><h2>Section B: Application / Word Problems</h2><ol>${Array.from({ length: sectionB }, (_, i) => `<li>${escapeHtml(items[(i + 2) % items.length])} Show your working clearly.</li>`).join('')}</ol><h2>Answer Guide</h2><p>Teacher should mark for correct method, accuracy, reasoning, diagrams/representations, and clear working. Use feedback to plan remediation and enrichment.</p></article>`
}
function lessonNotesText(f) {
  const examples = topicExamples(f.topic, f.class_level)
  return `<article class="teacher-output-doc"><h1>Detailed Lesson Notes</h1><h2>${escapeHtml(normalizeTopic(f.topic))}</h2><p><b>Concept:</b> This lesson helps learners build understanding of ${escapeHtml(normalizeTopic(f.topic))} through concrete materials, diagrams, symbolic work and real-life applications.</p><h2>Teacher Explanation</h2><p>Begin from learners’ prior knowledge. Use familiar examples from school, money, classroom objects, local market situations and learner experiences. Move from simple cases to more challenging problems.</p><h2>Key Teaching Points</h2><ul><li>Use mathematical vocabulary correctly.</li><li>Encourage learners to explain their reasoning.</li><li>Represent problems with objects, drawings, number sentences and words.</li><li>Check understanding frequently with oral questions and mini-whiteboard responses.</li></ul><h2>Examples</h2><ol>${examples.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ol><h2>Misconceptions to Watch</h2><p>Learners may confuse the operation, copy procedures without understanding, or fail to connect word problems to number sentences. Use peer explanation and practical examples to correct this.</p></article>`
}
function wrapOutput(title, html) { return `<section class="teacher-output-wrap"><div class="teacher-output-actions"><button class="btn btn-gold" data-print-teacher-output="true">Print / Save PDF</button><button class="btn btn-blue" data-save-teacher-output="true">Save Resource</button><button class="btn btn-ghost" data-download-teacher-html="true">Download HTML</button></div>${html}</section>` }
function generate(type) {
  const f = getFormData()
  let html = ''
  if (type === 'lessonPlan') html = lessonPlanHtml(f)
  if (type === 'lessonNotes') html = lessonNotesText(f)
  if (type === 'exam') html = assessmentHtml(f, f.assessment_type || 'Mid-Term Test')
  if (type === 'homework') html = homeworkHtml(f)
  if (type === 'classwork') html = classworkHtml(f)
  if (type === 'examples') html = examplesHtml(f)
  currentOutput = { id: uid(), type, title: `${type} - ${normalizeTopic(f.topic)}`, class_level: f.class_level, topic: normalizeTopic(f.topic), html, created_at: new Date().toISOString(), teacher: teacherName() }
  document.getElementById('teacherOutput').innerHTML = wrapOutput(currentOutput.title, html)
  toast('Teacher resource generated.')
}
function saveCurrent() { if (!currentOutput) return toast('Generate a resource first.'); saveJson(RESOURCE_KEY, [currentOutput, ...readJson(RESOURCE_KEY, [])].slice(0, 80)); toast('Resource saved locally.') }
function downloadHtml() { if (!currentOutput) return; const blob = new Blob([`<!doctype html><html><head><meta charset="utf-8"><title>${currentOutput.title}</title><style>body{font-family:Arial;padding:24px;line-height:1.5}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:8px;vertical-align:top}</style></head><body>${currentOutput.html}</body></html>`], { type: 'text/html' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${currentOutput.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.html`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 800) }
function printOutput() { const html = currentOutput?.html || document.getElementById('teacherOutput')?.innerHTML || ''; const w = window.open('', '_blank'); if (!w) return; w.document.write(`<!doctype html><html><head><title>Teacher Resource</title><style>body{font-family:Arial;padding:24px;line-height:1.5}h1{color:#1d4ed8}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:8px;vertical-align:top}.lesson-note-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin:10px 0}.teacher-output-actions{display:none}</style></head><body>${html}<script>window.print()</script></body></html>`); w.document.close() }
function recentResourcesHtml() { const list = readJson(RESOURCE_KEY, []).slice(0, 6); return list.map(item => `<article><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.class_level)} • ${escapeHtml(item.topic)}</span><button class="btn btn-ghost btn-small" data-open-saved-resource="${item.id}">Open</button></article>`).join('') || '<p>No saved resources yet.</p>' }
function teacherToolsPage() {
  if (!isTeacherOrAdmin()) toast('Tip: Teacher tools are designed for teacher/admin accounts. You can still preview them here.')
  const classLevel = activeClassDefault()
  const strand = Object.keys(strandsFor(classLevel))[0]
  const sub = subStrandsFor(classLevel, strand)[0]
  document.getElementById('root').innerHTML = `<main class="app-shell teacher-tools-app"><section class="app-frame teacher-tools-page"><nav class="screen-tabs teacher-tools-nav"><div class="brand-chip"><span class="brand-crown">${logoHtml()}</span><div><strong>MEZZO</strong><small>Teacher Tools</small></div></div><div class="tab-scroll"><button class="screen-tab" data-target="home"><span>🏟️</span>Home</button><button class="screen-tab active" data-teacher-tools-page="true"><span>👩🏾‍🏫</span>Teacher Tools</button><button class="screen-tab" data-target="dashboard"><span>👤</span>Dashboard</button></div></nav><section class="teacher-tools-hero glass-card"><div><span class="teacher-kicker">GES / Private School Maths Support</span><h1>Teacher Classroom Work Generator</h1><p>Generate GES/NaCCA-aligned lesson plans, lesson notes, mid-term/exam questions, homework, classwork and worked examples using strands, sub-strands, indicators and learner-centred phases.</p></div><div class="teacher-hero-badge"><strong>3-Phase</strong><small>Starter • New Learning • Reflection</small></div></section><section class="teacher-tools-layout"><form id="teacherToolsForm" class="teacher-tools-form glass-card"><h2>Curriculum Setup</h2><label><span>School Type</span><select name="school_type"><option>GES Public School</option><option>Private School using GES/NaCCA</option><option>Private School using GES + International Enrichment</option></select></label><label><span>Class</span><select name="class_level" id="teacherClass">${optionHtml(CLASSES, classLevel)}</select></label><label><span>Term</span><select name="term"><option>Term 1</option><option>Term 2</option><option>Term 3</option></select></label><label><span>Week</span><input name="week" placeholder="e.g. Week 4"></label><label><span>Date</span><input name="date" type="date"></label><label><span>Period</span><input name="period" placeholder="e.g. 1 & 2"></label><label><span>Duration</span><input name="duration" value="50 mins"></label><label><span>Class Size</span><input name="class_size" placeholder="e.g. 45"></label><label><span>Strand</span><select name="strand" id="teacherStrand">${optionHtml(Object.keys(strandsFor(classLevel)), strand)}</select></label><label><span>Sub-strand</span><select name="sub_strand" id="teacherSubStrand">${optionHtml(subStrandsFor(classLevel, strand), sub)}</select></label><label><span>Topic</span><input name="topic" id="teacherTopic" placeholder="e.g. Fractions / Place Value / Algebra" value="Place Value"></label><label><span>Lesson Number</span><input name="lesson_no" value="1 of 3"></label><label class="wide"><span>Content Standard</span><textarea name="content_standard" placeholder="Paste or type content standard. Leave blank to auto-generate."></textarea></label><label class="wide"><span>Indicator</span><textarea name="indicator" placeholder="Paste or type indicator. Leave blank to auto-generate."></textarea></label><label class="wide"><span>Performance Indicator</span><textarea name="performance_indicator" placeholder="Leave blank to auto-generate."></textarea></label><label><span>Core Competencies</span><select name="core_competencies">${optionHtml(COMPETENCIES, COMPETENCIES[0])}</select></label><label><span>Assessment Type</span><select name="assessment_type"><option>Mid-Term Test</option><option>End of Term Examination</option><option>Class Test</option><option>Diagnostic Test</option></select></label><label><span>Number of Questions</span><select name="question_count"><option>10</option><option>20</option><option selected>30</option><option>40</option></select></label><label><span>Total Marks</span><input name="total_marks" value="50"></label><label><span>Exam Duration</span><input name="exam_duration" value="60 mins"></label><label class="wide"><span>Keywords</span><input name="keywords" placeholder="e.g. denominator, numerator, equivalent fraction"></label><label class="wide"><span>References</span><input name="reference" value="GES/NaCCA Mathematics Curriculum, Mezzo Maths Workbook"></label><label class="wide"><span>Resources/TLMs</span><input name="resources" value="${RESOURCES.slice(0, 5).join(', ')}"></label><div class="teacher-generate-grid wide"><button type="button" class="btn btn-gold" data-generate-teacher="lessonPlan">Generate Lesson Plan</button><button type="button" class="btn btn-blue" data-generate-teacher="lessonNotes">Generate Lesson Notes</button><button type="button" class="btn btn-primary" data-generate-teacher="exam">Generate Exam/Test</button><button type="button" class="btn btn-ghost" data-generate-teacher="homework">Generate Homework</button><button type="button" class="btn btn-ghost" data-generate-teacher="classwork">Generate Classwork</button><button type="button" class="btn btn-ghost" data-generate-teacher="examples">Generate Examples</button></div></form><aside class="teacher-tools-side glass-card"><h2>Best-Practice Design Rules</h2><ul><li>Align every output to class, strand, sub-strand, standard and indicator.</li><li>Use learner-centred phases: starter, new learning and reflection.</li><li>Include formative assessment, homework, classwork and differentiation.</li><li>Use practical local examples, TLMs and problem solving.</li><li>Keep teacher final review before classroom use.</li></ul><h2>Saved Resources</h2><div class="teacher-saved-list">${recentResourcesHtml()}</div></aside></section><section id="teacherOutput" class="teacher-output-shell"></section></section></main>`
}
function syncTeacherSelects() {
  const classSelect = document.getElementById('teacherClass')
  const strandSelect = document.getElementById('teacherStrand')
  const subSelect = document.getElementById('teacherSubStrand')
  if (!classSelect || !strandSelect || !subSelect) return
  const currentStrands = Object.keys(strandsFor(classSelect.value))
  if (!currentStrands.includes(strandSelect.value)) strandSelect.innerHTML = optionHtml(currentStrands, currentStrands[0])
  const subs = subStrandsFor(classSelect.value, strandSelect.value)
  subSelect.innerHTML = optionHtml(subs, subs[0])
}
function installTeacherNav() {
  document.querySelectorAll('.tab-scroll').forEach(nav => {
    if (nav.querySelector('[data-teacher-tools-page]')) return
    const btn = document.createElement('button')
    btn.className = 'screen-tab teacher-tools-nav-button'
    btn.type = 'button'
    btn.dataset.teacherToolsPage = 'true'
    btn.innerHTML = '<span>👩🏾‍🏫</span>Teacher Tools'
    const auth = nav.querySelector('[data-target="auth"]')
    if (auth) auth.insertAdjacentElement('beforebegin', btn)
    else nav.appendChild(btn)
  })
}
function installTeacherDashboardCard() {
  const dash = document.querySelector('.dashboard-screen .dashboard-hero .cta-row')
  if (dash && !dash.querySelector('[data-teacher-tools-page]')) dash.insertAdjacentHTML('beforeend', '<button class="btn btn-blue" data-teacher-tools-page="true">👩🏾‍🏫 Teacher Tools</button>')
  const homeGrid = document.querySelector('.home-screen .home-mode-grid')
  if (homeGrid && !homeGrid.querySelector('.teacher-tools-home-card')) homeGrid.insertAdjacentHTML('beforeend', `<button class="home-mode-card game-mode-card teacher-tools-home-card" data-teacher-tools-page="true"><i class="mode-shine"></i><div class="mode-top"><span class="mode-icon">👩🏾‍🏫</span><em>Teachers</em></div><h3>Teacher Tools</h3><p>Generate lesson notes, lesson plans, exams, homework, classwork and examples from curriculum strands.</p><div class="reward-pill">GES/NaCCA aligned</div><strong>OPEN TEACHER TOOLS →</strong></button>`)
}
function sync() { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; installTeacherNav(); installTeacherDashboardCard() }) }

document.addEventListener('click', event => {
  if (event.target.closest('[data-teacher-tools-page]')) { event.preventDefault(); event.stopImmediatePropagation(); teacherToolsPage(); return }
  const gen = event.target.closest('[data-generate-teacher]')
  if (gen) { event.preventDefault(); generate(gen.dataset.generateTeacher); return }
  if (event.target.closest('[data-save-teacher-output]')) { event.preventDefault(); saveCurrent(); return }
  if (event.target.closest('[data-download-teacher-html]')) { event.preventDefault(); downloadHtml(); return }
  if (event.target.closest('[data-print-teacher-output]')) { event.preventDefault(); printOutput(); return }
  const saved = event.target.closest('[data-open-saved-resource]')
  if (saved) { const item = readJson(RESOURCE_KEY, []).find(x => x.id === saved.dataset.openSavedResource); if (item) { currentOutput = item; document.getElementById('teacherOutput').innerHTML = wrapOutput(item.title, item.html); document.getElementById('teacherOutput').scrollIntoView({ behavior: 'smooth' }) } }
}, true)

document.addEventListener('change', event => { if (event.target?.id === 'teacherClass' || event.target?.id === 'teacherStrand') syncTeacherSelects() })

const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false })
window.addEventListener('load', sync)
window.addEventListener('storage', sync)
setTimeout(sync, 350)
