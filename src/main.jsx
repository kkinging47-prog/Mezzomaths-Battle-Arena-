import './index.css'
import './upgrade.css'
import { supabase } from './supabaseClient.js'

const levels = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','JHS 1','JHS 2','JHS 3','SHS 1','SHS 2','SHS 3']
const curricula = ['GES', 'Cambridge', 'Pearson Edexcel']
const topicsByLevel = {
  'Grade 1': ['Counting & Number Sense', 'Basic Addition', 'Basic Subtraction', 'Shapes & Patterns', 'Time & Money'],
  'Grade 2': ['Place Value', 'Addition & Subtraction', 'Multiplication Foundations', 'Measurement', 'Patterns'],
  'Grade 3': ['Multiplication Strategies', 'Division Techniques', 'Fractions Introduction', 'Graphs & Charts', 'Logical Reasoning'],
  'Grade 4': ['Fractions & Decimals', 'Geometry Basics', 'Data Handling', 'Number Puzzles', 'Speed Maths'],
  'Grade 5': ['Number Operations', 'Fractions, Decimals & Percentages', 'Geometry', 'Statistics', 'Aptitude & Mental Reasoning'],
  'Grade 6': ['Pre-Algebra', 'Ratio & Proportion', 'Angles, Area & Volume', 'Statistics', 'Mezzopedia Prep'],
  'JHS 1': ['Integers & Number Systems', 'Algebraic Expressions', 'Geometry', 'Data Handling', 'Problem Solving'],
  'JHS 2': ['Linear Equations', 'Ratios & Percentages', 'Pythagoras & Geometry', 'Probability & Statistics', 'Speed Maths'],
  'JHS 3': ['BECE Exam Practice', 'Algebra', 'Geometry', 'Statistics', 'Aptitude & Mental Reasoning'],
  'SHS 1': ['Surds & Indices', 'Sets & Logic', 'Linear & Quadratic Equations', 'Coordinate Geometry', 'Statistics'],
  'SHS 2': ['Functions & Graphs', 'Trigonometry', 'Sequences & Series', 'Probability', 'Vectors & Mensuration'],
  'SHS 3': ['WASSCE Practice', 'Advanced Algebra', 'Calculus Foundations', 'Statistics', 'Vectors & Trigonometry']
}

const sampleQuestions = [
  { class_level: 'JHS 2', curriculum: 'GES', topic: 'Linear Equations', difficulty: 1, question: 'Solve: 3x + 7 = 22', options: ['x = 3','x = 4','x = 5','x = 6'], answer: 'C', explanation: 'Subtract 7 from both sides to get 3x = 15, then divide by 3.' },
  { class_level: 'JHS 2', curriculum: 'GES', topic: 'Ratios & Percentages', difficulty: 1, question: 'Find 25% of 240.', options: ['40','50','60','70'], answer: 'C', explanation: '25% is one quarter. 240 divided by 4 equals 60.' },
  { class_level: 'JHS 3', curriculum: 'GES', topic: 'Algebra', difficulty: 2, question: 'Factorise: x² - 5x + 6', options: ['(x - 2)(x - 3)','(x + 2)(x - 3)','(x - 1)(x - 6)','(x + 2)(x + 3)'], answer: 'A', explanation: 'The two numbers that multiply to 6 and add to -5 are -2 and -3.' },
  { class_level: 'SHS 1', curriculum: 'GES', topic: 'Linear & Quadratic Equations', difficulty: 3, question: 'Solve: 2x² + 5x - 3 = 0', options: ['x = 1, -3/2','x = -1, 3/2','x = 1/2, -3','x = -1/2, 3'], answer: 'C', explanation: 'Using the quadratic formula gives x = 1/2 or x = -3.' },
  { class_level: 'Grade 6', curriculum: 'GES', topic: 'Ratio & Proportion', difficulty: 1, question: 'A ratio is 2:3. If the total is 50, what is the larger share?', options: ['20','25','30','35'], answer: 'C', explanation: 'There are 5 total parts. 50 divided by 5 is 10. Larger share is 3 × 10 = 30.' }
]

const state = {
  view: 'dashboard',
  message: '',
  user: JSON.parse(localStorage.getItem('mezzo_profile') || 'null'),
  solo: { classLevel: 'JHS 2', curriculum: 'GES', topic: 'Linear Equations', time: '10 minutes', level: 1, questions: [], index: 0, score: 0, selected: '', finished: false }
}

