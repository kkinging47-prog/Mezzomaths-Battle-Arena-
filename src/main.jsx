import './index.css'
import './upgrade.css'
import './home-admin.css'
import './smartboard.css'
import { supabase } from './supabaseClient.js'

const levels = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','JHS 1','JHS 2','JHS 3','SHS 1','SHS 2','SHS 3']
const curricula = ['GES', 'Cambridge', 'Pearson Edexcel']
const durations = Array.from({ length: 12 }, (_, i) => String((i + 1) * 30))
const battleTopicAreas = ['Addition', 'Subtraction', 'Multiplication', 'Division']
const battleSkillLevels = ['1 digit × 1 digit', '2 digit × 1 digit', '2 digit × 2 digit']
const basicTopics = ['Addition', 'Subtraction', 'Multiplication', 'Division', 'Squaring', 'Squares']

const mezzoBookTopics = {
  'Grade 1': ['Addition Worksheet', 'Addition Table (SD)', 'Multiplication Table (1–6)', 'Multiplication Circles', 'Multiplication Worksheet', 'Subtraction of numbers (SD)', 'Subtraction Worksheets', 'Subtraction Table (SD)', 'Multiplication table (1–12)', 'Addition of numbers (2d + 1)', 'Doubling (SD)', 'Maths Worksheets'],
  'Grade 2': ['Addition of Numbers', 'Subtraction of Numbers', 'Addition of numbers (2d + 1)', 'Multiplication by 2', 'Subtraction of numbers (2d − 1)', 'Graphical multiplication (1 × 1)', 'Multiplication Table', 'Graphical Mult. (1×1, 1×2)', 'Doubling (2D)', 'Multiplication Trials', 'Multiplication table (2–12)', 'Addition of numbers (2d + 2)', 'Addition Table (2d + 2)', 'Multiplication by 11', 'Maths Word Problems'],
  'Grade 3': ['Addition of numbers', 'Subtraction of Numbers', 'Multiplication by Two (2)', 'Multiplication by Ten (10)', 'Graphical Multiplication', 'Sharing in Two (2)', 'Sharing in tens', 'Multiplying no’s ending with 0', 'Lattice Multiplication', 'Comparing Fractions', 'Multiplication by 11', 'Multiplying no’s ending with 1', 'Calculation of Time'],
  'Grade 4': ['Addition & Subtraction of No’s', 'Multiplication by 11 (2 & 3 dw)', 'Multiplication by 0.5', 'Division by 0.5', 'Multiplication by 4 (2 Digits)', 'Multiplication by 5', 'Multiplication by 9', 'Multiplication by 10', 'Fast Track Subtraction', 'Consecutive Numbers (3 & 4)', 'Mezzoscopic zeros', 'Mezzoscopic ones', 'Mezzoscopic Fives', 'Mezzoscopic Fours'],
  'Grade 5': ['Addition & Subtraction of No’s', 'Multiplying no’s ending with 0', 'Multiplying no’s ending with 1', 'Sharing in twos (2)', 'Sharing in nines (9)', 'Squaring no’s ending with 5', 'Squaring no’s ending with 4', 'Multiplying no’s between 100 & 110', 'Multiplication by 0.5', 'Addition of consecutive no’s (5 & 6)', 'Divisibility Test (2,3 & 4)', 'Multiplying No’s close to 100', 'Multiplication by 22', 'Divisibility Rules (5–8)', 'Division by 0.5'],
  'Grade 6': ['Addition & Subtraction of No’s', 'Multiplying no’s ending with 5', 'Squaring no’s ending with 0', 'Squaring no’s ending with 1', 'Sharing in fives (5)', 'Multiplication by nine (9)', 'Multiplying no’s between 10 & 20', 'Fast Track Subtraction', 'Multiplication by five (5)', 'Squaring no’s between 30 & 50', 'Multiplying No’s with a difference of 2', 'Mezzoscopic Four’s', 'Squaring no’s between 50 & 70', 'Division by twenty-five (25)', 'Multiplication by ten (10)'],
  'JHS 1': ['Addition and Subtraction of Numbers', 'Squaring No’s Ending With 0', 'Squaring No’s Ending With 1', 'Squaring No’s Ending With 5', 'Percentages', 'Mezzoscopic Tens and Ones', 'Multiplying by 9', 'Division by 50', 'Division by 500', 'Mult numbers ending with 0', 'Mult numbers ending with 1', 'Mult numbers ending with 5', 'Multiplying by 22', 'Division by 9', 'Multiplication by 50', 'Multiplication by 500', 'Divisibility Rules (5–10)', 'Division by 2'],
  'JHS 2': ['Understanding Word Problems', 'Add & Subtraction of numbers', 'Squaring No’s between 30 & 50', 'Mult. nos between 100 & 110', 'Percentages', 'Mezzoscopic Tens and Ones', 'Mult. No.s with a difference of 2', 'Mul numbers between 10 & 20', 'Squaring No’s between 50 & 70', 'Multiplying numbers close to 100', 'Fast track subtraction', 'Fractions', 'Divisibility Test (2–12)', 'General Multiplication', 'General Division', 'General Squaring', 'Division by 2'],
  'JHS 3': ['BECE Exam Practice', 'Algebra', 'Geometry', 'Statistics', 'Aptitude & Mental Reasoning', 'General Multiplication', 'General Division', 'General Squaring', 'Divisibility Rules', 'Maths Worksheets Trials'],
  'SHS 1': ['Surds & Indices', 'Sets & Logic', 'Linear & Quadratic Equations', 'Coordinate Geometry', 'Statistics'],
  'SHS 2': ['Functions & Graphs', 'Trigonometry', 'Sequences & Series', 'Probability', 'Vectors & Mensuration'],
  'SHS 3': ['WASSCE Practice', 'Advanced Algebra', 'Calculus Foundations', 'Statistics', 'Vectors & Trigonometry']
}
const topicsByLevel = Object.fromEntries(levels.map(level => [level, [...new Set([...basicTopics, ...battleTopicAreas, ...battleSkillLevels, ...(mezzoBookTopics[level] || [])])]]))

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
  { class_level: 'Grade 4', curriculum: 'GES', topic: 'Multiplication by 4 (2 Digits)', topic_area: 'Multiplication', topic_sublevel: '1 digit × 1 digit', question_text: '7 × 8', numeric_answer: 56, option_a: '54', option_b: '56', option_c: '58', option_d: '64', correct_answer: 'B', explanation: '7 × 8 = 56.' },
  { class_level: 'Grade 4', curriculum: 'GES', topic: 'Addition & Subtraction of No’s', topic_area: 'Addition', topic_sublevel: '2 digit × 1 digit', question_text: '48 + 37', numeric_answer: 85, option_a: '75', option_b: '85', option_c: '95', option_d: '65', correct_answer: 'B', explanation: '48 + 37 = 85.' },
  { class_level: 'Grade 5', curriculum: 'GES', topic: 'Sharing in twos (2)', topic_area: 'Division', topic_sublevel: '1 digit × 1 digit', question_text: '42 ÷ 6', numeric_answer: 7, option_a: '6', option_b: '7', option_c: '8', option_d: '9', correct_answer: 'B', explanation: '42 ÷ 6 = 7.' }
]

