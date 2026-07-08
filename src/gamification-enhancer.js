import './gamification.css'

const defaultStats = {
  xp: 0,
  coins: 0,
  wins: 0,
  streak: 0,
  level: 1,
  correctAnswers: 0,
  attemptedAnswers: 0,
  completedSets: 0,
  smartWins: 0,
  lastDailyDate: '',
  badges: []
}

const BADGES = [
  { id: 'first_steps', icon: '🌱', name: 'First Steps', desc: 'Answer your first question', test: s => s.attemptedAnswers >= 1 },
  { id: 'sharp_mind', icon: '🧠', name: 'Sharp Mind', desc: 'Get 10 correct answers', test: s => s.correctAnswers >= 10 },
  { id: 'speed_master', icon: '⚡', name: 'Speed Master', desc: 'Reach 500 XP', test: s => s.xp >= 500 },
  { id: 'coin_collector', icon: '🪙', name: 'Coin Collector', desc: 'Collect 1,000 coins', test: s => s.coins >= 1000 },
  { id: 'daily_fire', icon: '🔥', name: 'Daily Fire', desc: 'Build a 5-day streak', test: s => s.streak >= 5 },
  { id: 'battle_winner', icon: '🏆', name: 'Battle Winner', desc: 'Win 3 battles', test: s => s.wins >= 3 },
  { id: 'smart_champion', icon: '📺', name: 'Smart Board Champion', desc: 'Win a Smart Board contest', test: s => s.smartWins >= 1 },
  { id: 'level_10', icon: '👑', name: 'Level 10 Scholar', desc: 'Reach Level 10', test: s => s.level >= 10 },
  { id: 'practice_machine', icon: '💎', name: 'Practice Machine', desc: 'Complete 10 question sets', test: s => s.completedSets >= 10 }
]

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback }
}
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function getStats() {
  const saved = readJson('mezzo_player_stats', defaultStats)
  const level = Math.max(1, Math.floor((saved.xp || 0) / 250) + 1)
  return { ...defaultStats, ...saved, level }
}
function statsSignature(stats = getStats()) {
  return [stats.xp, stats.coins, stats.wins, stats.streak, stats.level, stats.correctAnswers, stats.attemptedAnswers, stats.completedSets, stats.smartWins, (stats.badges || []).join('|')].join('-')
}
function saveStats(stats) {
  stats.level = Math.max(1, Math.floor((stats.xp || 0) / 250) + 1)
  stats.badges = Array.from(new Set(stats.badges || []))
  saveJson('mezzo_player_stats', stats)
  window.dispatchEvent(new Event('storage'))
}
function levelProgress(stats) {
  const currentLevelStart = (stats.level - 1) * 250
  const nextLevel = stats.level * 250
  const progress = Math.max(0, Math.min(100, Math.round(((stats.xp - currentLevelStart) / (nextLevel - currentLevelStart)) * 100)))
  return { progress, remaining: Math.max(0, nextLevel - stats.xp) }
}
function showRewardToast(title, text) {
  const existing = document.querySelector('.reward-toast')
  if (existing) existing.remove()
  const toast = document.createElement('div')
  toast.className = 'reward-toast'
  toast.innerHTML = `<strong>${title}</strong><span>${text}</span>`
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 4600)
}
function checkBadges(stats) {
  const unlocked = []
  for (const badge of BADGES) {
    if (!stats.badges.includes(badge.id) && badge.test(stats)) {
      stats.badges.push(badge.id)
      unlocked.push(badge)
    }
  }
  return unlocked
}
function award({ xp = 0, coins = 0, correct = false, attempt = false, completed = false, win = false, smartWin = false, daily = false, reason = 'Reward earned' }) {
  const stats = getStats()
  const beforeLevel = stats.level
  stats.xp += xp
  stats.coins += coins
  if (attempt) stats.attemptedAnswers += 1
  if (correct) stats.correctAnswers += 1
  if (completed) stats.completedSets += 1
  if (win) stats.wins += 1
  if (smartWin) stats.smartWins += 1
  if (daily) {
    const today = new Date().toISOString().slice(0, 10)
    if (stats.lastDailyDate !== today) {
      stats.streak += 1
      stats.lastDailyDate = today
    }
  }
  stats.level = Math.max(1, Math.floor(stats.xp / 250) + 1)
  const newBadges = checkBadges(stats)
  saveStats(stats)
  syncGamificationUI()
  const levelText = stats.level > beforeLevel ? ` • Level up to ${stats.level}!` : ''
  showRewardToast('Reward earned', `+${xp} XP • +${coins} coins • ${reason}${levelText}`)
  if (newBadges.length) setTimeout(() => showRewardToast('Badge unlocked!', `${newBadges.map(b => `${b.icon} ${b.name}`).join(', ')}`), 650)
}
function badgeHtml(badge, unlocked) {
  return `<div class="badge-tile ${unlocked ? 'earned' : 'locked'}"><span>${unlocked ? badge.icon : '🔒'}</span><strong>${badge.name}</strong><small>${badge.desc}</small></div>`
}
function statsPanelHtml(signature) {
  const stats = getStats()
  const { progress, remaining } = levelProgress(stats)
  const earned = new Set(stats.badges || [])
  return `<section class="gamification-panel glass-card" data-reward-signature="${signature}">
    <div class="reward-header">
      <div><div class="pill">🎮 XP • Coins • Badges</div><h2>My Battle Rewards</h2><p>Earn XP, coins and badges by answering correctly, completing practice sets and winning battles.</p></div>
      <div class="level-orb"><span>Level</span><strong>${stats.level}</strong></div>
    </div>
    <div class="reward-metrics">
      <div><span>⚡</span><strong>${stats.xp}</strong><small>Total XP</small></div>
      <div><span>🪙</span><strong>${stats.coins}</strong><small>Coins</small></div>
      <div><span>🏆</span><strong>${stats.wins}</strong><small>Wins</small></div>
      <div><span>🔥</span><strong>${stats.streak}</strong><small>Daily streak</small></div>
      <div><span>✅</span><strong>${stats.correctAnswers}</strong><small>Correct answers</small></div>
    </div>
    <div class="level-progress-wrap"><div class="level-progress-label"><strong>Level ${stats.level} progress</strong><span>${remaining} XP to next level</span></div><div class="level-progress"><i style="width:${progress}%"></i></div></div>
    <div class="badge-cabinet"><div class="section-row"><h3>Badge Cabinet</h3><span>${earned.size}/${BADGES.length} earned</span></div><div class="badge-grid">${BADGES.map(b => badgeHtml(b, earned.has(b.id))).join('')}</div></div>
  </section>`
}
function miniDockHtml(signature) {
  const stats = getStats()
  return `<div class="reward-mini-dock" data-reward-signature="${signature}"><span>Lv. ${stats.level}</span><strong>⚡ ${stats.xp}</strong><strong>🪙 ${stats.coins}</strong><strong>🏆 ${stats.wins}</strong></div>`
}
function htmlToElement(html) {
  const wrap = document.createElement('div')
  wrap.innerHTML = html.trim()
  return wrap.firstElementChild
}
function injectDashboardRewards() {
  const dashboard = document.querySelector('.dashboard-screen')
  if (!dashboard) return
  const signature = statsSignature()
  const existing = dashboard.querySelector('.gamification-panel')
  if (existing?.dataset.rewardSignature === signature) return
  const next = htmlToElement(statsPanelHtml(signature))
  if (existing) existing.replaceWith(next)
  else {
    const avatarLab = dashboard.querySelector('.avatar-lab-card')
    if (avatarLab) avatarLab.insertAdjacentElement('afterend', next)
    else dashboard.appendChild(next)
  }
}
function injectMiniDock() {
  const appFrame = document.querySelector('.app-frame')
  if (!appFrame) return
  const signature = statsSignature()
  const existing = appFrame.querySelector(':scope > .reward-mini-dock') || document.querySelector('.reward-mini-dock')
  if (existing?.dataset.rewardSignature === signature) return
  const next = htmlToElement(miniDockHtml(signature))
  if (existing) existing.replaceWith(next)
  else appFrame.prepend(next)
}
function syncLandingStats() {
  const stats = getStats()
  const signature = statsSignature(stats)
  const grid = document.querySelector('.landing-stat-grid')
  if (!grid || grid.dataset.rewardSignature === signature) return
  grid.dataset.rewardSignature = signature
  const items = grid.querySelectorAll('.landing-stat')
  const values = [
    ['🔥', `${stats.streak}-Day`, 'Current streak'],
    ['🪙', `${stats.coins}`, 'Coins earned'],
    ['🏆', `${stats.wins}`, 'Battle wins'],
    ['⚡', `Lv. ${stats.level}`, 'Current level']
  ]
  items.forEach((item, index) => {
    if (!values[index]) return
    item.innerHTML = `<span>${values[index][0]}</span><strong>${values[index][1]}</strong><small>${values[index][2]}</small>`
  })
}
let syncQueued = false
function syncGamificationUI() {
  if (syncQueued) return
  syncQueued = true
  requestAnimationFrame(() => {
    syncQueued = false
    injectMiniDock()
    injectDashboardRewards()
    syncLandingStats()
  })
}
function resultText() { return document.querySelector('.result-banner strong')?.textContent?.trim() || '' }
function oncePerElement(el, key) {
  if (!el || el.dataset[key]) return false
  el.dataset[key] = '1'
  return true
}

