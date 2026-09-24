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
async function loadTrialQuestions() {
  const response = await fetch('/api/bece-sunday-start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ week_start: weekStartIso() })
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Unable to load the secured Sunday BECE questions.')
  return {
    questions: Array.isArray(data.questions) ? data.questions : [],
    sessionToken: data.session_token || ''
  }
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
  try {
    const secured = await loadTrialQuestions()
    if (!secured.questions.length || !secured.sessionToken) throw new Error('The secured question service returned no questions.')
    active = { id: `trial_${Date.now()}`, week_start: weekStartIso(), candidate: candidate(), questions: secured.questions, session_token: secured.sessionToken, index: 0, selected: '', feedback: null, score: 0, answers: [], started_at: Date.now() }
    saveJson(ACTIVE_KEY, active)
    renderQuestion()
  } catch (error) {
    shell(`<section class="sunday-report light-card"><h2>Trial temporarily unavailable</h2><p>We could not start the trial right now. Please check your connection and try again shortly.</p><button class="btn btn-blue" data-bece-sunday-open="true">Back to Sunday Trial</button></section>`)
  }
}
function renderQuestion() {
  active ||= readJson(ACTIVE_KEY, null)
  if (!active) return renderSundayHome()
  const q = active.questions[active.index]
  const feedback = active.feedback
  shell(`<section class="sunday-live"><div class="sunday-live-top glass-card"><span>Question ${active.index + 1}/${active.questions.length}</span><strong>${esc(q.topic_area || q.topic)}</strong><em>${fmt(Date.now() - active.started_at)}</em></div><article class="sunday-question light-card"><h2>${esc(q.question_text)}</h2>${q.question_image_url ? `<img class="sunday-question-img" src="${q.question_image_url}" alt="Question diagram">` : ''}<div class="sunday-options">${q.options.map((op, i) => { const letter = String.fromCharCode(65 + i); const cls = active.selected === letter && feedback ? (feedback.correct ? 'correct' : 'wrong') : ''; return `<button class="${cls}" data-sunday-answer="${letter}" ${active.selected ? 'disabled' : ''}><b>${letter}</b>${q.option_image_urls?.[i] ? `<img src="${q.option_image_urls[i]}" alt="Option ${letter}">` : ''}<span>${esc(op)}</span></button>` }).join('')}</div></article>${feedback ? `<section class="sunday-feedback ${feedback.correct ? 'correct' : 'wrong'}"><strong>${feedback.correct ? 'Correct' : 'Not correct'}</strong><p>Answer: ${esc(feedback.correct_answer)}. ${esc(feedback.explanation)}</p><button class="btn btn-gold" data-sunday-next="true">${active.index + 1 >= active.questions.length ? 'Finish Trial' : 'Next Question'} ▶</button></section>` : ''}</section>`)
}
async function answer(letter) {
  if (!active || active.selected) return
  const q = active.questions[active.index]
  active.selected = letter
  renderQuestion()
  try {
    const response = await fetch('/api/bece-sunday-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_token: active.session_token, question_id: q.id, selected_answer: letter })
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || 'Unable to verify this answer.')
    if (result.correct) active.score++
    active.session_token = result.session_token
    active.feedback = {
      correct: Boolean(result.correct),
      correct_answer: result.correct_answer,
      explanation: result.explanation
    }
    active.answers.push({ question_id: q.id, question_text: q.question_text, topic: q.topic, topic_area: q.topic_area, selected_answer: letter, correct_answer: result.correct_answer, correct: Boolean(result.correct) })
    saveJson(ACTIVE_KEY, active)
    renderQuestion()
  } catch (error) {
    active.selected = ''
    active.feedback = null
    saveJson(ACTIVE_KEY, active)
    alert('We could not verify your answer right now. Please check your connection and try again.')
    renderQuestion()
  }
}
async function nextQuestion() {
  active ||= readJson(ACTIVE_KEY, null)
  if (!active) return renderSundayHome()
  if (active.index + 1 >= active.questions.length) return finishTrial()
  active.index++
  active.selected = ''
  active.feedback = null
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