const tabs = [
  ['home','Home','🏟️'], ['smartboard','Smart Board 1v1','📺'], ['battle','Online 1v1','⚔️'], ['solo','Solo Practice','🧠'],
  ['dashboard','My Dashboard','👤'], ['auth','Login / Sign Up','🔐'], ['admin','Admin','🛠️'], ['leaderboard','Leaderboards','🏆']
]

const escapeText = (value = '') => String(value).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]))
const optionHtml = (list, selected) => list.map(item => `<option value="${escapeText(item)}" ${item === selected ? 'selected' : ''}>${escapeText(item)}</option>`).join('')
const stored = (key, fallback) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value))
const questionBank = () => stored('mezzo_question_bank', seedQuestions)
const setQuestionBank = list => save('mezzo_question_bank', list)
const generationSummary = () => stored('mezzo_generation_summary', { totalGenerated: 0, batches: [] })
const saveGenerationSummary = summary => save('mezzo_generation_summary', summary)
const ageFromDob = dob => {
  if (!dob) return ''
  const today = new Date(); const born = new Date(dob)
  let age = today.getFullYear() - born.getFullYear()
  const m = today.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--
  return Number.isFinite(age) ? age : ''
}
const isAdmin = () => state.user?.role === 'admin'

function defaultSmartState() {
  return {
    phase: 'setup', countdown: 5, duration: 60, remaining: 60,
    topic: 'Multiplication by 4 (2 Digits)', classLevel: 'Grade 4', curriculum: 'GES',
    round: 0, questions: [], roundStartedAt: 0, roundWinner: '',
    message: 'Enter participant details and start the smart board contest.',
    a: { name: '', school: '', classLevel: 'Grade 4', score: 0, answer: '', lastTime: 0 },
    b: { name: '', school: '', classLevel: 'Grade 4', score: 0, answer: '', lastTime: 0 },
    winner: null, runnerUp: null
  }
}

const state = {
  view: 'smartboard', authMode: 'login', message: '', editingIndex: null, adminPage: 1,
  user: stored('mezzo_profile', null),
  smart: defaultSmartState(),
  battle: { classLevel: 'Grade 4', curriculum: 'GES', topicArea: 'Multiplication', sublevel: '1 digit × 1 digit', opponent: 'Online Participant', playerScore: 0, opponentScore: 0, started: false },
  solo: { classLevel: 'JHS 2', curriculum: 'GES', topic: 'Multiplication', time: '10 minutes', level: 1 }
}
let countdownTimer = null
let contestTimer = null

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
  if (state.view === 'smartboard') return smartBoardHtml()
  if (state.view === 'battle') return battleHtml()
  if (state.view === 'solo') return soloHtml()
  if (state.view === 'dashboard') return dashboardHtml()
  if (state.view === 'auth') return authHtml()
  if (state.view === 'admin') return adminHtml()
  if (state.view === 'leaderboard') return leaderboardHtml()
  return homeHtml()
}

