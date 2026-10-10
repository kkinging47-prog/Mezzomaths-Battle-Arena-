import './bece-sunday-trial-window.css'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

const CANDIDATE_KEY = 'mezzo_bece_sunday_candidate'
const ATTEMPTS_KEY = 'mezzo_bece_sunday_attempts'
const ACTIVE_KEY = 'mezzo_bece_sunday_active'
const QUESTION_COUNT = 40
const REGIONS = ['Greater Accra','Ashanti','Central','Eastern','Western','Western North','Volta','Oti','Northern','Savannah','North East','Upper East','Upper West','Bono','Bono East','Ahafo']
let active = null
let queued = false
let previewReport = false
let submitting = false

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
  if (now < new Date('2026-10-18T18:00:00Z')) {
    const launch = new Date('2026-10-18T18:00:00Z')
    return { open: false, start: launch, end: new Date('2026-10-18T20:00:00Z'), ms: launch - now }
  }
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
function newCandidateId() {
  const bytes = new Uint8Array(9)
  crypto.getRandomValues(bytes)
  return 'MSB-' + [...bytes].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()
}
function attempts() { return readJson(ATTEMPTS_KEY, []) }
function currentAttempt() { return attempts().find(a => a.week_start === weekStartIso() && a.candidate?.candidate_id === candidate()?.candidate_id) }
function labOpen() { const d=new Date(); return d>=new Date('2026-10-19T00:00:00Z') && d.getUTCDay()>=1 && d.getUTCDay()<=5 }
function activeForCandidate() { const a=readJson(ACTIVE_KEY,null); return a?.candidate?.candidate_id===candidate()?.candidate_id ? a : null }
async function loadTrialQuestions() {
  const {data:auth} = candidate()?.school_managed ? await supabase.auth.getSession() : {data:{session:null}}
  if (labOpen() && !auth?.session?.access_token) throw new Error('School sign-in required for weekday lab examinations.')
  const response = await fetch('/api/bece-sunday-start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth?.session?.access_token ? {Authorization:'Bearer '+auth.session.access_token}:{}) },
    body: JSON.stringify({ week_start: weekStartIso(), candidate_id: candidate()?.candidate_id })
  })
  const data = await response.json().catch(() => ({}))
  if (response.status === 409) {
    const resumed = await fetch('/api/bece-sunday-resume',{
      method:'POST',headers:{'Content-Type':'application/json',...(auth?.session?.access_token ? {Authorization:'Bearer '+auth.session.access_token}:{})},
      body:JSON.stringify({candidate_id:candidate()?.candidate_id})
    })
    const existing=await resumed.json().catch(()=>({}))
    if(resumed.ok) return {questions:existing.questions||[],sessionToken:existing.session_token||'',weekStart:existing.week_start,mode:existing.mode,startedAt:existing.started_at,resumed:true}
    throw new Error(existing.error || data.error || 'This week’s examination attempt is already reserved.')
  }
  if (!response.ok) throw new Error(data.error || 'Unable to load the secured Sunday BECE questions.')
  return {
    questions: Array.isArray(data.questions) ? data.questions : [],
    sessionToken: data.session_token || '', weekStart: data.week_start || weekStartIso(), mode: data.mode || 'sunday'
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

}
async function dbLeaders() {
  if (!supabase || !isSupabaseConfigured) return []
  try {
    const { data, error } = await supabase.rpc('bece_sunday_official_leaderboard', {p_week_start:weekStartIso()})
    return error ? [] : data || []
  } catch { return [] }
}
function localLeaders() { return attempts().filter(a => a.week_start === weekStartIso()).sort((a,b) => b.score - a.score || a.time_taken_seconds - b.time_taken_seconds).slice(0, 20) }
function bannerHtml() {
  const w = trialWindow()
  return `<section class="bece-sunday-banner glass-card" data-bece-sunday-banner="true"><div><span>${w.open ? '🟢 Window open now' : '⏳ Countdown to Sunday'}</span><h2>Free Sunday BECE Maths Trial</h2><p>Every Sunday 6:00pm–8:00pm. 40 objectives, weekly leaderboard by score and time, plus worked explanations and performance analysis.</p></div><div class="bece-sunday-count"><small>${w.open ? 'Closes in' : 'Starts in'}</small><strong data-bece-sunday-countdown>${fmt(w.ms)}</strong><em>Ghana time</em></div><button class="btn btn-gold" type="button" data-bece-sunday-open="true">${w.open ? 'Start Trial' : 'Register Free'}</button></section>`
}
function injectBanner() {
  const home = document.querySelector('.home-screen, .landing-page') || document.querySelector('.mode-section-head')?.parentElement
  if (!home || document.querySelector('[data-bece-sunday-banner]')) return
  const anchor = home.querySelector('.hero-actions')?.closest('section') || home.firstElementChild
  anchor?.insertAdjacentHTML('afterend', bannerHtml())
}
function shell(content) {
  document.getElementById('root').innerHTML = `<main class="app-shell"><section class="app-frame bece-sunday-page"><nav class="screen-tabs"><div class="brand-chip"><span class="brand-crown">♛</span><div><strong>MEZZO</strong><small>BECE Sunday Trial</small></div></div><div class="tab-scroll"><button class="screen-tab" data-target="home"><span>🏟️</span>Home</button>${active?.preview || previewReport ? '<button class="screen-tab" data-target="admin"><span>🛠️</span>Admin workspace</button>' : '<button class="screen-tab" data-bece-page="true"><span>📘</span>BECE Practice</button><button class="screen-tab active" data-bece-sunday-open="true"><span>⏰</span>Sunday Trial</button>'}</div></nav>${content}</section></main>`
}

