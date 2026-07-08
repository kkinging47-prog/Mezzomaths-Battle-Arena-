import './sound-prep.css'

const prepStages = [
  { id: 'stage1', icon: '🧠', title: 'Stage 1 Online Practice', time: '15 minutes', count: 15, desc: 'Speed, accuracy and foundational Mezzo Maths topics.' },
  { id: 'stage2', icon: '⚡', title: 'Stage 2 Online Practice', time: '20 minutes', count: 20, desc: 'Mixed direct questions and word problems with higher pressure.' },
  { id: 'stage3', icon: '🔥', title: 'Stage 3 Online Practice', time: '25 minutes', count: 25, desc: 'Stronger reasoning, contest timing and multi-topic challenges.' },
  { id: 'tvround', icon: '📺', title: 'TV Round Practice', time: '60 seconds per round', count: 10, desc: 'Fast buzzer-style questions for the televised stage.' },
  { id: 'final', icon: '🏆', title: 'Grand Finale Challenge', time: '30 minutes', count: 30, desc: 'Full final challenge with direct questions, word problems and reasoning.' }
]
const topics = ['Algebra', 'Geometry', 'Statistics', 'Aptitude & Mental Reasoning', 'General Multiplication', 'General Division', 'General Squaring', 'Divisibility Rules', 'Word Problems', 'Fractions', 'Percentages']
const profileFallback = { full_name: 'Student Champion', class_level: 'Grade 8', curriculum: 'GES', school_name: 'Mezzo Demo School' }