function homeHtml() {
  const cards = [
    ['📺','Smart Board 1v1','Two students stand before a smart board and compete with keypad answers.','Open Smart Board','smartboard','mode-gold'],
    ['📅','Daily Practice','A fresh 15-question set from your class topics.','Start Daily Practice','solo','mode-purple'],
    ['⚔️','Online 1 vs 1','Select topic area and battle an online participant.','Start Online 1 vs 1','battle','mode-red'],
    ['🤖','Compete with Bot','Play against MathBot when no one is online.','Battle Bot','battle','mode-cyan'],
    ['🧠','Solo Practice','Choose class, topic, time and progress through 100 levels.','Start Solo','solo','mode-green']
  ]
  return `<section class="screen home-screen"><section class="dashboard-hero glass-card"><div><div class="pill">🏟️ Mezzo Maths Battle Arena</div><h1>Choose Your Maths Game Mode</h1><p>Practice daily, compete on a classroom smart board, fight online, battle a bot, and master topics from the Mezzo Maths book.</p><div class="cta-row"><button class="btn btn-gold" data-target="smartboard">📺 Smart Board Contest</button><button class="btn btn-primary" data-target="auth">🔐 Login / Sign Up</button></div></div><div class="hero-visual glass-card mini-hero"><div class="arena-ring"><div class="student student-left">👦🏽</div><div class="trophy-tower">🏆</div><div class="student student-right">👧🏾</div></div></div></section><section class="home-mode-grid">${cards.map(([icon,title,desc,cta,target,cls]) => `<button class="home-mode-card ${cls}" data-target="${target}"><span>${icon}</span><h3>${title}</h3><p>${desc}</p><strong>${cta} →</strong></button>`).join('')}</section></section>`
}

function smartBoardHtml() {
  const s = state.smart
  if (s.phase === 'result') return smartBoardResultHtml()
  const current = s.questions[s.round]
  return `<section class="screen smartboard-screen">
    <section class="smart-top glass-card"><div><div class="pill">📺 Classroom Smart Board 1 vs 1</div><h1>Two-Student Fastest Answer Contest</h1><p>Questions continue appearing until the selected contest time has fully elapsed.</p></div><div class="smart-clock ${s.phase === 'countdown' ? 'counting' : ''}"><small>${s.phase === 'countdown' ? 'Contest starts in' : 'Time left'}</small><strong>${s.phase === 'countdown' ? s.countdown : s.remaining}</strong><span>seconds</span></div></section>
    ${s.phase === 'setup' ? smartSetupHtml() : smartLiveHtml(current)}
  </section>`
}

function smartSetupHtml() {
  const s = state.smart
  return `<section class="smart-setup-grid">${participantForm('a', 'Student A', s.a)}<form class="smart-settings glass-card" id="smartSetupForm"><h2>Contest Settings</h2><label class="field-group"><span>Contest Duration</span><select id="smartDuration">${durations.map(d => `<option value="${d}" ${String(s.duration) === d ? 'selected' : ''}>${d} secs</option>`).join('')}</select></label><label class="field-group"><span>Class Level</span><select id="smartClass">${optionHtml(levels, s.classLevel)}</select></label><label class="field-group"><span>Curriculum</span><select id="smartCurriculum">${optionHtml(curricula, s.curriculum)}</select></label><label class="field-group"><span>Topic from Mezzo Topics PDF</span><select id="smartTopic">${optionHtml(topicsByLevel[s.classLevel] || [], s.topic)}</select></label><div class="smart-topic-note">Topics come from the uploaded Mezzo book topic list for Grade 1 to JHS/SHS levels.</div><button class="btn btn-gold" type="button" id="startSmartContest">Start 5-Second Countdown</button></form>${participantForm('b', 'Student B', s.b)}</section>`
}
function participantForm(side, title, p) { return `<article class="smart-player-card glass-card player-${side}"><div class="contest-label">${title}</div><div class="avatar avatar-medium">${side === 'a' ? '👦🏽' : '👧🏾'}</div><label class="field-group"><span>Name</span><input id="${side}Name" value="${escapeText(p.name)}" placeholder="Student name"></label><label class="field-group"><span>School</span><input id="${side}School" value="${escapeText(p.school)}" placeholder="School name"></label><label class="field-group"><span>Class</span><select id="${side}Class">${optionHtml(levels, p.classLevel)}</select></label></article>` }

function smartLiveHtml(current) {
  if (!current) return `<section class="empty-practice light-card"><h2>No question loaded</h2><p>Start again from setup.</p></section>`
  const s = state.smart
  return `<section class="smart-live-board"><aside class="smart-score-card student-a"><div class="contest-label">Student A</div><h2>${escapeText(s.a.name || 'Student A')}</h2><p>${escapeText(s.a.school || 'School')} • ${escapeText(s.a.classLevel)}</p><strong>${s.a.score}</strong><small>Last speed: ${s.a.lastTime ? `${s.a.lastTime}s` : '—'}</small></aside><main class="smart-question-zone light-card"><div class="smart-meta"><span>Round ${s.round + 1}</span><span>${escapeText(s.topic)}</span><span>${escapeText(s.message)}</span></div><h1>${escapeText(current.question_text)}</h1><div class="smart-answer-status">Correct answer is hidden until a round is awarded.</div></main><aside class="smart-score-card student-b"><div class="contest-label">Student B</div><h2>${escapeText(s.b.name || 'Student B')}</h2><p>${escapeText(s.b.school || 'School')} • ${escapeText(s.b.classLevel)}</p><strong>${s.b.score}</strong><small>Last speed: ${s.b.lastTime ? `${s.b.lastTime}s` : '—'}</small></aside>${smartKeypad('a', s.a.answer, 'Student A Keypad')}<section class="smart-center-status glass-card"><div>${s.phase === 'countdown' ? `<strong class="giant-count">${s.countdown}</strong><span>Get ready...</span>` : `<strong>FASTEST CORRECT ANSWER WINS</strong><span>New questions continue until time ends</span>`}</div><button class="btn btn-danger" id="endSmartContest">End Contest</button></section>${smartKeypad('b', s.b.answer, 'Student B Keypad')}</section>`
}
function smartKeypad(side, answer, title) { return `<section class="number-pad glass-card pad-${side}"><h3>${title}</h3><div class="answer-display">${answer || '0'}</div><div class="keypad-grid">${['7','8','9','4','5','6','1','2','3','0','.','⌫'].map(k => `<button class="key-btn" data-pad="${side}" data-key="${k}">${k}</button>`).join('')}</div><button class="btn btn-gold submit-answer" data-submit-smart="${side}">Submit Answer</button></section>` }

