import './bece-sunday-trial-window.css'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

const CANDIDATE_KEY = 'mezzo_bece_sunday_candidate'
const ATTEMPTS_KEY = 'mezzo_bece_sunday_attempts'
const ACTIVE_KEY = 'mezzo_bece_sunday_active'
const QUESTION_COUNT = 40
const REGIONS = ['Greater Accra','Ashanti','Central','Eastern','Western','Western North','Volta','Oti','Northern','Savannah','North East','Upper East','Upper West','Bono','Bono East','Ahafo']
let queued = false
let ticker = null
let active = null

function esc(v = '') { return String(v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])) }
function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function shuffle(list) { return [...list].sort(() => Math.random() - 0.5) }
function nowUtc() { return new Date() }
function nextWindowInfo(date = nowUtc()) {
  const now = new Date(date)
  const day = now.getUTCDay()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 18, 0, 0))
  start.setUTCDate(start.getUTCDate() + ((7 - day) % 7))
  const end = new Date(start); end.setUTCHours(20, 0, 0, 0)
  if (day === 0 && now >= start && now < end) return { status: 'open', start, end, next: start, ms: end - now }
  if (now >= end || (day === 0 && now >= end)) start.setUTCDate(start.getUTCDate() + 7)
  return { status: 'closed', start, end, next: start, ms: start - now }
}
function weekStartIso(date = nowUtc()) {
  const d = new Date(date)
  d.setUTCHours(0,0,0,0)
  d.setUTCDate(d.getUTCDate() - d.getUTCDay())
  return d.toISOString().slice(0, 10)
}
function duration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return d ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${sec}s`
}
function candidate() { return readJson(CANDIDATE_KEY, null) }
function attempts() { return readJson(ATTEMPTS_KEY, []) }
function currentAttemptForWeek() { const wk = weekStartIso(); return attempts().find(a => a.week_start === wk) }
function optionHtml(list, selected='') { return list.map(x => `<option value="${esc(x)}" ${x === selected ? 'selected' : ''}>${esc(x)}</option>`).join('') }
function normaliseDbQuestion(q = {}) {
  const options = q.options || [q.option_a, q.option_b, q.option_c, q.option_d]
  return {
    id: q.id || `q_${Math.random()}`,
    topic: q.topic || 'BECE Mathematics',
    topic_area: q.topic_area || q.topic || 'BECE Mathematics',
    question_text: q.question_text || q.q || q.question || '',
    question_image_url: q.question_image_url || q.image_url || '',
    options: [options?.[0] || '', options?.[1] || '', options?.[2] || '', options?.[3] || ''],
    option_image_urls: q.option_image_urls || [q.option_a_image_url || '', q.option_b_image_url || '', q.option_c_image_url || '', q.option_d_image_url || ''],
    correct_answer: String(q.correct_answer || q.answer || 'A').toUpperCase().slice(0,1),
    explanation: q.explanation || 'Review this topic and practise similar BECE objective questions.'
  }
}
function fallbackQuestions() {
  const admin = readJson('mezzo_bece_admin_bank', []).map(normaliseDbQuestion)
  const bank = readJson('mezzo_question_bank', []).filter(q => /grade 9|jhs 3|basic 9|shs/i.test(q.class_level || '') || /bece|algebra|geometry|statistics|mental|aptitude/i.test(q.topic || '')).map(normaliseDbQuestion)
  const pool = [...admin, ...bank].filter(q => q.question_text && q.options.every(Boolean))
  if (pool.length >= 8) return pool
  return [
    ['Algebra','If 3x + 5 = 20, find x.',['3','5','7','15'],'B','3x = 15, so x = 5.'],
    ['Number','Simplify 24 ÷ 6 × 2.',['2','4','8','12'],'C','Work from left to right: 24 ÷ 6 = 4; 4 × 2 = 8.'],
    ['Geometry','The sum of angles in a triangle is',['90°','180°','270°','360°'],'B','Angles in a triangle sum to 180°.'],
    ['Statistics','Find the mode of 2, 3, 3, 4, 5.',['2','3','4','5'],'B','The mode is the value that appears most often.'],
    ['Fractions','1/2 + 1/4 =',['1/6','2/6','3/4','1/8'],'C','1/2 = 2/4; 2/4 + 1/4 = 3/4.'],
    ['Percentages','25% of 80 =',['15','20','25','30'],'B','25% is one quarter; one quarter of 80 is 20.'],
    ['Aptitude','What comes next: 4, 8, 12, 16, ...',['18','20','22','24'],'B','The pattern adds 4 each time.'],
    ['Measurement','Convert 3.5 km to metres.',['35 m','350 m','3500 m','35000 m'],'C','1 km = 1000 m, so 3.5 km = 3500 m.']
  ].map(([topic, question_text, options, correct_answer, explanation], i) => ({ id:`sample_${i}`, topic, topic_area:topic, question_text, options, option_image_urls:['','','',''], question_image_url:'', correct_answer, explanation }))
}
async function loadQuestions() {
  let pool = []
  if (supabase && isSupabaseConfigured) {
    try {
      const a = await supabase.from('bece_question_bank').select('*').limit(300)
      if (!a.error && a.data?.length) pool.push(...a.data.map(q => normaliseDbQuestion({ ...q, q: q.question_text, answer: q.correct_answer })))
    } catch {}
    try {
      const b = await supabase.from('question_bank').select('*').eq('is_active', true).or('class_level.eq.Grade 9,class_level.eq.JHS 3,class_level.eq.Basic 9,topic.ilike.%BECE%,topic.ilike.%Algebra%,topic.ilike.%Geometry%,topic.ilike.%Statistics%,topic.ilike.%Aptitude%').limit(500)
      if (!b.error && b.data?.length) pool.push(...b.data.map(normaliseDbQuestion))
    } catch {}
  }
  pool = [...pool, ...fallbackQuestions()].filter(q => q.question_text && q.options.every(Boolean))
  return shuffle(pool).slice(0, QUESTION_COUNT).map((q, i) => ({ ...q, serial: i + 1 }))
}
function topicAdvice(topic, wrong, total) {
  const pct = total ? Math.round(((total - wrong) / total) * 100) : 100
  if (pct >= 80) return `Strong in ${topic}. Keep speed practice going.`
  if (/algebra/i.test(topic)) return `Revise forming equations, simplifying expressions and changing subject.`
  if (/geometry/i.test(topic)) return `Revise angles, shapes, mensuration, bearings and diagrams.`
  if (/stat|data/i.test(topic)) return `Revise tables, charts, averages, mode, median and probability.`
  if (/fraction|percent|ratio/i.test(topic)) return `Revise fractions, decimals, percentages, ratios and proportional reasoning.`
  return `Revise ${topic} with worked examples and timed objective questions.`
}
function analysisFor(attempt) {
  const byTopic = {}
  attempt.answers.forEach(a => { const t = a.topic || 'General'; byTopic[t] ||= { total: 0, wrong: 0 }; byTopic[t].total += 1; if (!a.correct) byTopic[t].wrong += 1 })
  const weak = Object.entries(byTopic).filter(([, v]) => v.wrong).sort((a,b) => b[1].wrong - a[1].wrong)
  const strong = Object.entries(byTopic).filter(([, v]) => v.wrong === 0).map(([t]) => t)
  const speed = attempt.time_taken_seconds <= 2400 ? 'Your time was strong for a 40-objective trial.' : 'You need more timed practice to improve speed before BECE.'
  const advice = weak.slice(0, 5).map(([topic, v]) => topicAdvice(topic, v.wrong, v.total))
  return { strong, weak, speed, advice }
}
async function saveAttempt(attempt) {
  const list = [attempt, ...attempts().filter(a => a.id !== attempt.id)].slice(0, 30)
  saveJson(ATTEMPTS_KEY, list)
  if (supabase && isSupabaseConfigured) {
    const c = attempt.candidate
    const payload = { week_start: attempt.week_start, full_name: c.full_name, contact: c.contact, school_name: c.school_name, location: c.location, region: c.region, score: attempt.score, total: attempt.total, time_taken_seconds: attempt.time_taken_seconds, percent: attempt.percent, answers: attempt.answers, ai_analysis: attempt.ai_analysis }
    try { await supabase.from('bece_sunday_trial_attempts').insert(payload) } catch {}
  }
}\nfunction leaderboardRows() {
  return attempts().filter(a => a.week_start === weekStartIso()).sort((a,b) => b.score - a.score || a.time_taken_seconds - b.time_taken_seconds).slice(0, 20)
}
async function dbLeaderboardRows() {
  if (!supabase || !isSupabaseConfigured) return []
  try {
    const { data, error } = await supabase.from('bece_sunday_trial_attempts').select('full_name,school_name,location,region,score,total,time_taken_seconds,percent,week_start,created_at').eq('week_start', weekStartIso()).order('score', { ascending: false }).order('time_taken_seconds', { ascending: true }).limit(20)
    return error ? [] : data || []
  } catch { return [] }
}
function bannerHtml() {
  const info = nextWindowInfo()
  const open = info.status === 'open'
  return `<section class="bece-sunday-banner glass-card" data-bece-sunday-banner="true"><div><span>${open ? '🟢 Window open now' : '⏳ Next Sunday trial'}</span><h2>Free Sunday BECE Maths Trial for Grade 9 Candidates</h2><p>Every Sunday, 6:00pm – 8:00pm. 40 BECE-type objectives, weekly leaderboard by score and time, plus AI-style progress analysis.</p></div><div class="bece-sunday-count"><small>${open ? 'Window closes in' : 'Starts in'}</small><strong data-bece-sunday-countdown>${duration(info.ms)}</strong><em>Ghana time</em></div><button class="btn btn-gold" type="button" data-bece-sunday-open="true">${open ? 'Start Trial Now' : 'Register / View Countdown'}</button></section>`
}
function injectBanner() {
  const home = document.querySelector('.home-screen') || document.querySelector('.landing-page') || document.querySelector('.mode-section-head')?.parentElement
  if (!home || document.querySelector('[data-bece-sunday-banner]')) return
  const anchor = home.querySelector('.hero-actions')?.closest('section') || home.firstElementChild
  anchor?.insertAdjacentHTML('afterend', bannerHtml())
}
function shell(content) {
  document.getElementById('root').innerHTML = `<main class="app-shell"><section class="app-frame bece-sunday-page"><nav class="screen-tabs"><div class="brand-chip"><span class="brand-crown">♛</span><div><strong>MEZZO</strong><small>Sunday BECE Trial</small></div></div><div class="tab-scroll"><button class="screen-tab" data-target="home"><span>🏟️</span>Home</button><button class="screen-tab" data-bece-page="true"><span>📘</span>BECE Practice</button><button class="screen-tab active" data-bece-sunday-open="true"><span>⏰</span>Sunday Trial</button></div></nav>${content}</section></main>`
}
function renderHomePage() {
  const c = candidate()
  const info = nextWindowInfo()
  const tried = currentAttemptForWeek()
  shell(`<section class="sunday-hero glass-card"><div><span>Free National Practice Window</span><h1>Sunday BECE Maths Trial</h1><p>For Year 9 / JHS 3 / Basic 9 candidates. Open every Sunday from 6:00pm to 8:00pm Ghana time.</p></div><div class="sunday-big-count"><small>${info.status === 'open' ? 'Window closes in' : 'Next trial starts in'}</small><strong data-bece-sunday-countdown>${duration(info.ms)}</strong><em>6:00pm – 8:00pm every Sunday</em></div></section>${c ? registeredHtml(c, info, tried) : registerHtml()}${leaderboardHtml(leaderboardRows())}`)
  loadDbLeaderboard()
}
function registerHtml() {
  return `<form class="sunday-register light-card" id="beceSundayRegisterForm"><h2>Register Free for Sunday Trial</h2><p>Students can register with either phone number or email. These details will be used for weekly leaderboards and progress reports.</p><div class="sunday-form-grid"><label><span>Full Name</span><input name="full_name" required placeholder="Student full name"></label><label><span>Phone Number or Email</span><input name="contact" required placeholder="Phone number or email"></label><label><span>Name of School</span><input name="school_name" required placeholder="School name"></label><label><span>Location / Town</span><input name="location" required placeholder="e.g. Kasoa, Madina, Kumasi"></label><label><span>Region</span><select name="region" required>${optionHtml(REGIONS, 'Greater Accra')}</select></label><label><span>Class</span><select name="class_level"><option>Grade 9</option><option>JHS 3</option><option>Basic 9</option></select></label></div><button class="btn btn-gold" type="submit">Create Free Candidate Profile</button></form>`
}
function registeredHtml(c, info, tried) {
  const open = info.status === 'open'
  return `<section class="sunday-registered light-card"><div><span>✅ Registered Candidate</span><h2>${esc(c.full_name)}</h2><p>${esc(c.school_name)} • ${esc(c.location)} • ${esc(c.region)}</p></div><div class="sunday-actions">${tried ? `<button class="btn btn-blue" type="button" data-bece-sunday-report="true">View This Week's Report</button>` : open ? `<button class="btn btn-gold" type="button" data-bece-sunday-start="true">Start 40 Objectives Trial</button>` : `<button class="btn btn-primary" type="button" disabled>Trial opens Sunday 6:00pm</button>`}<button class="btn btn-ghost" type="button" data-bece-sunday-change-profile="true">Change Candidate Details</button></div></section>`
}
function leaderboardHtml(rows) {
  return `<section class="sunday-board glass-card" data-sunday-leaderboard><div class="sunday-board-head"><div><span>🏆 Weekly Leaderboard</span><h2>Score + Time Ranking</h2></div><small>Week of ${weekStartIso()}</small></div>${rows.length ? rows.map((r,i) => `<div class="sunday-rank"><b>${i+1}</b><span><strong>${esc(r.full_name || r.candidate?.full_name || 'Candidate')}</strong><small>${esc(r.school_name || r.candidate?.school_name || '')} • ${esc(r.region || r.candidate?.region || '')}</small></span><em>${r.score}/${r.total || QUESTION_COUNT}</em><small>${duration((r.time_taken_seconds || 0) * 1000)}</small></div>`).join('') : '<p>No trial results yet this week.</p>'}</section>`
}
async function loadDbLeaderboard() {
  const rows = await dbLeaderboardRows()
  const box = document.querySelector('[data-sunday-leaderboard]')
  if (rows.length && box) box.outerHTML = leaderboardHtml(rows)
}
async function register(form) {
  const c = Object.fromEntries(new FormData(form).entries())
  c.created_at = new Date().toISOString()
  saveJson(CANDIDATE_KEY, c)
  if (supabase && isSupabaseConfigured) {
    try { await supabase.from('bece_sunday_trial_registrations').insert(c) } catch {}
  }
  renderHomePage()
}
async function startTrial() {
  const info = nextWindowInfo()
  if (info.status !== 'open') return renderHomePage()
  if (currentAttemptForWeek()) return renderReport(currentAttemptForWeek())
  const c = candidate()
  if (!c) return renderHomePage()
  const questions = await loadQuestions()
  active = { id: `trial_${Date.now()}`, week_start: weekStartIso(), candidate: c, questions, index: 0, answers: [], score: 0, started_at: Date.now(), selected: '' }
  saveJson(ACTIVE_KEY, active)
  renderQuestion()
}
function renderQuestion() {
  if (!active) active = readJson(ACTIVE_KEY, null)
  if (!active) return renderHomePage()
  const q = active.questions[active.index]
  shell(`<section class="sunday-live"><div class="sunday-live-top glass-card"><span>Question ${active.index + 1}/${active.questions.length}</span><strong>${esc(q.topic_area || q.topic)}</strong><em>${duration(Date.now() - active.started_at)}</em></div><article class="sunday-question light-card"><h2>${esc(q.question_text)}</h2>${q.question_image_url ? `<img class="sunday-question-img" src="${q.question_image_url}" alt="Question diagram">` : ''}<div class="sunday-options">${q.options.map((op,i) => { const letter = String.fromCharCode(65+i); return `<button type="button" data-sunday-answer="${letter}" class="${active.selected === letter ? (letter === q.correct_answer ? 'correct' : 'wrong') : ''}"><b>${letter}</b>${q.option_image_urls?.[i] ? `<img src="${q.option_image_urls[i]}" alt="Option ${letter}">` : ''}<span>${esc(op)}</span></button>` }).join('')}</div></article>${active.selected ? `<section class="sunday-feedback ${active.selected === q.correct_answer ? 'correct' : 'wrong'}"><strong>${active.selected === q.correct_answer ? 'Correct' : 'Not correct'}</strong><p>Answer: ${esc(q.correct_answer)}. ${esc(q.explanation)}</p><button class="btn btn-gold" type="button" data-sunday-next="true">${active.index + 1 >= active.questions.length ? 'Finish Trial' : 'Next Question'} ▶</button></section>` : ''}</section>`)
}
function answer(letter) {
  if (!active || active.selected) return
  const q = active.questions[active.index]
  const correct = letter === q.correct_answer
  if (correct) active.score += 1
  active.selected = letter
  active.answers.push({ question_id: q.id, question_text: q.question_text, topic: q.topic, topic_area: q.topic_area, selected_answer: letter, correct_answer: q.correct_answer, correct })
  saveJson(ACTIVE_KEY, active)
  renderQuestion()
}
async function next() {
  if (!active) active = readJson(ACTIVE_KEY, null)
  if (!active) return renderHomePage()
  if (active.index + 1 >= active.questions.length) return finishTrial()
  active.index += 1
  active.selected = ''
  saveJson(ACTIVE_KEY, active)
  renderQuestion()
}
async function finishTrial() {
  const seconds = Math.round((Date.now() - active.started_at) / 1000)
  const attempt = { id: active.id, week_start: active.week_start, candidate: active.candidate, score: active.score, total: active.questions.length, percent: Math.round((active.score / active.questions.length) * 100), time_taken_seconds: seconds, answers: active.answers, completed_at: new Date().toISOString() }
  attempt.ai_analysis = analysisFor(attempt)
  localStorage.removeItem(ACTIVE_KEY)
  await saveAttempt(attempt)
  active = null
  renderReport(attempt)
}
function renderReport(attempt = currentAttemptForWeek()) {
  if (!attempt) return renderHomePage()
  const a = attempt.ai_analysis || analysisFor(attempt)
  shell(`<section class="sunday-report light-card"><div class="report-score"><span>📊 Progress Report</span><h1>${attempt.score}/${attempt.total}</h1><p>${attempt.percent}% • Time: ${duration(attempt.time_taken_seconds * 1000)}</p></div><div class="report-ai"><h2>AI Analysis</h2><p>${esc(a.speed)}</p>${a.strong?.length ? `<p><b>Strong areas:</b> ${a.strong.map(esc).join(', ')}</p>` : ''}${a.weak?.length ? `<p><b>Areas to improve:</b> ${a.weak.slice(0,5).map(([t,v]) => `${esc(t)} (${v.wrong} missed)`).join(', ')}</p>` : '<p><b>Excellent:</b> no weak area detected in this trial.</p>'}<ul>${(a.advice || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div><div class="sunday-actions"><button class="btn btn-blue" data-bece-sunday-open="true">Back to Sunday Trial</button><button class="btn btn-gold" onclick="window.print()">Print / Save Report</button></div></section>${leaderboardHtml(leaderboardRows())}`)
  loadDbLeaderboard()
}
function updateCountdowns() {
  const info = nextWindowInfo()
  document.querySelectorAll('[data-bece-sunday-countdown]').forEach(el => { el.textContent = duration(info.ms) })
}
function sync() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; injectBanner(); updateCountdowns() })
}

document.addEventListener('click', event => {
  if (event.target.closest('[data-bece-sunday-open]')) { event.preventDefault(); event.stopImmediatePropagation(); renderHomePage(); return }
  if (event.target.closest('[data-bece-sunday-start]')) { event.preventDefault(); startTrial(); return }
  if (event.target.closest('[data-bece-sunday-change-profile]')) { event.preventDefault(); localStorage.removeItem(CANDIDATE_KEY); renderHomePage(); return }
  if (event.target.closest('[data-bece-sunday-report]')) { event.preventDefault(); renderReport(currentAttemptForWeek()); return }
  const ans = event.target.closest('[data-sunday-answer]')
  if (ans) { event.preventDefault(); answer(ans.dataset.sundayAnswer); return }
  if (event.target.closest('[data-sunday-next]')) { event.preventDefault(); next(); return }
}, true)

document.addEventListener('submit', event => { if (event.target?.id === 'beceSundayRegisterForm') { event.preventDefault(); register(event.target) } }, true)

const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false })
window.addEventListener('load', sync)
ticker = setInterval(updateCountdowns, 1000)
setTimeout(sync, 500)
