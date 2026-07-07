import { useEffect, useMemo, useState } from 'react'

const screens = [
  { id: 'landing', label: 'Landing', icon: '🏠' },
  { id: 'lobby', label: 'Student Lobby', icon: '🎮' },
  { id: 'gamezone', label: 'Game Zone', icon: '🗺️' },
  { id: 'quiz', label: 'Solo Quiz', icon: '🧠' },
  { id: 'battle', label: '1v1 Arena', icon: '⚔️' },
  { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  { id: 'studio', label: 'Smart Board Studio', icon: '📺' },
  { id: 'system', label: 'Design System', icon: '🎨' }
]

const modes = [
  { title: 'Solo Practice', icon: '🎯', description: 'Sharpen maths skills with adaptive question sets.', accent: 'emerald' },
  { title: '1v1 Battle', icon: '⚔️', description: 'Challenge classmates or AI opponents in real time.', accent: 'rose' },
  { title: 'School vs School', icon: '🛡️', description: 'Represent your school in weekly academic battles.', accent: 'blue' },
  { title: 'Daily Challenge', icon: '📅', description: 'Complete daily missions and collect big rewards.', accent: 'orange' },
  { title: 'Mezzopedia Mode', icon: '📘', description: 'Prepare for the national mathematics contest.', accent: 'gold' }
]

const gameModes = [
  { title: 'Solo Practice', subtitle: 'Improve your skills', icon: '🎯', className: 'mode-green' },
  { title: 'Game Zone', subtitle: 'Level, topic & trophy map', icon: '🗺️', className: 'mode-cyan' },
  { title: '1v1 Battle', subtitle: 'Challenge now', icon: '⚔️', className: 'mode-red' },
  { title: 'Daily Challenge', subtitle: 'Ends in 08:45:12', icon: '🗓️', className: 'mode-purple' },
  { title: 'Weekly Tournament', subtitle: 'Starts in 2d 15h', icon: '🏆', className: 'mode-orange' },
  { title: 'Exam Practice', subtitle: 'BECE & Olympiads', icon: '🎓', className: 'mode-blue' },
  { title: 'Mezzopedia Mode', subtitle: 'National Contest Prep', icon: '📚', className: 'mode-gold' }
]

const leaderboard = [
  { rank: 1, name: 'Riya Patel', school: 'Bright Future School', region: 'Greater Accra', xp: '12,950', wins: 285, accuracy: '94%', avatar: '👧🏽' },
  { rank: 2, name: 'Arjun Sharma', school: 'Meridian Public School', region: 'Ashanti', xp: '11,250', wins: 248, accuracy: '91%', avatar: '👦🏽' },
  { rank: 3, name: 'Vivaan Mensah', school: 'Sunrise School', region: 'Central', xp: '10,480', wins: 230, accuracy: '90%', avatar: '👦🏾' },
  { rank: 4, name: 'Ananya Iyer', school: 'St. Joseph School', region: 'Western', xp: '9,870', wins: 211, accuracy: '88%', avatar: '👧🏾' },
  { rank: 5, name: 'Adwoa Nair', school: 'Deli Public School', region: 'Eastern', xp: '9,210', wins: 204, accuracy: '86%', avatar: '👧🏽' },
  { rank: 6, name: 'Kabir Singh', school: 'Ryan International', region: 'Northern', xp: '8,760', wins: 193, accuracy: '84%', avatar: '👦🏽' }
]

const answers = [
  { key: 'A', value: 'x = 1, -3/2', correct: false },
  { key: 'B', value: 'x = -1, 3/2', correct: false },
  { key: 'C', value: 'x = 1/2, -3', correct: true },
  { key: 'D', value: 'x = -1/2, 3', correct: false }
]

const classLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'JHS 1', 'JHS 2', 'JHS 3', 'SHS 1', 'SHS 2', 'SHS 3']

const curricula = ['GES', 'Cambridge', 'Pearson Edexcel']