function smartBoardResultHtml() {
  const s = state.smart; const winner = s.winner || s.a; const runner = s.runnerUp || s.b
  return `<section class="smart-result-wrap"><section class="winner-card light-card confetti-burst"><div class="trophy-anim">🏆</div><h1>Congratulations, ${escapeText(winner.name || 'Winner')}!</h1><p>${escapeText(winner.school || 'School')} • ${escapeText(winner.classLevel || s.classLevel)}</p><strong>${winner.score} points</strong><div class="clap-text">👏 👏 👏</div><button class="btn btn-gold" id="playClap">Play Clapping Sound</button><button class="btn btn-primary" id="resetSmartContest">New Smart Board Contest</button></section><section class="runner-card glass-card"><h2>Second Place: ${escapeText(runner.name || 'Runner Up')}</h2><p>${escapeText(runner.school || 'School')} • ${runner.score} points</p><div class="ai-message">AI Motivation: You showed courage and speed today. Keep practising ${escapeText(s.topic)}; today’s second place can become tomorrow’s trophy.</div></section><section class="smart-leader-preview glass-card"><h2>Weekly, Monthly and Yearly Leaderboards</h2>${leaderboardScopeHtml('weekly')}${leaderboardScopeHtml('monthly')}${leaderboardScopeHtml('yearly')}</section></section>`
}
function leaderboardScopeHtml(scope) { const data = stored('mezzo_smart_leaderboards', { weekly: [], monthly: [], yearly: [] })[scope] || []; return `<div class="leader-scope"><strong>${scope.toUpperCase()}</strong>${data.slice(0,8).map((r,i) => `<span>${i + 1}. ${escapeText(r.name)} — ${r.score} pts • ${escapeText(r.school || '')}</span>`).join('') || '<span>No records yet</span>'}</div>` }

function battleHtml() { const b = state.battle; return `<section class="screen battle-screen"><section class="dashboard-hero glass-card"><div><div class="pill">⚔️ Online 1 vs 1 Battle Arena</div><h1>Select Topic and Start Battle</h1><p>For two students in front of a smart board, use the Smart Board version.</p><div class="cta-row"><button class="btn btn-gold" id="startBattle">Start Online Match</button><button class="btn btn-primary" data-target="smartboard">📺 Smart Board Version</button></div></div><div class="solo-level-card"><span class="badge badge-gold">${escapeText(b.opponent)}</span><strong>${b.playerScore} - ${b.opponentScore}</strong><small>Online mode</small></div></section><section class="solo-builder glass-card"><label class="field-group"><span>Class Level</span><select id="battleClass">${optionHtml(levels, b.classLevel)}</select></label><label class="field-group"><span>Curriculum</span><select id="battleCurriculum">${optionHtml(curricula, b.curriculum)}</select></label><label class="field-group"><span>Topic Area</span><select id="battleTopic">${optionHtml(battleTopicAreas, b.topicArea)}</select></label><label class="field-group"><span>Skill Level</span><select id="battleSublevel">${optionHtml(battleSkillLevels, b.sublevel)}</select></label><label class="field-group"><span>Opponent</span><select id="battleOpponent">${optionHtml(['Online Participant','Bot'], b.opponent)}</select></label><button class="btn btn-gold" id="startBattle2">Start Battle</button></section></section>` }
function soloHtml() { const solo = state.solo; return `<section class="screen solo-screen"><section class="solo-setup glass-card"><div><div class="pill">🧠 Solo Practice</div><h1>100-Level Solo Practice</h1><p>Select class, topic, timed practice and level.</p></div><div class="solo-level-card"><span class="badge badge-gold">Level</span><strong>${solo.level} / 100</strong><small>Difficulty rises every 5 levels</small></div></section><section class="solo-builder glass-card"><label class="field-group"><span>Select Class</span><select id="soloClass">${optionHtml(levels, solo.classLevel)}</select></label><label class="field-group"><span>Select Curriculum</span><select id="soloCurriculum">${optionHtml(curricula, solo.curriculum)}</select></label><label class="field-group"><span>Select Topic</span><select id="soloTopic">${optionHtml(topicsByLevel[solo.classLevel] || [], solo.topic)}</select></label><label class="field-group"><span>Timed Practice</span><select id="soloTime">${optionHtml(['5 minutes','10 minutes','15 minutes','20 minutes','30 minutes'], solo.time)}</select></label><button class="btn btn-gold" id="startSolo">Start 15 Questions</button></section><section class="empty-practice light-card"><h2>Solo Practice Ready</h2><p>Questions will be selected from the bank using your selected class and topic.</p></section></section>` }
function dashboardHtml() { const name = state.user?.full_name || 'Student Champion'; return `<section class="screen dashboard-screen"><section class="dashboard-hero glass-card"><div><div class="pill">👤 Personal Dashboard</div><h1>${escapeText(name)}</h1><p><strong>AI Summary:</strong> You are improving in arithmetic speed. Keep competing on the smart board to build accuracy under pressure.</p><div class="cta-row"><button class="btn btn-gold" data-target="smartboard">Smart Board Contest</button><button class="btn btn-primary" data-target="solo">Solo Practice</button></div></div><div class="dashboard-profile-card"><div class="avatar avatar-large glow">👦🏽</div><h3>${escapeText(name)}</h3><p>${state.user?.class_level || 'JHS 2'} • ${state.user?.school_name || 'Meridian Public School'}</p><div class="progress-track gradient"><i style="width:76%"></i></div><small>Lv. 23 • 7,650 XP • 12-day streak</small></div></section></section>` }

