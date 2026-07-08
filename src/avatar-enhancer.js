import './avatar.css'

const AVATARS = [
  { id: 'math_boy', emoji: '👦🏽', name: 'Math Warrior', type: 'starter', need: 'Starter avatar', desc: 'Ready for everyday practice.' },
  { id: 'math_girl', emoji: '👧🏾', name: 'Math Princess', type: 'starter', need: 'Starter avatar', desc: 'Bright, bold and confident.' },
  { id: 'school_genius', emoji: '🧑🏾‍🎓', name: 'School Genius', type: 'starter', need: 'Starter avatar', desc: 'Classroom champion look.' },
  { id: 'robot_jr', emoji: '🤖', name: 'MathBot Jr.', type: 'starter', need: 'Starter avatar', desc: 'A friendly practice robot.' },
  { id: 'speed_star', emoji: '⚡', name: 'Speed Star', type: 'xp', value: 500, need: 'Unlock at 500 XP', desc: 'For fast-answer champions.' },
  { id: 'coin_master', emoji: '🪙', name: 'Coin Master', type: 'coins', value: 1000, need: 'Unlock at 1,000 coins', desc: 'For students collecting rewards.' },
  { id: 'streak_flame', emoji: '🔥', name: 'Streak Flame', type: 'streak', value: 5, need: 'Unlock at 5-day streak', desc: 'For consistent daily learners.' },
  { id: 'trophy_hero', emoji: '🏆', name: 'Trophy Hero', type: 'wins', value: 10, need: 'Unlock after 10 wins', desc: 'For battle winners.' },
  { id: 'ghana_star', emoji: '⭐', name: 'Ghana Star', type: 'wins', value: 25, need: 'Unlock after 25 wins', desc: 'For top school performers.' },
  { id: 'grand_champion', emoji: '👑', name: 'Grand Champion', type: 'level', value: 50, need: 'Unlock at Level 50', desc: 'The ultimate Mezzo Maths look.' }
]

const fallbackStats = { xp: 7650, coins: 1200, wins: 12, streak: 7, level: 23 }

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback }
}
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function stats() { return { ...fallbackStats, ...readJson('mezzo_player_stats', fallbackStats) } }
function selectedAvatarId() { return localStorage.getItem('mezzo_avatar') || 'math_boy' }
function avatarById(id) { return AVATARS.find(a => a.id === id) || AVATARS[0] }
function currentAvatar() { return avatarById(selectedAvatarId()) }
function isUnlocked(avatar) {
  const s = stats()
  if (avatar.type === 'starter') return true
  if (avatar.type === 'xp') return s.xp >= avatar.value
  if (avatar.type === 'coins') return s.coins >= avatar.value
  if (avatar.type === 'wins') return s.wins >= avatar.value
  if (avatar.type === 'streak') return s.streak >= avatar.value
  if (avatar.type === 'level') return s.level >= avatar.value
  return false
}
function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
function toast(message) {
  const existing = document.querySelector('.avatar-toast')
  if (existing) existing.remove()
  const node = document.createElement('div')
  node.className = 'avatar-toast'
  node.textContent = message
  document.body.appendChild(node)
  setTimeout(() => node.remove(), 4300)
}
function syncHeroAvatars() {
  const avatar = currentAvatar()
  document.querySelectorAll('.dashboard-profile-card .avatar, .avatar-large.glow').forEach(node => {
    node.textContent = avatar.emoji
    node.title = avatar.name
  })
  document.querySelectorAll('.left-token').forEach(node => {
    if (node.dataset.avatarSynced === avatar.id) return
    node.dataset.avatarSynced = avatar.id
    node.innerHTML = `${avatar.emoji}<span>${escapeHtml(avatar.name)}</span>`
  })
}
function avatarCardHtml(avatar) {
  const selected = selectedAvatarId() === avatar.id
  const unlocked = isUnlocked(avatar)
  return `<button class="avatar-option ${selected ? 'selected' : ''} ${unlocked ? 'unlocked' : 'locked'}" data-avatar-pick="${avatar.id}">
    <span class="avatar-emoji">${avatar.emoji}</span>
    <strong>${escapeHtml(avatar.name)}</strong>
    <small>${escapeHtml(unlocked ? avatar.desc : avatar.need)}</small>
    <em>${selected ? 'Selected' : unlocked ? 'Use Avatar' : 'Locked'}</em>
  </button>`
}
function avatarLabHtml() {
  const avatar = currentAvatar()
  const s = stats()
  return `<section class="avatar-lab-card glass-card">
    <div class="avatar-lab-hero">
      <div class="avatar-stage"><div class="avatar-current">${avatar.emoji}</div><span>Current Avatar</span></div>
      <div>
        <div class="pill">🎭 Student Avatar Studio</div>
        <h2>Customize Your Maths Identity</h2>
        <p>Students can choose starter avatars and unlock special avatars as they gain XP, coins, streaks, wins and levels.</p>
        <div class="avatar-stats-row">
          <div><strong>${s.xp}</strong><span>XP</span></div>
          <div><strong>${s.coins}</strong><span>Coins</span></div>
          <div><strong>${s.wins}</strong><span>Wins</span></div>
          <div><strong>${s.streak}</strong><span>Streak</span></div>
          <div><strong>${s.level}</strong><span>Level</span></div>
        </div>
      </div>
    </div>
    <div class="avatar-picker-grid">${AVATARS.map(avatarCardHtml).join('')}</div>
  </section>`
}
function injectDashboardAvatarStudio() {
  const dashboard = document.querySelector('.dashboard-screen')
  if (!dashboard || dashboard.querySelector('.avatar-lab-card')) return
  const section = document.createElement('div')
  section.innerHTML = avatarLabHtml()
  dashboard.appendChild(section.firstElementChild)
}
function syncAvatarExperience() {
  syncHeroAvatars()
  injectDashboardAvatarStudio()
}

document.addEventListener('click', event => {
  const pick = event.target.closest('[data-avatar-pick]')
  if (!pick) return
  const avatar = avatarById(pick.dataset.avatarPick)
  if (!isUnlocked(avatar)) {
    toast(`${avatar.name} is locked. ${avatar.need}.`)
    return
  }
  localStorage.setItem('mezzo_avatar', avatar.id)
  toast(`${avatar.name} selected as your avatar.`)
  syncAvatarExperience()
})

const observer = new MutationObserver(() => syncAvatarExperience())
observer.observe(document.body, { childList: true, subtree: true })
window.addEventListener('storage', syncAvatarExperience)
window.addEventListener('load', syncAvatarExperience)
setTimeout(syncAvatarExperience, 250)
