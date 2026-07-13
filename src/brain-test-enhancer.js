import './brain-test.css'

const RESULT_KEY = 'mezzo_brain_test_results'
const ACCESS_KEY = 'mezzo_staff_access'
let queued = false
let session = { active: false, index: 0, score: 0, answers: [], showStimulus: true, startedAt: null }
let hideTimer = null

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function profile() { return readJson('mezzo_profile', {}) || {} }
function isStaff() { return profile().role === 'mezzo_staff' }
function staffAccess() { return { brain: true, ...readJson(ACCESS_KEY, {}) } }
function canOpenBrain() { return !isStaff() || staffAccess().brain !== false }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
function toast(message) { const old = document.querySelector('.brain-toast'); if (old) old.remove(); const node = document.createElement('div'); node.className = 'brain-toast'; node.textContent = message; document.body.appendChild(node); setTimeout(() => node.remove(), 4200) }
function logoHtml() { const logo = localStorage.getItem('mezzo_custom_logo'); return logo ? `<img src="${logo}" alt="Mezzo logo">` : '♛' }
function svgCard(body, viewBox = '0 0 360 220') { return `<svg class="brain-svg" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" role="img">${body}</svg>` }
function gridSvg(items = []) {
  const cells = Array.from({ length: 9 }, (_, i) => {
    const x = 30 + (i % 3) * 90
    const y = 25 + Math.floor(i / 3) * 60
    const item = items.find(a => a.i === i)
    return `<rect x="${x}" y="${y}" width="70" height="44" rx="12" fill="${item?.fill || '#e0f2fe'}" stroke="#0f172a" stroke-width="3"/><text x="${x + 35}" y="${y + 29}" text-anchor="middle" font-size="22" font-weight="900" fill="#0f172a">${item?.text || ''}</text>`
  }).join('')
  return svgCard(`<rect width="360" height="220" rx="24" fill="#f8fafc"/>${cells}`)
}
function shapeSvg(kind = 'mixed') {
  if (kind === 'house') return svgCard(`<rect width="360" height="220" rx="24" fill="#e0f2fe"/><polygon points="90,115 180,42 270,115" fill="#f59e0b" stroke="#0f172a" stroke-width="5"/><rect x="110" y="115" width="140" height="78" rx="12" fill="#22c55e" stroke="#0f172a" stroke-width="5"/><circle cx="150" cy="145" r="16" fill="#ef4444"/><rect x="190" y="145" width="34" height="48" rx="8" fill="#1d4ed8"/>`)
  if (kind === 'faces') return svgCard(`<rect width="360" height="220" rx="24" fill="#fef3c7"/><circle cx="90" cy="100" r="44" fill="#fde68a" stroke="#0f172a" stroke-width="4"/><circle cx="78" cy="92" r="5"/><circle cx="103" cy="92" r="5"/><path d="M72 112 Q90 130 111 112" stroke="#0f172a" stroke-width="5" fill="none"/><circle cx="180" cy="100" r="44" fill="#bfdbfe" stroke="#0f172a" stroke-width="4"/><circle cx="168" cy="92" r="5"/><circle cx="193" cy="92" r="5"/><path d="M165 116 Q180 104 199 116" stroke="#0f172a" stroke-width="5" fill="none"/><circle cx="270" cy="100" r="44" fill="#bbf7d0" stroke="#0f172a" stroke-width="4"/><circle cx="258" cy="92" r="5"/><circle cx="283" cy="92" r="5"/><path d="M252 112 Q270 130 291 112" stroke="#0f172a" stroke-width="5" fill="none"/>`)
  return svgCard(`<rect width="360" height="220" rx="24" fill="#f8fafc"/><circle cx="85" cy="80" r="38" fill="#ef4444"/><rect x="150" y="42" width="70" height="70" rx="14" fill="#1d4ed8"/><polygon points="282,40 330,118 235,118" fill="#22c55e"/><circle cx="150" cy="164" r="28" fill="#f59e0b"/><rect x="220" y="144" width="76" height="42" rx="21" fill="#7c3aed"/>`)
}
function clockSvg() { return svgCard(`<rect width="360" height="220" rx="24" fill="#ecfeff"/><circle cx="180" cy="110" r="78" fill="#fff" stroke="#0f172a" stroke-width="6"/><text x="180" y="52" text-anchor="middle" font-size="20" font-weight="900">12</text><text x="245" y="116" text-anchor="middle" font-size="20" font-weight="900">3</text><text x="180" y="181" text-anchor="middle" font-size="20" font-weight="900">6</text><text x="115" y="116" text-anchor="middle" font-size="20" font-weight="900">9</text><line x1="180" y1="110" x2="180" y2="68" stroke="#0f172a" stroke-width="7" stroke-linecap="round"/><line x1="180" y1="110" x2="218" y2="110" stroke="#ef4444" stroke-width="7" stroke-linecap="round"/><circle cx="180" cy="110" r="7" fill="#0f172a"/>`)}