function authHtml() { return `<section class="screen auth-screen"><section class="auth-card glass-card"><div class="auth-switch"><button class="${state.authMode === 'login' ? 'active' : ''}" data-auth-mode="login">Login</button><button class="${state.authMode === 'signup' ? 'active' : ''}" data-auth-mode="signup">Sign Up</button></div>${state.authMode === 'login' ? loginFormHtml() : signupFormHtml()}</section></section>` }
function loginFormHtml() { return `<form id="loginForm"><div class="section-heading compact-heading"><span>Secure access</span><h2>Login as Student or Admin</h2></div><label class="field-group"><span>Email</span><input name="email" type="email" required></label><label class="field-group"><span>Password</span><input name="password" type="password" required></label><label class="field-group"><span>Login Type</span><select name="role"><option value="student">Student</option><option value="admin">Admin</option></select></label><button class="btn btn-primary auth-submit" type="submit">Login</button></form>` }
function signupFormHtml() { return `<form id="signupForm"><div class="section-heading compact-heading"><span>Create account</span><h2>Student / Admin Sign Up</h2></div><div class="form-grid"><label class="field-group"><span>Full Name</span><input name="full_name" required></label><label class="field-group"><span>Email</span><input name="email" type="email" required></label><label class="field-group"><span>Password</span><input name="password" type="password" required></label><label class="field-group"><span>Date of Birth</span><input id="dobInput" name="date_of_birth" type="date" required></label><label class="field-group"><span>Age</span><input id="ageOutput" name="age" readonly placeholder="Auto calculated"></label><label class="field-group"><span>Name of School</span><input name="school_name" required></label><label class="field-group"><span>Location</span><input name="location" required></label><label class="field-group"><span>Class or Year</span><select name="class_level">${optionHtml(levels, 'JHS 2')}</select></label><label class="field-group"><span>Curriculum Type</span><select name="curriculum">${optionHtml(curricula, 'GES')}</select></label><label class="field-group"><span>Account Type</span><select name="role"><option value="student">Student</option><option value="admin">Admin</option></select></label></div><button class="btn btn-gold auth-submit" type="submit">Create Account</button></form>` }