const topicsByLevel = {
  'Grade 1': ['Counting & Number Sense', 'Basic Addition', 'Basic Subtraction', 'Shapes & Patterns', 'Time & Money', 'Mental Maths Games'],
  'Grade 2': ['Place Value', 'Addition & Subtraction', 'Multiplication Foundations', 'Measurement', 'Patterns & Relationships', 'Mental Speed'],
  'Grade 3': ['Multiplication Strategies', 'Division Techniques', 'Fractions Introduction', 'Time Calculations', 'Graphs & Charts', 'Logical Reasoning'],
  'Grade 4': ['Fractions & Decimals', 'Multiplying Close to 100', 'Lattice & Graphical Multiplication', 'Geometry Basics', 'Data Handling', 'Number Puzzles'],
  'Grade 5': ['Number Operations', 'Fractions, Decimals & Percentages', 'Geometry', 'Statistics', 'Aptitude & Mental Reasoning', 'Contest Practice'],
  'Grade 6': ['Pre-Algebra', 'Ratio & Proportion', 'Angles, Area & Volume', 'Statistics', 'Aptitude & Mental Reasoning', 'Mezzopedia Prep'],
  'JHS 1': ['Integers & Number Systems', 'Algebraic Expressions', 'Geometry', 'Data Handling', 'Problem Solving', 'Mental Reasoning'],
  'JHS 2': ['Linear Equations', 'Ratios & Percentages', 'Pythagoras & Geometry', 'Probability & Statistics', 'Aptitude & Mental Reasoning', 'Speed Maths'],
  'JHS 3': ['BECE Exam Practice', 'Algebra', 'Geometry', 'Statistics', 'Aptitude & Mental Reasoning', 'Mock Contest Sets'],
  'SHS 1': ['Surds & Indices', 'Sets & Logic', 'Linear & Quadratic Equations', 'Coordinate Geometry', 'Statistics', 'Mathematical Reasoning'],
  'SHS 2': ['Functions & Graphs', 'Trigonometry', 'Sequences & Series', 'Probability', 'Vectors & Mensuration', 'Advanced Problem Solving'],
  'SHS 3': ['WASSCE Practice', 'Advanced Algebra', 'Calculus Foundations', 'Statistics', 'Vectors & Trigonometry', 'National Contest Revision']
}

const stageNodes = [
  { title: 'Training Camp', subtitle: 'Set 1', status: 'done' },
  { title: 'Number Fortress', subtitle: 'Set 2', status: 'done' },
  { title: 'Logic Bridge', subtitle: 'Set 3', status: 'active' },
  { title: 'Arena Semi-Final', subtitle: 'Set 4', status: 'locked' },
  { title: 'Ultimate Trophy', subtitle: 'Final Set', status: 'locked' }
]

const gameZoneRules = [
  { label: 'Questions per set', value: '15', icon: '🧩' },
  { label: 'Progress pass mark', value: '13 / 15', icon: '✅' },
  { label: 'Stage reward', value: '+250 XP', icon: '⭐' },
  { label: 'Trophy path', value: '5 stages', icon: '🏆' }
]

