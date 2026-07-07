import './index.css'
import './upgrade.css'
import { supabase } from './supabaseClient.js'

const levels = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','JHS 1','JHS 2','JHS 3','SHS 1','SHS 2','SHS 3']
const curricula = ['GES', 'Cambridge', 'Pearson Edexcel']
const basicTopics = ['Addition', 'Subtraction', 'Multiplication', 'Division', 'Squaring', 'Squares']
const levelTopics = {
  'Grade 1': ['Counting & Number Sense', 'Shapes & Patterns', 'Time & Money'],
  'Grade 2': ['Place Value', 'Measurement', 'Patterns'],
  'Grade 3': ['Fractions Introduction', 'Graphs & Charts', 'Logical Reasoning'],
  'Grade 4': ['Fractions & Decimals', 'Geometry Basics', 'Data Handling'],
  'Grade 5': ['Number Operations', 'Percentages', 'Geometry', 'Statistics', 'Aptitude & Mental Reasoning'],
  'Grade 6': ['Pre-Algebra', 'Ratio & Proportion', 'Angles, Area & Volume', 'Statistics', 'Mezzopedia Prep'],
  'JHS 1': ['Integers & Number Systems', 'Algebraic Expressions', 'Geometry', 'Data Handling', 'Problem Solving'],
  'JHS 2': ['Linear Equations', 'Ratios & Percentages', 'Pythagoras & Geometry', 'Probability & Statistics', 'Speed Maths'],
  'JHS 3': ['BECE Exam Practice', 'Algebra', 'Geometry', 'Statistics', 'Aptitude & Mental Reasoning'],
  'SHS 1': ['Surds & Indices', 'Sets & Logic', 'Linear & Quadratic Equations', 'Coordinate Geometry', 'Statistics'],
  'SHS 2': ['Functions & Graphs', 'Trigonometry', 'Sequences & Series', 'Probability', 'Vectors & Mensuration'],
  'SHS 3': ['WASSCE Practice', 'Advanced Algebra', 'Calculus Foundations', 'Statistics', 'Vectors & Trigonometry']
}
const topicsByLevel = Object.fromEntries(levels.map(level => [level, [...basicTopics, ...(levelTopics[level] || [])]]))

const socialLinks = [
  ['WhatsApp Channel','💬','https://whatsapp.com/channel/0029VbBdLQT84OmIVySSaC1l'],
  ['Facebook','📘','https://www.facebook.com/share/1AGUVnsQ9E/'],
  ['TikTok','🎵','https://www.tiktok.com/@official.mezzomat?_r=1&_t=ZM-92cKEqZacVE'],
  ['YouTube','▶️','https://youtube.com/@mezzotv4955?feature=shared'],
  ['X','𝕏','https://x.com/mezzomaths'],
  ['Instagram','📸','https://www.instagram.com/invites/contact/?utm_source=ig_contact_invite&utm_medium=copy_link&utm_content=21dashj'],
  ['Telegram','✈️','https://t.me/mezzomaths']
]

const seedQuestions = [
  { class_level: 'JHS 2', curriculum: 'GES', topic: 'Linear Equations', difficulty: 1, question_text: 'Solve: 3x + 7 = 22', option_a: 'x = 3', option_b: 'x = 4', option_c: 'x = 5', option_d: 'x = 6', correct_answer: 'C', explanation: 'Subtract 7 from both sides to get 3x = 15, then divide by 3.' },
  { class_level: 'JHS 2', curriculum: 'GES', topic: 'Ratios & Percentages', difficulty: 1, question_text: 'Find 25% of 240.', option_a: '40', option_b: '50', option_c: '60', option_d: '70', correct_answer: 'C', explanation: '25% is one quarter. 240 divided by 4 equals 60.' },
  { class_level: 'JHS 3', curriculum: 'GES', topic: 'Algebra', difficulty: 2, question_text: 'Factorise: x² - 5x + 6', option_a: '(x - 2)(x - 3)', option_b: '(x + 2)(x - 3)', option_c: '(x - 1)(x - 6)', option_d: '(x + 2)(x + 3)', correct_answer: 'A', explanation: 'The two numbers that multiply to 6 and add to -5 are -2 and -3.' },
  { class_level: 'Grade 6', curriculum: 'GES', topic: 'Squares', difficulty: 1, question_text: 'What is 12²?', option_a: '124', option_b: '144', option_c: '132', option_d: '156', correct_answer: 'B', explanation: '12² means 12 × 12, which equals 144.' }
]