function adminHtml() {
  if (!isAdmin()) return `<section class="screen admin-screen"><section class="auth-card glass-card"><div class="pill">🔒 Admin Only</div><h1>Admin access required</h1><p class="auth-note">Login with an Admin account to generate, edit and delete questions.</p><button class="btn btn-gold" data-target="auth">Login / Sign Up</button></section></section>`
  const list = questionBank(); const editing = Number.isInteger(state.editingIndex) ? list[state.editingIndex] : null
  const summary = generationSummary(); const totalPages = Math.max(1, Math.ceil(list.length / 20)); const page = Math.min(Math.max(1, state.adminPage), totalPages); const start = (page - 1) * 20; const visible = list.slice(start, start + 20); const last = summary.batches[0]
  return `<section class="screen admin-screen"><section class="dashboard-hero glass-card"><div><div class="pill">🛠️ Unified Admin Page</div><h1>AI Generator, Settings & Bank Manager</h1><p>Generated question summary, 20-question pages, editing tools, and Smart Board numeric-answer support.</p></div></section><section class="question-manager glass-card"><div class="section-row"><h3>Generated Questions Summary</h3><span>${summary.batches.length} batches</span></div><div class="rules-demo-grid"><div><strong>Total Questions</strong><span>${list.length}</span></div><div><strong>AI Generated</strong><span>${summary.totalGenerated}</span></div><div><strong>Last Batch</strong><span>${last ? `${last.count} for ${escapeText(last.class_level)}` : 'None yet'}</span></div><div><strong>Showing</strong><span>${start + 1}-${Math.min(start + 20, list.length)} of ${list.length}</span></div></div><div class="question-list">${summary.batches.slice(0,5).map(b => `<article class="bank-row"><div><strong>${escapeText(b.count)} questions generated</strong><small>${escapeText(b.class_level)} • ${escapeText(b.curriculum)} • ${escapeText(b.topic)} • ${escapeText(b.topic_area)} • ${escapeText(b.created_at)}</small></div></article>`).join('') || '<p class="auth-note">No generated-question batch yet.</p>'}</div></section><form class="admin-form glass-card" id="aiGenerateForm"><label class="field-group"><span>Number to Generate</span><select name="count">${optionHtml(['10','20','30','40','50'], '10')}</select></label><label class="field-group"><span>Class Level</span><select name="class_level" id="adminLevel">${optionHtml(levels, 'Grade 4')}</select></label><label class="field-group"><span>Curriculum</span><select name="curriculum">${optionHtml(curricula, 'GES')}</select></label><label class="field-group"><span>Topic From Mezzo Book</span><select name="topic" id="adminTopic">${optionHtml(topicsByLevel['Grade 4'], 'Multiplication by 4 (2 Digits)')}</select></label><label class="field-group"><span>Smart Board Topic Area</span><select name="topic_area">${optionHtml(battleTopicAreas, 'Multiplication')}</select></label><label class="field-group"><span>Skill Level</span><select name="topic_sublevel">${optionHtml(battleSkillLevels, '1 digit × 1 digit')}</select></label><button class="btn btn-gold" type="submit">🤖 Generate Questions</button></form><form class="admin-form glass-card" id="adminQuestionForm"><input type="hidden" name="editing_index" value="${Number.isInteger(state.editingIndex) ? state.editingIndex : ''}"><label class="field-group"><span>Class</span><select name="class_level">${optionHtml(levels, editing?.class_level || 'Grade 4')}</select></label><label class="field-group"><span>Curriculum</span><select name="curriculum">${optionHtml(curricula, editing?.curriculum || 'GES')}</select></label><label class="field-group"><span>Topic</span><input name="topic" value="${escapeText(editing?.topic || '')}" required></label><label class="field-group"><span>Numeric Answer</span><input name="numeric_answer" value="${escapeText(editing?.numeric_answer || '')}" placeholder="for keypad contests"></label><label class="field-group wide"><span>Question Text</span><textarea name="question_text" class="symbol-target" required>${escapeText(editing?.question_text || '')}</textarea></label>${['a','b','c','d'].map(letter => `<label class="field-group"><span>Option ${letter.toUpperCase()}</span><input name="option_${letter}" value="${escapeText(editing?.[`option_${letter}`] || '')}" required></label>`).join('')}<label class="field-group"><span>Correct Answer</span><select name="correct_answer">${optionHtml(['A','B','C','D'], editing?.correct_answer || 'B')}</select></label><label class="field-group wide"><span>Explanation</span><textarea name="explanation">${escapeText(editing?.explanation || '')}</textarea></label><button class="btn btn-primary wide" type="submit">${editing ? 'Update Question' : 'Save Question'}</button></form><section class="question-manager glass-card"><div class="section-row"><h3>Question Bank</h3><span>Page ${page} of ${totalPages} • 20 per page</span></div><div class="question-list">${visible.map((q,i) => `<article class="bank-row"><div><strong>${escapeText(q.question_text)}</strong><small>${q.class_level} • ${q.curriculum} • ${q.topic} • Answer ${q.numeric_answer || q.correct_answer}</small></div><div><button class="btn btn-blue btn-small" data-edit-question="${start + i}">Edit</button><button class="btn btn-danger btn-small" data-delete-question="${start + i}">Delete</button></div></article>`).join('') || '<p class="auth-note">No questions found.</p>'}</div><div class="cta-row pagination-row"><button class="btn btn-ghost" data-admin-page="${Math.max(1, page - 1)}">← Previous 20</button><button class="btn btn-gold" data-admin-page="${Math.min(totalPages, page + 1)}">Next 20 →</button></div></section></section>`
}

function leaderboardHtml() { return `<section class="screen leaderboard-screen"><section class="leader-tabs glass-card"><button class="active">Weekly</button><button>Monthly</button><button>Yearly</button></section><section class="smart-leader-preview glass-card">${leaderboardScopeHtml('weekly')}${leaderboardScopeHtml('monthly')}${leaderboardScopeHtml('yearly')}</section></section>` }
function socialFooterHtml() { return `<footer class="social-footer glass-card"><div><strong>Follow and join Mezzo Maths</strong><p>Mezzo Maths is where Mathematics becomes simple, engaging, and meaningful — from foundations to mastery.</p></div><div class="social-links">${socialLinks.map(([name,icon,url]) => `<a href="${url}" target="_blank" rel="noreferrer"><span>${icon}</span>${name}</a>`).join('')}</div></footer>` }

function makeGeneratedQuestions({ count = 15, class_level = 'Grade 4', curriculum = 'GES', topic = 'Multiplication by 4 (2 Digits)', topic_area = 'Multiplication', topic_sublevel = '1 digit × 1 digit' }) {
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
  return Array.from({ length: Number(count) }, () => {
    let a = rand(2,9), b = rand(2,9), symbol = '×', answer = a * b
    if (topic_sublevel === '2 digit × 1 digit') { a = rand(12,99); b = rand(2,9); answer = a * b }
    if (topic_sublevel === '2 digit × 2 digit') { a = rand(12,99); b = rand(11,99); answer = a * b }
    if (topic_area === 'Addition') { a = rand(10,99); b = rand(10,99); symbol = '+'; answer = a + b }
    if (topic_area === 'Subtraction') { a = rand(40,150); b = rand(10,39); symbol = '−'; answer = a - b }
    if (topic_area === 'Division') { b = rand(2,12); answer = rand(2,25); a = answer * b; symbol = '÷' }
    return { class_level, curriculum, topic, topic_area, topic_sublevel, question_text: `${a} ${symbol} ${b}`, numeric_answer: answer, option_a: String(answer - 1), option_b: String(answer), option_c: String(answer + 1), option_d: String(answer + 2), correct_answer: 'B', explanation: `The answer is ${answer}.` }
  })
}