const tabs = [
  ['dashboard','Dashboard','🏠'], ['signup','Sign Up','📝'], ['login','Login','🔐'], ['solo','Solo Practice','🧠'],
  ['gamezone','Game Zone','🗺️'], ['admin','Admin','🛠️'], ['leaderboard','Leaderboard','🏆'], ['settings','Settings','⚙️']
]

const opt = (list, selected) => list.map(item => `<option value="${item}" ${item === selected ? 'selected' : ''}>${item}</option>`).join('')
const ageFromDob = (dob) => {
  if (!dob) return ''
  const today = new Date(); const born = new Date(dob)
  let age = today.getFullYear() - born.getFullYear()
  const m = today.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--
  return Number.isFinite(age) ? age : ''
}
const difficultyFor = (level) => level % 10 === 0 ? ['Power Level', '5× points', 'gold'] : level % 5 === 0 ? ['Boss Level', '3× points', 'orange'] : [`Difficulty ${Math.ceil(level / 5)}`, `${Math.max(1, Math.ceil(level / 5))}× points`, 'blue']

function render() {
  const active = tabs.find(([id]) => id === state.view)
  document.getElementById('root').innerHTML = `
    <main class="app-shell">
      <div class="orb orb-one"></div><div class="orb orb-two"></div><div class="orb orb-three"></div>
      <section class="app-frame">
        <nav class="screen-tabs" aria-label="Main navigation">
          <div class="brand-chip"><span class="brand-crown">♛</span><div><strong>MEZZO</strong><small>Maths Battle Arena</small></div></div>
          <div class="tab-scroll">${tabs.map(([id,label,icon]) => `<button type="button" class="screen-tab ${state.view === id ? 'active' : ''}" data-target="${id}"><span>${icon}</span>${label}</button>`).join('')}</div>
        </nav>
        <div class="active-title"><span>${active?.[2] || '🏠'}</span><p>${active?.[1] || 'Dashboard'}</p></div>
        ${state.message ? `<div class="status-banner glass-card">${state.message}</div>` : ''}
        ${viewHtml()}
      </section>
    </main>`
}

function viewHtml() {
  if (state.view === 'signup') return signupHtml()
  if (state.view === 'login') return loginHtml()
  if (state.view === 'solo') return soloHtml()
  if (state.view === 'gamezone') return gamezoneHtml()
  if (state.view === 'admin') return adminHtml()
  if (state.view === 'leaderboard') return leaderboardHtml()
  if (state.view === 'settings') return settingsHtml()
  return dashboardHtml()
}

function dashboardHtml() {
  const name = state.user?.full_name || 'Student Champion'
  return `<section class="screen dashboard-screen">
    <section class="dashboard-hero glass-card">
      <div><div class="pill">🎮 Dashboard Home</div><h1>Welcome back, ${name}</h1><p>Practice, battle, complete daily challenges, and climb the Mezzopedia leaderboard.</p><div class="cta-row"><button class="btn btn-gold" data-target="solo">▶ Start Solo Practice</button><button class="btn btn-primary" data-target="gamezone">🗺️ Open Game Zone</button><button class="btn btn-blue" data-target="signup">👤 Create Account</button></div></div>
      <div class="dashboard-profile-card"><div class="avatar avatar-large glow">👦🏽</div><h3>${name}</h3><p>${state.user?.class_level || 'JHS 2'} • ${state.user?.school_name || 'Meridian Public School'}</p><div class="progress-track gradient"><i style="width:76%"></i></div><small>Lv. 23 • 7,650 XP • 12-day streak</small></div>
    </section>
    <section class="stats-grid"><article class="mini-stat glass-card"><span>🪙</span><strong>12,450</strong><small>Coins</small></article><article class="mini-stat glass-card"><span>🔥</span><strong>12</strong><small>Streak</small></article><article class="mini-stat glass-card"><span>🎯</span><strong>87%</strong><small>Accuracy</small></article><article class="mini-stat glass-card"><span>🏆</span><strong>#89</strong><small>National Rank</small></article></section>
    <section class="dashboard-grid"><article class="mission-card glass-card"><span>📅</span><h3>Daily Challenge</h3><p>15 random questions from the database.</p><strong>+250 XP + 50 coins</strong><small>Ends in 08:45:12</small></article><article class="mission-card glass-card"><span>🧠</span><h3>Solo Practice</h3><p>100-level system, 13/15 pass mark, difficulty rises every 5 levels.</p><strong>Current Level: ${state.solo.level}</strong><small>Power levels give very high points.</small></article><article class="mission-card glass-card"><span>🛠️</span><h3>Admin Bank</h3><p>Save questions per class, curriculum and topic.</p><strong>Generate 10, 20, 30, 40, 50</strong><small>Supabase schema included.</small></article></section>
  </section>`
}

