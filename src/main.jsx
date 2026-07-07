import './index.css'

const screens = [
  ['landing', 'Landing', '🏠'],
  ['lobby', 'Student Lobby', '🎮'],
  ['gamezone', 'Game Zone', '🗺️'],
  ['quiz', 'Solo Quiz', '🧠'],
  ['battle', '1v1 Arena', '⚔️'],
  ['leaderboard', 'Leaderboard', '🏆'],
  ['studio', 'Smart Board Studio', '📺'],
  ['system', 'Design System', '🎨']
]

const topics = ['Algebra', 'Geometry', 'Statistics', 'Aptitude & Mental Reasoning', 'Fractions', 'Speed Maths']
const levels = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','JHS 1','JHS 2','JHS 3','SHS 1','SHS 2','SHS 3']
const curricula = ['GES', 'Cambridge', 'Pearson Edexcel']

const tabMarkup = screens.map(([id, label, icon]) => `
  <button type="button" class="screen-tab ${id === 'landing' ? 'active' : ''}" data-target="${id}">
    <span>${icon}</span>${label}
  </button>
`).join('')

const featureCards = [
  ['🎯','Solo Practice','Sharpen skills with 15-question adaptive sets.','emerald'],
  ['⚔️','1v1 Battle','Challenge classmates or AI opponents in real time.','rose'],
  ['🛡️','School vs School','Represent your school in weekly battles.','blue'],
  ['📅','Daily Challenge','Complete daily missions and collect rewards.','orange'],
  ['📘','Mezzopedia Mode','Prepare for national mathematics contests.','gold']
].map(([icon,title,desc,accent]) => `
  <article class="feature-card glass-card accent-${accent}"><span class="feature-icon">${icon}</span><h3>${title}</h3><p>${desc}</p></article>
`).join('')

const modeCards = [
  ['🎯','Solo Practice','Improve your skills','quiz','mode-green'],
  ['🗺️','Game Zone','Level, topic & trophy map','gamezone','mode-cyan'],
  ['⚔️','1v1 Battle','Challenge now','battle','mode-red'],
  ['🗓️','Daily Challenge','Ends in 08:45:12','quiz','mode-purple'],
  ['🏆','Weekly Tournament','Starts in 2d 15h','leaderboard','mode-orange'],
  ['🎓','Exam Practice','BECE, WASSCE & Olympiads','quiz','mode-blue'],
  ['📚','Mezzopedia Mode','National Contest Prep','leaderboard','mode-gold']
].map(([icon,title,sub,target,cls]) => `
  <button type="button" class="game-mode-card ${cls}" data-target="${target}"><span>${icon}</span><div><strong>${title}</strong><small>${sub}</small></div></button>
`).join('')

const levelOptions = levels.map(level => `<option ${level === 'JHS 2' ? 'selected' : ''}>${level}</option>`).join('')
const curriculumOptions = curricula.map(curriculum => `<option>${curriculum}</option>`).join('')
const topicChips = topics.map((topic, index) => `<button type="button" class="topic-chip ${index < 3 ? 'active' : ''}">${index < 3 ? '✓' : '+'} ${topic}</button>`).join('')

const leaderboardRows = [
  [4,'👧🏾','Ananya Iyer','St. Joseph School','Western','9,870',211,'88%'],
  [5,'👧🏽','Adwoa Nair','Deli Public School','Eastern','9,210',204,'86%'],
  [6,'👦🏽','Kabir Singh','Ryan International','Northern','8,760',193,'84%'],
  [7,'👧🏾','Myra Kulkarni','Podar International','Greater Accra','8,430',181,'85%']
].map(row => `
  <tr><td>${row[0]}</td><td><span class="student-cell"><span>${row[1]}</span>${row[2]}</span></td><td>${row[3]}</td><td>${row[4]}</td><td>${row[5]}</td><td>${row[6]}</td><td>${row[7]}</td></tr>
`).join('')

const root = document.getElementById('root')