async function startSmartContest() {
  clearInterval(countdownTimer); clearInterval(contestTimer)
  const duration = Number(document.getElementById('smartDuration')?.value || 60)
  const classLevel = document.getElementById('smartClass')?.value || 'Grade 4'
  const curriculum = document.getElementById('smartCurriculum')?.value || 'GES'
  const topic = document.getElementById('smartTopic')?.value || 'Multiplication by 4 (2 Digits)'
  const a = { name: document.getElementById('aName')?.value || 'Student A', school: document.getElementById('aSchool')?.value || 'School A', classLevel: document.getElementById('aClass')?.value || classLevel, score: 0, answer: '', lastTime: 0 }
  const b = { name: document.getElementById('bName')?.value || 'Student B', school: document.getElementById('bSchool')?.value || 'School B', classLevel: document.getElementById('bClass')?.value || classLevel, score: 0, answer: '', lastTime: 0 }
  let questions = questionBank().filter(q => q.class_level === classLevel && q.curriculum === curriculum && q.topic === topic && q.numeric_answer)
  if (supabase) { try { const { data } = await supabase.from('question_bank').select('*').eq('class_level', classLevel).eq('curriculum', curriculum).eq('topic', topic).not('numeric_answer', 'is', null).limit(200); if (data?.length) questions = data } catch {} }
  if (!questions.length) questions = makeGeneratedQuestions({ count: 200, class_level: classLevel, curriculum, topic, topic_area: inferTopicArea(topic), topic_sublevel: '1 digit × 1 digit' })
  while (questions.length < 200) questions = [...questions, ...makeGeneratedQuestions({ count: 50, class_level: classLevel, curriculum, topic, topic_area: inferTopicArea(topic), topic_sublevel: '1 digit × 1 digit' })]
  state.smart = { ...defaultSmartState(), phase: 'countdown', countdown: 5, duration, remaining: duration, topic, classLevel, curriculum, questions: questions.sort(() => Math.random() - 0.5), a, b, message: 'Get ready. Countdown started!' }
  render()
  countdownTimer = setInterval(() => { state.smart.countdown -= 1; if (state.smart.countdown <= 0) beginSmartLive(); else render() }, 1000)
}
function beginSmartLive() { clearInterval(countdownTimer); state.smart.phase = 'live'; state.smart.round = 0; state.smart.roundStartedAt = Date.now(); state.smart.message = 'Answer now!'; render(); contestTimer = setInterval(() => { state.smart.remaining -= 1; if (state.smart.remaining <= 0) endSmartContest(); else render() }, 1000) }
function smartSubmit(side) {
  if (state.smart.phase !== 'live' || state.smart.roundWinner) return
  const q = state.smart.questions[state.smart.round]
  const player = state.smart[side]
  const seconds = Number(((Date.now() - state.smart.roundStartedAt) / 1000).toFixed(2))
  player.lastTime = seconds
  if (Number(q.numeric_answer) === Number(player.answer)) { const points = 10 + Math.max(1, Math.ceil(10 - seconds)); player.score += points; state.smart.roundWinner = side; state.smart.message = `${player.name} answered fastest! +${points} points`; render(); setTimeout(nextSmartQuestion, 700) }
  else { state.smart.message = `${player.name} submitted ${player.answer || 'blank'} — not correct.`; player.answer = ''; render() }
}
function nextSmartQuestion() {
  if (state.smart.phase !== 'live') return
  if (state.smart.remaining <= 0) { endSmartContest(); return }
  state.smart.round += 1
  if (state.smart.round >= state.smart.questions.length) {
    state.smart.questions.push(...makeGeneratedQuestions({ count: 50, class_level: state.smart.classLevel, curriculum: state.smart.curriculum, topic: state.smart.topic, topic_area: inferTopicArea(state.smart.topic), topic_sublevel: '1 digit × 1 digit' }))
  }
  state.smart.a.answer = ''; state.smart.b.answer = ''; state.smart.roundWinner = ''; state.smart.roundStartedAt = Date.now(); state.smart.message = 'Next question. Fastest correct answer wins!'; render()
}
function endSmartContest() { clearInterval(countdownTimer); clearInterval(contestTimer); const a = state.smart.a, b = state.smart.b; const winner = a.score >= b.score ? a : b; const runnerUp = a.score >= b.score ? b : a; state.smart.phase = 'result'; state.smart.winner = winner; state.smart.runnerUp = runnerUp; recordSmartWinner(winner); playClap(); render() }
function resetSmartContest() { clearInterval(countdownTimer); clearInterval(contestTimer); state.smart = defaultSmartState(); render() }
function recordSmartWinner(winner) { const boards = stored('mezzo_smart_leaderboards', { weekly: [], monthly: [], yearly: [] }); const row = { name: winner.name, school: winner.school, classLevel: winner.classLevel, score: winner.score, topic: state.smart.topic, date: new Date().toISOString() }; for (const scope of ['weekly','monthly','yearly']) boards[scope] = [row, ...(boards[scope] || [])].sort((x,y) => y.score - x.score).slice(0,50); save('mezzo_smart_leaderboards', boards) }
function inferTopicArea(topic) { const t = String(topic).toLowerCase(); if (t.includes('division') || t.includes('sharing')) return 'Division'; if (t.includes('subtraction') || t.includes('take away')) return 'Subtraction'; if (t.includes('add')) return 'Addition'; return 'Multiplication' }
function playClap() { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); for (let i = 0; i < 5; i++) { const size = ctx.sampleRate * 0.08; const buffer = ctx.createBuffer(1, size, ctx.sampleRate); const data = buffer.getChannelData(0); for (let j = 0; j < size; j++) data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / size, 2); const source = ctx.createBufferSource(); source.buffer = buffer; const gain = ctx.createGain(); gain.gain.value = 0.35; source.connect(gain).connect(ctx.destination); source.start(ctx.currentTime + i * 0.16) } } catch {} }