const stored = (key, fallback) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value))
const questionBank = () => stored('mezzo_question_bank', seedQuestions)
const setQuestionBank = (list) => save('mezzo_question_bank', list)

const state = {
  view: 'home',
  authMode: 'login',
  message: '',
  editingIndex: null,
  user: stored('mezzo_profile', null),
  solo: { classLevel: 'JHS 2', curriculum: 'GES', topic: 'Linear Equations', time: '10 minutes', level: 1, questions: [], index: 0, score: 0, selected: '', finished: false }
}

const tabs = [
  ['home','Home','🏟️'], ['dashboard','My Dashboard','👤'], ['auth','Login / Sign Up','🔐'], ['solo','Solo Practice','🧠'],
  ['battle','Battle Modes','⚔️'], ['admin','Admin Settings','🛠️'], ['leaderboard','Leaderboard','🏆'], ['settings','Settings','⚙️']
]

const optionHtml = (list, selected) => list.map(item => `<option value="${item}" ${item === selected ? 'selected' : ''}>${item}</option>`).join('')
const ageFromDob = (dob) => {
  if (!dob) return ''
  const today = new Date(); const born = new Date(dob)
  let age = today.getFullYear() - born.getFullYear()
  const m = today.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--
  return Number.isFinite(age) ? age : ''
}
const difficultyFor = (level) => level % 10 === 0 ? ['Power Level', '5× points', 'gold'] : level % 5 === 0 ? ['Boss Level', '3× points', 'orange'] : [`Difficulty ${Math.ceil(level / 5)}`, `${Math.max(1, Math.ceil(level / 5))}× points`, 'blue']
const escapeText = (value = '') => String(value).replace(/[&<>"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]))

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
        <div class="active-title"><span>${active?.[2] || '🏟️'}</span><p>${active?.[1] || 'Home'}</p></div>
        ${state.message ? `<div class="status-banner glass-card">${state.message}</div>` : ''}
        ${viewHtml()}
        ${socialFooterHtml()}
      </section>
    </main>`
}

function viewHtml() {
  if (state.view === 'dashboard') return dashboardHtml()
  if (state.view === 'auth') return authHtml()
  if (state.view === 'solo') return soloHtml()
  if (state.view === 'battle') return battleHtml()
  if (state.view === 'admin') return adminHtml()
  if (state.view === 'leaderboard') return leaderboardHtml()
  if (state.view === 'settings') return settingsHtml()
  return homeHtml()
}

function homeHtml() {
  const cards = [
    ['📅','Daily Practice','A fresh 15-question daily set to build consistency.','Start Daily Practice','solo','mode-purple'],
    ['⚔️','1 vs 1','Challenge another learner in a fast battle format.','Start 1 vs 1','battle','mode-red'],
    ['🤖','Compete with Bot','Play against MathBot when no one is online.','Battle Bot','battle','mode-cyan'],
    ['🌍','Compete Online','Match with an online participant for live contest practice.','Find Opponent','battle','mode-blue'],
    ['🧠','Solo Practice','Choose class, topic, time and progress through 100 levels.','Start Solo','solo','mode-green']
  ]
  return `<section class="screen home-screen"><section class="dashboard-hero glass-card"><div><div class="pill">🏟️ Mezzo Maths Battle Arena</div><h1>Choose Your Maths Game Mode</h1><p>Practice daily, fight 1 vs 1, compete with a bot or online participant, and master maths through solo level progression.</p><div class="cta-row"><button class="btn btn-gold" data-target="solo">▶ Start Practice</button><button class="btn btn-primary" data-target="auth">🔐 Login / Sign Up</button><button class="btn btn-blue" data-target="dashboard">👤 My Dashboard</button></div></div><div class="hero-visual glass-card mini-hero"><div class="arena-ring"><div class="student student-left">👦🏽</div><div class="trophy-tower">🏆</div><div class="student student-right">🤖</div></div></div></section><section class="home-mode-grid">${cards.map(([icon,title,desc,cta,target,cls]) => `<button class="home-mode-card ${cls}" data-target="${target}"><span>${icon}</span><h3>${title}</h3><p>${desc}</p><strong>${cta} →</strong></button>`).join('')}</section></section>`
}

function authHtml() {
  return `<section class="screen auth-screen"><section class="auth-card glass-card"><div class="auth-switch"><button class="${state.authMode === 'login' ? 'active' : ''}" data-auth-mode="login">Login</button><button class="${state.authMode === 'signup' ? 'active' : ''}" data-auth-mode="signup">Sign Up</button></div>${state.authMode === 'login' ? loginFormHtml() : signupFormHtml()}</section></section>`
}
function loginFormHtml() {
  return `<form id="loginForm"><div class="section-heading compact-heading"><span>Secure access</span><h2>Login as Student or Admin</h2></div><label class="field-group"><span>Email</span><input name="email" type="email" required></label><label class="field-group"><span>Password</span><input name="password" type="password" required></label><label class="field-group"><span>Login Type</span><select name="role"><option value="student">Student</option><option value="admin">Admin</option></select></label><button class="btn btn-primary auth-submit" type="submit">Login</button></form>`
}
function signupFormHtml() {
  return `<form id="signupForm"><div class="section-heading compact-heading"><span>Create account</span><h2>Student / Admin Sign Up</h2></div><div class="form-grid"><label class="field-group"><span>Full Name</span><input name="full_name" required></label><label class="field-group"><span>Email</span><input name="email" type="email" required></label><label class="field-group"><span>Password</span><input name="password" type="password" required></label><label class="field-group"><span>Date of Birth</span><input id="dobInput" name="date_of_birth" type="date" required></label><label class="field-group"><span>Age</span><input id="ageOutput" name="age" readonly placeholder="Auto calculated"></label><label class="field-group"><span>Name of School</span><input name="school_name" required></label><label class="field-group"><span>Location</span><input name="location" required></label><label class="field-group"><span>Class or Year</span><select name="class_level">${optionHtml(levels, 'JHS 2')}</select></label><label class="field-group"><span>Curriculum Type</span><select name="curriculum">${optionHtml(curricula, 'GES')}</select></label><label class="field-group"><span>Account Type</span><select name="role"><option value="student">Student</option><option value="admin">Admin</option></select></label></div><button class="btn btn-gold auth-submit" type="submit">Create Account</button><p class="auth-note">Age is calculated automatically from date of birth.</p></form>`
}

function dashboardHtml() {
  const name = state.user?.full_name || 'Student Champion'
  return `<section class="screen dashboard-screen"><section class="dashboard-hero glass-card"><div><div class="pill">👤 Personal Dashboard</div><h1>${name}</h1><p><strong>AI Summary:</strong> You are building strong consistency. Your best area is Speed Maths, your next improvement area is Geometry, and keeping your streak will increase your rank faster.</p><div class="cta-row"><button class="btn btn-gold" data-target="solo">Continue Level ${state.solo.level}</button><button class="btn btn-primary" data-target="leaderboard">View Ranking</button></div></div><div class="dashboard-profile-card"><div class="avatar avatar-large glow">👦🏽</div><h3>${name}</h3><p>${state.user?.class_level || 'JHS 2'} • ${state.user?.school_name || 'Meridian Public School'}</p><div class="progress-track gradient"><i style="width:76%"></i></div><small>Lv. 23 • 7,650 XP • 12-day streak</small></div></section><section class="stats-grid"><article class="mini-stat glass-card"><span>⭐</span><strong>7,650</strong><small>Total Points</small></article><article class="mini-stat glass-card"><span>🔥</span><strong>12</strong><small>Streak</small></article><article class="mini-stat glass-card"><span>🎯</span><strong>87%</strong><small>Accuracy</small></article><article class="mini-stat glass-card"><span>🏆</span><strong>#89</strong><small>National Rank</small></article></section><section class="dashboard-grid"><article class="mission-card glass-card"><span>📘</span><h3>Attempted Topics</h3><p>Addition, Multiplication, Linear Equations, Statistics, Speed Maths.</p><strong>24 topic attempts</strong><small>5 mastered topics</small></article><article class="mission-card glass-card"><span>🧠</span><h3>Levels Progress</h3><p>100-level pathway with difficulty increase every 5 levels.</p><strong>Level ${state.solo.level} / 100</strong><small>Next power level: ${Math.ceil(Number(state.solo.level) / 10) * 10}</small></article><article class="mission-card glass-card"><span>📊</span><h3>Progress Report</h3><p>You answer fastest in arithmetic and need more practice in multi-step word problems.</p><strong>Recommended: Geometry + Algebra</strong><small>Practice 15 minutes daily</small></article></section></section>`
}

function soloHtml() {
  const solo = state.solo; const [difficulty, multiplier, tone] = difficultyFor(Number(solo.level)); const current = solo.questions[solo.index]; const progress = solo.questions.length ? Math.round(((solo.index + 1) / 15) * 100) : 0
  return `<section class="screen solo-screen"><section class="solo-setup glass-card"><div><div class="pill">🧠 Solo Practice</div><h1>100-Level Solo Practice System</h1><p>Select class, topic, timed practice and level. Score 13/15 or higher to move forward.</p></div><div class="solo-level-card"><span class="badge badge-${tone}">${difficulty}</span><strong>Level ${solo.level} / 100</strong><small>${multiplier} • difficulty rises every 5 levels</small></div></section><section class="solo-builder glass-card"><label class="field-group"><span>Select Class</span><select id="soloClass">${optionHtml(levels, solo.classLevel)}</select></label><label class="field-group"><span>Select Curriculum</span><select id="soloCurriculum">${optionHtml(curricula, solo.curriculum)}</select></label><label class="field-group"><span>Select Topic</span><select id="soloTopic">${optionHtml(topicsByLevel[solo.classLevel] || [], solo.topic)}</select></label><label class="field-group"><span>Timed Practice</span><select id="soloTime">${optionHtml(['5 minutes','10 minutes','15 minutes','20 minutes','30 minutes'], solo.time)}</select></label><label class="field-group"><span>Level</span><input id="soloLevel" type="number" min="1" max="100" value="${solo.level}"></label><button class="btn btn-gold" id="startSolo">Start 15 Questions</button></section><section class="quiz-top glass-card"><div class="quiz-progress-wrap"><span>${solo.questions.length ? `Question ${solo.index + 1} / 15` : 'No active set'} • Pass mark 13/15</span><div class="progress-track gradient"><i style="width:${progress}%"></i></div></div><div class="timer danger">⏱ ${solo.time}</div><div class="timer">Score: ${solo.score}/15</div></section>${solo.finished ? soloResultHtml() : current ? soloQuestionHtml(current) : `<section class="empty-practice light-card"><h2>Ready to begin?</h2><p>Questions are randomly selected from the database question bank. Basic topics such as Addition, Subtraction, Multiplication, Division, Squaring and Squares are available for every level.</p></section>`}</section>`
}
function soloQuestionHtml(q) {
  const opts = ['A','B','C','D'].map(key => ({ key, text: q[`option_${key.toLowerCase()}`], img: q[`option_${key.toLowerCase()}_image_url`] }))
  return `<section class="quiz-layout"><article class="question-card light-card"><div class="question-meta"><span>${q.class_level} • ${q.curriculum}</span><span class="difficulty">${q.topic}</span></div>${q.question_image_url ? `<img class="question-image" src="${q.question_image_url}" alt="Question visual">` : ''}<h2>${escapeText(q.question_text)}</h2><div class="answer-grid">${opts.map(({key,text,img}) => { const cls = state.solo.selected === key ? (key === q.correct_answer ? 'correct' : 'wrong') : ''; return `<button type="button" class="answer-card ${cls}" data-answer="${key}"><span>${key}</span>${img ? `<img src="${img}" alt="Option ${key}">` : ''}<strong>${escapeText(text)}</strong></button>` }).join('')}</div></article><aside class="score-panel glass-card"><div class="panel-metric"><span>✅</span><small>Pass</small><strong>13/15</strong></div><div class="panel-metric"><span>🔥</span><small>Power</small><strong>Every 10</strong></div><div class="panel-metric"><span>🎯</span><small>Score</small><strong>${state.solo.score}</strong></div></aside></section>${state.solo.selected ? `<section class="explanation-card light-card"><div class="result-banner"><strong>${state.solo.selected === q.correct_answer ? 'Correct! 🎉' : 'Not correct yet'}</strong><div><span>Answer: ${q.correct_answer}</span></div></div><p>${escapeText(q.explanation || 'Review the method and try again.')}</p><div class="quiz-actions"><button class="btn btn-primary" id="nextSolo">Next Question ▶</button></div></section>` : ''}`
}
function soloResultHtml() { const passed = state.solo.score >= 13; return `<section class="result-card light-card"><h2>${passed ? 'Level Passed! 🏆' : 'Revision Needed 📘'}</h2><p>You scored ${state.solo.score}/15. ${passed ? `You unlocked Level ${Math.min(Number(state.solo.level) + 1, 100)}.` : 'Score 13/15 or higher to unlock the next level.'}</p><div class="cta-row"><button class="btn btn-gold" id="${passed ? 'advanceSolo' : 'retrySolo'}">${passed ? 'Move to Next Level' : 'Repeat Level'}</button><button class="btn btn-primary" data-target="dashboard">Back to Dashboard</button></div></section>` }

function battleHtml() { return `<section class="screen home-screen"><section class="home-mode-grid"><button class="home-mode-card mode-red"><span>⚔️</span><h3>1 vs 1</h3><p>Challenge a classmate in a live split contest.</p><strong>Coming online-ready</strong></button><button class="home-mode-card mode-cyan"><span>🤖</span><h3>Compete With Bot</h3><p>Battle MathBot with speed and streak bonuses.</p><strong>Start Bot Battle</strong></button><button class="home-mode-card mode-blue"><span>🌍</span><h3>Online Participant</h3><p>Match against another active learner.</p><strong>Find Opponent</strong></button></section></section>` }

function adminHtml() {
  const list = questionBank(); const editing = Number.isInteger(state.editingIndex) ? list[state.editingIndex] : null
  return `<section class="screen admin-screen"><section class="dashboard-hero glass-card"><div><div class="pill">🛠️ Admin Settings</div><h1>AI Question Generator & Bank Manager</h1><p>Generate questions by number, class level, curriculum and topic. Edit/delete questions, insert maths symbols, and use images as questions or options.</p></div><div class="session-summary-grid"><article class="session-card"><span>🤖</span><strong>AI</strong><small>Generate 10-50</small></article><article class="session-card"><span>✍️</span><strong>Edit</strong><small>Question bank</small></article><article class="session-card"><span>🖼️</span><strong>Images</strong><small>Question/options</small></article><article class="session-card"><span>∑</span><strong>Symbols</strong><small>Math input</small></article></div></section><form class="admin-form glass-card" id="aiGenerateForm"><label class="field-group"><span>Number to Generate</span><select name="count">${optionHtml(['10','20','30','40','50'], '10')}</select></label><label class="field-group"><span>Class Level</span><select name="class_level" id="adminLevel">${optionHtml(levels, 'JHS 2')}</select></label><label class="field-group"><span>Curriculum</span><select name="curriculum">${optionHtml(curricula, 'GES')}</select></label><label class="field-group"><span>Topic</span><select name="topic" id="adminTopic">${optionHtml(topicsByLevel['JHS 2'], 'Linear Equations')}</select></label><label class="field-group"><span>Difficulty</span><select name="difficulty">${optionHtml(['1','2','3','4','5','6','7','8','9','10'], '1')}</select></label><button class="btn btn-gold" type="submit">🤖 Generate Questions</button></form><form class="admin-form glass-card" id="adminQuestionForm"><input type="hidden" name="editing_index" value="${Number.isInteger(state.editingIndex) ? state.editingIndex : ''}"><label class="field-group"><span>Class</span><select name="class_level">${optionHtml(levels, editing?.class_level || 'JHS 2')}</select></label><label class="field-group"><span>Curriculum</span><select name="curriculum">${optionHtml(curricula, editing?.curriculum || 'GES')}</select></label><label class="field-group"><span>Topic</span><input name="topic" value="${escapeText(editing?.topic || '')}" required placeholder="Algebra"></label><label class="field-group"><span>Difficulty</span><select name="difficulty">${optionHtml(['1','2','3','4','5','6','7','8','9','10'], String(editing?.difficulty || 1))}</select></label><div class="symbol-toolbar wide">${['²','³','√','π','÷','×','≤','≥','≠','±','∑','∞','θ','∆','/','(',')'].map(s => `<button type="button" class="math-symbol" data-symbol="${s}">${s}</button>`).join('')}</div><label class="field-group wide"><span>Question Text</span><textarea name="question_text" class="symbol-target" required>${escapeText(editing?.question_text || '')}</textarea></label><label class="field-group wide"><span>Question Image URL</span><input name="question_image_url" value="${escapeText(editing?.question_image_url || '')}" placeholder="https://..."></label>${['a','b','c','d'].map(letter => `<label class="field-group"><span>Option ${letter.toUpperCase()}</span><input name="option_${letter}" value="${escapeText(editing?.[`option_${letter}`] || '')}" required></label><label class="field-group"><span>Option ${letter.toUpperCase()} Image URL</span><input name="option_${letter}_image_url" value="${escapeText(editing?.[`option_${letter}_image_url`] || '')}" placeholder="optional image URL"></label>`).join('')}<label class="field-group"><span>Correct Answer</span><select name="correct_answer">${optionHtml(['A','B','C','D'], editing?.correct_answer || 'A')}</select></label><label class="field-group wide"><span>Explanation</span><textarea name="explanation">${escapeText(editing?.explanation || '')}</textarea></label><button class="btn btn-primary wide" type="submit">${editing ? 'Update Question' : 'Save Question'}</button></form><section class="question-manager glass-card"><div class="section-row"><h3>Question Bank</h3><span>${list.length} questions</span></div><div class="question-list">${list.map((q,i) => `<article class="bank-row"><div><strong>${escapeText(q.question_text)}</strong><small>${q.class_level} • ${q.curriculum} • ${q.topic} • Answer ${q.correct_answer}</small></div><div><button class="btn btn-blue btn-small" data-edit-question="${i}">Edit</button><button class="btn btn-danger btn-small" data-delete-question="${i}">Delete</button></div></article>`).join('')}</div></section></section>`
}

function leaderboardHtml() { return `<section class="screen leaderboard-screen"><section class="leader-tabs glass-card"><button>School</button><button>Region</button><button class="active">National</button><button>Weekly Tournament</button></section><section class="podium-grid"><article class="podium-card rank-2"><span class="medal">🥈</span><div class="avatar avatar-medium">👦🏽</div><h3>Arjun Sharma</h3><p>Meridian Public School</p><strong>11,250 XP</strong></article><article class="podium-card rank-1"><span class="medal">🥇</span><div class="avatar avatar-medium">👧🏽</div><h3>Riya Patel</h3><p>Bright Future School</p><strong>12,950 XP</strong></article><article class="podium-card rank-3"><span class="medal">🥉</span><div class="avatar avatar-medium">👦🏾</div><h3>Vivaan Mensah</h3><p>Sunrise School</p><strong>10,480 XP</strong></article></section></section>` }
function settingsHtml() { return `<section class="screen settings-screen"><section class="settings-grid"><article class="system-panel light-card"><h2>Profile Settings</h2><p>Update name, school, location, class level, curriculum and avatar.</p></article><article class="system-panel light-card"><h2>Game Settings</h2><p>Default timer, sound effects, animations, battle difficulty, reminders and leaderboard visibility.</p></article><article class="system-panel light-card"><h2>Admin AI Settings</h2><p>Question counts: 10, 20, 30, 40, 50. Control topic, class level, curriculum, difficulty, image use and symbols.</p></article><article class="system-panel light-card"><h2>Solo Rules</h2><div class="rules-demo-grid"><div><strong>Levels</strong><span>1 to 100</span></div><div><strong>Pass Mark</strong><span>13/15</span></div><div><strong>Difficulty</strong><span>Every 5 levels</span></div><div><strong>Power</strong><span>Every 10 levels</span></div></div></article></section></section>` }
function socialFooterHtml() { return `<footer class="social-footer glass-card"><div><strong>Follow and join Mezzo Maths</strong><p>Mezzo Maths is where Mathematics becomes simple, engaging, and meaningful — from foundations to mastery.</p></div><div class="social-links">${socialLinks.map(([name,icon,url]) => `<a href="${url}" target="_blank" rel="noreferrer"><span>${icon}</span>${name}</a>`).join('')}</div></footer>` }

function makeGeneratedQuestions({ count, class_level, curriculum, topic, difficulty }) {
  const templates = [
    n => ({ question_text: `Calculate ${n} + ${n + 7}.`, option_a: String(n + 6), option_b: String(n + 7), option_c: String(n + n + 7), option_d: String(n + n + 9), correct_answer: 'C', explanation: `Add ${n} and ${n + 7}.` }),
    n => ({ question_text: `Find ${n}².`, option_a: String(n * n), option_b: String(n + n), option_c: String(n * 2 + 1), option_d: String(n * n + 2), correct_answer: 'A', explanation: `${n}² means ${n} × ${n}.` }),
    n => ({ question_text: `Solve: x + ${n} = ${n + 12}.`, option_a: '10', option_b: '11', option_c: '12', option_d: '13', correct_answer: 'C', explanation: `Subtract ${n} from both sides.` })
  ]
  return Array.from({ length: Number(count) }, (_, i) => ({ class_level, curriculum, topic, difficulty: Number(difficulty), ai_generated: true, ...templates[i % templates.length](i + 3) }))
}
async function aiGenerate(form) {
  const f = Object.fromEntries(new FormData(form).entries())
  let generated = null
  if (supabase) {
    try { const { data } = await supabase.functions.invoke('generate-questions', { body: f }); if (data?.questions?.length) generated = data.questions } catch { generated = null }
  }
  generated ||= makeGeneratedQuestions(f)
  const current = questionBank(); setQuestionBank([...generated, ...current])
  if (supabase) { try { await supabase.from('question_bank').insert(generated) } catch {} }
  state.message = `${generated.length} AI questions generated for ${f.class_level} • ${f.curriculum} • ${f.topic}.`
  render()
}
async function saveQuestion(form) {
  const f = Object.fromEntries(new FormData(form).entries())
  const item = { class_level: f.class_level, curriculum: f.curriculum, topic: f.topic, difficulty: Number(f.difficulty), question_text: f.question_text, question_image_url: f.question_image_url, option_a: f.option_a, option_b: f.option_b, option_c: f.option_c, option_d: f.option_d, option_a_image_url: f.option_a_image_url, option_b_image_url: f.option_b_image_url, option_c_image_url: f.option_c_image_url, option_d_image_url: f.option_d_image_url, correct_answer: f.correct_answer, explanation: f.explanation }
  const list = questionBank(); const idx = f.editing_index === '' ? -1 : Number(f.editing_index)
  if (idx >= 0) list[idx] = item; else list.unshift(item)
  setQuestionBank(list); state.editingIndex = null; state.message = idx >= 0 ? 'Question updated.' : 'Question saved.'
  if (supabase && idx < 0) { try { await supabase.from('question_bank').insert(item) } catch {} }
  render()
}
async function signup(form) {
  const profile = Object.fromEntries(new FormData(form).entries()); profile.age = ageFromDob(profile.date_of_birth); delete profile.password; localStorage.setItem('mezzo_profile', JSON.stringify(profile)); state.user = profile
  if (supabase) { const raw = Object.fromEntries(new FormData(form).entries()); const { data, error } = await supabase.auth.signUp({ email: raw.email, password: raw.password }); if (!error && data.user) await supabase.from('profiles').upsert({ id: data.user.id, ...profile }); state.message = error ? error.message : 'Account created. Check email if confirmation is enabled.' } else state.message = 'Demo account created locally. Add Supabase keys for live authentication.'
  state.view = 'dashboard'; render()
}
async function login(form) { const f = Object.fromEntries(new FormData(form).entries()); if (supabase) { const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password }); state.message = error ? error.message : 'Logged in successfully.' } else state.message = 'Demo login successful. Add Supabase keys for live authentication.'; state.view = 'dashboard'; render() }
async function startSolo() {
  const classLevel = document.getElementById('soloClass').value, curriculum = document.getElementById('soloCurriculum').value, topic = document.getElementById('soloTopic').value, time = document.getElementById('soloTime').value, level = Math.max(1, Math.min(100, Number(document.getElementById('soloLevel').value || 1)))
  let questions = []
  if (supabase) { const { data } = await supabase.from('question_bank').select('*').eq('class_level', classLevel).eq('curriculum', curriculum).eq('topic', topic).limit(60); if (data?.length) questions = data }
  if (!questions.length) questions = questionBank().filter(q => q.class_level === classLevel && q.curriculum === curriculum && q.topic === topic)
  if (!questions.length) questions = questionBank()
  const set = [...questions].sort(() => Math.random() - 0.5); while (set.length < 15) set.push(...questions)
  state.solo = { classLevel, curriculum, topic, time, level, questions: set.slice(0,15), index: 0, score: 0, selected: '', finished: false }; render()
}