function signupHtml() {
  return `<section class="screen auth-screen"><form class="auth-card glass-card" id="signupForm"><div class="section-heading compact-heading"><span>Create account</span><h2>Student / Admin Sign Up</h2></div><div class="form-grid"><label class="field-group"><span>Full Name</span><input name="full_name" required></label><label class="field-group"><span>Email</span><input name="email" type="email" required></label><label class="field-group"><span>Password</span><input name="password" type="password" required></label><label class="field-group"><span>Date of Birth</span><input id="dobInput" name="date_of_birth" type="date" required></label><label class="field-group"><span>Age</span><input id="ageOutput" name="age" readonly placeholder="Auto calculated"></label><label class="field-group"><span>Name of School</span><input name="school_name" required></label><label class="field-group"><span>Location</span><input name="location" required></label><label class="field-group"><span>Class or Year</span><select name="class_level">${opt(levels, 'JHS 2')}</select></label><label class="field-group"><span>Curriculum Type</span><select name="curriculum">${opt(curricula, 'GES')}</select></label><label class="field-group"><span>Account Type</span><select name="role"><option value="student">Student</option><option value="admin">Admin</option></select></label></div><button class="btn btn-gold auth-submit" type="submit">Create Account</button><p class="auth-note">With Supabase keys, this creates the auth user and profile. Without keys, it stores a local demo profile.</p></form></section>`
}

function loginHtml() {
  return `<section class="screen auth-screen"><form class="auth-card glass-card" id="loginForm"><div class="section-heading compact-heading"><span>Secure login</span><h2>Login as Student or Admin</h2></div><label class="field-group"><span>Email</span><input name="email" type="email" required></label><label class="field-group"><span>Password</span><input name="password" type="password" required></label><label class="field-group"><span>Login Type</span><select name="role"><option value="student">Student</option><option value="admin">Admin</option></select></label><button class="btn btn-primary auth-submit" type="submit">Login</button><p class="auth-note">Admins can manage questions, daily challenges and settings.</p></form></section>`
}

function soloHtml() {
  const solo = state.solo; const [difficulty, multiplier, tone] = difficultyFor(Number(solo.level)); const current = solo.questions[solo.index]; const progress = solo.questions.length ? Math.round(((solo.index + 1) / 15) * 100) : 0
  return `<section class="screen solo-screen"><section class="solo-setup glass-card"><div><div class="pill">🧠 Solo Practice</div><h1>100-Level Solo Practice System</h1><p>Select class, topic, timed practice and level. Score 13/15 or higher to move forward.</p></div><div class="solo-level-card"><span class="badge badge-${tone}">${difficulty}</span><strong>Level ${solo.level} / 100</strong><small>${multiplier} • Difficulty rises every 5 levels</small></div></section><section class="solo-builder glass-card"><label class="field-group"><span>Select Class</span><select id="soloClass">${opt(levels, solo.classLevel)}</select></label><label class="field-group"><span>Select Curriculum</span><select id="soloCurriculum">${opt(curricula, solo.curriculum)}</select></label><label class="field-group"><span>Select Topic</span><select id="soloTopic">${opt(topicsByLevel[solo.classLevel] || [], solo.topic)}</select></label><label class="field-group"><span>Timed Practice</span><select id="soloTime">${opt(['5 minutes','10 minutes','15 minutes','20 minutes','30 minutes'], solo.time)}</select></label><label class="field-group"><span>Level</span><input id="soloLevel" type="number" min="1" max="100" value="${solo.level}"></label><button class="btn btn-gold" id="startSolo">Start 15-Question Set</button></section><section class="quiz-top glass-card"><div class="quiz-progress-wrap"><span>${solo.questions.length ? `Question ${solo.index + 1} / 15` : 'No active set'} • Pass mark 13/15</span><div class="progress-track gradient"><i style="width:${progress}%"></i></div></div><div class="timer danger">⏱ ${solo.time}</div><div class="timer">Score: ${solo.score}/15</div></section>${solo.finished ? soloResultHtml() : current ? soloQuestionHtml(current) : `<section class="empty-practice light-card"><h2>Ready to begin?</h2><p>Questions are selected randomly from the question bank. When Supabase is connected, they come from your database.</p></section>`}</section>`
}