async function aiGenerate(form) { const f = Object.fromEntries(new FormData(form).entries()); let generated = null; if (supabase) { try { const { data } = await supabase.functions.invoke('generate-questions', { body: f }); if (data?.questions?.length) generated = data.questions } catch { generated = null } } generated ||= makeGeneratedQuestions(f); setQuestionBank([...generated, ...questionBank()]); const summary = generationSummary(); summary.totalGenerated += generated.length; summary.batches.unshift({ count: generated.length, class_level: f.class_level, curriculum: f.curriculum, topic: f.topic, topic_area: f.topic_area, topic_sublevel: f.topic_sublevel, created_at: new Date().toLocaleString() }); saveGenerationSummary(summary); state.adminPage = 1; state.message = `${generated.length} questions generated and added to the question bank.`; render() }
async function saveQuestion(form) { const f = Object.fromEntries(new FormData(form).entries()); const item = { class_level: f.class_level, curriculum: f.curriculum, topic: f.topic, numeric_answer: f.numeric_answer ? Number(f.numeric_answer) : null, question_text: f.question_text, option_a: f.option_a, option_b: f.option_b, option_c: f.option_c, option_d: f.option_d, correct_answer: f.correct_answer, explanation: f.explanation }; const list = questionBank(); const idx = f.editing_index === '' ? -1 : Number(f.editing_index); if (idx >= 0) list[idx] = item; else list.unshift(item); setQuestionBank(list); state.editingIndex = null; state.message = idx >= 0 ? 'Question updated.' : 'Question saved.'; render() }
async function signup(form) { const raw = Object.fromEntries(new FormData(form).entries()); const profile = { ...raw, age: ageFromDob(raw.date_of_birth) }; delete profile.password; save('mezzo_profile', profile); state.user = profile; state.message = 'Demo account created.'; state.view = 'dashboard'; render() }
async function login(form) { const f = Object.fromEntries(new FormData(form).entries()); const local = stored('mezzo_profile', {}) || {}; local.email = f.email; local.role = f.role; save('mezzo_profile', local); state.user = local; state.message = 'Demo login successful.'; state.view = f.role === 'admin' ? 'admin' : 'dashboard'; render() }
function startSolo() { state.message = 'Solo practice engine is ready.'; render() }
function startBattle() { state.message = 'Online battle mode is ready. Use Smart Board 1v1 for classroom contest.'; render() }

document.addEventListener('click', async e => {
  const target = e.target.closest('[data-target]'); if (target) { clearInterval(countdownTimer); clearInterval(contestTimer); state.view = target.dataset.target; state.message = ''; state.editingIndex = null; render(); return }
  const mode = e.target.closest('[data-auth-mode]'); if (mode) { state.authMode = mode.datasetAuthMode || mode.dataset.authMode; render(); return }
  const adminPage = e.target.closest('[data-admin-page]'); if (adminPage) { state.adminPage = Number(adminPage.dataset.adminPage); render(); return }
  const edit = e.target.closest('[data-edit-question]'); if (edit) { state.editingIndex = Number(edit.dataset.editQuestion); render(); return }
  const del = e.target.closest('[data-delete-question]'); if (del) { const list = questionBank(); list.splice(Number(del.dataset.deleteQuestion), 1); setQuestionBank(list); state.message = 'Question deleted.'; render(); return }
  const key = e.target.closest('[data-key]'); if (key && state.smart.phase === 'live') { const p = state.smart[key.dataset.pad]; p.answer = key.dataset.key === '⌫' ? p.answer.slice(0,-1) : `${p.answer}${key.dataset.key}`; render(); return }
  const smartSubmitBtn = e.target.closest('[data-submit-smart]'); if (smartSubmitBtn) { smartSubmit(smartSubmitBtn.dataset.submitSmart); return }
  if (e.target.closest('#startSmartContest')) { await startSmartContest(); return }
  if (e.target.closest('#endSmartContest')) { endSmartContest(); return }
  if (e.target.closest('#resetSmartContest')) { resetSmartContest(); return }
  if (e.target.closest('#playClap')) { playClap(); return }
  if (e.target.closest('#startSolo')) { startSolo(); return }
  if (e.target.closest('#startBattle') || e.target.closest('#startBattle2')) { startBattle(); return }
})

document.addEventListener('change', e => {
  if (e.target.id === 'dobInput') document.getElementById('ageOutput').value = ageFromDob(e.target.value)
  if (e.target.id === 'smartClass') { state.smart.classLevel = e.target.value; state.smart.topic = (topicsByLevel[e.target.value] || [])[0] || ''; render() }
  if (e.target.id === 'soloClass') { state.solo.classLevel = e.target.value; state.solo.topic = (topicsByLevel[e.target.value] || [])[0] || ''; render() }
  if (e.target.id === 'adminLevel') { const topic = document.getElementById('adminTopic'); if (topic) topic.innerHTML = optionHtml(topicsByLevel[e.target.value] || [], (topicsByLevel[e.target.value] || [])[0]) }
})
document.addEventListener('submit', async e => { e.preventDefault(); if (e.target.id === 'signupForm') await signup(e.target); if (e.target.id === 'loginForm') await login(e.target); if (e.target.id === 'adminQuestionForm') await saveQuestion(e.target); if (e.target.id === 'aiGenerateForm') await aiGenerate(e.target) })

render()
