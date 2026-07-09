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
    <section class="ai-report-card glass-card"><div class="ai-report-head"><span>🤖</span><div><h2>Comprehensive AI Report</h2><p><b>Current level:</b> ${strengthLabel(stats.percent)}. Your strongest area is ${escapeHtml(advice.praise)}. Your immediate improvement focus should be ${escapeHtml(advice.focus)}.</p><p><b>Recommended plan:</b> ${escapeHtml(advice.plan)}</p></div></div><div class="report-actions"><button class="btn btn-gold" data-download-bece-report="full-pdf">Download Full PDF Report</button><button class="btn btn-primary" data-download-bece-report="answers-pdf">Download Answers PDF</button></div></section>
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
function cleanPdfText(value = '') {
  return String(value)
    .replace(/[•✓✅❌📝🏆🤖📘📊🏟️]/gu, '')
    .replace(/[−–—]/g, '-')
    .replace(/×/g, 'x')
    .replace(/÷/g, '/')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .split('')
    .filter(char => {
      const code = char.charCodeAt(0)
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126)
    })
    .join('')
}
function wrapText(text, max = 86) {
  const words = cleanPdfText(text).split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  words.forEach(word => {
    if ((line + ' ' + word).trim().length > max) {
      if (line) lines.push(line)
      line = word
    } else line = (line + ' ' + word).trim()
  })
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}
function pdfEscape(text) {
  return cleanPdfText(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}
function downloadPdf(filename, rawLines) {
  const pageLines = []
  rawLines.forEach(line => wrapText(line, 92).forEach(wrapped => pageLines.push(wrapped)))
  const pages = []
  for (let i = 0; i < pageLines.length; i += 48) pages.push(pageLines.slice(i, i + 48))
  if (!pages.length) pages.push(['No report data available.'])

  const objects = []
  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  const kids = pages.map((_, i) => `${4 + i * 2} 0 R`).join(' ')
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`)
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  pages.forEach((lines, index) => {
    const pageId = 4 + index * 2
    const contentId = pageId + 1
    const content = `BT\n/F1 10 Tf\n14 TL\n50 800 Td\n${lines.map(line => `(${pdfEscape(line)}) Tj\nT*`).join('')}ET`
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`)
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  })

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((obj, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n` })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  downloadFile(filename, pdf, 'application/pdf')
}
function fullReportLines() {
  const p = profile()
  const stats = overallStats()
  const advice = aiAdvice(stats)
  const lines = [
    'MEZZO MATHS BECE AI PERFORMANCE REPORT',
    `Student: ${p.full_name || 'Student'}`,
    `Date: ${today()}`,
    '',
    'SUMMARY',
    `Overall Score: ${stats.percent}%`,
    `Questions Answered: ${stats.answered}`,
    `Correct Answers: ${stats.correct}`,
    `Wrong Answers: ${stats.wrong}`,
    `Best BECE Set Score: ${stats.best}%`,
    '',
    'AI RECOMMENDATION',
    `Strength: ${advice.praise}`,
    `Improve: ${advice.focus}`,
    `Plan: ${advice.plan}`,
    '',
    'TOPIC BREAKDOWN'
  ]
  ;(stats.topics.length ? stats.topics : [{ topic: 'No BECE practice yet', answered: 0, correct: 0, wrong: 0, percent: 0, label: 'Start practice' }]).forEach(t => {
    lines.push(`${t.topic}: ${t.percent}% | ${t.correct}/${t.answered} correct | ${t.wrong} wrong | ${t.label}`)
  })
  lines.push('', 'MISTAKE REVIEW')
  const mistakes = detailedAnswers().filter(a => !a.correct)
  if (!mistakes.length) lines.push('No mistakes recorded yet.')
  mistakes.forEach((a, index) => {
    lines.push(`${index + 1}. ${a.topic}: ${a.question}`)
    lines.push(`   Your answer: ${a.selectedText || a.selected} | Correct: ${a.correctText || a.correctAnswer}`)
  })
  return lines
}
function answersReportLines() {
  const lines = ['MEZZO MATHS BECE ANSWER HISTORY PDF', `Date: ${today()}`, '', 'ANSWER HISTORY']
  const rows = detailedAnswers()
  if (!rows.length) lines.push('No BECE answers recorded yet.')
  rows.forEach((a, index) => {
    lines.push(`${index + 1}. ${a.date || ''}`)
    lines.push(`   Mode: ${a.mode || 'BECE Practice'} | Topic: ${a.topic || ''} | Result: ${a.correct ? 'Correct' : 'Wrong'}`)
    lines.push(`   Question: ${a.question || ''}`)
    lines.push(`   Selected: ${a.selectedText || a.selected || ''} | Correct Answer: ${a.correctText || a.correctAnswer || ''}`)
  })
  return lines
}
function downloadFullPdfReport() { downloadPdf('mezzo-bece-ai-report.pdf', fullReportLines()) }
function downloadAnswersPdfReport() { downloadPdf('mezzo-bece-answer-history.pdf', answersReportLines()) }
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
  if (download) {
    event.preventDefault()
    download.dataset.downloadBeceReport === 'answers-pdf' ? downloadAnswersPdfReport() : downloadFullPdfReport()
  }
}, true)

const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, attributes: false })
window.addEventListener('load', sync)
setTimeout(sync, 350)