function soloQuestionHtml(q) {
  return `<section class="quiz-layout"><article class="question-card light-card"><div class="question-meta"><span>${q.class_level} • ${q.curriculum}</span><span class="difficulty">${q.topic}</span></div><h2>${q.question}</h2><div class="answer-grid">${q.options.map((option, index) => { const key = ['A','B','C','D'][index]; const cls = state.solo.selected === key ? (key === q.answer ? 'correct' : 'wrong') : ''; return `<button type="button" class="answer-card ${cls}" data-answer="${key}"><span>${key}</span><strong>${option}</strong></button>` }).join('')}</div></article><aside class="score-panel glass-card"><div class="panel-metric"><span>✅</span><small>Pass</small><strong>13/15</strong></div><div class="panel-metric"><span>🔥</span><small>Power</small><strong>10,20,30...</strong></div><div class="panel-metric"><span>🎯</span><small>Score</small><strong>${state.solo.score}</strong></div></aside></section>${state.solo.selected ? `<section class="explanation-card light-card"><div class="result-banner"><strong>${state.solo.selected === q.answer ? 'Correct! 🎉' : 'Not correct yet'}</strong><div><span>Answer: ${q.answer}</span></div></div><p>${q.explanation}</p><div class="quiz-actions"><button class="btn btn-primary" id="nextSolo">Next Question ▶</button></div></section>` : ''}`
}

function soloResultHtml() { const passed = state.solo.score >= 13; return `<section class="result-card light-card"><h2>${passed ? 'Level Passed! 🏆' : 'Revision Needed 📘'}</h2><p>You scored ${state.solo.score}/15. ${passed ? `You unlocked Level ${Math.min(Number(state.solo.level) + 1, 100)}.` : 'Score 13/15 or higher to unlock the next level.'}</p><div class="cta-row"><button class="btn btn-gold" id="${passed ? 'advanceSolo' : 'retrySolo'}">${passed ? 'Move to Next Level' : 'Repeat Level'}</button><button class="btn btn-primary" data-target="dashboard">Back to Dashboard</button></div></section>` }

function gamezoneHtml() {
  return `<section class="screen gamezone-screen"><section class="session-hero glass-card"><div><div class="pill">🗺️ Game Zone Session</div><h1>Trophy map per class level</h1><p>Each class level has 100 levels. Each level uses 15 random questions. Score above 12 to progress toward the Ultimate Trophy.</p><div class="cta-row"><button class="btn btn-gold" data-target="solo">Start Solo Level</button><button class="btn btn-primary" data-target="leaderboard">View Leaderboard</button></div></div><div class="session-summary-grid"><article class="session-card"><span>🧩</span><strong>15</strong><small>Questions</small></article><article class="session-card"><span>✅</span><strong>13/15</strong><small>Pass mark</small></article><article class="session-card"><span>⚡</span><strong>Every 5</strong><small>Difficulty increase</small></article><article class="session-card"><span>🔥</span><strong>Power</strong><small>Every 10 levels</small></article></div></section><section class="map-card glass-card"><div class="section-row setup-heading"><h3>100-Level Progression Preview</h3><span>Ultimate Trophy at Level 100</span></div><div class="level-road">${Array.from({length: 20}).map((_, i) => `<span class="${i < 4 ? 'done' : i === 4 ? 'active' : ''}">${(i + 1) * 5}</span>`).join('')}</div></section></section>`
}