const TESTS = [
  { id: 1, skill: 'Photographic Memory', type: 'choice', reveal: 6500, image: gridSvg([{ i:0,text:'7',fill:'#fde68a'},{i:3,text:'B',fill:'#bfdbfe'},{i:5,text:'★',fill:'#bbf7d0'},{i:8,text:'4',fill:'#fecaca'}]), prompt: 'Which item was in the bottom-right box?', options: ['B', '4', '7', 'Star'], answer: '4', explanation: 'The bottom-right cell contained 4.' },
  { id: 2, skill: 'Pattern Recall', type: 'choice', reveal: 6000, image: shapeSvg('mixed'), prompt: 'What colour was the triangle?', options: ['Red', 'Blue', 'Green', 'Purple'], answer: 'Green', explanation: 'The triangle was green.' },
  { id: 3, skill: 'Working Memory', type: 'input', reveal: 5000, stimulus: 'Remember this sequence: 8 - 2 - 9 - 4', prompt: 'Type the sequence in the same order, without spaces.', answer: '8294', explanation: 'The correct sequence is 8294.' },
  { id: 4, skill: 'Attention Control', type: 'choice', prompt: 'Select the word that is different: MATH, MATH, MATH, MATHS, MATH', options: ['1st', '2nd', '3rd', '4th'], answer: '4th', explanation: 'The 4th word is MATHS, not MATH.' },
  { id: 5, skill: 'Logic Speed', type: 'choice', prompt: 'What comes next? 2, 4, 8, 16, ?', options: ['18', '24', '32', '64'], answer: '32', explanation: 'The numbers double each time.' },
  { id: 6, skill: 'Photographic Memory', type: 'choice', reveal: 6500, image: shapeSvg('house'), prompt: 'What colour was the roof?', options: ['Green', 'Orange', 'Blue', 'Red'], answer: 'Orange', explanation: 'The roof was orange.' },
  { id: 7, skill: 'Mental Flexibility', type: 'choice', prompt: 'If RED is written in blue ink, what should you choose if asked for the ink colour?', options: ['Red', 'Blue', 'Green', 'Yellow'], answer: 'Blue', explanation: 'Ink colour is blue, not the word meaning.' },
  { id: 8, skill: 'Number Memory', type: 'input', reveal: 6000, stimulus: 'Remember: 14, 21, 28, 35', prompt: 'What was the third number?', answer: '28', explanation: 'The third number was 28.' },
  { id: 9, skill: 'Visual Count', type: 'choice', reveal: 7000, image: svgCard(`<rect width="360" height="220" rx="24" fill="#f8fafc"/><circle cx="62" cy="70" r="18" fill="#ef4444"/><circle cx="118" cy="62" r="18" fill="#ef4444"/><circle cx="178" cy="80" r="18" fill="#ef4444"/><rect x="232" y="50" width="36" height="36" rx="8" fill="#1d4ed8"/><circle cx="285" cy="150" r="18" fill="#ef4444"/><rect x="92" y="135" width="36" height="36" rx="8" fill="#1d4ed8"/>`), prompt: 'How many red circles were shown?', options: ['3', '4', '5', '6'], answer: '4', explanation: 'There were four red circles.' },
  { id: 10, skill: 'Reasoning', type: 'choice', prompt: 'Book is to reading as spoon is to _____.', options: ['Writing', 'Eating', 'Running', 'Sleeping'], answer: 'Eating', explanation: 'A spoon is used for eating.' },
  { id: 11, skill: 'Photographic Memory', type: 'choice', reveal: 6000, image: clockSvg(), prompt: 'What time did the clock show?', options: ['12:15', '3:00', '12:30', '6:15'], answer: '12:15', explanation: 'The minute hand pointed to 3 and hour hand to 12.' },
  { id: 12, skill: 'Sequence Training', type: 'choice', prompt: 'A, C, F, J, O, ?', options: ['S', 'T', 'U', 'V'], answer: 'U', explanation: 'The gaps are +2, +3, +4, +5, so next is +6: U.' },
  { id: 13, skill: 'Short-Term Memory', type: 'input', reveal: 7000, stimulus: 'Remember these words: Mango, Drum, River, Star', prompt: 'Type the second word.', answer: 'Drum', explanation: 'The second word was Drum.' },
  { id: 14, skill: 'Focus', type: 'choice', prompt: 'How many letters are in the word PHOTOGRAPHIC?', options: ['10', '11', '12', '13'], answer: '12', explanation: 'PHOTOGRAPHIC has 12 letters.' },
  { id: 15, skill: 'Visual Memory', type: 'choice', reveal: 6500, image: gridSvg([{ i:1,text:'●',fill:'#fecaca'},{i:2,text:'9',fill:'#bfdbfe'},{i:4,text:'K',fill:'#bbf7d0'},{i:6,text:'▲',fill:'#fde68a'}]), prompt: 'Which symbol appeared in the top row?', options: ['Triangle', 'Circle', 'Square', 'Heart'], answer: 'Circle', explanation: 'A circle appeared in the top row.' },
  { id: 16, skill: 'Calculation Speed', type: 'choice', prompt: '15 + 7 - 4 = ?', options: ['16', '18', '20', '22'], answer: '18', explanation: '15 + 7 = 22, then 22 - 4 = 18.' },
  { id: 17, skill: 'Photographic Memory', type: 'choice', reveal: 6500, image: shapeSvg('faces'), prompt: 'Which face was sad?', options: ['Left', 'Middle', 'Right', 'None'], answer: 'Middle', explanation: 'The middle face had a sad mouth.' },
  { id: 18, skill: 'Auditory-Style Memory', type: 'input', reveal: 5500, stimulus: 'Say quietly in your mind: Lion - Market - Pencil', prompt: 'Type the last word.', answer: 'Pencil', explanation: 'The last word was Pencil.' },
  { id: 19, skill: 'Logic Pattern', type: 'choice', prompt: 'Find the odd one out: 9, 16, 25, 30, 36', options: ['9', '16', '30', '36'], answer: '30', explanation: 'The others are square numbers.' },
  { id: 20, skill: 'Spatial Thinking', type: 'choice', prompt: 'If you turn left twice from facing North, which direction do you face?', options: ['North', 'East', 'South', 'West'], answer: 'South', explanation: 'Left from North is West; left again is South.' },
  { id: 21, skill: 'Visual Association', type: 'choice', reveal: 6500, image: svgCard(`<rect width="360" height="220" rx="24" fill="#f0fdf4"/><text x="80" y="82" font-size="38">🍎</text><text x="80" y="145" font-size="38">🚗</text><text x="190" y="82" font-size="38">📘</text><text x="190" y="145" font-size="38">⚽</text>`), prompt: 'Which object was at the top-right?', options: ['Apple', 'Car', 'Book', 'Ball'], answer: 'Book', explanation: 'The book was at the top-right.' },
  { id: 22, skill: 'Reasoning', type: 'choice', prompt: 'All squares are rectangles. This shape is a square. Therefore it is a _____.', options: ['Circle', 'Triangle', 'Rectangle', 'Line'], answer: 'Rectangle', explanation: 'A square is also a rectangle.' },
  { id: 23, skill: 'Memory Span', type: 'input', reveal: 6500, stimulus: 'Remember: 6 - 1 - 8 - 3 - 5', prompt: 'Type the numbers backwards.', answer: '53816', explanation: 'Backwards gives 5 3 8 1 6.' },
  { id: 24, skill: 'Attention', type: 'choice', prompt: 'Which number appears twice? 12, 18, 21, 14, 18, 24', options: ['12', '14', '18', '24'], answer: '18', explanation: '18 appears twice.' },
  { id: 25, skill: 'Image Memory', type: 'choice', reveal: 6000, image: svgCard(`<rect width="360" height="220" rx="24" fill="#eef2ff"/><rect x="45" y="45" width="55" height="55" rx="12" fill="#ef4444"/><rect x="120" y="45" width="55" height="55" rx="12" fill="#22c55e"/><rect x="195" y="45" width="55" height="55" rx="12" fill="#1d4ed8"/><rect x="270" y="45" width="55" height="55" rx="12" fill="#f59e0b"/><text x="72" y="145" font-size="24" text-anchor="middle" font-weight="900">A</text><text x="147" y="145" font-size="24" text-anchor="middle" font-weight="900">B</text><text x="222" y="145" font-size="24" text-anchor="middle" font-weight="900">C</text><text x="297" y="145" font-size="24" text-anchor="middle" font-weight="900">D</text>`), prompt: 'Which letter was below the blue square?', options: ['A', 'B', 'C', 'D'], answer: 'C', explanation: 'The blue square was above C.' },
  { id: 26, skill: 'Word Logic', type: 'choice', prompt: 'Which word does not belong? Accra, Kumasi, Tamale, Banana', options: ['Accra', 'Kumasi', 'Tamale', 'Banana'], answer: 'Banana', explanation: 'The first three are places; Banana is a fruit.' },
  { id: 27, skill: 'Processing Speed', type: 'choice', prompt: 'Choose the result quickly: 9 × 3 + 1', options: ['27', '28', '30', '31'], answer: '28', explanation: '9 × 3 = 27, plus 1 = 28.' },
  { id: 28, skill: 'Memory Detail', type: 'choice', reveal: 6500, image: gridSvg([{ i:0,text:'G',fill:'#bbf7d0'},{i:2,text:'1',fill:'#fde68a'},{i:4,text:'Z',fill:'#fecaca'},{i:7,text:'8',fill:'#bfdbfe'}]), prompt: 'What was in the centre box?', options: ['G', 'Z', '1', '8'], answer: 'Z', explanation: 'The centre box contained Z.' },
  { id: 29, skill: 'Pattern Prediction', type: 'choice', prompt: '3, 6, 11, 18, 27, ?', options: ['36', '38', '40', '42'], answer: '38', explanation: 'The differences are +3, +5, +7, +9, then +11.' },
  { id: 30, skill: 'Visual Focus', type: 'choice', reveal: 6000, image: svgCard(`<rect width="360" height="220" rx="24" fill="#fff7ed"/><text x="180" y="64" text-anchor="middle" font-size="32" font-weight="900">SUN</text><text x="180" y="112" text-anchor="middle" font-size="32" font-weight="900">MOON</text><text x="180" y="160" text-anchor="middle" font-size="32" font-weight="900">STAR</text><circle cx="88" cy="152" r="18" fill="#f59e0b"/><circle cx="272" cy="58" r="18" fill="#1d4ed8"/>`), prompt: 'Which word was at the bottom?', options: ['SUN', 'MOON', 'STAR', 'None'], answer: 'STAR', explanation: 'STAR was at the bottom.' }
]