document.addEventListener('click', event => {
  const soloAnswer = event.target.closest('[data-solo-answer]')
  const battleAnswer = event.target.closest('[data-battle-answer]')
  const smartSubmit = event.target.closest('[data-submit-smart]')
  if (soloAnswer || battleAnswer) {
    const target = soloAnswer || battleAnswer
    if (!oncePerElement(target, 'rewarded')) return
    setTimeout(() => {
      const correct = resultText().toLowerCase().includes('correct')
      award({ xp: correct ? 20 : 5, coins: correct ? 10 : 2, correct, attempt: true, reason: correct ? 'Correct answer' : 'Attempt completed' })
    }, 80)
  }
  if (smartSubmit) {
    setTimeout(() => {
      const text = document.querySelector('.smart-meta')?.textContent || ''
      if (text.includes('answered fastest')) award({ xp: 25, coins: 12, correct: true, attempt: true, reason: 'Fast Smart Board answer' })
      else award({ xp: 3, coins: 1, attempt: true, reason: 'Smart Board attempt' })
    }, 100)
  }
  if (event.target.closest('[data-start-daily]')) award({ xp: 10, coins: 5, daily: true, reason: 'Daily challenge opened' })
})

const completedKeys = new Set()
const mutationObserver = new MutationObserver(() => {
  syncGamificationUI()
  const result = document.querySelector('.result-card')
  if (result) {
    const key = result.textContent.slice(0, 140)
    if (!completedKeys.has(key)) {
      completedKeys.add(key)
      const won = result.textContent.includes('You won')
      award({ xp: won ? 80 : 50, coins: won ? 45 : 25, completed: true, win: won, reason: won ? 'Battle completed and won' : 'Practice set completed' })
    }
  }
  const smartWinner = document.querySelector('.winner-card h1')
  if (smartWinner) {
    const key = `smart-${smartWinner.textContent}`
    if (!completedKeys.has(key)) {
      completedKeys.add(key)
      award({ xp: 120, coins: 60, completed: true, win: true, smartWin: true, reason: 'Smart Board champion' })
    }
  }
})
mutationObserver.observe(document.body, { childList: true, subtree: true })
window.addEventListener('load', syncGamificationUI)
window.addEventListener('storage', syncGamificationUI)
setTimeout(syncGamificationUI, 300)