function App() {
  const [activeScreen, setActiveScreen] = useState('landing')
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [battleAnswer, setBattleAnswer] = useState(null)
  const [selectedLevel, setSelectedLevel] = useState('JHS 2')
  const [selectedCurriculum, setSelectedCurriculum] = useState('GES')
  const [selectedTopics, setSelectedTopics] = useState(topicsByLevel['JHS 2'].slice(0, 3))

  useEffect(() => {
    const levelTopics = topicsByLevel[selectedLevel] || []
    setSelectedTopics((currentTopics) => {
      const keptTopics = currentTopics.filter((topic) => levelTopics.includes(topic))
      return keptTopics.length ? keptTopics : levelTopics.slice(0, 3)
    })
  }, [selectedLevel])

  const toggleTopic = (topic) => {
    setSelectedTopics((currentTopics) => {
      if (currentTopics.includes(topic)) return currentTopics.filter((item) => item !== topic)
      return [...currentTopics, topic]
    })
  }

  const active = useMemo(() => screens.find((screen) => screen.id === activeScreen), [activeScreen])

  return (
    <main className="app-shell">
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <div className="orb orb-three" />

      <section className="app-frame">
        <nav className="screen-tabs" aria-label="Screen navigation">
          <div className="brand-chip">
            <span className="brand-crown">♛</span>
            <div>
              <strong>MEZZO</strong>
              <small>Maths Battle Arena</small>
            </div>
          </div>
          <div className="tab-scroll">
            {screens.map((screen) => (
              <button
                key={screen.id}
                type="button"
                onClick={() => setActiveScreen(screen.id)}
                className={`screen-tab ${activeScreen === screen.id ? 'active' : ''}`}
              >
                <span>{screen.icon}</span>
                {screen.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="active-title">
          <span>{active?.icon}</span>
          <p>{active?.label}</p>
        </div>

        {activeScreen === 'landing' && <LandingPage setActiveScreen={setActiveScreen} />}
        {activeScreen === 'lobby' && (
          <LobbyPage
            setActiveScreen={setActiveScreen}
            selectedLevel={selectedLevel}
            setSelectedLevel={setSelectedLevel}
            selectedCurriculum={selectedCurriculum}
            setSelectedCurriculum={setSelectedCurriculum}
            selectedTopics={selectedTopics}
            toggleTopic={toggleTopic}
          />
        )}
        {activeScreen === 'gamezone' && (
          <GameZonePage
            setActiveScreen={setActiveScreen}
            selectedLevel={selectedLevel}
            setSelectedLevel={setSelectedLevel}
            selectedCurriculum={selectedCurriculum}
            setSelectedCurriculum={setSelectedCurriculum}
            selectedTopics={selectedTopics}
            toggleTopic={toggleTopic}
          />
        )}
        {activeScreen === 'quiz' && <QuizPage selectedAnswer={selectedAnswer} setSelectedAnswer={setSelectedAnswer} selectedLevel={selectedLevel} selectedCurriculum={selectedCurriculum} selectedTopics={selectedTopics} />}
        {activeScreen === 'battle' && <BattlePage battleAnswer={battleAnswer} setBattleAnswer={setBattleAnswer} selectedLevel={selectedLevel} selectedCurriculum={selectedCurriculum} selectedTopics={selectedTopics} />}
        {activeScreen === 'leaderboard' && <LeaderboardPage />}
        {activeScreen === 'studio' && <StudioPage />}
        {activeScreen === 'system' && <DesignSystem />}
      </section>
    </main>
  )
}

function LandingPage({ setActiveScreen }) {
  return (
    <div className="screen landing-screen">
      <header className="top-nav glass-card">
        <div className="logo-lockup">
          <span>♛</span>
          <div>
            <strong>MEZZO</strong>
            <small>Maths Battle Arena</small>
          </div>
        </div>
        <div className="desktop-links">
          <a href="#features">Features</a>
          <a href="#contests">Contests</a>
          <a href="#schools">Schools</a>
          <button type="button" className="btn btn-ghost">Login</button>
        </div>
      </header>

      <section className="hero-grid">
        <div className="hero-copy">
          <div className="pill">🏆 Mezzopedia National Contest Prep</div>
          <h1>Turn Mathematics Into an Exciting Battle</h1>
          <p>Practice, compete, earn rewards, and rise to the top of the national leaderboard.</p>
          <div className="cta-row">
            <button type="button" className="btn btn-gold" onClick={() => setActiveScreen('battle')}>⚡ Start Battle</button>
            <button type="button" className="btn btn-primary" onClick={() => setActiveScreen('lobby')}>👤 Join as Student</button>
            <button type="button" className="btn btn-blue">🏫 Register Your School</button>
          </div>
        </div>

        <div className="hero-visual glass-card">
          <div className="math-float f1">π</div>
          <div className="math-float f2">√x</div>
          <div className="math-float f3">a²+b²</div>
          <div className="math-float f4">%</div>
          <div className="arena-ring">
            <div className="student student-left">👦🏽</div>
            <div className="trophy-tower">🏆</div>
            <div className="student student-right">👧🏾</div>
          </div>
          <div className="coins-row">
            <span>🪙</span><span>🪙</span><span>💎</span><span>⭐</span>
          </div>
        </div>
      </section>

      <section id="features" className="feature-section">
        <div className="section-heading">
          <span>Choose your battle mode</span>
          <h2>One app for practice, contests, and school competitions.</h2>
        </div>
        <div className="feature-grid five-grid">
          {modes.map((mode) => (
            <article key={mode.title} className={`feature-card glass-card accent-${mode.accent}`}>
              <span className="feature-icon">{mode.icon}</span>
              <h3>{mode.title}</h3>
              <p>{mode.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="stats-strip glass-card">
        <Stat icon="👥" value="120K+" label="Students" />
        <Stat icon="🌍" value="600+" label="Schools" />
        <Stat icon="🛡️" value="50+" label="Cities" />
        <Stat icon="🏅" value="Mezzopedia" label="National Maths Contest" />
      </section>
    </div>
  )
}

function LobbyPage({ setActiveScreen, selectedLevel, setSelectedLevel, selectedCurriculum, setSelectedCurriculum, selectedTopics, toggleTopic }) {
  return (
    <div className="screen lobby-screen">
      <section className="lobby-header glass-card">
        <div className="profile-block">
          <Avatar emoji="👦🏽" size="large" glow />
          <div className="profile-meta">
            <h2>Arjun Sharma</h2>
            <p>{selectedLevel} • Meridian Public School</p>
            <div className="xp-line">
              <span>Lv. 23</span>
              <Progress value="76" />
              <small>7,650 / 10,000 XP</small>
            </div>
          </div>
        </div>
        <div className="wallet-row">
          <Wallet icon="🪙" value="12,450" label="Coins" />
          <Wallet icon="💎" value="320" label="Gems" />
          <Wallet icon="🔥" value="12" label="Day Streak" />
        </div>
      </section>

      <section className="stats-grid">
        <MiniStat icon="⭐" value="7,650" label="Total XP" />
        <MiniStat icon="🏆" value="186" label="Wins" />
        <MiniStat icon="⚔️" value="352" label="Battles" />
        <MiniStat icon="🎯" value="87%" label="Accuracy" />
      </section>

      <section className="rank-grid">
        <RankCard label="School Rank" value="#3" sub="Out of 250" icon="🛡️" />
        <RankCard label="Regional Rank" value="#12" sub="Out of 2,450" icon="💜" featured />
        <RankCard label="National Rank" value="#89" sub="Out of 120,000" icon="🏆" gold />
      </section>

      <section className="game-mode-section">
        <div className="section-row">
          <h3>Choose your mode</h3>
          <span>Gaming lobby</span>
        </div>
        <div className="game-mode-grid">
          {gameModes.map((mode) => (
            <button
              type="button"
              key={mode.title}
              className={`game-mode-card ${mode.className}`}
              onClick={() => {
                if (mode.title === 'Solo Practice') setActiveScreen('quiz')
                if (mode.title === 'Game Zone') setActiveScreen('gamezone')
                if (mode.title === '1v1 Battle') setActiveScreen('battle')
                if (mode.title === 'Mezzopedia Mode') setActiveScreen('leaderboard')
              }}
            >
              <span>{mode.icon}</span>
              <div>
                <strong>{mode.title}</strong>
                <small>{mode.subtitle}</small>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="lobby-additions-grid">
        <ClassCurriculumPanel
          selectedLevel={selectedLevel}
          setSelectedLevel={setSelectedLevel}
          selectedCurriculum={selectedCurriculum}
          setSelectedCurriculum={setSelectedCurriculum}
          selectedTopics={selectedTopics}
          toggleTopic={toggleTopic}
          compact
        />
        <StageMap selectedLevel={selectedLevel} compact />
      </section>

      <section className="streak-card glass-card">
        <div>
          <h3>Your 7-day activity</h3>
          <p>Keep the streak alive to unlock bonus coins.</p>
        </div>
        <div className="days-row">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
            <span key={day} className={index < 5 ? 'done' : index === 5 ? 'today' : ''}>{index < 5 ? '✓' : index === 5 ? '★' : '○'} {day}</span>
          ))}
        </div>
      </section>

      <MobileNav />
    </div>
  )
}

function QuizPage({ selectedAnswer, setSelectedAnswer, selectedLevel, selectedCurriculum, selectedTopics }) {
  return (
    <div className="screen quiz-screen">
      <section className="quiz-top glass-card">
        <button className="btn btn-ghost" type="button">← Quit</button>
        <div className="quiz-progress-wrap">
          <span>Question 7 / 15 • Pass mark 13/15</span>
          <Progress value="68" />
        </div>
        <div className="timer danger">⏱ 00:18</div>
      </section>

      <section className="quiz-rule-strip glass-card">
        <span>🎯 Each practice set has 15 questions</span>
        <span>✅ Score above 12 to unlock the next map stage</span>
        <span>🏆 Current goal: Ultimate Trophy for {selectedLevel}</span>
      </section>

      <section className="quiz-layout">
        <article className="question-card light-card">
          <div className="question-meta">
            <span>{selectedLevel} • {selectedCurriculum}</span>
            <span className="difficulty">{selectedTopics[0] || 'Topic Practice'}</span>
          </div>
          <h2>2x² + 5x − 3 = 0</h2>
          <div className="answer-grid">
            {answers.map((answer) => {
              const isSelected = selectedAnswer === answer.key
              const resultClass = selectedAnswer && answer.correct ? 'correct' : isSelected ? 'wrong' : ''
              return (
                <button
                  key={answer.key}
                  type="button"
                  className={`answer-card ${resultClass}`}
                  onClick={() => setSelectedAnswer(answer.key)}
                >
                  <span>{answer.key}</span>
                  <strong>{answer.value}</strong>
                </button>
              )
            })}
          </div>
        </article>

        <aside className="score-panel glass-card">
          <PanelMetric icon="⭐" label="XP" value="1,250" />
          <PanelMetric icon="🪙" label="Coins" value="210" />
          <PanelMetric icon="🔥" label="Streak" value="12 days" />
          <PanelMetric icon="🎯" label="Score" value="420" />
        </aside>
      </section>

      {selectedAnswer && (
        <section className="explanation-card light-card">
          <div className="result-banner">
            <strong>Correct! 🎉</strong>
            <div><span>+20 XP</span><span>+10 coins</span></div>
          </div>
          <div className="explanation-content">
            <div>
              <h3>Step-by-step explanation</h3>
              <p>Using the quadratic formula, x = (-b ± √(b² − 4ac)) / 2a.</p>
              <p>For a = 2, b = 5, c = −3: x = (-5 ± √49) / 4 = (-5 ± 7) / 4.</p>
              <p>Therefore, x = 1/2 or x = -3.</p>
            </div>
            <div className="clipboard">✅</div>
          </div>
          <div className="quiz-actions">
            <button className="btn btn-ghost" type="button" onClick={() => setSelectedAnswer(null)}>↻ Try Again</button>
            <button className="btn btn-primary" type="button">Next Question ▶</button>
          </div>
        </section>
      )}
    </div>
  )
}

function BattlePage({ battleAnswer, setBattleAnswer, selectedLevel, selectedCurriculum, selectedTopics }) {
  const battleOptions = [
    { key: 'A', value: '5x² − 7x − 3', correct: false },
    { key: 'B', value: '5x² + 3x − 3', correct: true },
    { key: 'C', value: 'x² + 3x − 5', correct: false },
    { key: 'D', value: '5x² + 7x − 3', correct: false }
  ]

  return (
    <div className="screen battle-screen">
      <section className="arena-scoreboard glass-card">
        <PlayerBar side="left" emoji="👦🏽" name="Arjun" level="Lv. 23" score="420" health="65" />
        <div className="round-clock">
          <span>Round 2 / 5</span>
          <strong>00:12</strong>
        </div>
        <PlayerBar side="right" emoji="🤖" name="MathBot Pro" level="Lv. 20" score="360" health="76" />
      </section>

      <section className="battle-context glass-card">
        <span>🗺️ Game Zone Battle</span>
        <strong>{selectedLevel}</strong>
        <span>{selectedCurriculum}</span>
        <span>{selectedTopics.slice(0, 2).join(' + ') || 'Mixed Topics'}</span>
        <span>15 questions • pass 13/15</span>
      </section>

      <section className="arena-stage glass-card">
        <div className="bonus-stack">
          {battleAnswer && <Badge tone="green">✓ Correct!</Badge>}
          {battleAnswer && <Badge tone="blue">⚡ Speed Bonus +15</Badge>}
          {battleAnswer && <Badge tone="orange">🔥 Streak Bonus ×3</Badge>}
        </div>

        <div className="vs-row">
          <div className="fighter fighter-left"><Avatar emoji="👦🏽" size="battle" glow /><span>Student</span></div>
          <div className="vs-badge">VS</div>
          <div className="fighter fighter-right"><Avatar emoji="🤖" size="battle" glow /><span>AI Bot</span></div>
        </div>

        <article className="battle-question">
          <span>Simplify:</span>
          <h2>(3x² − 2x + 1) + (2x² + 5x − 4)</h2>
        </article>

        <div className="battle-answer-grid">
          {battleOptions.map((option) => {
            const active = battleAnswer === option.key
            return (
              <button
                key={option.key}
                type="button"
                className={`battle-answer ${active ? option.correct ? 'correct' : 'wrong' : ''}`}
                onClick={() => setBattleAnswer(option.key)}
              >
                <span>{option.key}</span>
                <strong>{option.value}</strong>
              </button>
            )
          })}
        </div>

        <div className="battle-progress">
          <span>Battle progress</span>
          <div>
            {[1, 2, 3, 4, 5].map((step) => <i key={step} className={step <= 2 ? 'active' : ''}>{step}</i>)}
          </div>
        </div>
      </section>
    </div>
  )
}

function LeaderboardPage() {
  const podium = leaderboard.slice(0, 3)
  const rows = leaderboard.slice(3)

  return (
    <div className="screen leaderboard-screen">
      <section className="leader-tabs glass-card">
        {['School', 'Region', 'National', 'Weekly Tournament'].map((tab) => (
          <button type="button" key={tab} className={tab === 'National' ? 'active' : ''}>{tab}</button>
        ))}
      </section>

      <section className="podium-grid">
        {podium.map((student) => (
          <article key={student.rank} className={`podium-card rank-${student.rank}`}>
            <span className="medal">{student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : '🥉'}</span>
            <Avatar emoji={student.avatar} size="medium" />
            <h3>{student.name}</h3>
            <p>{student.school}</p>
            <strong>{student.xp} XP</strong>
          </article>
        ))}
      </section>

      <section className="table-card glass-card">
        <div className="table-header">
          <h2>National Leaderboard</h2>
          <span>Updates every 15 minutes</span>
        </div>
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>School</th>
                <th>Region</th>
                <th>XP</th>
                <th>Wins</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((student) => (
                <tr key={student.rank}>
                  <td>{student.rank}</td>
                  <td><span className="student-cell"><span>{student.avatar}</span>{student.name}</span></td>
                  <td>{student.school}</td>
                  <td>{student.region}</td>
                  <td>{student.xp}</td>
                  <td>{student.wins}</td>
                  <td>{student.accuracy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function StudioPage() {
  return (
    <div className="screen studio-screen">
      <section className="studio-board">
        <aside className="contestant-card student-a">
          <div className="contest-label">Student A</div>
          <Avatar emoji="👦🏽" size="medium" />
          <h3>Arjun Sharma</h3>
          <p>Meridian Public School</p>
          <strong className="contest-score blue">650</strong>
          <Progress value="76" />
          <RoundDots active={4} />
          <div className="answer-status correct">Current Answer: B ✓ Correct</div>
        </aside>

        <main className="smart-question-card light-card">
          <div className="studio-meta">
            <strong>Round 3 / 10</strong>
            <span>00:18</span>
          </div>
          <p>Factorise:</p>
          <h1>x² − 5x + 6</h1>
          <div className="studio-options">
            <span>A. (x − 2)(x − 3)</span>
            <span>B. (x − 2)(x + 3)</span>
            <span>C. (x + 2)(x − 3)</span>
            <span>D. (x − 1)(x − 6)</span>
          </div>
        </main>

        <aside className="contestant-card student-b">
          <div className="contest-label">Student B</div>
          <Avatar emoji="👧🏾" size="medium" />
          <h3>Myra Kulkarni</h3>
          <p>Podar International School</p>
          <strong className="contest-score red">550</strong>
          <Progress value="65" />
          <RoundDots active={2} wrong />
          <div className="answer-status wrong">Current Answer: A ✕ Wrong</div>
        </aside>
      </section>

      <section className="teacher-controls glass-card">
        <button className="btn btn-success" type="button">▶ Start Contest</button>
        <button className="btn btn-blue" type="button">↪ Next Question</button>
        <button className="btn btn-gold" type="button">Ⅱ Pause</button>
        <button className="btn btn-danger" type="button">■ End Contest</button>
        <button className="btn btn-ghost" type="button">⚙ Settings</button>
      </section>
    </div>
  )
}


function GameZonePage({ setActiveScreen, selectedLevel, setSelectedLevel, selectedCurriculum, setSelectedCurriculum, selectedTopics, toggleTopic }) {
  return (
    <div className="screen gamezone-screen">
      <section className="session-hero glass-card">
        <div>
          <div className="pill">🗺️ Game Zone Session Builder</div>
          <h1>Pick your class, curriculum and topic path.</h1>
          <p>Every stage contains a 15-question set. A score above 12 unlocks the next stage on the map until the student reaches the ultimate trophy for that class level.</p>
          <div className="cta-row">
            <button className="btn btn-gold" type="button" onClick={() => setActiveScreen('quiz')}>▶ Start 15-Question Set</button>
            <button className="btn btn-primary" type="button" onClick={() => setActiveScreen('battle')}>⚔️ Battle from This Topic</button>
          </div>
        </div>
        <div className="session-summary-grid">
          {gameZoneRules.map((rule) => (
            <article className="session-card" key={rule.label}>
              <span>{rule.icon}</span>
              <strong>{rule.value}</strong>
              <small>{rule.label}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="gamezone-grid">
        <ClassCurriculumPanel
          selectedLevel={selectedLevel}
          setSelectedLevel={setSelectedLevel}
          selectedCurriculum={selectedCurriculum}
          setSelectedCurriculum={setSelectedCurriculum}
          selectedTopics={selectedTopics}
          toggleTopic={toggleTopic}
        />
        <StageMap selectedLevel={selectedLevel} />
      </section>

      <section className="zone-mission-grid">
        <article className="mission-card glass-card">
          <span>🎯</span>
          <h3>Current Session</h3>
          <p>{selectedLevel} • {selectedCurriculum}</p>
          <strong>{selectedTopics.length || 1} topic area{selectedTopics.length === 1 ? '' : 's'} selected</strong>
          <small>{selectedTopics.join(' • ') || 'Select a topic to begin'}</small>
        </article>
        <article className="mission-card glass-card">
          <span>✅</span>
          <h3>Progress Rule</h3>
          <p>Students answer 15 questions per set.</p>
          <strong>13/15 or higher to progress</strong>
          <small>12/15 or below repeats the current stage with revision hints.</small>
        </article>
        <article className="mission-card glass-card">
          <span>🏆</span>
          <h3>Ultimate Trophy</h3>
          <p>Each class level has its own trophy path.</p>
          <strong>{selectedLevel} Trophy Map</strong>
          <small>Complete all 5 stages to become class champion.</small>
        </article>
      </section>
    </div>
  )
}

function ClassCurriculumPanel({ selectedLevel, setSelectedLevel, selectedCurriculum, setSelectedCurriculum, selectedTopics, toggleTopic, compact = false }) {
  const topics = topicsByLevel[selectedLevel] || []

  return (
    <section className={`setup-panel glass-card ${compact ? 'compact' : ''}`}>
      <div className="section-row setup-heading">
        <h3>Student Learning Setup</h3>
        <span>Class • Curriculum • Topics</span>
      </div>
      <div className="setup-grid">
        <label className="field-group">
          <span>Class Level</span>
          <select value={selectedLevel} onChange={(event) => setSelectedLevel(event.target.value)}>
            {classLevels.map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
        </label>
        <label className="field-group">
          <span>Curriculum</span>
          <select value={selectedCurriculum} onChange={(event) => setSelectedCurriculum(event.target.value)}>
            {curricula.map((curriculum) => <option key={curriculum} value={curriculum}>{curriculum}</option>)}
          </select>
        </label>
      </div>
      <div className="topic-area-block">
        <div className="topic-title-row">
          <strong>Specific Topic Areas</strong>
          <small>{selectedTopics.length} selected</small>
        </div>
        <div className="topic-chip-grid">
          {topics.map((topic) => (
            <button
              key={topic}
              type="button"
              className={`topic-chip ${selectedTopics.includes(topic) ? 'active' : ''}`}
              onClick={() => toggleTopic(topic)}
            >
              {selectedTopics.includes(topic) ? '✓ ' : '+ '}{topic}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function StageMap({ selectedLevel, compact = false }) {
  return (
    <section className={`map-card glass-card ${compact ? 'compact' : ''}`}>
      <div className="section-row setup-heading">
        <h3>{selectedLevel} Trophy Map</h3>
        <span>15 questions per stage</span>
      </div>
      <div className="map-rule-row">
        <Badge tone="green">Pass: 13/15+</Badge>
        <Badge tone="gold">Ultimate Trophy</Badge>
      </div>
      <div className="stage-map">
        {stageNodes.map((stage, index) => (
          <div key={stage.title} className={`stage-node ${stage.status}`}>
            <span>{stage.status === 'locked' ? '🔒' : stage.status === 'active' ? '⚡' : '✓'}</span>
            <strong>{stage.title}</strong>
            <small>{stage.subtitle}</small>
            {index < stageNodes.length - 1 && <i />}
          </div>
        ))}
      </div>
    </section>
  )
}

function DesignSystem() {
  const colors = [
    ['Primary', '#7C3AED'], ['Secondary', '#22D3EE'], ['Accent', '#F59E0B'], ['Success', '#22C55E'],
    ['Danger', '#EF4444'], ['Warning', '#FBBF24'], ['Deep Navy', '#080B2D'], ['Dark Blue', '#111827'],
    ['Slate', '#1F2937'], ['Glass', 'rgba(255,255,255,.10)'], ['Light', '#F8FAFC'], ['White', '#FFFFFF']
  ]

  return (
    <div className="screen system-screen">
      <section className="system-grid">
        <article className="system-panel light-card">
          <h2>Color palette</h2>
          <div className="palette-grid">
            {colors.map(([name, value]) => (
              <div className="color-swatch" key={name}>
                <span style={{ background: value }} />
                <strong>{name}</strong>
                <small>{value}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="system-panel light-card">
          <h2>Typography styles</h2>
          <div className="type-list">
            <div><h1>H1 Heading</h1><span>Rajdhani / 48px / Bold</span></div>
            <div><h2>H2 Heading</h2><span>Rajdhani / 32px / Bold</span></div>
            <div><p>Body text for classroom instructions and dashboard labels.</p><span>Nunito / 16px / Regular</span></div>
            <div><code>STAT 12,450 XP</code><span>JetBrains Mono / 20px / Bold</span></div>
          </div>
        </article>

        <article className="system-panel light-card">
          <h2>Button styles</h2>
          <div className="button-demo-grid">
            <button className="btn btn-primary" type="button">Primary</button>
            <button className="btn btn-blue" type="button">Secondary</button>
            <button className="btn btn-gold" type="button">Accent</button>
            <button className="btn btn-success" type="button">Success</button>
            <button className="btn btn-ghost" type="button">Ghost</button>
            <button className="btn btn-danger" type="button">Danger</button>
          </div>
        </article>

        <article className="system-panel light-card">
          <h2>Card styles</h2>
          <div className="card-demo-grid">
            <div className="demo-card glass-card"><span>🧩</span><strong>Glass Card</strong><small>Blur + border</small></div>
            <div className="demo-card elevated"><span>🏆</span><strong>Elevated Card</strong><small>Shadow + depth</small></div>
            <div className="demo-card solid"><span>🎮</span><strong>Solid Card</strong><small>Dark UI panel</small></div>
          </div>
        </article>

        <article className="system-panel light-card">
          <h2>Badge styles</h2>
          <div className="badge-demo-wrap">
            <Badge tone="blue">New</Badge><Badge tone="red">Hot</Badge><Badge tone="gold">Pro</Badge><Badge tone="purple">Legend</Badge>
            <Badge tone="orange">Streak 7</Badge><Badge tone="green">Verified</Badge><Badge tone="dark">Elite</Badge>
          </div>
          <h2>XP bars</h2>
          <div className="xp-demo"><Progress value="76" /><Progress value="54" success /><Progress value="88" gradient /></div>
        </article>

        <article className="system-panel light-card">
          <h2>Navigation + icons</h2>
          <div className="nav-demo">
            <span>Top navigation</span>
            <div className="mini-nav"><b>Home</b><b>Features</b><b>Contests</b><b>Login</b></div>
            <span>Mobile bottom navigation</span>
            <MobileNav compact />
          </div>
          <div className="icon-demo">🎯 ⚔️ 🏆 🗓️ 📘 🛡️ 👥 🏫 📊 🎁 ⭐ ⚙️ 🔔 💬</div>
        </article>


        <article className="system-panel light-card">
          <h2>Academic game rules</h2>
          <div className="rules-demo-grid">
            <div><strong>Levels</strong><span>Grade 1 to SHS 3</span></div>
            <div><strong>Question Set</strong><span>15 questions</span></div>
            <div><strong>Pass Mark</strong><span>Above 12 = progress</span></div>
            <div><strong>Curricula</strong><span>GES, Cambridge, Pearson Edexcel</span></div>
          </div>
        </article>
      </section>
    </div>
  )
}

function Stat({ icon, value, label }) {
  return <div className="stat"><span>{icon}</span><strong>{value}</strong><small>{label}</small></div>
}

function MiniStat({ icon, value, label }) {
  return <article className="mini-stat glass-card"><span>{icon}</span><strong>{value}</strong><small>{label}</small></article>
}

function RankCard({ label, value, sub, icon, featured, gold }) {
  return <article className={`rank-card glass-card ${featured ? 'featured' : ''} ${gold ? 'gold' : ''}`}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{sub}</p></div></article>
}

function Avatar({ emoji, size = 'small', glow = false }) {
  return <div className={`avatar avatar-${size} ${glow ? 'glow' : ''}`}>{emoji}</div>
}

function Wallet({ icon, value, label }) {
  return <div className="wallet"><span>{icon}</span><strong>{value}</strong><small>{label}</small></div>
}

function Progress({ value, success = false, gradient = false }) {
  return <div className={`progress-track ${success ? 'success' : ''} ${gradient ? 'gradient' : ''}`}><i style={{ width: `${value}%` }} /></div>
}

function Badge({ children, tone = 'purple' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

function PanelMetric({ icon, label, value }) {
  return <div className="panel-metric"><span>{icon}</span><small>{label}</small><strong>{value}</strong></div>
}

function PlayerBar({ side, emoji, name, level, score, health }) {
  return (
    <div className={`player-bar ${side}`}>
      <Avatar emoji={emoji} size="small" />
      <div>
        <strong>{name}</strong>
        <small>{level}</small>
        <Progress value={health} success={side === 'left'} />
      </div>
      <span className="score-badge">{score}</span>
    </div>
  )
}

function RoundDots({ active, wrong = false }) {
  return <div className="round-dots">{Array.from({ length: 8 }).map((_, index) => <span key={index} className={index < active ? wrong && index === 1 ? 'wrong' : 'active' : ''}>{index < active ? wrong && index === 1 ? '×' : '✓' : ''}</span>)}</div>
}

function MobileNav({ compact = false }) {
  return (
    <nav className={`mobile-nav glass-card ${compact ? 'compact' : ''}`}>
      {['Lobby', 'Game Zone', 'Leaderboard', 'Battles', 'Profile'].map((item, index) => (
        <button key={item} type="button" className={index === 0 ? 'active' : ''}>
          <span>{['🏠', '🗺️', '🏆', '⚔️', '👤'][index]}</span>{item}
        </button>
      ))}
    </nav>
  )
}

export default App
