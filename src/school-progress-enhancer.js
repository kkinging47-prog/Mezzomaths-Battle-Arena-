import './school-progress.css'

const fallbackProfile = { full_name: 'Student Champion', school_name: 'Mezzo Demo School', class_level: 'Grade 8', location: 'Greater Accra' }
const fallbackStats = { xp: 0, coins: 0, wins: 0, streak: 0, level: 1, correctAnswers: 0, attemptedAnswers: 0, completedSets: 0 }
const fallbackTopics = ['Addition', 'Subtraction', 'Multiplication', 'Division', 'Word Problems', 'Fractions', 'Percentages', 'Squaring', 'General Multiplication', 'General Division', 'BECE Exam Practice']

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback }
}
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function profile() { return { ...fallbackProfile, ...readJson('mezzo_profile', fallbackProfile) } }
function stats() { return { ...fallbackStats, ...readJson('mezzo_player_stats', fallbackStats) } }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
function percent(score, total) { return total ? Math.round((Number(score) / Number(total)) * 100) : 0 }
function parseResultCard() {
  const result = document.querySelector('.result-card')
  if (!result) return null
  const text = result.textContent || ''
  const scoreMatch = text.match(/score:\s*(\d+)\/(\d+)/i) || text.match(/Your score:\s*(\d+)\/(\d+)/i)
  const mode = text.includes('You won') || text.includes('Match') ? 'Battle' : 'Practice'
  const topic = document.querySelector('.solo-level-card small')?.textContent?.trim() || 'General Practice'
  if (!scoreMatch) return null
  return { mode, topic, score: Number(scoreMatch[1]), total: Number(scoreMatch[2]), date: new Date().toISOString() }
}
function allHistory() { return readJson('mezzo_practice_history', []) }
function recordHistory() {
  const result = parseResultCard()
  if (!result) return
  const key = `${result.mode}|${result.topic}|${result.score}|${result.total}|${new Date().toISOString().slice(0,10)}`
  const existingKeys = readJson('mezzo_history_keys', [])
  if (existingKeys.includes(key)) return
  saveJson('mezzo_history_keys', [key, ...existingKeys].slice(0, 300))
  const p = profile()
  const history = [{ ...result, student: p.full_name || 'Student Champion', school: p.school_name || 'Mezzo Demo School', classLevel: p.class_level || 'Grade 8', location: p.location || 'Greater Accra' }, ...allHistory()].slice(0, 500)
  saveJson('mezzo_practice_history', history)
  updateTopicProgress(result)
}
function topicProgress() { return readJson('mezzo_topic_progress', {}) }
function updateTopicProgress(result) {
  const map = topicProgress()
  const topic = result.topic || 'General Practice'
  const p = percent(result.score, result.total)
  const prev = map[topic] || { attempts: 0, best: 0, totalPercent: 0, lastScore: 0, status: 'Started' }
  prev.attempts += 1
  prev.best = Math.max(prev.best, p)
  prev.totalPercent += p
  prev.lastScore = p
  prev.lastPractised = new Date().toISOString()
  prev.status = prev.best >= 80 ? 'Mastered' : prev.best >= 55 ? 'Improving' : 'Started'
  map[topic] = prev
  saveJson('mezzo_topic_progress', map)
}
function leaderboardRows(scope) {
  const s = stats()
  const p = profile()
  const smart = readJson('mezzo_smart_leaderboards', { weekly: [], monthly: [], yearly: [] })
  const base = [
    { name: p.full_name || 'You', school: p.school_name || 'Mezzo Demo School', location: p.location || 'Greater Accra', classLevel: p.class_level || 'Grade 8', score: s.xp || 0, label: 'XP' },
    { name: 'Akosua Mensah', school: 'Crystal Heights', location: 'Greater Accra', classLevel: 'Grade 6', score: Math.max(900, (s.xp || 0) - 120), label: 'XP' },
    { name: 'Kofi Boateng', school: 'Republic Academy', location: 'Central Region', classLevel: 'Grade 8', score: Math.max(750, (s.xp || 0) - 250), label: 'XP' },
    { name: 'Efua Owusu', school: 'My Redeemer School', location: 'Ashanti Region', classLevel: 'Grade 7', score: Math.max(680, (s.xp || 0) - 320), label: 'XP' },
    { name: 'Yaw Addo', school: 'Gold Avenue', location: 'Greater Accra', classLevel: 'Grade 5', score: Math.max(620, (s.xp || 0) - 380), label: 'XP' }
  ]
  if (scope === 'smart') return (smart.weekly || []).map(r => ({ ...r, label: 'pts' })).concat(base.slice(0, 3)).sort((a,b) => (b.score || 0) - (a.score || 0)).slice(0, 8)
  if (scope === 'school') return base.filter(r => r.school === (p.school_name || 'Mezzo Demo School')).concat(base).slice(0, 6).sort((a,b) => b.score - a.score)
  if (scope === 'class') return base.filter(r => r.classLevel === (p.class_level || 'Grade 8')).concat(base).slice(0, 6).sort((a,b) => b.score - a.score)
  if (scope === 'regional') return base.filter(r => r.location === (p.location || 'Greater Accra')).concat(base).slice(0, 6).sort((a,b) => b.score - a.score)
  return base.sort((a,b) => b.score - a.score)
}
function expandedLeaderboardsHtml() {
  const scopes = [
    ['class', 'Class'], ['school', 'School'], ['regional', 'Regional'], ['national', 'National'], ['smart', 'Smart Board']
  ]
  return `<section class="expanded-leaderboards glass-card">
    <div class="section-row"><div><span class="mini-kicker">🏆 Expanded Rankings</span><h2>Class, School, Regional and National Leaderboards</h2></div><small>Uses saved scores now and can later be connected to Supabase leaderboard tables.</small></div>
    <div class="expanded-board-grid">${scopes.map(([scope, label]) => `<article class="rank-board"><h3>${label} Leaders</h3>${leaderboardRows(scope).slice(0, 6).map((row, index) => `<div class="rank-row"><b>${index + 1}</b><span>${escapeHtml(row.name)}</span><em>${escapeHtml(row.school || row.location || '')}</em><strong>${row.score || 0} ${row.label || 'XP'}</strong></div>`).join('')}</article>`).join('')}</div>
  </section>`
}
function injectExpandedLeaderboards() {
  const screen = document.querySelector('.leaderboard-screen')
  if (!screen || screen.querySelector('.expanded-leaderboards')) return
  screen.insertAdjacentHTML('beforeend', expandedLeaderboardsHtml())
}
function teacherAnalytics() {
  const history = allHistory()
  const p = profile()
  const grouped = {}
  for (const h of history) {
    grouped[h.topic] ||= { topic: h.topic, attempts: 0, total: 0, best: 0 }
    grouped[h.topic].attempts += 1
    const pc = percent(h.score, h.total)
    grouped[h.topic].total += pc
    grouped[h.topic].best = Math.max(grouped[h.topic].best, pc)
  }
  const topics = Object.values(grouped).map(t => ({ ...t, avg: Math.round(t.total / t.attempts) }))
  return {
    students: Math.max(1, new Set(history.map(h => h.student)).size),
    attempts: history.length,
    completed: history.length,
    bestTopic: topics.sort((a,b) => b.best - a.best)[0]?.topic || 'Multiplication',
    weakTopic: topics.sort((a,b) => a.avg - b.avg)[0]?.topic || 'Word Problems',
    bestStudent: p.full_name || 'Student Champion',
    needsHelp: topics.filter(t => t.avg < 55).map(t => t.topic).slice(0, 3)
  }
}
function teacherDashboardHtml() {
  const a = teacherAnalytics()
  const history = allHistory().slice(0, 8)
  return `<section class="teacher-dashboard-panel glass-card">
    <div class="teacher-head"><div><span class="mini-kicker">👩🏾‍🏫 Teacher Dashboard</span><h2>Class Performance Overview</h2><p>Track practice attempts, strong topics, weak topics, top performers and learners who need support.</p></div><button class="btn btn-gold" data-export-teacher-report="true">Download CSV Report</button></div>
    <div class="teacher-metrics"><div><strong>${a.students}</strong><span>Active students</span></div><div><strong>${a.attempts}</strong><span>Total attempts</span></div><div><strong>${a.bestTopic}</strong><span>Strong topic</span></div><div><strong>${a.weakTopic}</strong><span>Weak topic</span></div></div>
    <div class="teacher-grid"><article><h3>Students Needing Help</h3>${(a.needsHelp.length ? a.needsHelp : ['Word Problems', 'Fractions']).map(t => `<p>⚠️ Give extra support in <b>${escapeHtml(t)}</b></p>`).join('')}</article><article><h3>Best Performer</h3><p>🏅 ${escapeHtml(a.bestStudent)}</p><p>Use this student for peer-support or board demonstration.</p></article><article><h3>Recent Attempts</h3>${history.length ? history.map(h => `<p>${escapeHtml(h.student)} — ${escapeHtml(h.topic)} — ${h.score}/${h.total}</p>`).join('') : '<p>No practice history yet. Complete a practice set to populate this dashboard.</p>'}</article></div>
  </section>`
}
function injectTeacherDashboard() {
  const admin = document.querySelector('.admin-screen')
  const dashboard = document.querySelector('.dashboard-screen')
  const target = admin || dashboard
  if (!target || target.querySelector('.teacher-dashboard-panel')) return
  target.insertAdjacentHTML('beforeend', teacherDashboardHtml())
}
function topicListFromCurrentDom() {
  const soloOptions = Array.from(document.querySelectorAll('#soloTopic option')).map(o => o.value).filter(Boolean)
  const smartOptions = Array.from(document.querySelectorAll('#smartTopic option')).map(o => o.value).filter(Boolean)
  const merged = [...new Set([...soloOptions, ...smartOptions, ...fallbackTopics])]
  return merged.slice(0, 18)
}
function topicProgressHtml() {
  const map = topicProgress()
  const topics = topicListFromCurrentDom()
  return `<section class="topic-progress-map glass-card">
    <div class="section-row"><div><span class="mini-kicker">🗺️ Topic Progress Map</span><h2>Unlock Your Maths Journey</h2></div><small>Topics move from Started → Improving → Mastered based on practice performance.</small></div>
    <div class="topic-path">${topics.map((topic, index) => { const p = map[topic] || { best: 0, attempts: 0, status: index < 2 ? 'Started' : 'Locked' }; const status = p.status || 'Locked'; return `<div class="topic-node ${status.toLowerCase()}"><span>${status === 'Mastered' ? '✅' : status === 'Improving' ? '🔥' : status === 'Started' ? '🟡' : '🔒'}</span><strong>${escapeHtml(topic)}</strong><small>${p.best || 0}% best • ${p.attempts || 0} attempts</small><i style="width:${Math.min(100, p.best || 0)}%"></i></div>` }).join('')}</div>
  </section>`
}
function injectTopicProgressMap() {
  const dashboard = document.querySelector('.dashboard-screen')
  const solo = document.querySelector('.solo-screen')
  const target = dashboard || solo
  if (!target || target.querySelector('.topic-progress-map')) return
  target.insertAdjacentHTML('beforeend', topicProgressHtml())
}
function exportTeacherReport() {
  const history = allHistory()
  const rows = [['Student','School','Class','Location','Mode','Topic','Score','Total','Percent','Date'], ...history.map(h => [h.student, h.school, h.classLevel, h.location, h.mode, h.topic, h.score, h.total, percent(h.score, h.total), h.date])]
  const csv = rows.map(row => row.map(cell => `"${String(cell || '').replaceAll('"', '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `mezzo-teacher-report-${Date.now()}.csv`
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

document.addEventListener('click', event => {
  if (event.target.closest('[data-export-teacher-report]')) exportTeacherReport()
})

const observer = new MutationObserver(() => {
  recordHistory()
  injectExpandedLeaderboards()
  injectTeacherDashboard()
  injectTopicProgressMap()
})
observer.observe(document.body, { childList: true, subtree: true })
window.addEventListener('load', () => { recordHistory(); injectExpandedLeaderboards(); injectTeacherDashboard(); injectTopicProgressMap() })
setTimeout(() => { recordHistory(); injectExpandedLeaderboards(); injectTeacherDashboard(); injectTopicProgressMap() }, 400)
