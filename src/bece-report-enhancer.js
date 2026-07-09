import './bece-report.css'

let syncQueued = false

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback }
}
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
function today() { return new Date().toLocaleDateString() }
function profile() { return readJson('mezzo_profile', {}) || {} }
function detailedAnswers() { return readJson('mezzo_bece_detailed_answers', []) }
function history() { return readJson('mezzo_bece_history', []) }
function pct(a, b) { return b ? Math.round((a / b) * 100) : 0 }
function strengthLabel(score) {
  if (score >= 80) return 'Perfect / Strong'
  if (score >= 60) return 'Good, but needs polishing'
  if (score >= 40) return 'Developing'
  return 'Needs improvement'
}
function topicStats() {
  const rows = detailedAnswers()
  const map = {}
  rows.forEach(row => {
    const topic = row.topic || 'General BECE Practice'
    map[topic] ||= { topic, answered: 0, correct: 0, wrong: 0, questions: [] }
    map[topic].answered += 1
    if (row.correct) map[topic].correct += 1
    else map[topic].wrong += 1
    map[topic].questions.push(row)
  })
  return Object.values(map).map(item => ({ ...item, percent: pct(item.correct, item.answered), label: strengthLabel(pct(item.correct, item.answered)) })).sort((a, b) => b.percent - a.percent)
}
function overallStats() {
  const answers = detailedAnswers()
  const correct = answers.filter(a => a.correct).length
  const wrong = answers.length - correct
  const sets = history()
  const best = sets.reduce((max, set) => Math.max(max, pct(set.score || 0, set.total || 0)), 0)
  const topics = topicStats()
  return { answered: answers.length, correct, wrong, percent: pct(correct, answers.length), sets: sets.length, best, topics, strengths: topics.filter(t => t.percent >= 70), weaknesses: topics.filter(t => t.percent < 60) }
}
function aiAdvice(stats) {
  const weak = stats.weaknesses.slice(-4).map(t => t.topic)
  const strong = stats.strengths.slice(0, 4).map(t => t.topic)
  const focus = weak.length ? weak.join(', ') : 'higher-order word problems and speed practice'
  const praise = strong.length ? strong.join(', ') : 'basic problem solving and consistency'
  const plan = stats.percent >= 80
    ? 'Move into timed mixed BECE sets and practise explaining your steps clearly.'
    : stats.percent >= 60
    ? 'Revise weak topics, then complete two mixed sets under time pressure.'
    : 'Go back to the basic methods topic by topic, practise direct questions first, then attempt short word problems.'
  return { focus, praise, plan }
}
function reportHtml() {
  const p = profile()
  const stats = overallStats()
  const advice = aiAdvice(stats)
  const topicRows = stats.topics.length ? stats.topics : [{ topic: 'No BECE practice yet', answered: 0, correct: 0, wrong: 0, percent: 0, label: 'Start practice' }]
  return `<main class="app-shell"><section class="app-frame bece-report-page">
    <nav class="screen-tabs bece-nav"><div class="brand-chip"><span class="brand-crown">♛</span><div><strong>MEZZO</strong><small>BECE AI Report</small></div></div><div class="tab-scroll"><button class="screen-tab" data-bece-page="true"><span>📘</span>BECE Practice</button><button class="screen-tab active" data-bece-report-page="true"><span>📊</span>BECE Report</button><button class="screen-tab" data-target="home"><span>🏟️</span>Home</button></div></nav>
    <section class="bece-report-hero glass-card"><div><span class="bece-report-kicker">🤖 AI BECE Performance Report</span><h1>Progress, Strengths & Weaknesses</h1><p>${escapeHtml(p.full_name || 'Student')}, this report analyses your BECE practice answers, topic performance, areas of strength, weak topics and what to improve next.</p></div><div class="report-score-orb"><strong>${stats.percent}%</strong><span>Overall</span></div></section>
    <section class="report-metrics"><div><span>✅</span><strong>${stats.correct}</strong><small>Correct answers</small></div><div><span>❌</span><strong>${stats.wrong}</strong><small>Wrong answers</small></div><div><span>📝</span><strong>${stats.answered}</strong><small>Questions answered</small></div><div><span>🏆</span><strong>${stats.best}%</strong><small>Best set score</small></div></section>
    <section class="ai-report-card glass-card"><div class="ai-report-head"><span>🤖</span><div><h2>Comprehensive AI Report</h2><p><b>Current level:</b> ${strengthLabel(stats.percent)}. Your strongest area is ${escapeHtml(advice.praise)}. Your immediate improvement focus should be ${escapeHtml(advice.focus)}.</p><p><b>Recommended plan:</b> ${escapeHtml(advice.plan)}</p></div></div><div class="report-actions"><button class="btn btn-gold" data-download-bece-report="html">Download Full Report</button><button class="btn btn-primary" data-download-bece-report="csv">Download CSV</button></div></section>
    <section class="topic-report-grid">${topicRows.map(topic => `<article class="topic-report-card ${topic.percent >= 70 ? 'strong' : topic.percent < 60 ? 'weak' : 'medium'}"><div><h3>${escapeHtml(topic.topic)}</h3><span>${escapeHtml(topic.label)}</span></div><strong>${topic.percent}%</strong><p>${topic.correct}/${topic.answered} correct • ${topic.wrong} wrong</p><i style="width:${topic.percent}%"></i><small>${topic.percent >= 70 ? 'Keep practising to perfect speed and accuracy.' : topic.percent >= 60 ? 'Good foundation. Practise more word problems.' : 'Revise the method and practise direct questions first.'}</small></article>`).join('')}</section>
    <section class="mistake-review glass-card"><h2>Where You Need to Improve</h2>${detailedAnswers().filter(a => !a.correct).slice(0, 12).map(a => `<div class="mistake-row"><b>${escapeHtml(a.topic)}</b><span>${escapeHtml(a.question)}</span><small>Your answer: ${escapeHtml(a.selectedText || a.selected)} • Correct: ${escapeHtml(a.correctText || a.correctAnswer)}</small></div>`).join('') || '<p>No wrong answers recorded yet. Complete BECE practice to populate this section.</p>'}</section>
  </section></main>`
}
function captureAnswer(button) {
  setTimeout(() => {
    const card = button.closest('.bece-question-card')
    if (!card || button.dataset.reportCaptured === 'true') return
    button.dataset.reportCaptured = 'true'
    const topic = card.querySelector('.bece-meta span')?.textContent?.trim() || 'BECE Practice'
    const question = card.querySelector('h2')?.textContent?.trim() || ''
    const selected = button.dataset.beceAnswer || ''
    const selectedText = button.querySelector('span')?.textContent?.trim() || ''
    const correctButton = card.querySelector('.bece-correct')
    const correctAnswer = correctButton?.dataset.beceAnswer || ''
    const correctText = correctButton?.querySelector('span')?.textContent?.trim() || ''
    const correct = button.classList.contains('bece-correct')
    const mode = document.querySelector('.bece-side div:nth-child(3) strong')?.textContent?.trim() || 'BECE Practice'
    const item = { topic, question, selected, selectedText, correctAnswer, correctText, correct, mode, date: new Date().toISOString() }
    const rows = detailedAnswers()
    const duplicate = rows.some(row => row.question === question && row.selected === selected && Math.abs(new Date(row.date) - new Date(item.date)) < 3000)
    if (!duplicate) saveJson('mezzo_bece_detailed_answers', [item, ...rows].slice(0, 1000))
  }, 120)
}
function installReportButtons() {
  const becePage = document.querySelector('.bece-page')
  if (becePage && !becePage.querySelector('[data-bece-report-page]')) {
    const nav = becePage.querySelector('.tab-scroll')
    if (nav) nav.insertAdjacentHTML('beforeend', '<button class="screen-tab" data-bece-report-page="true"><span>📊</span>AI Report</button>')
  }
  const tracker = document.querySelector('.bece-set-grid .bece-set-card:nth-child(3)')
  if (tracker && !tracker.querySelector('[data-bece-report-page]')) tracker.insertAdjacentHTML('beforeend', '<button class="btn btn-gold" data-bece-report-page="true">Open AI Report</button>')
  const result = document.querySelector('.bece-result')
  if (result && !result.querySelector('[data-bece-report-page]')) result.querySelector('.bece-actions')?.insertAdjacentHTML('afterbegin', '<button class="btn btn-gold" data-bece-report-page="true">View AI Report</button>')
}
function downloadHtmlReport() {
  const stats = overallStats()
  const advice = aiAdvice(stats)
  const topics = stats.topics.map(t => `<tr><td>${escapeHtml(t.topic)}</td><td>${t.answered}</td><td>${t.correct}</td><td>${t.wrong}</td><td>${t.percent}%</td><td>${escapeHtml(t.label)}</td></tr>`).join('')
  const mistakes = detailedAnswers().filter(a => !a.correct).map(a => `<li><b>${escapeHtml(a.topic)}:</b> ${escapeHtml(a.question)}<br>Your answer: ${escapeHtml(a.selectedText || a.selected)} | Correct: ${escapeHtml(a.correctText || a.correctAnswer)}</li>`).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>BECE AI Report</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#0f172a}h1{color:#1d4ed8}table{width:100%;border-collapse:collapse}td,th{border:1px solid #cbd5e1;padding:8px;text-align:left}.box{background:#eff6ff;padding:16px;border-radius:14px;margin:14px 0}</style></head><body><h1>Mezzo Maths BECE AI Performance Report</h1><p>Date: ${today()}</p><div class="box"><h2>Summary</h2><p>Overall Score: ${stats.percent}%</p><p>Questions Answered: ${stats.answered}</p><p>Correct: ${stats.correct} | Wrong: ${stats.wrong}</p></div><div class="box"><h2>AI Recommendation</h2><p><b>Strength:</b> ${escapeHtml(advice.praise)}</p><p><b>Improve:</b> ${escapeHtml(advice.focus)}</p><p><b>Plan:</b> ${escapeHtml(advice.plan)}</p></div><h2>Topic Breakdown</h2><table><thead><tr><th>Topic</th><th>Answered</th><th>Correct</th><th>Wrong</th><th>Score</th><th>Status</th></tr></thead><tbody>${topics}</tbody></table><h2>Mistake Review</h2><ol>${mistakes || '<li>No mistakes recorded.</li>'}</ol></body></html>`
  downloadFile('mezzo-bece-ai-report.html', html, 'text/html')
}
function downloadCsvReport() {
  const rows = [['Date','Mode','Topic','Question','Selected','Correct Answer','Result'], ...detailedAnswers().map(a => [a.date, a.mode, a.topic, a.question, a.selectedText || a.selected, a.correctText || a.correctAnswer, a.correct ? 'Correct' : 'Wrong'])]
  const csv = rows.map(row => row.map(cell => `"${String(cell || '').replaceAll('"', '""')}"`).join(',')).join('\n')
  downloadFile('mezzo-bece-answer-history.csv', csv, 'text/csv')
}
function downloadFile(name, content, type) {
  const blob = new Blob([content], { type })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}
function sync() {
  if (syncQueued) return
  syncQueued = true
  requestAnimationFrame(() => { syncQueued = false; installReportButtons() })
}

document.addEventListener('click', event => {
  const answer = event.target.closest('[data-bece-answer]')
  if (answer) captureAnswer(answer)
  if (event.target.closest('[data-bece-report-page]')) { event.preventDefault(); event.stopImmediatePropagation(); document.getElementById('root').innerHTML = reportHtml(); return }
  const download = event.target.closest('[data-download-bece-report]')
  if (download) { event.preventDefault(); download.dataset.downloadBeceReport === 'csv' ? downloadCsvReport() : downloadHtmlReport() }
}, true)

const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, attributes: false })
window.addEventListener('load', sync)
setTimeout(sync, 350)