let audioEnabled = localStorage.getItem('mezzo_sound_enabled') !== 'off'
let prepSession = null
let prepTimer = null
let syncQueued = false
let initialHomeForced = false

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
function profile() { return { ...profileFallback, ...readJson('mezzo_profile', profileFallback) } }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function shuffle(list) { return [...list].sort(() => Math.random() - 0.5) }
function inferArea(topic) {
  const t = String(topic || '').toLowerCase()
  if (t.includes('algebra')) return 'Algebra'
  if (t.includes('geometry')) return 'Geometry'
  if (t.includes('statistic')) return 'Statistics'
  if (t.includes('division')) return 'Division'
  if (t.includes('squar')) return 'Squaring'
  if (t.includes('fraction')) return 'Fractions'
  if (t.includes('percent')) return 'Percentages'
  if (t.includes('word')) return 'Word Problems'
  return 'Multiplication'
}
function playTone(type = 'tap') {
  if (!audioEnabled) return
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const gain = ctx.createGain()
    const osc = ctx.createOscillator()
    const now = ctx.currentTime
    const settings = {
      tap: [520, 0.04, 'sine', 0.04],
      start: [220, 0.18, 'triangle', 0.075],
      correct: [780, 0.16, 'sine', 0.09],
      wrong: [150, 0.18, 'sawtooth', 0.055],
      level: [980, 0.22, 'triangle', 0.10],
      beep: [640, 0.08, 'square', 0.05]
    }[type] || [440, 0.08, 'sine', 0.04]
    osc.frequency.setValueAtTime(settings[0], now)
    if (type === 'correct' || type === 'level') osc.frequency.exponentialRampToValueAtTime(settings[0] * 1.35, now + settings[1])
    if (type === 'wrong') osc.frequency.exponentialRampToValueAtTime(Math.max(60, settings[0] * 0.72), now + settings[1])
    osc.type = settings[2]
    gain.gain.setValueAtTime(settings[3], now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + settings[1])
    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + settings[1] + 0.02)
  } catch {}
}
function playStartFanfare() { playTone('start'); setTimeout(() => playTone('beep'), 120); setTimeout(() => playTone('level'), 250) }
function renderSoundToggle() {
  const app = document.querySelector('.app-frame') || document.body
  let btn = document.querySelector('.sound-toggle')
  const text = `${audioEnabled ? '🔊' : '🔇'} Sound ${audioEnabled ? 'On' : 'Off'}`
  if (!btn) {
    btn = document.createElement('button')
    btn.type = 'button'
    btn.dataset.soundToggle = 'true'
    app.prepend(btn)
  }
  btn.className = `sound-toggle ${audioEnabled ? 'on' : 'off'}`
  if (btn.innerHTML !== text) btn.innerHTML = text
}
function makeQuestion(topic, i, total) {
  const area = inferArea(topic)
  let a = rand(3, 60), b = rand(2, 12), answer = a * b, symbol = '×'
  if (area === 'Division') { b = rand(2, 12); answer = rand(3, 30); a = answer * b; symbol = '÷' }
  if (area === 'Squaring') { a = rand(4, 25); b = 2; answer = a * a; symbol = '²' }
  if (area === 'Fractions') { a = rand(1, 9); b = rand(2, 9); answer = a + b; symbol = '+' }
  if (area === 'Percentages') { b = 100; a = rand(10, 90); answer = a; symbol = '%' }
  if (area === 'Algebra') { a = rand(2, 12); b = rand(2, 20); answer = a + b; symbol = '+ x =' }
  const word = i > Math.ceil(total * 0.35) && i % 2 === 0
  const question = word
    ? area === 'Division' ? `A contest team shares ${a} points equally among ${b} players. How many points does each player get?`
    : area === 'Squaring' ? `A square field has side ${a} metres. What is the area?`
    : area === 'Algebra' ? `If x + ${a} = ${answer + a}, what is x?`
    : `A Mezzopedia contestant solves ${a} ${symbol} ${b}. What is the answer?`
    : area === 'Algebra' ? `Find x: x + ${a} = ${answer + a}`
    : area === 'Squaring' ? `${a}²`
    : `${a} ${symbol} ${b}`
  return { topic, area, question, answer, options: shuffle([answer, answer + 1, answer - 1, answer + 2]).map(String) }
}
function buildPrepQuestions(stage) {
  const selectedTopics = stage.id === 'final' ? topics : shuffle(topics).slice(0, 5)
  return Array.from({ length: stage.count }, (_, i) => makeQuestion(selectedTopics[i % selectedTopics.length], i, stage.count))
}
function prepHomeHtml() {
  const p = profile()
  return `<main class="app-shell prep-app"><section class="prep-frame glass-card">
    <div class="prep-hero"><div><button class="prep-back" data-prep-back-home="true">← Back to Arena</button><div class="pill">🎓 Mezzopedia Contest Prep Mode</div><h1>Prepare for Mezzopedia 2026</h1><p>Train for Stage 1, Stage 2, Stage 3, the TV Round and the Grand Finale with timed mock tests and mixed Mezzo topic questions.</p><div class="prep-profile-chip">👤 ${escapeHtml(p.full_name)} • ${escapeHtml(p.class_level)} • ${escapeHtml(p.school_name)}</div></div><div class="prep-trophy">🏆</div></div>
    <section class="prep-stage-grid">${prepStages.map(stage => `<button class="prep-stage-card" data-prep-stage="${stage.id}"><span>${stage.icon}</span><h3>${stage.title}</h3><p>${stage.desc}</p><strong>${stage.count} questions • ${stage.time}</strong><em>Start Stage →</em></button>`).join('')}</section>
    <section class="prep-roadmap"><div><b>Stage 1</b><span>Online speed practice</span></div><div><b>Stage 2</b><span>Mixed challenge</span></div><div><b>Stage 3</b><span>Final online screening</span></div><div><b>TV Round</b><span>Fast buzzer practice</span></div><div><b>Grand Finale</b><span>Full contest mode</span></div></section>
  </section></main>`
}
function renderPrepHome() { clearInterval(prepTimer); prepSession = null; document.getElementById('root').innerHTML = prepHomeHtml(); playStartFanfare() }
function renderPrepQuestion() {
  const s = prepSession
  const q = s.questions[s.index]
  document.getElementById('root').innerHTML = `<main class="app-shell prep-app"><section class="prep-frame glass-card">
    <div class="prep-topbar"><button class="prep-back" data-prep-open="true">← Prep Menu</button><div><strong>${escapeHtml(s.stage.title)}</strong><span>Q${s.index + 1}/${s.questions.length} • ${escapeHtml(q.topic)} • ${s.remaining}s left</span></div><div class="prep-score">${s.score} pts</div></div>
    <article class="prep-question-card light-card"><div class="prep-meta"><span>${escapeHtml(q.area)}</span><span>${s.stage.icon} ${escapeHtml(s.stage.title)}</span></div><h2>${escapeHtml(q.question)}</h2><div class="prep-options">${q.options.map((option, idx) => `<button data-prep-answer="${escapeHtml(option)}"><b>${String.fromCharCode(65 + idx)}</b><span>${escapeHtml(option)}</span></button>`).join('')}</div></article>
  </section></main>`
}
function startPrepStage(id) {
  const stage = prepStages.find(s => s.id === id) || prepStages[0]
  const seconds = stage.id === 'tvround' ? 60 : stage.id === 'final' ? 1800 : stage.id === 'stage3' ? 1500 : stage.id === 'stage2' ? 1200 : 900
  prepSession = { stage, questions: buildPrepQuestions(stage), index: 0, score: 0, correct: 0, remaining: seconds, startedAt: Date.now() }
  playStartFanfare()
  renderPrepQuestion()
  clearInterval(prepTimer)
  prepTimer = setInterval(() => {
    if (!prepSession) return clearInterval(prepTimer)
    prepSession.remaining -= 1
    if ([5,4,3,2,1].includes(prepSession.remaining)) playTone('beep')
    if (prepSession.remaining <= 0) finishPrep()
  }, 1000)
}
function answerPrep(value) {
  if (!prepSession) return
  const q = prepSession.questions[prepSession.index]
  const correct = Number(value) === Number(q.answer)
  if (correct) { prepSession.score += 10; prepSession.correct += 1; playTone('correct') } else playTone('wrong')
  document.querySelectorAll('[data-prep-answer]').forEach(btn => {
    if (btn.dataset.prepAnswer === value) btn.classList.add(correct ? 'prep-correct' : 'prep-wrong')
  })
  setTimeout(() => {
    prepSession.index += 1
    if (prepSession.index >= prepSession.questions.length) finishPrep()
    else renderPrepQuestion()
  }, 550)
}
function finishPrep() {
  clearInterval(prepTimer)
  if (!prepSession) return
  const s = prepSession
  const percent = Math.round((s.correct / s.questions.length) * 100)
  const history = readJson('mezzo_mezzopedia_prep_history', [])
  saveJson('mezzo_mezzopedia_prep_history', [{ stage: s.stage.title, score: s.score, correct: s.correct, total: s.questions.length, percent, date: new Date().toISOString() }, ...history].slice(0, 100))
  playTone(percent >= 70 ? 'level' : 'start')
  document.getElementById('root').innerHTML = `<main class="app-shell prep-app"><section class="prep-frame glass-card"><section class="prep-result light-card"><div class="prep-trophy big">${percent >= 70 ? '🏆' : '🎓'}</div><h1>${escapeHtml(s.stage.title)} Complete</h1><p>You scored <b>${s.correct}/${s.questions.length}</b> (${percent}%) and earned <b>${s.score} points</b>.</p><div class="prep-ai-note"><strong>AI Prep Coach:</strong> ${percent >= 80 ? 'Excellent. You are ready for a harder Mezzopedia round.' : percent >= 55 ? 'Good progress. Repeat this stage with more word problems and speed.' : 'Focus on the basic methods first, then try the stage again.'}</div><div class="cta-row"><button class="btn btn-gold" data-prep-stage="${s.stage.id}">Retry Stage</button><button class="btn btn-primary" data-prep-open="true">Prep Menu</button><button class="btn btn-blue" data-prep-back-home="true">Back to Arena</button></div></section></section></main>`
}
function soundFromClick(event) {
  if (event.target.closest('[data-sound-toggle]')) return
  if (event.target.closest('button, .home-mode-card, .screen-tab')) playTone('tap')
  if (event.target.closest('#startSmartContest,#startBattle,#startBattle2,#startSolo,#startBotBattle,[data-start-daily],[data-start-bot]')) playStartFanfare()
  if (event.target.closest('#nextSolo,#nextBattle')) playTone('beep')
}
function soundFromMutation() {
  const banner = document.querySelector('.result-banner')
  const result = banner?.querySelector('strong')?.textContent?.trim().toLowerCase()
  if (result && !banner.dataset.soundPlayed) { banner.dataset.soundPlayed = '1'; playTone(result.includes('correct') ? 'correct' : 'wrong') }
}
function installPrepButtons() {
  document.querySelectorAll('.game-mode-card').forEach(card => {
    if (!card.textContent.includes('Mezzopedia Prep')) return
    if (card.dataset.prepOpen !== 'true') card.dataset.prepOpen = 'true'
    if (card.hasAttribute('data-target')) card.removeAttribute('data-target')
  })
  const home = document.querySelector('.home-screen')
  if (home && !home.querySelector('.prep-promo-banner')) {
    home.insertAdjacentHTML('beforeend', `<section class="prep-promo-banner glass-card"><div><span>🎓 Special Contest Mode</span><h2>Mezzopedia Contest Prep</h2><p>Train for Stage 1, Stage 2, Stage 3, TV Round and Grand Finale.</p></div><button class="btn btn-gold" data-prep-open="true">Open Prep Mode</button></section>`)
  }
}
function syncSoundPrep() {
  if (syncQueued) return
  syncQueued = true
  requestAnimationFrame(() => {
    syncQueued = false
    renderSoundToggle()
    installPrepButtons()
    soundFromMutation()
  })
}
function forceHomeOnStartup() {
  if (initialHomeForced) return
  initialHomeForced = true
  setTimeout(() => {
    if (document.querySelector('.smartboard-screen') && document.querySelector('[data-target="home"]')) {
      document.querySelector('[data-target="home"]').click()
    }
  }, 120)
}

document.addEventListener('click', event => {
  soundFromClick(event)
  if (event.target.closest('[data-sound-toggle]')) {
    audioEnabled = !audioEnabled
    localStorage.setItem('mezzo_sound_enabled', audioEnabled ? 'on' : 'off')
    renderSoundToggle()
    playTone('tap')
    return
  }
  if (event.target.closest('[data-prep-open]')) { event.preventDefault(); event.stopPropagation(); renderPrepHome(); return }
  const stage = event.target.closest('[data-prep-stage]')
  if (stage) { event.preventDefault(); event.stopPropagation(); startPrepStage(stage.dataset.prepStage); return }
  const answer = event.target.closest('[data-prep-answer]')
  if (answer) { event.preventDefault(); event.stopPropagation(); answerPrep(answer.dataset.prepAnswer); return }
  if (event.target.closest('[data-prep-back-home]')) { event.preventDefault(); event.stopPropagation(); window.location.reload() }
}, true)

const observer = new MutationObserver(syncSoundPrep)
observer.observe(document.body, { childList: true, subtree: true, attributes: false })
window.addEventListener('load', () => { syncSoundPrep(); forceHomeOnStartup() })
setTimeout(() => { syncSoundPrep(); forceHomeOnStartup() }, 300)