function adminHtml() {
  return `<section class="screen admin-screen"><section class="dashboard-hero glass-card"><div><div class="pill">🛠️ Admin Dashboard</div><h1>Question Bank & Challenge Control</h1><p>Save questions by class level, curriculum, topic and difficulty. Generate random practice sets of 10, 20, 30, 40 or 50 questions.</p></div><div class="session-summary-grid"><article class="session-card"><span>📚</span><strong>Bank</strong><small>Supabase</small></article><article class="session-card"><span>🎲</span><strong>Random</strong><small>Per user</small></article><article class="session-card"><span>📅</span><strong>Daily</strong><small>Challenge</small></article><article class="session-card"><span>🏆</span><strong>Progress</strong><small>Leaderboard</small></article></div></section><form class="admin-form glass-card" id="adminQuestionForm"><label class="field-group"><span>Class</span><select name="class_level">${opt(levels, 'JHS 2')}</select></label><label class="field-group"><span>Curriculum</span><select name="curriculum">${opt(curricula, 'GES')}</select></label><label class="field-group"><span>Topic</span><input name="topic" required placeholder="Algebra"></label><label class="field-group"><span>Difficulty</span><select name="difficulty">${opt(['1','2','3','4','5'], '1')}</select></label><label class="field-group wide"><span>Question</span><textarea name="question" required></textarea></label><label class="field-group"><span>Option A</span><input name="option_a" required></label><label class="field-group"><span>Option B</span><input name="option_b" required></label><label class="field-group"><span>Option C</span><input name="option_c" required></label><label class="field-group"><span>Option D</span><input name="option_d" required></label><label class="field-group"><span>Correct</span><select name="answer">${opt(['A','B','C','D'], 'A')}</select></label><label class="field-group"><span>Generate Set</span><select name="set_size">${opt(['10','20','30','40','50'], '10')}</select></label><label class="field-group wide"><span>Explanation</span><textarea name="explanation"></textarea></label><button class="btn btn-gold wide" type="submit">Save Question</button></form></section>`
}

function leaderboardHtml() { return `<section class="screen leaderboard-screen"><section class="leader-tabs glass-card"><button>School</button><button>Region</button><button class="active">National</button><button>Weekly Tournament</button></section><section class="podium-grid"><article class="podium-card rank-2"><span class="medal">🥈</span><div class="avatar avatar-medium">👦🏽</div><h3>Arjun Sharma</h3><p>Meridian Public School</p><strong>11,250 XP</strong></article><article class="podium-card rank-1"><span class="medal">🥇</span><div class="avatar avatar-medium">👧🏽</div><h3>Riya Patel</h3><p>Bright Future School</p><strong>12,950 XP</strong></article><article class="podium-card rank-3"><span class="medal">🥉</span><div class="avatar avatar-medium">👦🏾</div><h3>Vivaan Mensah</h3><p>Sunrise School</p><strong>10,480 XP</strong></article></section></section>` }
function settingsHtml() { return `<section class="screen settings-screen"><section class="settings-grid"><article class="system-panel light-card"><h2>Profile Settings</h2><p>Update name, school, location, class level, curriculum and avatar.</p></article><article class="system-panel light-card"><h2>Game Settings</h2><p>Default timer, sound effects, animations, battle difficulty, reminders and leaderboard visibility.</p></article><article class="system-panel light-card"><h2>Question Generation</h2><p>Admin can generate sets of 10, 20, 30, 40 and 50 questions by class, curriculum, topic and difficulty.</p></article><article class="system-panel light-card"><h2>Solo Rules</h2><div class="rules-demo-grid"><div><strong>Levels</strong><span>1 to 100</span></div><div><strong>Pass Mark</strong><span>13/15</span></div><div><strong>Difficulty</strong><span>Every 5 levels</span></div><div><strong>Power</strong><span>Every 10 levels</span></div></div></article></section></section>` }