document.addEventListener('click', async (e) => {
  const target = e.target.closest('[data-target]'); if (target) { state.view = target.dataset.target; state.message = ''; state.editingIndex = null; render(); return }
  const mode = e.target.closest('[data-auth-mode]'); if (mode) { state.authMode = mode.dataset.authMode; render(); return }
  const edit = e.target.closest('[data-edit-question]'); if (edit) { state.editingIndex = Number(edit.dataset.editQuestion); render(); return }
  const del = e.target.closest('[data-delete-question]'); if (del) { const list = questionBank(); list.splice(Number(del.dataset.deleteQuestion), 1); setQuestionBank(list); state.message = 'Question deleted.'; render(); return }
  const sym = e.target.closest('[data-symbol]'); if (sym) { const field = document.activeElement?.matches('textarea,input') ? document.activeElement : document.querySelector('.symbol-target'); if (field) { field.value += sym.dataset.symbol; field.focus() } return }
  if (e.target.closest('#startSolo')) { await startSolo(); return }
  const ans = e.target.closest('[data-answer]'); if (ans && !state.solo.selected) { const q = state.solo.questions[state.solo.index]; state.solo.selected = ans.dataset.answer; if (state.solo.selected === q.correct_answer) state.solo.score += 1; render(); return }
  if (e.target.closest('#nextSolo')) { if (state.solo.index >= 14) state.solo.finished = true; else { state.solo.index += 1; state.solo.selected = '' } render(); return }
  if (e.target.closest('#advanceSolo')) { state.solo.level = Math.min(Number(state.solo.level) + 1, 100); state.solo.questions = []; state.solo.index = 0; state.solo.score = 0; state.solo.selected = ''; state.solo.finished = false; render(); return }
  if (e.target.closest('#retrySolo')) { state.solo.questions = []; state.solo.index = 0; state.solo.score = 0; state.solo.selected = ''; state.solo.finished = false; render() }
})
document.addEventListener('change', (e) => { if (e.target.id === 'dobInput') document.getElementById('ageOutput').value = ageFromDob(e.target.value); if (e.target.id === 'soloClass') { state.solo.classLevel = e.target.value; state.solo.topic = (topicsByLevel[e.target.value] || [])[0] || ''; render() } if (e.target.id === 'adminLevel') { const topic = document.getElementById('adminTopic'); if (topic) topic.innerHTML = optionHtml(topicsByLevel[e.target.value] || [], (topicsByLevel[e.target.value] || [])[0]) } })
document.addEventListener('submit', async (e) => { e.preventDefault(); if (e.target.id === 'signupForm') await signup(e.target); if (e.target.id === 'loginForm') await login(e.target); if (e.target.id === 'adminQuestionForm') await saveQuestion(e.target); if (e.target.id === 'aiGenerateForm') await aiGenerate(e.target) })

render()