root.innerHTML = `
  <main class="app-shell">
    <div class="orb orb-one"></div><div class="orb orb-two"></div><div class="orb orb-three"></div>
    <section class="app-frame">
      <nav class="screen-tabs" aria-label="Screen navigation">
        <div class="brand-chip"><span class="brand-crown">♛</span><div><strong>MEZZO</strong><small>Maths Battle Arena</small></div></div>
        <div class="tab-scroll">${tabMarkup}</div>
      </nav>

      <section class="screen landing-screen app-screen" data-screen="landing">
        <header class="top-nav glass-card"><div class="logo-lockup"><span>♛</span><div><strong>MEZZO</strong><small>Maths Battle Arena</small></div></div><div class="desktop-links"><a>Features</a><a>Contests</a><a>Schools</a><button class="btn btn-ghost">Login</button></div></header>
        <section class="hero-grid"><div class="hero-copy"><div class="pill">🏆 Mezzopedia National Contest Prep</div><h1>Turn Mathematics Into an Exciting Battle</h1><p>Practice, compete, earn rewards, and rise to the top of the national leaderboard.</p><div class="cta-row"><button class="btn btn-gold" data-target="battle">⚡ Start Battle</button><button class="btn btn-primary" data-target="lobby">👤 Join as Student</button><button class="btn btn-blue">🏫 Register Your School</button></div></div><div class="hero-visual glass-card"><div class="math-float f1">π</div><div class="math-float f2">√x</div><div class="math-float f3">a²+b²</div><div class="math-float f4">%</div><div class="arena-ring"><div class="student student-left">👦🏽</div><div class="trophy-tower">🏆</div><div class="student student-right">👧🏾</div></div><div class="coins-row"><span>🪙</span><span>🪙</span><span>💎</span><span>⭐</span></div></div></section>
        <section class="feature-section"><div class="section-heading"><span>Choose your battle mode</span><h2>One app for practice, contests, and school competitions.</h2></div><div class="feature-grid five-grid">${featureCards}</div></section>
        <section class="stats-strip glass-card"><div class="stat"><span>👥</span><strong>120K+</strong><small>Students</small></div><div class="stat"><span>🌍</span><strong>600+</strong><small>Schools</small></div><div class="stat"><span>🛡️</span><strong>50+</strong><small>Cities</small></div><div class="stat"><span>🏅</span><strong>Mezzopedia</strong><small>National Maths Contest</small></div></section>
      </section>

      <section class="screen lobby-screen app-screen" data-screen="lobby" hidden>
        <section class="lobby-header glass-card"><div class="profile-block"><div class="avatar avatar-large glow">👦🏽</div><div class="profile-meta"><h2>Arjun Sharma</h2><p>JHS 2 • Meridian Public School</p><div class="xp-line"><span>Lv. 23</span><div class="progress-track"><i style="width:76%"></i></div><small>7,650 / 10,000 XP</small></div></div></div><div class="wallet-row"><div class="wallet"><span>🪙</span><strong>12,450</strong><small>Coins</small></div><div class="wallet"><span>💎</span><strong>320</strong><small>Gems</small></div><div class="wallet"><span>🔥</span><strong>12</strong><small>Day Streak</small></div></div></section>
        <section class="stats-grid"><article class="mini-stat glass-card"><span>⭐</span><strong>7,650</strong><small>Total XP</small></article><article class="mini-stat glass-card"><span>🏆</span><strong>186</strong><small>Wins</small></article><article class="mini-stat glass-card"><span>⚔️</span><strong>352</strong><small>Battles</small></article><article class="mini-stat glass-card"><span>🎯</span><strong>87%</strong><small>Accuracy</small></article></section>
        <section class="rank-grid"><article class="rank-card glass-card"><span>🛡️</span><div><small>School Rank</small><strong>#3</strong><p>Out of 250</p></div></article><article class="rank-card glass-card featured"><span>💜</span><div><small>Regional Rank</small><strong>#12</strong><p>Out of 2,450</p></div></article><article class="rank-card glass-card gold"><span>🏆</span><div><small>National Rank</small><strong>#89</strong><p>Out of 120,000</p></div></article></section>
        <section class="game-mode-section"><div class="section-row"><h3>Choose your mode</h3><span>Gaming lobby</span></div><div class="game-mode-grid">${modeCards}</div></section>
        <section class="lobby-additions-grid"><section class="setup-panel glass-card compact"><div class="section-row setup-heading"><h3>Student Learning Setup</h3><span>Class • Curriculum • Topics</span></div><div class="setup-grid"><label class="field-group"><span>Class Level</span><select>${levelOptions}</select></label><label class="field-group"><span>Curriculum</span><select>${curriculumOptions}</select></label></div><div class="topic-area-block"><div class="topic-title-row"><strong>Specific Topic Areas</strong><small>3 selected</small></div><div class="topic-chip-grid">${topicChips}</div></div></section><section class="map-card glass-card compact"><div class="section-row setup-heading"><h3>JHS 2 Trophy Map</h3><span>15 questions per stage</span></div><div class="map-rule-row"><span class="badge badge-green">Pass: 13/15+</span><span class="badge badge-gold">Ultimate Trophy</span></div><div class="stage-map"><div class="stage-node done"><span>✓</span><strong>Training Camp</strong><small>Set 1</small><i></i></div><div class="stage-node done"><span>✓</span><strong>Number Fortress</strong><small>Set 2</small><i></i></div><div class="stage-node active"><span>⚡</span><strong>Logic Bridge</strong><small>Set 3</small><i></i></div><div class="stage-node locked"><span>🔒</span><strong>Arena Semi-Final</strong><small>Set 4</small><i></i></div><div class="stage-node locked"><span>🔒</span><strong>Ultimate Trophy</strong><small>Final Set</small></div></div></section></section>
      </section>

      <section class="screen gamezone-screen app-screen" data-screen="gamezone" hidden>
        <section class="session-hero glass-card"><div><div class="pill">🗺️ Game Zone Session Builder</div><h1>Pick your class, curriculum and topic path.</h1><p>Every stage contains a 15-question set. A score above 12 unlocks the next stage on the map until the student reaches the ultimate trophy for that class level.</p><div class="cta-row"><button class="btn btn-gold" data-target="quiz">▶ Start 15-Question Set</button><button class="btn btn-primary" data-target="battle">⚔️ Battle from This Topic</button></div></div><div class="session-summary-grid"><article class="session-card"><span>🧩</span><strong>15</strong><small>Questions per set</small></article><article class="session-card"><span>✅</span><strong>13 / 15</strong><small>Progress pass mark</small></article><article class="session-card"><span>⭐</span><strong>+250 XP</strong><small>Stage reward</small></article><article class="session-card"><span>🏆</span><strong>5 stages</strong><small>Trophy path</small></article></div></section>
        <section class="gamezone-grid"><section class="setup-panel glass-card"><div class="section-row setup-heading"><h3>Student Learning Setup</h3><span>Grade 1 to SHS 3</span></div><div class="setup-grid"><label class="field-group"><span>Class Level</span><select>${levelOptions}</select></label><label class="field-group"><span>Curriculum</span><select>${curriculumOptions}</select></label></div><div class="topic-area-block"><div class="topic-title-row"><strong>Specific Topic Areas</strong><small>Select one or more</small></div><div class="topic-chip-grid">${topicChips}</div></div></section><section class="map-card glass-card"><div class="section-row setup-heading"><h3>Trophy Map</h3><span>15 questions per stage</span></div><div class="map-rule-row"><span class="badge badge-green">Pass: 13/15+</span><span class="badge badge-gold">Ultimate Trophy</span></div><div class="stage-map"><div class="stage-node done"><span>✓</span><strong>Training Camp</strong><small>Set 1</small><i></i></div><div class="stage-node done"><span>✓</span><strong>Number Fortress</strong><small>Set 2</small><i></i></div><div class="stage-node active"><span>⚡</span><strong>Logic Bridge</strong><small>Set 3</small><i></i></div><div class="stage-node locked"><span>🔒</span><strong>Arena Semi-Final</strong><small>Set 4</small><i></i></div><div class="stage-node locked"><span>🔒</span><strong>Ultimate Trophy</strong><small>Final Set</small></div></div></section></section>
      </section>

      <section class="screen quiz-screen app-screen" data-screen="quiz" hidden>
        <section class="quiz-top glass-card"><button class="btn btn-ghost" data-target="lobby">← Quit</button><div class="quiz-progress-wrap"><span>Question 7 / 15 • Pass mark 13/15</span><div class="progress-track"><i style="width:68%"></i></div></div><div class="timer danger">⏱ 00:18</div></section>
        <section class="quiz-rule-strip glass-card"><span>🎯 Each practice set has 15 questions</span><span>✅ Score above 12 to unlock the next map stage</span><span>🏆 Current goal: Ultimate Trophy</span></section>
        <section class="quiz-layout"><article class="question-card light-card"><div class="question-meta"><span>JHS 2 • GES</span><span class="difficulty">Algebra</span></div><h2>2x² + 5x − 3 = 0</h2><div class="answer-grid"><button class="answer-card"><span>A</span><strong>x = 1, -3/2</strong></button><button class="answer-card"><span>B</span><strong>x = -1, 3/2</strong></button><button class="answer-card" data-correct="true"><span>C</span><strong>x = 1/2, -3</strong></button><button class="answer-card"><span>D</span><strong>x = -1/2, 3</strong></button></div></article><aside class="score-panel glass-card"><div class="panel-metric"><span>⭐</span><small>XP</small><strong>1,250</strong></div><div class="panel-metric"><span>🪙</span><small>Coins</small><strong>210</strong></div><div class="panel-metric"><span>🔥</span><small>Streak</small><strong>12 days</strong></div><div class="panel-metric"><span>🎯</span><small>Score</small><strong>420</strong></div></aside></section>
        <section class="explanation-card light-card"><div class="result-banner"><strong>Correct! 🎉</strong><div><span>+20 XP</span><span>+10 coins</span></div></div><div class="explanation-content"><div><h3>Step-by-step explanation</h3><p>Using the quadratic formula, x = (-b ± √(b² − 4ac)) / 2a.</p><p>For a = 2, b = 5, c = −3: x = (-5 ± √49) / 4 = (-5 ± 7) / 4.</p><p>Therefore, x = 1/2 or x = -3.</p></div><div class="clipboard">✅</div></div></section>
      </section>

      <section class="screen battle-screen app-screen" data-screen="battle" hidden>
        <section class="arena-scoreboard glass-card"><div class="player-bar left"><div class="avatar avatar-small">👦🏽</div><div><strong>Arjun</strong><small>Lv. 23</small><div class="progress-track success"><i style="width:65%"></i></div></div><span class="score-badge">420</span></div><div class="round-clock"><span>Round 2 / 5</span><strong>00:12</strong></div><div class="player-bar right"><div class="avatar avatar-small">🤖</div><div><strong>MathBot Pro</strong><small>Lv. 20</small><div class="progress-track"><i style="width:76%"></i></div></div><span class="score-badge">360</span></div></section>
        <section class="battle-context glass-card"><span>🗺️ Game Zone Battle</span><strong>JHS 2</strong><span>GES</span><span>Algebra + Geometry</span><span>15 questions • pass 13/15</span></section>
        <section class="arena-stage glass-card"><div class="bonus-stack"><span class="badge badge-green">✓ Correct!</span><span class="badge badge-blue">⚡ Speed Bonus +15</span><span class="badge badge-orange">🔥 Streak Bonus ×3</span></div><div class="vs-row"><div class="fighter fighter-left"><div class="avatar avatar-battle glow">👦🏽</div><span>Student</span></div><div class="vs-badge">VS</div><div class="fighter fighter-right"><div class="avatar avatar-battle glow">🤖</div><span>AI Bot</span></div></div><article class="battle-question"><span>Simplify:</span><h2>(3x² − 2x + 1) + (2x² + 5x − 4)</h2></article><div class="battle-answer-grid"><button class="battle-answer"><span>A</span><strong>5x² − 7x − 3</strong></button><button class="battle-answer correct"><span>B</span><strong>5x² + 3x − 3</strong></button><button class="battle-answer"><span>C</span><strong>x² + 3x − 5</strong></button><button class="battle-answer"><span>D</span><strong>5x² + 7x − 3</strong></button></div><div class="battle-progress"><span>Battle progress</span><div><i class="active">1</i><i class="active">2</i><i>3</i><i>4</i><i>5</i></div></div></section>
      </section>

      <section class="screen leaderboard-screen app-screen" data-screen="leaderboard" hidden>
        <section class="leader-tabs glass-card"><button>School</button><button>Region</button><button class="active">National</button><button>Weekly Tournament</button></section>
        <section class="podium-grid"><article class="podium-card rank-2"><span class="medal">🥈</span><div class="avatar avatar-medium">👦🏽</div><h3>Arjun Sharma</h3><p>Meridian Public School</p><strong>11,250 XP</strong></article><article class="podium-card rank-1"><span class="medal">🥇</span><div class="avatar avatar-medium">👧🏽</div><h3>Riya Patel</h3><p>Bright Future School</p><strong>12,950 XP</strong></article><article class="podium-card rank-3"><span class="medal">🥉</span><div class="avatar avatar-medium">👦🏾</div><h3>Vivaan Mensah</h3><p>Sunrise School</p><strong>10,480 XP</strong></article></section>
        <section class="table-card glass-card"><div class="table-header"><h2>National Leaderboard</h2><span>Updates every 15 minutes</span></div><div class="responsive-table"><table><thead><tr><th>#</th><th>Student</th><th>School</th><th>Region</th><th>XP</th><th>Wins</th><th>Accuracy</th></tr></thead><tbody>${leaderboardRows}</tbody></table></div></section>
      </section>

      <section class="screen studio-screen app-screen" data-screen="studio" hidden>
        <section class="studio-board"><aside class="contestant-card student-a"><div class="contest-label">Student A</div><div class="avatar avatar-medium">👦🏽</div><h3>Arjun Sharma</h3><p>Meridian Public School</p><strong class="contest-score blue">650</strong><div class="progress-track"><i style="width:76%"></i></div><div class="round-dots"><span class="active">✓</span><span class="active">✓</span><span class="active">✓</span><span class="active">✓</span><span></span><span></span><span></span><span></span></div><div class="answer-status correct">Current Answer: B ✓ Correct</div></aside><main class="smart-question-card light-card"><div class="studio-meta"><strong>Round 3 / 10</strong><span>00:18</span></div><p>Factorise:</p><h1>x² − 5x + 6</h1><div class="studio-options"><span>A. (x − 2)(x − 3)</span><span>B. (x − 2)(x + 3)</span><span>C. (x + 2)(x − 3)</span><span>D. (x − 1)(x − 6)</span></div></main><aside class="contestant-card student-b"><div class="contest-label">Student B</div><div class="avatar avatar-medium">👧🏾</div><h3>Myra Kulkarni</h3><p>Podar International School</p><strong class="contest-score red">550</strong><div class="progress-track"><i style="width:65%"></i></div><div class="round-dots"><span class="active">✓</span><span class="wrong">×</span><span></span><span></span><span></span><span></span><span></span><span></span></div><div class="answer-status wrong">Current Answer: A ✕ Wrong</div></aside></section>
        <section class="teacher-controls glass-card"><button class="btn btn-success">▶ Start Contest</button><button class="btn btn-blue">↪ Next Question</button><button class="btn btn-gold">Ⅱ Pause</button><button class="btn btn-danger">■ End Contest</button><button class="btn btn-ghost">⚙ Settings</button></section>
      </section>

      <section class="screen system-screen app-screen" data-screen="system" hidden>
        <section class="system-grid"><article class="system-panel light-card"><h2>Color palette</h2><div class="palette-grid"><div class="color-swatch"><span style="background:#7C3AED"></span><strong>Primary</strong><small>#7C3AED</small></div><div class="color-swatch"><span style="background:#22D3EE"></span><strong>Secondary</strong><small>#22D3EE</small></div><div class="color-swatch"><span style="background:#F59E0B"></span><strong>Gold</strong><small>#F59E0B</small></div><div class="color-swatch"><span style="background:#22C55E"></span><strong>Success</strong><small>#22C55E</small></div></div></article><article class="system-panel light-card"><h2>Typography styles</h2><div class="type-list"><div><h1>H1 Heading</h1><span>Rajdhani / Bold</span></div><div><p>Body text for instructions and dashboard labels.</p><span>Nunito / Regular</span></div><div><code>STAT 12,450 XP</code><span>JetBrains Mono</span></div></div></article><article class="system-panel light-card"><h2>Button styles</h2><div class="button-demo-grid"><button class="btn btn-primary">Primary</button><button class="btn btn-blue">Secondary</button><button class="btn btn-gold">Accent</button><button class="btn btn-success">Success</button><button class="btn btn-ghost">Ghost</button><button class="btn btn-danger">Danger</button></div></article><article class="system-panel light-card"><h2>Academic game rules</h2><div class="rules-demo-grid"><div><strong>Levels</strong><span>Grade 1 to SHS 3</span></div><div><strong>Question Set</strong><span>15 questions</span></div><div><strong>Pass Mark</strong><span>Above 12 = progress</span></div><div><strong>Curricula</strong><span>GES, Cambridge, Pearson Edexcel</span></div></div></article></section>
      </section>
    </section>
  </main>
`

function activateScreen(target) {
  document.querySelectorAll('.app-screen').forEach((screen) => {
    screen.hidden = screen.dataset.screen !== target
  })
  document.querySelectorAll('.screen-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.target === target)
  })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

document.addEventListener('click', (event) => {
  const targetButton = event.target.closest('[data-target]')
  if (targetButton) {
    activateScreen(targetButton.dataset.target)
    return
  }

  const topicChip = event.target.closest('.topic-chip')
  if (topicChip) {
    topicChip.classList.toggle('active')
    const active = topicChip.classList.contains('active')
    topicChip.textContent = `${active ? '✓' : '+'} ${topicChip.textContent.replace(/^✓\s|^\+\s/, '')}`
    return
  }

  const answer = event.target.closest('.answer-card')
  if (answer) {
    document.querySelectorAll('.answer-card').forEach((card) => card.classList.remove('correct', 'wrong'))
    answer.classList.add(answer.dataset.correct ? 'correct' : 'wrong')
  }
})

activateScreen('landing')
