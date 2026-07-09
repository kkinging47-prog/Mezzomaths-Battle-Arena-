import './bece-practice.css'

const beceSets = {
  samples: [
    { year: 'Sample', topic: 'Number', q: 'Simplify: 3/4 + 1/8', options: ['1/2', '7/8', '5/8', '1'], answer: 'B', explanation: '3/4 is 6/8, and 6/8 + 1/8 = 7/8.' },
    { year: 'Sample', topic: 'Algebra', q: 'If 2x + 5 = 17, find x.', options: ['4', '5', '6', '7'], answer: 'C', explanation: '2x = 12, so x = 6.' },
    { year: 'Sample', topic: 'Geometry', q: 'Find the area of a rectangle with length 12 cm and breadth 7 cm.', options: ['19 cm²', '38 cm²', '84 cm²', '96 cm²'], answer: 'C', explanation: 'Area = length × breadth = 12 × 7 = 84 cm².' },
    { year: 'Sample', topic: 'Statistics', q: 'The marks are 4, 6, 8, 10, 12. What is the mean?', options: ['7', '8', '9', '10'], answer: 'B', explanation: 'Sum = 40. Mean = 40 ÷ 5 = 8.' },
    { year: 'Sample', topic: 'Percentages', q: 'Find 20% of 250.', options: ['25', '40', '50', '60'], answer: 'C', explanation: '20% of 250 = 20/100 × 250 = 50.' },
    { year: 'Sample', topic: 'Ratio', q: 'Share GHS 60 in the ratio 2:3. What is the larger share?', options: ['GHS 20', 'GHS 24', 'GHS 30', 'GHS 36'], answer: 'D', explanation: 'Total parts = 5. Larger share = 3/5 × 60 = 36.' },
    { year: 'Sample', topic: 'Angles', q: 'Two angles on a straight line are x and 65°. Find x.', options: ['25°', '95°', '115°', '125°'], answer: 'C', explanation: 'Angles on a straight line sum to 180°. x = 180 − 65 = 115°.' },
    { year: 'Sample', topic: 'Speed', q: 'A car travels 180 km in 3 hours. Find its average speed.', options: ['30 km/h', '45 km/h', '60 km/h', '90 km/h'], answer: 'C', explanation: 'Speed = distance ÷ time = 180 ÷ 3 = 60 km/h.' },
    { year: 'Sample', topic: 'Indices', q: 'Evaluate 2³ × 2².', options: ['16', '24', '32', '64'], answer: 'C', explanation: '2³ × 2² = 2⁵ = 32.' },
    { year: 'Sample', topic: 'Probability', q: 'A bag contains 3 red balls and 2 blue balls. What is the probability of picking a blue ball?', options: ['2/5', '3/5', '1/2', '1/5'], answer: 'A', explanation: 'There are 5 balls. Blue balls = 2, so probability = 2/5.' },
    { year: 'Sample', topic: 'Mensuration', q: 'Find the perimeter of a square of side 9 cm.', options: ['18 cm', '27 cm', '36 cm', '81 cm'], answer: 'C', explanation: 'Perimeter of square = 4 × side = 4 × 9 = 36 cm.' },
    { year: 'Sample', topic: 'Linear Equations', q: 'Solve: y/3 = 7.', options: ['10', '14', '21', '24'], answer: 'C', explanation: 'Multiply both sides by 3. y = 21.' }
  ],
  pastStyle: [
    { year: 'Sample', topic: 'Fractions', q: 'A trader sold 2/5 of her oranges in the morning and 1/4 in the afternoon. What fraction was sold altogether?', options: ['3/9', '13/20', '3/20', '7/20'], answer: 'B', explanation: '2/5 = 8/20 and 1/4 = 5/20. Total = 13/20.' },
    { year: 'Sample', topic: 'Algebra', q: 'Expand: 3(a + 4).', options: ['3a + 4', '3a + 7', '3a + 12', 'a + 12'], answer: 'C', explanation: 'Multiply each term in the bracket by 3: 3a + 12.' },
    { year: 'Sample', topic: 'Geometry', q: 'The base of a triangle is 10 cm and its height is 8 cm. Find its area.', options: ['18 cm²', '40 cm²', '80 cm²', '160 cm²'], answer: 'B', explanation: 'Area of triangle = 1/2 × base × height = 1/2 × 10 × 8 = 40 cm².' },
    { year: 'Sample', topic: 'Percentages', q: 'A book costs GHS 80. It is sold at a discount of 10%. What is the discount?', options: ['GHS 4', 'GHS 8', 'GHS 10', 'GHS 72'], answer: 'B', explanation: '10% of 80 = 8.' },
    { year: 'Sample', topic: 'Statistics', q: 'Find the mode of 2, 5, 7, 5, 8, 5, 9.', options: ['2', '5', '7', '9'], answer: 'B', explanation: 'The mode is the number that occurs most often. 5 occurs three times.' },
    { year: 'Sample', topic: 'Integers', q: 'Evaluate: −4 + 9 − 3.', options: ['2', '4', '8', '16'], answer: 'A', explanation: '−4 + 9 = 5, and 5 − 3 = 2.' },
    { year: 'Sample', topic: 'Ratio', q: 'The ratio of boys to girls in a class is 3:5. If there are 24 boys, how many girls are there?', options: ['30', '36', '40', '45'], answer: 'C', explanation: '3 parts = 24, so 1 part = 8. Girls = 5 × 8 = 40.' },
    { year: 'Sample', topic: 'Word Problem', q: 'A farmer harvested 144 eggs and packed them equally into crates of 12. How many crates were used?', options: ['10', '11', '12', '14'], answer: 'C', explanation: '144 ÷ 12 = 12 crates.' },
    { year: 'Sample', topic: 'Angles', q: 'An angle is 35° less than a right angle. Find the angle.', options: ['35°', '45°', '55°', '65°'], answer: 'C', explanation: 'A right angle is 90°. 90 − 35 = 55°.' },
    { year: 'Sample', topic: 'Scale Drawing', q: 'On a map, 1 cm represents 5 km. What distance is represented by 7 cm?', options: ['12 km', '25 km', '35 km', '50 km'], answer: 'C', explanation: '7 × 5 km = 35 km.' },
    { year: 'Sample', topic: 'Sequences', q: 'Find the next number: 4, 8, 12, 16, __.', options: ['18', '20', '22', '24'], answer: 'B', explanation: 'The sequence increases by 4 each time. 16 + 4 = 20.' },
    { year: 'Sample', topic: 'Volume', q: 'Find the volume of a cuboid of length 5 cm, width 4 cm and height 3 cm.', options: ['12 cm³', '20 cm³', '60 cm³', '120 cm³'], answer: 'C', explanation: 'Volume = length × width × height = 5 × 4 × 3 = 60 cm³.' }
  ]
}

