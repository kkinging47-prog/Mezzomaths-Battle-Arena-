import './bece-time-report.css'

const STANDARD_SECONDS = 60 * 60
let queued = false

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
function formatTime(seconds = 0) { const safe = Math.max(0, Math.floor(Number(seconds) || 0)); const h = Math.floor(safe / 3600); const m = Math.floor((safe % 3600) / 60); const s = safe % 60; return h ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}` }
function timeStatus(seconds = 0) { if (seconds <= STANDARD_SECONDS * .75) return 'Excellent speed'; if (seconds <= STANDARD_SECONDS) return 'Within standard time'; return 'Above standard time' }
function history() { return readJson('mezzo_bece_history', []) }
function detailed() { return readJson('mezzo_bece_detailed_answers', []) }
function latestTimedSet() { return history().find(row => row.time_spent_seconds) || null }
function avgTime() { const timed = history().filter(row => row.time_spent_seconds); return timed.length ? Math.round(timed.reduce((sum, row) => sum + Number(row.time_spent_seconds || 0), 0) / timed.length) : 0 }
function timeAdvice(seconds = 0, score = 0, total = 0) {
  if (!seconds) return 'Complete a BECE practice set to generate time analysis.'
  const pct = total ? Math.round((score / total) * 100) : 0
  if (seconds <= STANDARD_SECONDS && pct >= 70) return 'Good pace and accuracy. Continue practising full objective sets under 60 minutes.'
  if (seconds <= STANDARD_SECONDS && pct < 70) return 'Your time is within the standard, but improve accuracy by revising weak topics before increasing speed.'
  if (seconds > STANDARD_SECONDS && pct >= 70) return 'Accuracy is promising, but speed must improve. Practise timed sets and avoid spending too long on one question.'
  return 'Both speed and accuracy need attention. Revise topic methods first, then practise 10-question timed drills daily.'
}
function cardHtml() {
  const latest = latestTimedSet()
  const average = avgTime()
  const latestSeconds = Number(latest?.time_spent_seconds || 0)
  const remaining = STANDARD_SECONDS - latestSeconds
  const usedPct = latestSeconds ? Math.round((latestSeconds / STANDARD_SECONDS) * 100) : 0
  return `<section class="bece-time-report-card glass-card"><div class="time-report-head"><span>⏱️</span><div><h2>BECE Objective Time Analysis</h2><p>The BECE objective standard is <b>60 minutes</b>. This compares the student’s actual practice time against that standard.</p></div></div><div class="time-report-grid"><div><strong>${latestSeconds ? formatTime(latestSeconds) : '--:--'}</strong><small>Latest time used</small></div><div><strong>60:00</strong><small>Standard objective time</small></div><div><strong>${latestSeconds ? `${usedPct}%` : '0%'}</strong><small>Time used against standard</small></div><div><strong>${average ? formatTime(average) : '--:--'}</strong><small>Average time</small></div></div><div class="time-report-note ${latestSeconds > STANDARD_SECONDS ? 'slow' : 'ok'}"><b>${latestSeconds ? timeStatus(latestSeconds) : 'No timed set yet'}:</b> ${latestSeconds ? `${remaining >= 0 ? `${formatTime(remaining)} remaining` : `${formatTime(Math.abs(remaining))} above standard`}. ` : ''}${escapeHtml(timeAdvice(latestSeconds, latest?.score || 0, latest?.total || 0))}</div></section>`
}
function installCard() {
  const page = document.querySelector('.bece-report-page')
  if (!page || page.querySelector('.bece-time-report-card')) return
  const metrics = page.querySelector('.report-metrics')
  if (metrics) metrics.insertAdjacentHTML('afterend', cardHtml())
  const actions = page.querySelector('.ai-report-card .report-actions')
  if (actions && !actions.querySelector('[data-download-timed-bece-report]')) actions.insertAdjacentHTML('beforeend', '<button class="btn btn-blue" data-download-timed-bece-report="true">Download Timed PDF Report</button>')
}
function pdfTextLines() {
  const latest = latestTimedSet()
  const average = avgTime()
  const latestSeconds = Number(latest?.time_spent_seconds || 0)
  const answers = detailed().slice(0, 80)
  const lines = [
    'MEZZO MATHS BECE TIMED PERFORMANCE REPORT',
    `Date: ${new Date().toLocaleDateString()}`,
    '',
    'TIME ANALYSIS',
    `BECE Objective Standard Time: 60:00`,
    `Latest Time Used: ${latestSeconds ? formatTime(latestSeconds) : 'No timed set yet'}`,
    `Time Status: ${latestSeconds ? timeStatus(latestSeconds) : 'No timed set yet'}`,
    `Average Time Used: ${average ? formatTime(average) : 'No timed set yet'}`,
    `Latest Score: ${latest ? `${latest.score}/${latest.total}` : 'No timed set yet'}`,
    `Advice: ${timeAdvice(latestSeconds, latest?.score || 0, latest?.total || 0)}`,
    '',
    'QUESTION TIME TRACE'
  ]
  if (!answers.length) lines.push('No answer history yet.')
  answers.forEach((a, i) => {
    lines.push(`${i + 1}. ${a.topic || 'BECE'} | ${a.correct ? 'Correct' : 'Wrong'} | Time mark: ${a.elapsed_seconds ? formatTime(a.elapsed_seconds) : 'Not recorded'}`)
    lines.push(`   ${a.question || ''}`)
  })
  return lines
}
function cleanPdfText(value = '') { return String(value).replace(/[•✓✅❌📝🏆🤖📘📊🏟️⏱️]/gu, '').replace(/[−–—]/g, '-').replace(/×/g, 'x').replace(/÷/g, '/').replace(/²/g, '^2').replace(/³/g, '^3').split('').filter(char => { const code = char.charCodeAt(0); return code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126) }).join('') }
function wrapText(text, max = 92) { const words = cleanPdfText(text).split(/\s+/).filter(Boolean); const lines = []; let line = ''; words.forEach(word => { if ((line + ' ' + word).trim().length > max) { if (line) lines.push(line); line = word } else line = (line + ' ' + word).trim() }); if (line) lines.push(line); return lines.length ? lines : [''] }
function pdfEscape(text) { return cleanPdfText(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)') }
function downloadPdf() {
  const raw = pdfTextLines(); const pageLines = []; raw.forEach(line => wrapText(line).forEach(w => pageLines.push(w))); const pages = []
  for (let i = 0; i < pageLines.length; i += 48) pages.push(pageLines.slice(i, i + 48))
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${pages.map((_, i) => `${4 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
  pages.forEach((lines, index) => { const pageId = 4 + index * 2; const contentId = pageId + 1; const content = `BT\n/F1 10 Tf\n14 TL\n50 800 Td\n${lines.map(line => `(${pdfEscape(line)}) Tj\nT*`).join('')}ET`; objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`); objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`) })
  let pdf = '%PDF-1.4\n'; const offsets = [0]; objects.forEach((obj, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n` }); const xref = pdf.length; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`; offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n` }); pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  const blob = new Blob([pdf], { type: 'application/pdf' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'mezzo-bece-timed-performance-report.pdf'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}
function queueInstall() { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; installCard() }) }

document.addEventListener('click', event => { if (event.target.closest('[data-download-timed-bece-report]')) { event.preventDefault(); downloadPdf() } }, true)
const observer = new MutationObserver(queueInstall)
observer.observe(document.body, { childList: true, subtree: true, attributes: false })
window.addEventListener('load', queueInstall)
setTimeout(queueInstall, 400)