async function schoolResults() {
  const {data,error}=await supabase.rpc('bece_sunday_school_results')
  if(error) return alert('School reports unavailable. Confirm database migration and school sign-in.')
  const rows=(data||[]).map(x=>'<tr><td>'+esc(x.full_name)+'</td><td>'+esc(x.class_level)+'</td><td>'+esc(x.week_start)+'</td><td>'+esc(x.score)+'/'+esc(x.total)+'</td><td>'+esc(Object.entries(x.topics||{}).filter(([t,v])=>v.correct<v.total).map(([t,v])=>t+': '+(v.total-v.correct)+' missed').join('; ')||'None')+'</td></tr>').join('')
  shell('<section class="sunday-report light-card"><h2>School examination results</h2><p>Official Sunday and supervised laboratory results.</p><div style="overflow-x:auto"><table><thead><tr><th>Student</th><th>Class</th><th>Sunday paper</th><th>Score</th><th>Areas to improve</th></tr></thead><tbody>'+rows+'</tbody></table></div><button class="btn btn-blue" data-sunday-school-mode>Back to School Portal</button></section>')
}
async function schoolPortal() {
  if (!supabase) return alert('School service unavailable.')
  const {data:auth} = await supabase.auth.getUser()
  if (!auth?.user) return shell('<section class="sunday-register light-card"><h2>School account required</h2><p>Sign in using the main Mezzo Maths account page, then return here to create or access your school roster.</p><button class="btn btn-ghost" data-bece-sunday-open="true">Back</button></section>')
  const {data:school,error} = await supabase.from('bece_sunday_schools').select('*').eq('owner_id',auth.user.id).maybeSingle()
  if (error) return alert('School database is unavailable. Please apply the school migration.')
  if (!school) return shell('<form id="sundaySchoolForm" class="sunday-register light-card"><h2>Register your school</h2><label>School name<input name="school_name" required></label><label>Town<input name="location" required></label><label>Region<select name="region">'+optionHtml(REGIONS)+'</select></label><button class="btn btn-gold" type="submit">Create school profile</button></form>')
  const {data:students,error:rosterError} = await supabase.from('bece_sunday_school_students').select('candidate_id,full_name,class_level,student_reference').eq('school_id',school.id).order('full_name').limit(500)
  if (rosterError) return alert('Unable to load school roster.')
  const studentButtons = (students || []).map(x => '<button class="btn btn-blue" type="button" data-school-candidate="'+esc(x.candidate_id)+'">'+esc(x.full_name)+' — '+esc(x.class_level)+' ('+esc(x.student_reference)+')</button>').join('')
  shell('<section class="sunday-register light-card"><h2>'+esc(school.school_name)+' — School Portal</h2><p>Each student has a separate candidate record and weekly attempt.</p><form id="sundaySchoolStudentForm"><h3>Add student</h3><label>Full name<input name="full_name" required></label><label>Class<select name="class_level"><option>Grade 9</option><option>JHS 3</option><option>Basic 9</option></select></label><label>Admission / student number<input name="student_reference" required></label><button class="btn btn-gold" type="submit">Add student</button></form><button class="btn btn-blue" data-sunday-school-results type="button">View School Results</button><h3>Student roster ('+(students || []).length+')</h3><p>Select the student who is using this computer.</p><div class="sunday-actions">'+studentButtons+'</div><button class="btn btn-ghost" data-bece-sunday-open="true">Back</button></section>')
}
async function createSundaySchool(form) {
  const {data:auth} = await supabase.auth.getUser()
  if (!auth?.user) return alert('Sign in first.')
  const {error} = await supabase.from('bece_sunday_schools').insert({...Object.fromEntries(new FormData(form)),owner_id:auth.user.id})
  if (error) return alert('School registration failed. Check the database setup.')
  schoolPortal()
}
async function addSundaySchoolStudent(form) {
  const {data:auth} = await supabase.auth.getUser()
  if (!auth?.user) return alert('Sign in first.')
  const {data:school} = await supabase.from('bece_sunday_schools').select('*').eq('owner_id',auth.user.id).single()
  if (!school) return alert('School account unavailable.')
  const v = Object.fromEntries(new FormData(form))
  const candidateId = newCandidateId()
  const contact = 'school:'+school.id+':'+v.student_reference
  const {error:registrationError} = await supabase.from('bece_sunday_trial_registrations').insert({candidate_id:candidateId,full_name:v.full_name,contact,school_name:school.school_name,location:school.location,region:school.region,class_level:v.class_level})
  if (registrationError) return alert('Unable to register this student.')
  const {error} = await supabase.from('bece_sunday_school_students').insert({...v,school_id:school.id,candidate_id:candidateId})
  if (error) return alert('Roster entry failed. Contact support before retrying.')
  schoolPortal()
}
async function selectSundaySchoolStudent(candidateId) {
  const {data:auth} = await supabase.auth.getUser()
  if (!auth?.user) return alert('School sign-in required.')
  const {data:school} = await supabase.from('bece_sunday_schools').select('*').eq('owner_id',auth.user.id).single()
  if (!school) return alert('School not found.')
  const {data:student} = await supabase.from('bece_sunday_school_students').select('*').eq('school_id',school.id).eq('candidate_id',candidateId).single()
  if (!student) return alert('Student not found.')
  active = null
  saveJson(CANDIDATE_KEY,{candidate_id:student.candidate_id,full_name:student.full_name,class_level:student.class_level,contact:'school:'+school.id+':'+student.student_reference,school_name:school.school_name,location:school.location,region:school.region,registration_status:'confirmed',school_managed:true})
  renderSundayHome()
}