async function startSolo() {
  const classLevel = document.getElementById('soloClass').value, curriculum = document.getElementById('soloCurriculum').value, topic = document.getElementById('soloTopic').value, time = document.getElementById('soloTime').value, level = Math.max(1, Math.min(100, Number(document.getElementById('soloLevel').value || 1)))
  let questions = []
  if (supabase) {
    const { data } = await supabase.from('question_bank').select('*').eq('class_level', classLevel).eq('curriculum', curriculum).eq('topic', topic).limit(50)
    if (data?.length) questions = data.map(q => ({ class_level: q.class_level, curriculum: q.curriculum, topic: q.topic, difficulty: q.difficulty, question: q.question_text, options: [q.option_a, q.option_b, q.option_c, q.option_d], answer: q.correct_answer, explanation: q.explanation || 'Review the method and try again.' }))
  }
  if (!questions.length) questions = sampleQuestions.filter(q => q.class_level === classLevel && q.curriculum === curriculum && q.topic === topic)
  if (!questions.length) questions = sampleQuestions
  const set = [...questions].sort(() => Math.random() - 0.5)
  while (set.length < 15) set.push(...questions)
  state.solo = { classLevel, curriculum, topic, time, level, questions: set.slice(0, 15), index: 0, score: 0, selected: '', finished: false }
  render()
}

async function saveQuestion(form) {
  const f = Object.fromEntries(new FormData(form).entries())
  const payload = { class_level: f.class_level, curriculum: f.curriculum, topic: f.topic, difficulty: Number(f.difficulty), question_text: f.question, option_a: f.option_a, option_b: f.option_b, option_c: f.option_c, option_d: f.option_d, correct_answer: f.answer, explanation: f.explanation }
  if (supabase) {
    const { error } = await supabase.from('question_bank').insert(payload)
    state.message = error ? error.message : 'Question saved to Supabase question bank.'
  } else {
    const local = JSON.parse(localStorage.getItem('mezzo_question_bank') || '[]'); local.push(payload); localStorage.setItem('mezzo_question_bank', JSON.stringify(local)); state.message = 'Question saved locally. Add Supabase keys to save to database.'
  }
  render()
}

async function signup(form) {
  const profile = Object.fromEntries(new FormData(form).entries()); profile.age = ageFromDob(profile.date_of_birth); localStorage.setItem('mezzo_profile', JSON.stringify(profile)); state.user = profile
  if (supabase) { const { data, error } = await supabase.auth.signUp({ email: profile.email, password: profile.password }); if (!error && data.user) { const { password, ...clean } = profile; await supabase.from('profiles').upsert({ id: data.user.id, ...clean }) } state.message = error ? error.message : 'Account created. Check email if confirmation is enabled.' } else state.message = 'Demo account created locally. Add Supabase keys for live authentication.'
  state.view = 'dashboard'; render()
}
async function login(form) { const f = Object.fromEntries(new FormData(form).entries()); if (supabase) { const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password }); state.message = error ? error.message : 'Logged in successfully.' } else state.message = 'Demo login successful. Add Supabase keys for live authentication.'; state.view = 'dashboard'; render() }

document.addEventListener('click', async (e) => {
  const target = e.target.closest('[data-target]'); if (target) { state.view = target.dataset.target; state.message = ''; render(); return }
  if (e.target.closest('#startSolo')) { await startSolo(); return }
  const ans = e.target.closest('[data-answer]'); if (ans && !state.solo.selected) { const q = state.solo.questions[state.solo.index]; state.solo.selected = ans.dataset.answer; if (state.solo.selected === q.answer) state.solo.score += 1; render(); return }
  if (e.target.closest('#nextSolo')) { if (state.solo.index >= 14) state.solo.finished = true; else { state.solo.index += 1; state.solo.selected = '' } render(); return }
  if (e.target.closest('#advanceSolo')) { state.solo.level = Math.min(Number(state.solo.level) + 1, 100); state.solo.questions = []; state.solo.index = 0; state.solo.score = 0; state.solo.selected = ''; state.solo.finished = false; render(); return }
  if (e.target.closest('#retrySolo')) { state.solo.questions = []; state.solo.index = 0; state.solo.score = 0; state.solo.selected = ''; state.solo.finished = false; render() }
})

document.addEventListener('change', (e) => { if (e.target.id === 'dobInput') document.getElementById('ageOutput').value = ageFromDob(e.target.value); if (e.target.id === 'soloClass') { state.solo.classLevel = e.target.value; state.solo.topic = (topicsByLevel[e.target.value] || [])[0] || ''; render() } })
document.addEventListener('submit', async (e) => { e.preventDefault(); if (e.target.id === 'signupForm') await signup(e.target); if (e.target.id === 'loginForm') await login(e.target); if (e.target.id === 'adminQuestionForm') await saveQuestion(e.target) })

render()
