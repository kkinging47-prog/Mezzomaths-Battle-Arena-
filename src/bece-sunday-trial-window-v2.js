import './bece-sunday-trial-window.css'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

const CANDIDATE_KEY = 'mezzo_bece_sunday_candidate'
const ATTEMPTS_KEY = 'mezzo_bece_sunday_attempts'
const ACTIVE_KEY = 'mezzo_bece_sunday_active'
const QUESTION_COUNT = 40
const REGIONS = ['Greater Accra','Ashanti','Central','Eastern','Western','Western North','Volta','Oti','Northern','Savannah','North East','Upper East','Upper West','Bono','Bono East','Ahafo']
let active = null
let queued = false

const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))
const readJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
const saveJson = (key, value) => localStorage.setItem(key, JSON.stringify(value))
const shuffle = list => [...list].sort(() => Math.random() - 0.5)
const optionHtml = (list, selected = '') => list.map(x => `<option value="${esc(x)}" ${x === selected ? 'selected' : ''}>${esc(x)}</option>`).join('')

function trialWindow(now = new Date()) {
  const day = now.getUTCDay()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 18, 0, 0))
  start.setUTCDate(start.getUTCDate() + ((7 - day) % 7))
  const end = new Date(start)
  end.setUTCHours(20, 0, 0, 0)
  if (day === 0 && now >= start && now < end) return { open: true, start, end, ms: end - now }
  if (now >= end || (day === 0 && now >= end)) start.setUTCDate(start.getUTCDate() + 7)
  return { open: false, start, end, ms: start - now }
}
function weekStartIso(date = new Date()) {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - d.getUTCDay())
  return d.toISOString().slice(0, 10)
}
function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return d ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${sec}s`
}
function candidate() { return readJson(CANDIDATE_KEY, null) }
function attempts() { return readJson(ATTEMPTS_KEY, []) }
function currentAttempt() { return attempts().find(a => a.week_start === weekStartIso()) }
function normalise(q = {}) {
  const options = q.options || [q.option_a, q.option_b, q.option_c, q.option_d]
  return {
    id: q.id || `q_${Math.random().toString(16).slice(2)}`,
    topic: q.topic || 'BECE Mathematics',
    topic_area: q.topic_area || q.topic || 'BECE Mathematics',
    question_text: q.question_text || q.q || q.question || '',
    question_image_url: q.question_image_url || q.image_url || '',
    options: [options?.[0] || '', options?.[1] || '', options?.[2] || '', options?.[3] || ''],
    option_image_urls: q.option_image_urls || [q.option_a_image_url || '', q.option_b_image_url || '', q.option_c_image_url || '', q.option_d_image_url || ''],
    correct_answer: String(q.correct_answer || q.answer || 'A').toUpperCase().slice(0, 1),
    explanation: q.explanation || 'Review the method and practise similar BECE objective questions.'
  }
}
function localPool() {
  const bece = readJson('mezzo_bece_admin_bank', []).map(normalise)
  const bank = readJson('mezzo_question_bank', [])
    .filter(q => /grade 9|jhs 3|basic 9/i.test(q.class_level || '') || /bece|algebra|geometry|statistics|aptitude|mental/i.test(q.topic || ''))
    .map(normalise)
  const pool = [...bece, ...bank].filter(q => q.question_text && q.options.every(Boolean))
  if (pool.length) return pool
  const sample = [
    ['Algebra','If 3x + 5 = 20, find x.',['3','5','7','15'],'B','3x = 15, so x = 5.'],
    ['Number','Simplify 24 ÷ 6 × 2.',['2','4','8','12'],'C','24 ÷ 6 = 4 and 4 × 2 = 8.'],
    ['Geometry','The sum of angles in a triangle is',['90°','180°','270°','360°'],'B','Angles in a triangle add up to 180°.'],
    ['Statistics','Find the mode of 2, 3, 3, 4, 5.',['2','3','4','5'],'B','The mode is the value that appears most often.'],
    ['Fractions','1/2 + 1/4 =',['1/6','2/6','3/4','1/8'],'C','1/2 is 2/4, so 2/4 + 1/4 = 3/4.'],
    ['Percentages','25% of 80 =',['15','20','25','30'],'B','25% is one quarter and one quarter of 80 is 20.'],
    ['Aptitude','What comes next: 4, 8, 12, 16, ...',['18','20','22','24'],'B','The pattern adds 4 each time.'],
    ['Measurement','Convert 3.5 km to metres.',['35 m','350 m','3500 m','35000 m'],'C','1 km = 1000 m, so 3.5 km = 3500 m.']
  ]
  return sample.map(([topic, question_text, options, correct_answer, explanation]) => normalise({ topic, topic_area: topic, question_text, options, correct_answer, explanation }))
}
async function loadTrialQuestions() {
  let pool = []
  if (supabase && isSupabaseConfigured) {
    try {
      const a = await supabase.from('bece_question_bank').select('*').limit(400)
      if (!a.error && a.data?.length) pool.push(...a.data.map(x => normalise({ ...x, question_text: x.question_text, correct_answer: x.correct_answer })))
    } catch {}
    try {
      const b = await supabase.from('question_bank').select('*').eq('is_active', true).or('class_level.eq.Grade 9,class_level.eq.JHS 3,class_level.eq.Basic 9,topic.ilike.%BECE%,topic.ilike.%Algebra%,topic.ilike.%Geometry%,topic.ilike.%Statistics%,topic.ilike.%Aptitude%').limit(600)
      if (!b.error && b.data?.length) pool.push(...b.data.map(normalise))
    } catch {}
  }
  pool = [...pool, ...localPool()].filter(q => q.question_text && q.options.every(Boolean))
  while (pool.length && pool.length < QUESTION_COUNT) pool.push(...shuffle(pool).slice(0, Math.min(pool.length, QUESTION_COUNT - pool.length)))
  return shuffle(pool).slice(0, QUESTION_COUNT)
}
function analyse(attempt) {
  const byTopic = {}
  attempt.answers.forEach(a => { const t = a.topic || 'General'; byTopic[t] ||= { total: 0, wrong: 0 }; byTopic[t].total++; if (!a.correct) byTopic[t].wrong++ })
  const weak = Object.entries(byTopic).filter(([, v]) => v.wrong).sort((a,b) => b[1].wrong - a[1].wrong)
  const strong = Object.entries(byTopic).filter(([, v]) => !v.wrong).map(([t]) => t)
  const advice = weak.slice(0, 5).map(([topic, v]) => `Revise ${topic}: you missed ${v.wrong} out of ${v.total} question(s). Practise worked examples before next Sunday.`)
  return { strong, weak, advice, speed: attempt.time_taken_seconds <= 2400 ? 'Good timing for a 40-objective trial.' : 'Improve speed with timed practice before the next trial.' }
}
async function saveAttempt(attempt) {
  saveJson(ATTEMPTS_KEY, [attempt, ...attempts().filter(a => a.id !== attempt.id)].slice(0, 40))
  if (supabase && isSupabaseConfigured) {
    const c = attempt.candidate
    try {
      await supabase.from('bece_sunday_trial_attempts').insert({ week_start: attempt.week_start, full_name: c.full_name, contact: c.contact, school_name: c.school_name, location: c.location, region: c.region, score: attempt.score, total: attempt.total, percent: attempt.percent, time_taken_seconds: attempt.time_taken_seconds, answers: attempt.answers, ai_analysis: attempt.ai_analysis })
    } catch {}
  }
}
async function dbLeaders() {
  if (!supabase || !isSupabaseConfigured) return []
  try {
    const { data, error } = await supabase.from('bece_sunday_trial_attempts').select('full_name,school_name,region,score,total,percent,time_taken_seconds,week_start').eq('week_start', weekStartIso()).order('score', { ascending: false }).order('time_taken_seconds', { ascending: true }).limit(20)
    return error ? [] : data || []
  } catch { return [] }
}
function localLeaders() { return attempts().filter(a => a.week_start === weekStartIso()).sort((a,b) => b.score - a.score || a.time_taken_seconds - b.time_taken_seconds).slice(0, 20) }
function bannerHtml() {
  const w = trialWindow()
  return `<section class="bece-sunday-banner glass-card" data-bece-sunday-banner="true"><div><span>${w.open ? '🟢 Window open now' : '⏳ Countdown to Sunday'}</span><h2>Free Sunday BECE Maths Trial</h2><p>Every Sunday 6:00pm–8:00pm. 40 objectives, weekly leaderboard by score and time, plus progress report and AI analysis.</p></div><div class="bece-sunday-count"><small>${w.open ? 'Closes in' : 'Starts in'}</small><strong data-bece-sunday-countdown>${fmt(w.ms)}</strong><em>Ghana time</em></div><button class="btn btn-gold" type="button" data-bece-sunday-open="true">${w.open ? 'Start Trial' : 'Register Free'}</button></section>`
}
function injectBanner() {
  const home = document.querySelector('.home-screen, .landing-page') || document.querySelector('.mode-section-head')?.parentElement
  if (!home || document.querySelector('[data-bece-sunday-banner]')) return
  const anchor = home.querySelector('.hero-actions')?.closest('section') || home.firstElementChild
  anchor?.insertAdjacentHTML('afterend', bannerHtml())
}
function shell(content) {
  document.getElementById('root').innerHTML = `<main class="app-shell"><section class="app-frame bece-sunday-page"><nav class="screen-tabs"><div class="brand-chip"><span class="brand-crown">♛</span><div><strong>MEZZO</strong><small>BECE Sunday Trial</small></div></div><div class="tab-scroll"><button class="screen-tab" data-target="home"><span>🏟️</span>Home</button><button class="screen-tab" data-bece-page="true"><span>📘</span>BECE Practice</button><button class="screen-tab active" data-bece-sunday-open="true"><span>⏰</span>Sunday Trial</button></div></nav>${content}</section></main>`
}
function registerHtml() {
  return `<form class="sunday-register light-card" id="beceSundayRegisterForm"><h2>Register Free for Sunday Trial</h2><p>For Year 9 / JHS 3 / Basic 9 candidates. Students can register with phone number or email.</p><div class="sunday-form-grid"><label><span>Full Name</span><input name="full_name" required></label><label><span>Phone Number or Email</span><input name="contact" required></label><label><span>Name of School</span><input name="school_name" required></label><label><span>Location / Town</span><input name="location" required></label><label><span>Region</span><select name="region">${optionHtml(REGIONS, 'Greater Accra')}</select></label><label><span>Class</span><select name="class_level"><option>Grade 9</option><option>JHS 3</option><option>Basic 9</option></select></label></div><button class="btn btn-gold" type="submit">Create Free Candidate Profile</button></form>`
}
function registeredHtml(c, w, tried) {
  return `<section class="sunday-registered light-card"><div><span>✅ Registered Candidate</span><h2>${esc(c.full_name)}</h2><p>${esc(c.school_name)} • ${esc(c.location)} • ${esc(c.region)}</p></div><div class="sunday-actions">${tried ? '<button class="btn btn-blue" data-bece-sunday-report="true">View This Week Report</button>' : w.open ? '<button class="btn btn-gold" data-bece-sunday-start="true">Start 40 Objectives Trial</button>' : '<button class="btn btn-primary" disabled>Trial opens Sunday 6:00pm</button>'}<button class="btn btn-ghost" data-bece-sunday-change-profile="true">Change Details</button></div></section>`
}
function leaderboardHtml(rows) {
  return `<section class="sunday-board glass-card" data-sunday-leaderboard><div class="sunday-board-head"><div><span>🏆 Weekly Leaderboard</span><h2>Score + Time Ranking</h2></div><small>Week of ${weekStartIso()}</small></div>${rows.length ? rows.map((r, i) => `<div class="sunday-rank"><b>${i + 1}</b><span><strong>${esc(r.full_name || r.candidate?.full_name || 'Candidate')}</strong><small>${esc(r.school_name || r.candidate?.school_name || '')} • ${esc(r.region || r.candidate?.region || '')}</small></span><em>${r.score}/${r.total || QUESTION_COUNT}</em><small>${fmt((r.time_taken_seconds || 0) * 1000)}</small></div>`).join('') : '<p>No results yet this week.</p>'}</section>`
}
async function refreshDbLeaders() { const rows = await dbLeaders(); const box = document.querySelector('[data-sunday-leaderboard]'); if (rows.length && box) box.outerHTML = leaderboardHtml(rows) }
function renderSundayHome() {
  const c = candidate(), w = trialWindow(), tried = currentAttempt()
  shell(`<section class="sunday-hero glass-card"><div><span>Free National Practice Window</span><h1>Sunday BECE Maths Trial</h1><p>Open every Sunday, 6:00pm – 8:00pm Ghana time.</p></div><div class="sunday-big-count"><small>${w.open ? 'Window closes in' : 'Next trial starts in'}</small><strong data-bece-sunday-countdown>${fmt(w.ms)}</strong><em>40 BECE objectives</em></div></section>${c ? registeredHtml(c, w, tried) : registerHtml()}${leaderboardHtml(localLeaders())}`)
  refreshDbLeaders()
}
async function register(form) {
  const c = Object.fromEntries(new FormData(form).entries())
  c.created_at = new Date().toISOString()
  saveJson(CANDIDATE_KEY, c)
  if (supabase && isSupabaseConfigured) { try { await supabase.from('bece_sunday_trial_registrations').insert(c) } catch {} }
  renderSundayHome()
}
async function startTrial() {
  if (!trialWindow().open) return renderSundayHome()
  if (!candidate()) return renderSundayHome()
  if (currentAttempt()) return renderReport(currentAttempt())
  active = { id: `trial_${Date.now()}`, week_start: weekStartIso(), candidate: candidate(), questions: await loadTrialQuestions(), index: 0, selected: '', score: 0, answers: [], started_at: Date.now() }
  saveJson(ACTIVE_KEY, active)
  renderQuestion()
}
function renderQuestion() {
  active ||= readJson(ACTIVE_KEY, null)
  if (!active) return renderSundayHome()
  const q = active.questions[active.index]
  shell(`<section class="sunday-live"><div class="sunday-live-top glass-card"><span>Question ${active.index + 1}/${active.questions.length}</span><strong>${esc(q.topic_area || q.topic)}</strong><em>${fmt(Date.now() - active.started_at)}</em></div><article class="sunday-question light-card"><h2>${esc(q.question_text)}</h2>${q.question_image_url ? `<img class="sunday-question-img" src="${q.question_image_url}" alt="Question diagram">` : ''}<div class="sunday-options">${q.options.map((op, i) => { const letter = String.fromCharCode(65 + i); const cls = active.selected === letter ? (letter === q.correct_answer ? 'correct' : 'wrong') : ''; return `<button class="${cls}" data-sunday-answer="${letter}"><b>${letter}</b>${q.option_image_urls?.[i] ? `<img src="${q.option_image_urls[i]}" alt="Option ${letter}">` : ''}<span>${esc(op)}</span></button>` }).join('')}</div></article>${active.selected ? `<section class="sunday-feedback ${active.selected === q.correct_answer ? 'correct' : 'wrong'}"><strong>${active.selected === q.correct_answer ? 'Correct' : 'Not correct'}</strong><p>Answer: ${esc(q.correct_answer)}. ${esc(q.explanation)}</p><button class="btn btn-gold" data-sunday-next="true">${active.index + 1 >= active.questions.length ? 'Finish Trial' : 'Next Question'} ▶</button></section>` : ''}</section>`)
}
function answer(letter) {
  if (!active || active.selected) return
  const q = active.questions[active.index]
  const correct = letter === q.correct_answer
  if (correct) active.score++
  active.selected = letter
  active.answers.push({ question_id: q.id, question_text: q.question_text, topic: q.topic, topic_area: q.topic_area, selected_answer: letter, correct_answer: q.correct_answer, correct })
  saveJson(ACTIVE_KEY, active)
  renderQuestion()
}
async function nextQuestion() {
  active ||= readJson(ACTIVE_KEY, null)
  if (!active) return renderSundayHome()
  if (active.index + 1 >= active.questions.length) return finishTrial()
  active.index++
  active.selected = ''
  saveJson(ACTIVE_KEY, active)
  renderQuestion()
}
async function finishTrial() {
  const seconds = Math.round((Date.now() - active.started_at) / 1000)
  const attempt = { id: active.id, week_start: active.week_start, candidate: active.candidate, score: active.score, total: active.questions.length, percent: Math.round((active.score / active.questions.length) * 100), time_taken_seconds: seconds, answers: active.answers, completed_at: new Date().toISOString() }
  attempt.ai_analysis = analyse(attempt)
  localStorage.removeItem(ACTIVE_KEY)
  await saveAttempt(attempt)
  active = null
  renderReport(attempt)
}
function renderReport(attempt = currentAttempt()) {
  if (!attempt) return renderSundayHome()
  const a = attempt.ai_analysis || analyse(attempt)
  shell(`<section class="sunday-report light-card"><div class="report-score"><span>📊 Progress Report</span><h1>${attempt.score}/${attempt.total}</h1><p>${attempt.percent}% • Time: ${fmt(attempt.time_taken_seconds * 1000)}</p></div><div class="report-ai"><h2>AI Analysis</h2><p>${esc(a.speed)}</p>${a.strong?.length ? `<p><b>Strong areas:</b> ${a.strong.map(esc).join(', ')}</p>` : ''}${a.weak?.length ? `<p><b>Areas to improve:</b> ${a.weak.slice(0,5).map(([t,v]) => `${esc(t)} (${v.wrong} missed)`).join(', ')}</p>` : '<p><b>Excellent:</b> no weak area detected.</p>'}<ul>${(a.advice || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div><div class="sunday-actions"><button class="btn btn-blue" data-bece-sunday-open="true">Back to Sunday Trial</button><button class="btn btn-gold" onclick="window.print()">Print / Save Report</button></div></section>${leaderboardHtml(localLeaders())}`)
  refreshDbLeaders()
}
function updateCountdowns() { const w = trialWindow(); document.querySelectorAll('[data-bece-sunday-countdown]').forEach(el => { el.textContent = fmt(w.ms) }) }
function sync() { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; injectBanner(); updateCountdowns() }) }

document.addEventListener('click', e => {
  if (e.target.closest('[data-bece-sunday-open]')) { e.preventDefault(); e.stopImmediatePropagation(); renderSundayHome(); return }
  if (e.target.closest('[data-bece-sunday-start]')) { e.preventDefault(); startTrial(); return }
  if (e.target.closest('[data-bece-sunday-change-profile]')) { e.preventDefault(); localStorage.removeItem(CANDIDATE_KEY); renderSundayHome(); return }
  if (e.target.closest('[data-bece-sunday-report]')) { e.preventDefault(); renderReport(); return }
  const ans = e.target.closest('[data-sunday-answer]')
  if (ans) { e.preventDefault(); answer(ans.dataset.sundayAnswer); return }
  if (e.target.closest('[data-sunday-next]')) { e.preventDefault(); nextQuestion(); return }
}, true)
document.addEventListener('submit', e => { if (e.target?.id === 'beceSundayRegisterForm') { e.preventDefault(); register(e.target) } }, true)

new MutationObserver(sync).observe(document.body, { childList: true, subtree: true, attributes: false })
window.addEventListener('load', sync)
setInterval(updateCountdowns, 1000)
setTimeout(sync, 500)