let session = null
let syncQueued = false

function shuffle(list) { return [...list].sort(() => Math.random() - 0.5) }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function markingMode() { return localStorage.getItem('mezzo_bece_marking_mode') || 'cumulative' }
function setMarkingMode(mode) { localStorage.setItem('mezzo_bece_marking_mode', mode === 'instant' ? 'instant' : 'cumulative') }
function modeLabel(mode = markingMode()) { return mode === 'instant' ? 'Instant Answer' : 'Cumulative Total Score' }
function practiceYear() { return localStorage.getItem('mezzo_bece_practice_year') || 'All' }
function setPracticeYear(year) { localStorage.setItem('mezzo_bece_practice_year', year || 'All') }
function normaliseAdminQuestion(row = {}) {
  const options = row.options || [row.option_a, row.option_b, row.option_c, row.option_d]
  return { year: String(row.year || row.bece_year || 'Sample'), type: row.type || row.mode || 'pastStyle', topic: row.topic || 'General BECE', q: row.q || row.question || row.question_text || '', options: [options[0] || '', options[1] || '', options[2] || '', options[3] || ''], answer: String(row.answer || row.correct_answer || 'A').toUpperCase().slice(0, 1), explanation: row.explanation || '' }
}
function adminBank() { return readJson('mezzo_bece_admin_bank', []).map(normaliseAdminQuestion).filter(q => q.q && q.options.every(Boolean)) }
function availableYears() {
  const years = [...new Set(adminBank().map(q => q.year).filter(Boolean))].sort((a, b) => Number(b) - Number(a))
  return ['All', ...years]
}
function yearOptionsHtml(selected = practiceYear()) { return availableYears().map(y => `<option value="${escapeHtml(y)}" ${String(y) === String(selected) ? 'selected' : ''}>${y === 'All' ? 'All Uploaded Years + Samples' : escapeHtml(y)}</option>`).join('') }
function questionPool(type, year = practiceYear()) {
  const admin = adminBank().filter(q => q.type === type && (year === 'All' || String(q.year) === String(year)))
  if (admin.length) return admin
  return (beceSets[type] || beceSets.samples).map(q => ({ ...q, type }))
}
function installNavButton() {
  const nav = document.querySelector('.tab-scroll')
  if (!nav || nav.querySelector('[data-bece-page]')) return
  const btn = document.createElement('button')
  btn.className = 'screen-tab'
  btn.type = 'button'
  btn.dataset.becePage = 'true'
  btn.innerHTML = '<span>📘</span>BECE Practice'
  const leaderboard = nav.querySelector('[data-target="leaderboard"]')
  if (leaderboard) leaderboard.insertAdjacentElement('beforebegin', btn)
  else nav.appendChild(btn)
}
function markingModePanel() {
  const current = markingMode()
  const count = adminBank().length
  return `<section class="bece-marking-panel glass-card"><div><strong>BECE Settings</strong><small>Default marking: cumulative total score. Uploaded admin questions: ${count}.</small></div><label><span>Practice Year</span><select id="becePracticeYear">${yearOptionsHtml()}</select></label><label><span>Marking Mode</span><select id="beceMarkingMode"><option value="cumulative" ${current === 'cumulative' ? 'selected' : ''}>Cumulative Total Score</option><option value="instant" ${current === 'instant' ? 'selected' : ''}>Instant Answer</option></select></label></section>`
}
function beceHomeHtml() {
  const history = readJson('mezzo_bece_history', [])
  const best = history.reduce((max, h) => Math.max(max, h.score || 0), 0)
  return `<main class="app-shell"><section class="app-frame bece-page">
    <nav class="screen-tabs bece-nav"><div class="brand-chip"><span class="brand-crown">♛</span><div><strong>MEZZO</strong><small>Maths Battle Arena</small></div></div><div class="tab-scroll"><button class="screen-tab" data-target="home"><span>🏟️</span>Home</button><button class="screen-tab active" data-bece-page="true"><span>📘</span>BECE Practice</button><button class="screen-tab" data-target="solo"><span>🧠</span>Solo Practice</button><button class="screen-tab" data-target="auth"><span>🔐</span>Login / Sign Up</button></div></nav>
    <section class="bece-hero glass-card"><div><span class="bece-kicker">📘 BECE Mathematics Practice</span><h1>BECE Past Questions & Sample Practice</h1><p>Practise BECE-style mathematics questions by topic, year, score mode, explanations, revision guidance and downloadable AI reports.</p><div class="bece-actions"><button class="btn btn-gold" data-start-bece="pastStyle">Start Past-Style Practice</button><button class="btn btn-primary" data-start-bece="samples">Start Sample Questions</button></div></div><div class="bece-score-card"><span>🏆</span><strong>${best}</strong><small>Best BECE Score</small></div></section>
    ${markingModePanel()}
    <section class="bece-set-grid"><article class="bece-set-card glass-card"><span>📝</span><h2>BECE Past Questions Practice</h2><p>Practise uploaded BECE questions by selected year. If no upload exists for that year, sample past-style questions will load.</p><button class="btn btn-gold" data-start-bece="pastStyle">Practice Now</button></article><article class="bece-set-card glass-card"><span>✅</span><h2>Sample BECE Practice Questions</h2><p>Original sample BECE-style questions covering Number, Algebra, Geometry, Statistics, Percentages, Ratio and Word Problems.</p><button class="btn btn-primary" data-start-bece="samples">Try Samples</button></article><article class="bece-set-card glass-card"><span>📊</span><h2>Revision Tracker</h2><p>${history.length ? `You have completed ${history.length} BECE set(s). Latest score: ${history[0].score}/${history[0].total}.` : 'Complete a BECE set to start tracking your revision progress.'}</p><button class="btn btn-blue" data-bece-review="true">View Topics</button></article></section>
  </section></main>`
}
function renderBeceHome() { session = null; document.getElementById('root').innerHTML = beceHomeHtml() }
function startBece(type) {
  const year = practiceYear()
  const questions = shuffle(questionPool(type, year)).slice(0, 10)
  session = { type, year, questions, index: 0, score: 0, answers: [], markingMode: markingMode(), startedAt: new Date().toISOString() }
  renderQuestion()
}
function renderQuestion() {
  const q = session.questions[session.index]
  const correctText = q.options['ABCD'.indexOf(q.answer)] || ''
  const long = q.q.length > 70 ? 'true' : 'false'
  const veryLong = q.q.length > 115 ? 'true' : 'false'
  const scoreText = session.markingMode === 'instant' ? session.score : `${session.answers.length}/${session.questions.length}`
  const scoreLabel = session.markingMode === 'instant' ? 'Live Score' : 'Answered'
  document.getElementById('root').innerHTML = `<main class="app-shell"><section class="app-frame bece-page bece-live"><nav class="screen-tabs bece-nav"><div class="brand-chip"><span class="brand-crown">♛</span><div><strong>MEZZO</strong><small>BECE Practice</small></div></div><div class="tab-scroll"><button class="screen-tab" data-bece-page="true"><span>📘</span>BECE Menu</button><button class="screen-tab" data-target="home"><span>🏟️</span>Home</button><button class="screen-tab" data-bece-report-page="true"><span>📊</span>AI Report</button></div></nav><section class="bece-quiz-layout"><article class="bece-question-card light-card" data-correct-answer="${q.answer}" data-correct-text="${escapeHtml(correctText)}"><div class="bece-meta"><strong>BECE • ${escapeHtml(q.year || session.year)} • Q${session.index + 1}/${session.questions.length}</strong><span>${escapeHtml(q.topic)}</span><em>${modeLabel(session.markingMode)}</em></div><h2 data-long-question="${long}" data-very-long-question="${veryLong}">${escapeHtml(q.q)}</h2><div class="bece-options">${q.options.map((option, idx) => `<button data-bece-answer="${String.fromCharCode(65 + idx)}"><b>${String.fromCharCode(65 + idx)}</b><span>${escapeHtml(option)}</span></button>`).join('')}</div></article><aside class="bece-side glass-card"><div><span>🎯</span><strong>${scoreText}</strong><small>${scoreLabel}</small></div><div><span>📚</span><strong>${escapeHtml(q.topic)}</strong><small>Topic</small></div><div><span>🧾</span><strong>${escapeHtml(q.year || session.year)}</strong><small>Year</small></div></aside></section></section></main>`
}
function answerBece(letter) {
  if (!session) return
  const q = session.questions[session.index]
  const correct = letter === q.answer
  if (correct) session.score += 1
  session.answers.push({ topic: q.topic, correct, question: q.q, answer: letter, correctAnswer: q.answer, year: q.year || session.year })
  document.querySelectorAll('[data-bece-answer]').forEach(btn => {
    const picked = btn.dataset.beceAnswer === letter
    const right = btn.dataset.beceAnswer === q.answer
    if (session.markingMode === 'instant' && right) btn.classList.add('bece-correct')
    if (session.markingMode === 'instant' && picked && !correct) btn.classList.add('bece-wrong')
    if (session.markingMode === 'cumulative' && picked) btn.classList.add('bece-selected')
    btn.disabled = true
  })
  const isLast = session.index + 1 >= session.questions.length
  const feedback = session.markingMode === 'instant'
    ? `<div class="bece-feedback ${correct ? 'correct' : 'wrong'}"><strong>${correct ? 'Correct!' : 'Not correct'}</strong><p>${escapeHtml(q.explanation)}</p><button class="btn ${correct ? 'btn-gold' : 'btn-primary'}" data-next-bece="true">${isLast ? 'See Results' : 'Next Question'} ▶</button></div>`
    : `<div class="bece-feedback cumulative"><strong>Answer recorded</strong><p>Your total score will be calculated at the end of the BECE practice set.</p><button class="btn btn-gold" data-next-bece="true">${isLast ? 'See Total Score' : 'Next Question'} ▶</button></div>`
  document.querySelector('.bece-question-card')?.insertAdjacentHTML('beforeend', feedback)
}
function nextBece() {
  if (!session) return
  session.index += 1
  if (session.index >= session.questions.length) renderResults()
  else renderQuestion()
}
function renderResults() {
  const weak = session.answers.filter(a => !a.correct).map(a => a.topic)
  const history = readJson('mezzo_bece_history', [])
  const record = { type: session.type, year: session.year, mode: session.markingMode, score: session.score, total: session.questions.length, date: new Date().toISOString(), weakTopics: weak }
  saveJson('mezzo_bece_history', [record, ...history].slice(0, 50))
  document.getElementById('root').innerHTML = `<main class="app-shell"><section class="app-frame bece-page"><section class="bece-result light-card"><div class="bece-result-icon">${session.score >= 8 ? '🏆' : session.score >= 5 ? '🎓' : '📚'}</div><h1>BECE Practice Complete</h1><p>You scored <b>${session.score}/${session.questions.length}</b> using <b>${modeLabel(session.markingMode)}</b>.</p><div class="bece-ai-note"><strong>Revision Advice:</strong> ${weak.length ? `Revise these topics next: ${[...new Set(weak)].map(escapeHtml).join(', ')}.` : 'Excellent work. Try the next set or increase speed.'}</div><div class="bece-actions"><button class="btn btn-gold" data-bece-report-page="true">View AI Report</button><button class="btn btn-primary" data-start-bece="${session.type}">Retry This Mode</button><button class="btn btn-blue" data-bece-page="true">BECE Menu</button><button class="btn btn-ghost" data-target="home">Home</button></div></section></section></main>`
}
function renderTopicReview() {
  const topics = [...new Set([...beceSets.samples, ...beceSets.pastStyle, ...adminBank()].map(q => q.topic))]
  document.getElementById('root').innerHTML = `<main class="app-shell"><section class="app-frame bece-page"><section class="bece-topic-review glass-card"><span class="bece-kicker">📚 BECE Topic Checklist</span><h1>Topics Included</h1><div class="bece-topic-grid">${topics.map(topic => `<div><span>✅</span><strong>${escapeHtml(topic)}</strong><small>Practise sample, uploaded and past-style questions.</small></div>`).join('')}</div><button class="btn btn-gold" data-bece-page="true">Back to BECE Menu</button></section></section></main>`
}
function sync() { if (syncQueued) return; syncQueued = true; requestAnimationFrame(() => { syncQueued = false; installNavButton() }) }

document.addEventListener('click', event => {
  if (event.target.closest('[data-bece-page]')) { event.preventDefault(); event.stopImmediatePropagation(); renderBeceHome(); return }
  const start = event.target.closest('[data-start-bece]')
  if (start) { event.preventDefault(); startBece(start.dataset.startBece); return }
  const answer = event.target.closest('[data-bece-answer]')
  if (answer) { event.preventDefault(); answerBece(answer.dataset.beceAnswer); return }
  if (event.target.closest('[data-next-bece]')) { event.preventDefault(); nextBece(); return }
  if (event.target.closest('[data-bece-review]')) { event.preventDefault(); renderTopicReview(); return }
}, true)

document.addEventListener('change', event => {
  if (event.target?.id === 'beceMarkingMode') setMarkingMode(event.target.value)
  if (event.target?.id === 'becePracticeYear') setPracticeYear(event.target.value)
})

window.addEventListener('beceAdminBankUpdated', () => { if (document.querySelector('.bece-page:not(.bece-live)')) renderBeceHome() })
const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, attributes: false })
window.addEventListener('load', sync)
setTimeout(sync, 350)