function registerHtml() {
  return `<form class="sunday-register light-card" id="beceSundayRegisterForm"><h2>Register Free for Sunday Trial</h2><p><button type="button" class="btn btn-blue" data-sunday-school-mode>Register / Access as a School</button></p><p>For Year 9 / JHS 3 / Basic 9 candidates. Students can register with phone number or email.</p><div class="sunday-form-grid"><label><span>Full Name</span><input name="full_name" required></label><label><span>Phone Number or Email</span><input name="contact" required></label><label><span>Name of School</span><input name="school_name" required></label><label><span>Location / Town</span><input name="location" required></label><label><span>Region</span><select name="region">${optionHtml(REGIONS, 'Greater Accra')}</select></label><label><span>Class</span><select name="class_level"><option>Grade 9</option><option>JHS 3</option><option>Basic 9</option></select></label></div><button class="btn btn-gold" type="submit">Create Free Candidate Profile</button></form>`
}
function registeredHtml(c, w, tried) {
  return `<section class="sunday-registered light-card"><div><span>✅ Registered Candidate</span><h2>${esc(c.full_name)}</h2><p>${esc(c.school_name)} • ${esc(c.location)} • ${esc(c.region)}</p><p><strong>Candidate ID:</strong> ${esc(c.candidate_id || 'Legacy registration')}</p><p>${esc(c.registration_status === 'confirmed' ? 'Registration saved successfully.' : 'Registration is saved on this device. Online confirmation is pending; please reconnect and retry registration.')}</p></div><div class="sunday-actions">${tried ? '<button class="btn btn-blue" data-bece-sunday-report="true">View This Week Report</button>' : (w.open || (labOpen() && c.school_managed)) ? '<button class="btn btn-gold" data-bece-sunday-start="true">Start 40 Objectives Trial</button>' : '<button class="btn btn-primary" disabled>Trial opens Sunday 6:00pm</button>'}${c.school_managed ? '<button class="btn btn-blue" data-sunday-school-mode="true">Switch Student</button>' : '<button class="btn btn-ghost" data-bece-sunday-change-profile="true">Change Details</button>'}</div></section>`
}
function leaderboardHtml(rows) {
  return `<section class="sunday-board glass-card" data-sunday-leaderboard><div class="sunday-board-head"><div><span>🏆 Weekly Leaderboard</span><h2>Score + Time Ranking</h2></div><small>Week of ${weekStartIso()}</small></div>${rows.length ? rows.map((r, i) => `<div class="sunday-rank"><b>${i + 1}</b><span><strong>${esc(r.full_name || r.candidate?.full_name || 'Candidate')}</strong><small>${esc(r.school_name || r.candidate?.school_name || '')} • ${esc(r.region || r.candidate?.region || '')}</small></span><em>${r.score}/${r.total || QUESTION_COUNT}</em><small>${fmt((r.time_taken_seconds || 0) * 1000)}</small></div>`).join('') : '<p>No results yet this week.</p>'}</section>`
}
async function refreshDbLeaders() { const rows = await dbLeaders(); const box = document.querySelector('[data-sunday-leaderboard]'); if (rows.length && box) box.outerHTML = leaderboardHtml(rows) }
async function showSundayAdminSummary() {
  if (!supabase) return alert('Database connection unavailable.')
  const { data, error } = await supabase.rpc('bece_sunday_admin_registration_summary')
  if (error) return alert('Admin registration report unavailable. Please sign in as an administrator and confirm the latest database migration has been applied.')
  const rows = data || []
  const table = rows.map(r => `<tr><td>${esc(r.school_name)}</td><td>${esc(r.region)}</td><td>${Number(r.registered) || 0}</td></tr>`).join('')
  shell(`<section class="sunday-report light-card"><h2>Sunday BECE registrations by school and region</h2><p>Total registered: <strong>${rows.reduce((n,r) => n + (Number(r.registered) || 0), 0)}</strong></p><div style="overflow-x:auto"><table><thead><tr><th>School</th><th>Region</th><th>Candidates</th></tr></thead><tbody>${table || '<tr><td colspan="3">No registrations yet</td></tr>'}</tbody></table></div><button class="btn btn-blue" data-bece-sunday-open="true">Back to Sunday Trial</button></section>`)
}
function renderSundayHome() {
  const c = candidate(), w = trialWindow(), tried = currentAttempt()
  shell(`<section class="sunday-hero glass-card"><div><span>Free National Practice Window</span><h1>Sunday BECE Maths Trial</h1><p>Open every Sunday, 6:00pm – 8:00pm Ghana time.</p></div><div class="sunday-big-count"><small>${w.open ? 'Window closes in' : 'Next trial starts in'}</small><strong data-bece-sunday-countdown>${fmt(w.ms)}</strong><em>40 BECE objectives</em></div></section>${c ? registeredHtml(c, w, tried) : registerHtml()}${leaderboardHtml(localLeaders())}`)
  refreshDbLeaders()
  if (supabase) supabase.auth.getUser().then(({data}) => {
    if (!data?.user || !document.querySelector('.bece-sunday-page')) return
    supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle().then(({data:profile}) => {
      if (profile?.role === 'admin' && document.querySelector('.sunday-hero') && !document.querySelector('[data-sunday-admin-summary]'))
        document.querySelector('.sunday-hero').insertAdjacentHTML('afterend', '<button class="btn btn-blue" type="button" data-sunday-admin-summary="true">Admin: Registration by School and Region</button>')
    })
  }).catch(() => {})
}
async function register(form) {
  const c = Object.fromEntries(new FormData(form).entries())
  c.created_at = new Date().toISOString()
  c.candidate_id = newCandidateId()
  c.registration_status = 'pending'
  if (!supabase || !isSupabaseConfigured) {
    alert('Registration is temporarily unavailable. Please try again when the service is connected.')
    return
  }
  const submit = form.querySelector('[type="submit"]')
  if (submit) { submit.disabled = true; submit.textContent = 'Registering…' }
  try {
    const { error } = await supabase.from('bece_sunday_trial_registrations').insert({
      candidate_id: c.candidate_id, full_name: c.full_name, contact: c.contact,
      school_name: c.school_name, location: c.location, region: c.region,
      class_level: c.class_level, created_at: c.created_at
    })
    if (error) throw error
    c.registration_status = 'confirmed'
    saveJson(CANDIDATE_KEY, c)
    renderSundayHome()
  } catch (error) {
    alert('We could not confirm your registration. Please check your connection and try again. No registration has been confirmed.')
  } finally {
    if (submit?.isConnected) { submit.disabled = false; submit.textContent = 'Create Free Candidate Profile' }
  }
}
async function startTrial() {
  if (!trialWindow().open && !(labOpen() && candidate()?.school_managed)) return renderSundayHome()
  if (!candidate() || candidate().registration_status !== 'confirmed') return renderSundayHome()
  if (currentAttempt()) return renderReport(currentAttempt())
  if (activeForCandidate()) { active = activeForCandidate(); return renderQuestion() }
  try {
    const secured = await loadTrialQuestions()
    if (!secured.questions.length || !secured.sessionToken) throw new Error('The secured question service returned no questions.')
    active = { id: `trial_${Date.now()}`, week_start: secured.weekStart, mode: secured.mode, candidate: candidate(), questions: secured.questions, session_token: secured.sessionToken, index: 0, selections: {}, started_at: secured.startedAt || Date.now() }
    saveJson(ACTIVE_KEY, active)
    if (secured.resumed) alert('Your previous examination session has been recovered. The original time limit still applies.')
    renderQuestion()
  } catch (error) {
    shell(`<section class="sunday-report light-card"><h2>Trial temporarily unavailable</h2><p>${esc(error.message || 'Please check your connection and try again shortly.')}</p><button class="btn btn-blue" data-bece-sunday-open="true">Back to Sunday Trial</button></section>`)
  }
}
async function startAdminPreview(setId) {
  try {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    if (!token) throw new Error('Sign in as an administrator to preview a set.')
    const response = await fetch('/api/bece-sunday-preview', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ set_id: setId }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || 'The set could not be loaded.')
    active = { id: `preview_${Date.now()}`, preview: true, set_number: result.set_number, questions: result.questions, session_token: result.session_token, index: 0, selections: {}, started_at: Date.now() }
    renderQuestion()
  } catch (error) { alert(error.message) }
}
function selectedCount() { return Object.keys(active?.selections || {}).length }
function renderQuestion() {
  active ||= activeForCandidate()
  if (!active) return renderSundayHome()
  const q = active.questions[active.index]
  const selected = active.selections?.[q.id] || ''
  const complete = selectedCount() === active.questions.length
  shell(`<section class="sunday-live"><div class="sunday-live-top glass-card"><span>${active.preview ? `Admin trial · Set ${esc(active.set_number)}` : 'Sunday BECE Trial'} · Question ${active.index + 1}/${active.questions.length}</span><strong>${selectedCount()} answered</strong><em>${fmt(Date.now() - active.started_at)}</em></div><article class="sunday-question light-card"><p class="sunday-question-topic">${esc(q.topic_area || q.topic)}</p><h2>${esc(q.question_text)}</h2>${q.question_image_url ? `<img class="sunday-question-img" src="${esc(q.question_image_url)}" alt="Question diagram">` : ''}<div class="sunday-options">${q.options.map((op, i) => { const letter = String.fromCharCode(65 + i); return `<button type="button" class="${selected === letter ? 'selected' : ''}" data-sunday-answer="${letter}" aria-pressed="${selected === letter}"><b>${letter}</b>${q.option_image_urls?.[i] ? `<img src="${esc(q.option_image_urls[i])}" alt="Option ${letter}">` : ''}<span>${esc(op)}</span></button>` }).join('')}</div></article><nav class="sunday-question-nav" aria-label="Question navigation"><button type="button" class="btn btn-blue" data-sunday-prev ${active.index === 0 ? 'disabled' : ''}>← Previous</button><span>${selected ? 'Answer saved' : 'Choose an answer'}</span><button type="button" class="btn btn-blue" data-sunday-next ${active.index + 1 === active.questions.length ? 'disabled' : ''}>Next →</button></nav><div class="sunday-question-jump" aria-label="Jump to question">${active.questions.map((item, i) => `<button type="button" data-sunday-jump="${i}" class="${i === active.index ? 'current' : ''} ${active.selections?.[item.id] ? 'answered' : ''}" aria-label="Question ${i + 1}${active.selections?.[item.id] ? ', answered' : ', unanswered'}" aria-current="${i === active.index ? 'step' : 'false'}">${i + 1}</button>`).join('')}</div><div class="sunday-submit-row"><p>${complete ? 'All questions answered. Submit to see your feedback and explanations.' : `${active.questions.length - selectedCount()} question(s) still need an answer.`}</p><button type="button" class="btn btn-gold" data-sunday-submit ${complete ? '' : 'disabled'}>Submit all answers</button>${active.preview ? '<button type="button" class="btn btn-ghost" data-sunday-exit-preview>Exit admin trial</button>' : ''}</div></section>`)
}
function answer(letter) {
  if (!active || !/^[ABCD]$/.test(letter)) return
  const q = active.questions[active.index]
  active.selections ||= {}
  active.selections[q.id] = letter
  if (!active.preview) saveJson(ACTIVE_KEY, active)
  renderQuestion()
}
function nextQuestion(delta = 1) {
  if (!active) return
  active.index = Math.min(active.questions.length - 1, Math.max(0, active.index + delta))
  if (!active.preview) saveJson(ACTIVE_KEY, active)
  renderQuestion()
}
async function finishTrial() {
  if (!active || submitting || selectedCount() !== active.questions.length) return
  if (!window.confirm('Submit all answers? You will see feedback and explanations after submission.')) return
  submitting = true
  const current = active
  const button = document.querySelector('[data-sunday-submit]')
  if (button) { button.disabled = true; button.textContent = 'Marking answers…' }
  try {
    const token = current.preview ? (await supabase.auth.getSession()).data?.session?.access_token : ''
    if (current.preview && !token) throw new Error('Sign in again to submit the admin trial.')
    const response = await fetch('/api/bece-sunday-answer', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ session_token: current.session_token, answers: current.questions.map(q => ({ question_id: q.id, selected_answer: current.selections[q.id] })) }) })
    const marked = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(marked.error || 'The answers could not be marked.')
    const seconds = Math.round((Date.now() - current.started_at) / 1000)
    const byId = new Map(marked.results.map(result => [String(result.question_id), result]))
    const answers = current.questions.map(q => ({ ...byId.get(String(q.id)), question_text: q.question_text, options: q.options, question_image_url: q.question_image_url }))
    const attempt = { id: current.id, week_start: current.week_start, candidate: current.candidate, preview: current.preview, set_number: current.set_number, score: marked.score, total: current.questions.length, percent: Math.round(marked.score / current.questions.length * 100), time_taken_seconds: seconds, answers, completed_at: new Date().toISOString() }
    attempt.ai_analysis = analyse(attempt)
    active = null
    if (!current.preview) { localStorage.removeItem(ACTIVE_KEY); await saveAttempt(attempt) }
    renderReport(attempt)
  } catch (error) { alert(error.message); if (button) { button.disabled = false; button.textContent = 'Submit all answers' } }
  finally { submitting = false }
}
function renderReport(attempt = currentAttempt()) {
  if (!attempt) return renderSundayHome()
  previewReport = Boolean(attempt.preview)
  const a = attempt.ai_analysis || analyse(attempt)
  const review = (attempt.answers || []).map((item, index) => `<article class="sunday-review-item ${item.correct ? 'correct' : 'incorrect'}"><h3>Question ${index + 1} · ${esc(item.topic_area || item.topic || 'General')} · ${item.correct ? 'Correct' : 'Needs review'}</h3><p>${esc(item.question_text || '')}</p>${item.question_image_url ? `<img src="${esc(item.question_image_url)}" alt="Question diagram">` : ''}<p>Your answer: <b>${esc(item.selected_answer || '—')}${item.options?.['ABCD'.indexOf(item.selected_answer)] ? ` · ${esc(item.options['ABCD'.indexOf(item.selected_answer)])}` : ''}</b> · Correct answer: <b>${esc(item.correct_answer || '—')}</b></p><p><strong>How to solve it:</strong> ${esc(item.explanation || 'A worked explanation is awaiting editor review.')}</p></article>`).join('')
  shell(`<section class="sunday-report light-card"><div class="report-score"><span>${attempt.preview ? `Admin trial · Set ${esc(attempt.set_number)}` : '📊 Progress Report'}</span><h1>${attempt.score}/${attempt.total}</h1><p>${attempt.percent}% · Time: ${fmt(attempt.time_taken_seconds * 1000)}</p></div><div class="report-ai"><h2>Performance analysis</h2><p>${esc(a.speed)}</p>${a.strong?.length ? `<p><b>Strong areas:</b> ${a.strong.map(esc).join(', ')}</p>` : ''}${a.weak?.length ? `<p><b>Areas to improve:</b> ${a.weak.slice(0,5).map(([t,v]) => `${esc(t)} (${v.wrong} missed)`).join(', ')}</p>` : '<p><b>Excellent:</b> no weak area detected.</p>'}<ul>${(a.advice || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div><div class="sunday-actions"><button class="btn btn-blue" ${attempt.preview ? 'data-sunday-exit-preview' : 'data-bece-sunday-open'}>${attempt.preview ? 'Return to admin workspace' : 'Back to Sunday Trial'}</button><button class="btn btn-gold" onclick="window.print()">Print / Save Report</button></div></section><section class="sunday-review light-card"><h2>Question by question feedback</h2>${review || '<p>Detailed review is unavailable for this earlier attempt.</p>'}</section>${attempt.preview ? '' : leaderboardHtml(localLeaders())}`)
  if (!attempt.preview) refreshDbLeaders()
}
function updateCountdowns() { const w = trialWindow(); document.querySelectorAll('[data-bece-sunday-countdown]').forEach(el => { el.textContent = fmt(w.ms) }) }
function sync() { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; injectBanner(); updateCountdowns() }) }