function installBrainNav() {
  document.querySelectorAll('.tab-scroll').forEach(nav => {
    if (nav.querySelector('[data-brain-test-page]')) return
    const button = document.createElement('button')
    button.className = 'screen-tab brain-nav-button'
    button.type = 'button'
    button.dataset.brainTestPage = 'true'
    button.innerHTML = '<span>🧠</span>Brain Test'
    const courses = nav.querySelector('[data-courses-page]')
    const auth = nav.querySelector('[data-target="auth"]')
    if (courses) courses.insertAdjacentElement('beforebegin', button)
    else if (auth) auth.insertAdjacentElement('beforebegin', button)
    else nav.appendChild(button)
  })
}
function installBrainHomeCard() {
  const grid = document.querySelector('.home-screen .home-mode-grid')
  if (!grid || grid.querySelector('.brain-home-card')) return
  grid.insertAdjacentHTML('beforeend', `<button class="home-mode-card game-mode-card brain-home-card" data-brain-test-page="true"><i class="mode-shine"></i><div class="mode-top"><span class="mode-icon">🧠</span><em>Starter</em></div><h3>Brain Test</h3><p>Sharpen focus, memory, IQ-style reasoning and photographic memory with interactive starter tests.</p><div class="reward-pill">30 sample brain drills</div><strong>START BRAIN TRAINING →</strong></button>`)
}
function bestScore() { return Math.max(0, ...readJson(RESULT_KEY, []).map(r => Number(r.percent || 0))) }
function renderBrainHome() {
  if (!canOpenBrain()) return toast('Brain Test is locked for Mezzo Staff. Ask admin to allow access.')
  const results = readJson(RESULT_KEY, [])
  const last = results[0]
  document.getElementById('root').innerHTML = `<main class="app-shell brain-app"><section class="app-frame brain-page"><nav class="screen-tabs brain-nav"><div class="brand-chip"><span class="brand-crown">${logoHtml()}</span><div><strong>MEZZO</strong><small>Brain Test</small></div></div><div class="tab-scroll"><button class="screen-tab" data-target="home"><span>🏟️</span>Home</button><button class="screen-tab active" data-brain-test-page="true"><span>🧠</span>Brain Test</button><button class="screen-tab" data-target="dashboard"><span>👤</span>Dashboard</button></div></nav><section class="brain-hero glass-card"><div><span class="brain-kicker">🧠 Starter Brain Training</span><h1>Sharper Brain. Stronger Memory.</h1><p>Students take interactive starter tests that train focus, working memory, visual recall, photographic memory, reasoning and quick thinking.</p><div class="brain-actions"><button class="btn btn-gold" data-start-brain="true">Start 30-Sample Test</button><button class="btn btn-blue" data-start-brain="short">Quick 10 Drill</button></div></div><div class="brain-stat"><strong>${bestScore()}%</strong><span>Best Brain Score</span><small>${last ? `Last: ${last.score}/${last.total}` : 'No test taken yet'}</small></div></section><section class="brain-skill-grid"><article><b>👁️</b><h3>Photographic Memory</h3><p>Look, hide, recall images and positions.</p></article><article><b>⚡</b><h3>Fast Reasoning</h3><p>Patterns, logic and speed decisions.</p></article><article><b>🎯</b><h3>Focus Control</h3><p>Train attention and avoid distractions.</p></article><article><b>🔢</b><h3>Working Memory</h3><p>Hold numbers, words and sequences mentally.</p></article></section></section></main>`
}
function startBrain(short = false) {
  session = { active: true, index: 0, score: 0, answers: [], showStimulus: true, startedAt: Date.now(), total: short ? 10 : TESTS.length }
  renderQuestion()
}
function currentTest() { return TESTS[session.index % TESTS.length] }
function renderQuestion() {
  clearTimeout(hideTimer)
  const q = currentTest()
  const total = session.total || TESTS.length
  const showStimulus = (q.image || q.stimulus) && session.showStimulus
  document.getElementById('root').innerHTML = `<main class="app-shell brain-app"><section class="app-frame brain-page"><nav class="screen-tabs brain-nav"><div class="brand-chip"><span class="brand-crown">${logoHtml()}</span><div><strong>MEZZO</strong><small>Brain Drill</small></div></div><div class="tab-scroll"><button class="screen-tab" data-brain-test-page="true"><span>🧠</span>Brain Test</button><button class="screen-tab" data-target="home"><span>🏟️</span>Home</button></div></nav><section class="brain-question-layout"><article class="brain-question-card light-card"><div class="brain-progress"><span>Question ${session.index + 1} of ${total}</span><b>${escapeHtml(q.skill)}</b></div>${showStimulus ? stimulusHtml(q) : answerHtml(q)}</article><aside class="brain-side glass-card"><h2>Brain Score</h2><strong>${session.score}</strong><p>Correct answers so far</p><div class="brain-mini-meter"><i style="width:${Math.round((session.index / total) * 100)}%"></i></div><small>Tip: For memory questions, look carefully before the image disappears.</small></aside></section></section></main>`
  if (showStimulus && q.reveal) hideTimer = setTimeout(() => { session.showStimulus = false; renderQuestion() }, q.reveal)
}
function stimulusHtml(q) {
  return `<div class="brain-stimulus-wrap"><span class="brain-kicker">Memorise this</span><h1>Look carefully</h1><p>This will hide automatically. Try to remember every detail before answering.</p><div class="brain-stimulus">${q.image || `<div class="memory-code">${escapeHtml(q.stimulus)}</div>`}</div><button class="btn btn-gold" data-brain-ready="true">I have memorised it</button></div>`
}
function answerHtml(q) {
  if (q.type === 'input') return `<span class="brain-kicker">Answer from memory</span><h1>${escapeHtml(q.prompt)}</h1><form id="brainAnswerForm" class="brain-input-answer"><input name="answer" autocomplete="off" placeholder="Type your answer"><button class="btn btn-gold">Submit Answer</button></form>`
  return `<span class="brain-kicker">Choose the correct answer</span><h1>${escapeHtml(q.prompt)}</h1><div class="brain-options">${q.options.map(option => `<button data-brain-answer="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join('')}</div>`
}
function normalise(value) { return String(value || '').trim().toLowerCase().replace(/\s+/g, '') }
function submitAnswer(value) {
  const q = currentTest()
  const correct = normalise(value) === normalise(q.answer)
  if (correct) session.score += 1
  session.answers.push({ id: q.id, skill: q.skill, prompt: q.prompt, selected: value, answer: q.answer, correct })
  document.querySelector('.brain-question-card')?.insertAdjacentHTML('beforeend', `<div class="brain-feedback ${correct ? 'correct' : 'wrong'}"><h2>${correct ? 'Correct! 🧠' : 'Not quite'}</h2><p>${escapeHtml(q.explanation)}</p><button class="btn btn-primary" data-next-brain="true">${session.index + 1 >= session.total ? 'See Brain Report' : 'Next Drill'}</button></div>`)
}
function nextQuestion() {
  session.index += 1
  if (session.index >= session.total) return finishBrain()
  session.showStimulus = true
  renderQuestion()
}
function finishBrain() {
  const total = session.total || TESTS.length
  const percent = Math.round((session.score / total) * 100)
  const bySkill = session.answers.reduce((acc, answer) => {
    acc[answer.skill] ||= { total: 0, correct: 0 }
    acc[answer.skill].total += 1
    if (answer.correct) acc[answer.skill].correct += 1
    return acc
  }, {})
  const result = { id: Date.now(), score: session.score, total, percent, date: new Date().toISOString(), answers: session.answers }
  saveJson(RESULT_KEY, [result, ...readJson(RESULT_KEY, [])].slice(0, 30))
  const advice = percent >= 80 ? 'Excellent brain sharpness. Move to harder drills next.' : percent >= 55 ? 'Good start. Repeat the memory and pattern drills to improve speed.' : 'Starter level is okay. Practise daily for 10 minutes to build focus and recall.'
  document.getElementById('root').innerHTML = `<main class="app-shell brain-app"><section class="app-frame brain-page"><nav class="screen-tabs brain-nav"><div class="brand-chip"><span class="brand-crown">${logoHtml()}</span><div><strong>MEZZO</strong><small>Brain Report</small></div></div><div class="tab-scroll"><button class="screen-tab" data-brain-test-page="true"><span>🧠</span>Brain Test</button><button class="screen-tab" data-target="home"><span>🏟️</span>Home</button></div></nav><section class="brain-result-card glass-card"><span class="brain-kicker">Brain Test Complete</span><h1>${percent}%</h1><p>You scored ${session.score} out of ${total}. ${advice}</p><div class="brain-result-grid">${Object.entries(bySkill).map(([skill, data]) => `<article><strong>${Math.round((data.correct / data.total) * 100)}%</strong><span>${escapeHtml(skill)}</span><small>${data.correct}/${data.total} correct</small></article>`).join('')}</div><div class="brain-actions"><button class="btn btn-gold" data-start-brain="true">Retake Full Test</button><button class="btn btn-blue" data-start-brain="short">Try Quick Drill</button></div></section></section></main>`
}
function sync() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; installBrainNav(); installBrainHomeCard() })
}

document.addEventListener('submit', event => {
  if (event.target?.id === 'brainAnswerForm') {
    event.preventDefault()
    const value = new FormData(event.target).get('answer')
    submitAnswer(value)
  }
}, true)

document.addEventListener('click', event => {
  if (event.target.closest('[data-brain-test-page]')) { event.preventDefault(); event.stopImmediatePropagation(); renderBrainHome(); return }
  const start = event.target.closest('[data-start-brain]')
  if (start) { event.preventDefault(); startBrain(start.dataset.startBrain === 'short'); return }
  if (event.target.closest('[data-brain-ready]')) { event.preventDefault(); session.showStimulus = false; renderQuestion(); return }
  const answer = event.target.closest('[data-brain-answer]')
  if (answer) { event.preventDefault(); submitAnswer(answer.dataset.brainAnswer); return }
  if (event.target.closest('[data-next-brain]')) { event.preventDefault(); nextQuestion(); return }
}, true)

const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false })
window.addEventListener('load', sync)
window.addEventListener('storage', sync)
setTimeout(sync, 350)
