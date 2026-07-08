import './celebration-ai.css'

const avatarMap = {
  math_boy: '👦🏽',
  math_girl: '👧🏾',
  school_genius: '🧑🏾‍🎓',
  robot_jr: '🤖',
  speed_star: '⚡',
  coin_master: '🪙',
  streak_flame: '🔥',
  trophy_hero: '🏆',
  ghana_star: '⭐',
  grand_champion: '👑'
}
const avatarNameMap = {
  math_boy: 'Math Warrior',
  math_girl: 'Math Princess',
  school_genius: 'School Genius',
  robot_jr: 'MathBot Jr.',
  speed_star: 'Speed Star',
  coin_master: 'Coin Master',
  streak_flame: 'Streak Flame',
  trophy_hero: 'Trophy Hero',
  ghana_star: 'Ghana Star',
  grand_champion: 'Grand Champion'
}

function selectedAvatarId() { return localStorage.getItem('mezzo_avatar') || 'math_boy' }
function selectedAvatar() { return avatarMap[selectedAvatarId()] || '👦🏽' }
function selectedAvatarName() { return avatarNameMap[selectedAvatarId()] || 'Math Warrior' }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
function parseScore(text = '') {
  const match = text.match(/score:\s*(\d+)\/(\d+)/i) || text.match(/Your score:\s*(\d+)\/(\d+)/i)
  if (!match) return { score: 0, total: 0, percent: 0 }
  const score = Number(match[1])
  const total = Number(match[2])
  return { score, total, percent: total ? Math.round((score / total) * 100) : 0 }
}
function getTopicFromResult() {
  return document.querySelector('.solo-level-card small')?.textContent?.trim() || document.querySelector('.smart-answer-status')?.textContent?.split('•')?.[0]?.trim() || 'selected topic'
}
function coachMessage({ percent, topic, mode }) {
  const strength = percent >= 80 ? 'speed and accuracy' : percent >= 55 ? 'effort and steady problem solving' : 'courage to attempt the challenge'
  const improve = percent >= 80 ? 'harder word problems and time pressure' : percent >= 55 ? 'careful reading of word problems and checking steps' : 'basic method review before increasing speed'
  const next = percent >= 80 ? `Try a higher-level ${topic} battle or compete on the Smart Board.` : percent >= 55 ? `Repeat ${topic} with 10 mixed direct and word questions.` : `Start with direct ${topic} questions, then move into short word problems.`
  return { strength, improve, next, summary: `${mode} completed. Your current performance suggests you should keep building ${strength}, while focusing next on ${improve}.` }
}
function aiCoachHtml({ mode = 'Practice', percent = 0, score = 0, total = 0, topic = 'selected topic' }) {
  const msg = coachMessage({ percent, topic, mode })
  return `<section class="ai-coach-card glass-card">
    <div class="ai-coach-head"><div class="ai-orb">🤖</div><div><span>AI Coach Feedback</span><h2>${escapeHtml(mode)} Performance Report</h2><p>${escapeHtml(msg.summary)}</p></div></div>
    <div class="coach-score-ring"><strong>${percent}%</strong><span>${score}/${total || '?'} score</span></div>
    <div class="coach-insights">
      <div><b>✅ Your Strength</b><p>${escapeHtml(msg.strength)}</p></div>
      <div><b>🎯 Area to Improve</b><p>${escapeHtml(msg.improve)}</p></div>
      <div><b>➡️ Recommended Next Practice</b><p>${escapeHtml(msg.next)}</p></div>
    </div>
  </section>`
}
function injectPracticeCoach() {
  const result = document.querySelector('.result-card')
  if (!result || result.dataset.coachAdded) return
  result.dataset.coachAdded = 'true'
  const text = result.textContent || ''
  const { score, total, percent } = parseScore(text)
  const mode = text.includes('You won') || text.includes('Match') ? 'Battle' : 'Practice'
  const topic = getTopicFromResult()
  result.insertAdjacentHTML('afterend', aiCoachHtml({ mode, percent, score, total, topic }))
}
function smartCoachHtml() {
  const winnerText = document.querySelector('.winner-card h1')?.textContent?.replace('Congratulations,', '')?.replace('!', '')?.trim() || 'Winner'
  const points = document.querySelector('.winner-card strong')?.textContent?.trim() || '0 points'
  const runner = document.querySelector('.runner-card h2')?.textContent?.replace('Second Place:', '')?.trim() || 'Runner Up'
  const topic = getTopicFromResult()
  return `<section class="ai-coach-card smart-ai-coach glass-card">
    <div class="ai-coach-head"><div class="ai-orb">🤖</div><div><span>AI Coach Smart Board Report</span><h2>${escapeHtml(winnerText)} is Champion of the Day</h2><p>The winner showed speed under pressure. The runner-up, ${escapeHtml(runner)}, should keep practising quick reading and keypad accuracy.</p></div></div>
    <div class="coach-insights">
      <div><b>🏆 Winner Score</b><p>${escapeHtml(points)}</p></div>
      <div><b>📚 Topic Focus</b><p>${escapeHtml(topic)}</p></div>
      <div><b>➡️ Next Challenge</b><p>Run another 60-second contest with mixed direct and word questions to strengthen speed and understanding.</p></div>
    </div>
  </section>`
}
function injectSmartCoach() {
  const wrap = document.querySelector('.smart-result-wrap')
  if (!wrap || wrap.dataset.smartCoachAdded) return
  wrap.dataset.smartCoachAdded = 'true'
  wrap.insertAdjacentHTML('beforeend', smartCoachHtml())
}
function playCrowdClap() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    for (let i = 0; i < 16; i++) {
      const size = ctx.sampleRate * 0.055
      const buffer = ctx.createBuffer(1, size, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let j = 0; j < size; j++) data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / size, 2)
      const source = ctx.createBufferSource()
      source.buffer = buffer
      const gain = ctx.createGain()
      gain.gain.value = 0.18 + Math.random() * 0.2
      source.connect(gain).connect(ctx.destination)
      source.start(ctx.currentTime + i * 0.085)
    }
  } catch {}
}
function makeCelebrationLayer() {
  if (document.querySelector('.winner-celebration-layer')) return
  const layer = document.createElement('div')
  layer.className = 'winner-celebration-layer'
  layer.innerHTML = `${Array.from({ length: 34 }, (_, i) => `<i style="--x:${Math.random() * 100}%;--d:${Math.random() * 2.2}s;--r:${Math.random() * 360}deg">${['🎉','✨','🎊','⭐','🪙','🏆'][i % 6]}</i>`).join('')}`
  document.body.appendChild(layer)
  setTimeout(() => layer.remove(), 5200)
}
function championOverlay() {
  const winnerCard = document.querySelector('.winner-card')
  if (!winnerCard || document.querySelector('.champion-day-overlay')) return
  const winner = winnerCard.querySelector('h1')?.textContent?.replace('Congratulations,', '')?.replace('!', '')?.trim() || 'Winner'
  const score = winnerCard.querySelector('strong')?.textContent?.trim() || '0 points'
  const overlay = document.createElement('div')
  overlay.className = 'champion-day-overlay'
  overlay.innerHTML = `<div class="champion-day-card"><button class="champion-close" aria-label="Close celebration">×</button><div class="champion-avatar">${selectedAvatar()}</div><span>Champion of the Day</span><h1>${escapeHtml(winner)}</h1><p>${escapeHtml(score)} • ${escapeHtml(selectedAvatarName())}</p><div class="firework-row">🎆 🎇 ✨ 🎆</div><button class="btn btn-gold" data-download-winner-card="true">Download Winner Card</button></div>`
  document.body.appendChild(overlay)
  setTimeout(() => overlay.classList.add('show'), 30)
}
function drawWinnerCard() {
  const winnerCard = document.querySelector('.winner-card')
  const winner = winnerCard?.querySelector('h1')?.textContent?.replace('Congratulations,', '')?.replace('!', '')?.trim() || 'Mezzo Champion'
  const score = winnerCard?.querySelector('strong')?.textContent?.trim() || '0 points'
  const meta = winnerCard?.querySelector('p')?.textContent?.trim() || 'Mezzo Maths Battle Arena'
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 675
  const ctx = canvas.getContext('2d')
  const grad = ctx.createLinearGradient(0, 0, 1200, 675)
  grad.addColorStop(0, '#06112f')
  grad.addColorStop(.55, '#1d4ed8')
  grad.addColorStop(1, '#f59e0b')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 1200, 675)
  ctx.fillStyle = 'rgba(255,255,255,.10)'
  for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * 1200, Math.random() * 675, 5 + Math.random() * 16, 5 + Math.random() * 16)
  ctx.fillStyle = '#fef3c7'
  ctx.font = 'bold 48px Arial'
  ctx.fillText('MEZZO MATHS BATTLE ARENA', 70, 90)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 78px Arial'
  ctx.fillText('Champion of the Day', 70, 190)
  ctx.font = 'bold 86px Arial'
  ctx.fillText(winner.slice(0, 22), 70, 310)
  ctx.font = 'bold 52px Arial'
  ctx.fillStyle = '#fbbf24'
  ctx.fillText(score, 70, 390)
  ctx.fillStyle = '#e0f2fe'
  ctx.font = '34px Arial'
  ctx.fillText(meta.slice(0, 44), 70, 455)
  ctx.font = '150px Arial'
  ctx.fillText(selectedAvatar(), 900, 310)
  ctx.font = '170px Arial'
  ctx.fillText('🏆', 905, 500)
  ctx.fillStyle = '#ffffff'
  ctx.font = '28px Arial'
  ctx.fillText(`Generated: ${new Date().toLocaleDateString()}`, 70, 600)
  return canvas
}
function downloadWinnerCard() {
  const canvas = drawWinnerCard()
  const link = document.createElement('a')
  link.download = `mezzo-winner-card-${Date.now()}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}
function enhanceWinnerCelebration() {
  const winnerCard = document.querySelector('.winner-card')
  if (!winnerCard || winnerCard.dataset.celebrationAdded) return
  winnerCard.dataset.celebrationAdded = 'true'
  winnerCard.classList.add('winner-ultimate')
  winnerCard.insertAdjacentHTML('beforeend', `<div class="winner-extra-actions"><button class="btn btn-gold" data-download-winner-card="true">Download Winner Card</button><button class="btn btn-primary" data-replay-celebration="true">Replay Celebration</button></div>`)
  makeCelebrationLayer()
  championOverlay()
  playCrowdClap()
  injectSmartCoach()
}

document.addEventListener('click', event => {
  if (event.target.closest('[data-download-winner-card]')) downloadWinnerCard()
  if (event.target.closest('[data-replay-celebration]')) { makeCelebrationLayer(); championOverlay(); playCrowdClap() }
  if (event.target.closest('.champion-close')) event.target.closest('.champion-day-overlay')?.remove()
})

const observer = new MutationObserver(() => {
  injectPracticeCoach()
  injectSmartCoach()
  enhanceWinnerCelebration()
})
observer.observe(document.body, { childList: true, subtree: true })
window.addEventListener('load', () => { injectPracticeCoach(); injectSmartCoach(); enhanceWinnerCelebration() })
setTimeout(() => { injectPracticeCoach(); injectSmartCoach(); enhanceWinnerCelebration() }, 300)