document.addEventListener('click', e => {
  if (e.target.closest('[data-sunday-school-results]')) { e.preventDefault(); schoolResults(); return }
  if (e.target.closest('[data-sunday-school-mode]')) { e.preventDefault(); schoolPortal(); return }
  const sc = e.target.closest('[data-school-candidate]')
  if (sc) { e.preventDefault(); selectSundaySchoolStudent(sc.dataset.schoolCandidate); return }
  if (e.target.closest('[data-sunday-admin-summary]')) { e.preventDefault(); showSundayAdminSummary(); return }
  if (e.target.closest('[data-bece-sunday-open]')) { e.preventDefault(); e.stopImmediatePropagation(); renderSundayHome(); return }
  if (e.target.closest('[data-bece-sunday-start]')) { e.preventDefault(); startTrial(); return }
  if (e.target.closest('[data-bece-sunday-change-profile]')) { e.preventDefault(); localStorage.removeItem(CANDIDATE_KEY); renderSundayHome(); return }
  if (e.target.closest('[data-bece-sunday-report]')) { e.preventDefault(); renderReport(); return }
  const ans = e.target.closest('[data-sunday-answer]')
  if (ans) { e.preventDefault(); answer(ans.dataset.sundayAnswer); return }
  if (e.target.closest('[data-sunday-next]')) { e.preventDefault(); nextQuestion(1); return }
  if (e.target.closest('[data-sunday-prev]')) { e.preventDefault(); nextQuestion(-1); return }
  const jump = e.target.closest('[data-sunday-jump]')?.dataset?.sundayJump
  if (jump !== undefined) { e.preventDefault(); if (active) { active.index = Number(jump); renderQuestion() } return }
  if (e.target.closest('[data-sunday-submit]')) { e.preventDefault(); finishTrial(); return }
  if (e.target.closest('[data-sunday-exit-preview]')) { e.preventDefault(); active = null; previewReport = false; document.querySelector('.screen-tabs [data-target="admin"]')?.click(); return }
}, true)
window.addEventListener('mezzoSundayPreview', event => { if (event.detail?.setId) startAdminPreview(event.detail.setId) })
document.addEventListener('submit', e => {
  if (e.target?.id === 'sundaySchoolForm') { e.preventDefault(); createSundaySchool(e.target); return }
  if (e.target?.id === 'sundaySchoolStudentForm') { e.preventDefault(); addSundaySchoolStudent(e.target); return } if (e.target?.id === 'beceSundayRegisterForm') { e.preventDefault(); register(e.target) } }, true)

new MutationObserver(sync).observe(document.body, { childList: true, subtree: true, attributes: false })
window.addEventListener('load', sync)
setInterval(updateCountdowns, 1000)
setTimeout(sync, 500)
