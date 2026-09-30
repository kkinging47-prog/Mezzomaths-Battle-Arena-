import './course-session.css'
import './course-lms-complete.css'
import { supabase } from './supabaseClient.js'

const K = {
  courses: 'mezzo_courses_bank', enroll: 'mezzo_course_enrollments', progress: 'mezzo_course_progress',
  purchases: 'mezzo_course_purchases', coupons: 'mezzo_course_coupons', grants: 'mezzo_course_access_grants',
  certs: 'mezzo_course_certificates', reviews: 'mezzo_course_reviews', discussions: 'mezzo_course_discussions',
  submissions: 'mezzo_course_trial_submissions', notifications: 'mezzo_course_notifications', staffAccess: 'mezzo_staff_access'
}
const CLASSES = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','SHS 1','SHS 2','SHS 3']
const LEVELS = ['Beginner','Intermediate','Advanced']
const TYPES = ['Text Lesson','Video Lesson','Interactive Lesson','Worked Example','Practice Lesson','PDF/Resource Lesson','Audio Lesson']
const RULES = { allLessons: true, minQuizScore: 70, requireHomework: false, requireClasswork: false, requireFinal: false, finalPass: 70 }
let queued = false, editingCourseId = '', selectedCourseId = '', chapterIndex = 0, lessonIndex = 0
let cloudCourses = null, cloudReady = false, cloudError = ''
let cloudGrants = []
let cloudEnrollmentIds = new Set()
const courseDrafts = new Map()
let draftTimer = null
let filters = { q: '', classLevel: '', category: '', access: '', level: '', sort: 'newest' }

const $ = s => document.querySelector(s)
const $$ = s => Array.from(document.querySelectorAll(s))
const read = (k, f) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(f)) } catch { return f } }
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v))
const rows = k => read(k, [])
const saveRows = (k, v) => save(k, v)
const h = (v = '') => String(v).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))
const id = (p = 'id') => `${p}_${Date.now()}_${Math.random().toString(16).slice(2)}`
const profile = () => read('mezzo_profile', {}) || {}
const userKey = () => String(profile().email || profile().full_name || 'demo-student').toLowerCase()
const draftKey = (courseId = editingCourseId) => `mezzo_course_draft:${userKey()}:${courseId || 'new'}`
function rememberCourseDraft(form){
  const key=draftKey(form.elements.namedItem('id')?.value || '')
  const fields=Object.fromEntries([...new FormData(form).entries()].filter(([,value])=>typeof value==='string'))
  courseDrafts.set(key,fields)
  form.dataset.courseDirty='true'
  clearTimeout(draftTimer)
  draftTimer=setTimeout(()=>{try{sessionStorage.setItem(key,JSON.stringify(fields))}catch{}},300)
}
function restoreCourseDraft(form){
  const key=draftKey(form.elements.namedItem('id')?.value || '')
  let fields=courseDrafts.get(key)
  if(!fields){try{fields=JSON.parse(sessionStorage.getItem(key)||'null')}catch{}}
  if(!fields)return
  for(const [name,value] of Object.entries(fields)){
    const field=form.elements.namedItem(name)
    if(field&&field.type!=='file')field.value=value
  }
  form.dataset.courseDirty='true'
}
function clearCourseDraft(courseId=''){
  clearTimeout(draftTimer)
  const key=draftKey(courseId)
  courseDrafts.delete(key)
  sessionStorage.removeItem(key)
}
document.addEventListener('course-studio-save-draft',event=>{
  const form=event.target
  if(form.getAttribute('id')!=='courseAdminForm')return
  rememberCourseDraft(form)
  clearTimeout(draftTimer)
  const key=draftKey(form.elements.namedItem('id')?.value || '')
  try{
    sessionStorage.setItem(key,JSON.stringify(courseDrafts.get(key)))
    event.detail.saved=true
  }catch{toast('Draft could not be saved. Keep this page open and try again.')}
})
const isAdmin = () => profile().role === 'admin'
const isTeacher = () => profile().role === 'teacher'
const isStaff = () => profile().role === 'mezzo_staff'
const logo = () => localStorage.getItem('mezzo_custom_logo') ? `<img src="${localStorage.getItem('mezzo_custom_logo')}" alt="Logo">` : '♛'
const classOpts = sel => CLASSES.map(x => `<option value="${h(x)}" ${x === sel ? 'selected' : ''}>${h(x)}</option>`).join('')
const opts = (list, sel) => list.map(x => `<option value="${h(x)}" ${x === sel ? 'selected' : ''}>${h(x)}</option>`).join('')
const lines = txt => String(txt || '').split('\n').map(x => x.trim()).filter(Boolean)
function toast(msg){ $('.course-toast')?.remove(); document.body.insertAdjacentHTML('beforeend', `<div class="course-toast">${h(msg)}</div>`); setTimeout(() => $('.course-toast')?.remove(), 4200) }
function notify(msg, courseId = ''){ const n = { id:id('note'), user:userKey(), role:profile().role || 'student', course_id:courseId, message:msg, read:false, created_at:new Date().toISOString() }; saveRows(K.notifications, [n, ...rows(K.notifications)].slice(0,200)); toast(msg) }
function subscribed(){ const s = read('mezzo_subscription', null); return Boolean(s?.active && (!s.expires_at || new Date(s.expires_at) > new Date())) }
function canStaffOpen(){ return !isStaff() || read(K.staffAccess, { courses:true }).courses !== false }
function starterCourses(){
  return [{ id:id('course'), title:'Multiplication Mastery Basics', class_level:'Grade 4', category:'Number Work', course_level:'Beginner', instructor:'Mezzo Maths Faculty', duration:'2 hours', access_type:'free', price:0, status:'published', cover_icon:'✖️', cover_image:'', featured:true, summary:'Self-paced multiplication course with chapters, interactive lesson, quiz, homework, classwork and final assessment.', outcomes:'Understand equal groups\nSolve multiplication facts\nApply multiplication in word problems', requirements:'Notebook\nBasic addition', drip_mode:'chapter', prerequisite_course_id:'', completion_rules:RULES, chapters:[{ title:'Understanding Multiplication', unlock_date:'', lessons:[{ title:'Equal Groups', type:'Interactive Lesson', content:'Multiplication means equal groups. Example: 4 groups of 3 means 4 × 3 = 12.', video_url:'', resource_url:'', interactive:'Draw four equal groups and type the total.', homework:'Create five equal-group examples at home.', classwork:'Solve ten multiplication drills in class.', unlock_date:'' }], quiz:[{ q:'What is 4 × 3?', options:['7','10','12','16'], answer:'C', explanation:'4 groups of 3 gives 12.' }], homework:[{ title:'Home Trial', instructions:'Write the 2, 3, 4 and 5 times tables.', due:'' }], classwork:[{ title:'Class Trial', instructions:'Complete a 10-question multiplication speed drill.', due:'' }] }], final:[{ q:'What is 6 × 5?', options:['11','20','30','35'], answer:'C', explanation:'6 groups of 5 gives 30.' }], updated_at:new Date().toISOString() }]
}
function normal(c){
  const lessons = c.lessons?.length ? c.lessons : [{ title:'Course Introduction', type:'Interactive Lesson', content:'Course introduction.', video_url:'', resource_url:'', interactive:'Write what you learnt.', homework:'Homework trial.', classwork:'Classwork trial.', unlock_date:'' }]
  const chapters = c.chapters?.length ? c.chapters : [{ title:'Chapter 1', unlock_date:'', lessons, quiz:[], homework:[], classwork:[] }]
  return { cover_image:'', featured:false, instructor:'Mezzo Maths Faculty', access_type:'free', price:0, course_level:'Beginner', drip_mode:'all', prerequisite_course_id:'', outcomes:'', requirements:'', completion_rules:RULES, final:[], ...c, chapters, completion_rules:{ ...RULES, ...(c.completion_rules || {}) } }
}
function courses(){ if (cloudReady) return cloudCourses.map(normal); if (supabase) return []; let list = rows(K.courses); if (!list.length) { list = starterCourses(); saveRows(K.courses, list); saveRows(K.coupons, [{ id:id('coupon'), code:'MEZZO50', course_id:'all', discount:50, active:true }]) } return list.map(normal) }
function saveCourses(v){ if (cloudReady) cloudCourses = v.map(normal); else saveRows(K.courses, v) }

const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '')
async function authUser(){ if (!supabase) return null; const { data } = await supabase.auth.getUser(); return data?.user || null }
function publicOutline(course){ return (course.chapters || []).map(ch => ({ title:ch.title, lessons:(ch.lessons || []).map(l => ({title:l.title,type:l.type})), quiz_count:(ch.quiz||[]).length, homework_count:(ch.homework||[]).length, classwork_count:(ch.classwork||[]).length })) }
function cloudCourse(row){ const outline = row.course_document?.outline || []; return normal({ ...row, chapters:outline.map(ch => ({title:ch.title,lessons:ch.lessons||[],quiz:[],homework:[],classwork:[]})), final:[] }) }
async function loadCloudCourses(){
  if (!supabase) return
  const {data,error} = await supabase.from('course_sessions').select('*').order('updated_at',{ascending:false}).limit(250)
  if (error) { cloudError = 'Courses could not be loaded. Please try again.'; cloudCourses=[]; cloudReady=true; if ($('.course-app .catalog-section')) renderCourses(); refreshCourseAdminPanel(); return }
  cloudError = ''
  const previous = cloudCourses || []
  cloudCourses = (data || []).map(row => {
    const cached = previous.find(c => c.id === row.id)
    return cached?.contentLoaded ? Object.assign(cloudCourse(row), {chapters:cached.chapters,final:cached.final,contentLoaded:true}) : cloudCourse(row)
  })
  cloudReady = true
  const user = await authUser()
  const review = await supabase.from('course_reviews').select('course_id,student_email,rating,comment,created_at').limit(500)
  if (!review.error) saveRows(K.reviews,(review.data||[]).map(row => ({...row,user:row.student_email})))
  if (user) {
    const enrol = await supabase.from('course_enrollments').select('course_id,progress_snapshot,enrolled_at').eq('student_id',user.id)
    cloudEnrollmentIds = new Set(enrol.error ? [] : (enrol.data || []).map(row => row.course_id))
    if (!enrol.error) {
      const e = {}, p = {}
      enrol.data.forEach(row => { e[`${userKey()}_${row.course_id}`] = {course_id:row.course_id,student:userKey(),enrolled_at:row.enrolled_at}; p[`${userKey()}_${row.course_id}`] = row.progress_snapshot || {} })
      save(K.enroll,e); save(K.progress,p)
    }
    const grants = await supabase.from('course_access_grants').select('course_id,student_id').eq('student_id',user.id)
    cloudGrants = grants.error ? [] : grants.data || []
  } else { save(K.enroll,{}); save(K.progress,{}); cloudGrants=[]; cloudEnrollmentIds=new Set() }
  if ($('.course-app .catalog-section')) renderCourses()
  refreshCourseAdminPanel()
}
function refreshCourseAdminPanel(){
  const panel = $('[data-course-admin-panel]')
  if (!panel || panel.querySelector('#courseAdminForm')?.dataset.courseDirty === 'true') return
  panel.remove()
  adminPanel()
}
async function loadContent(cid){
  const course = cloudCourses?.find(c => c.id === cid)
  if (!course || course.contentLoaded) return course
  const {data,error} = await supabase.from('course_content').select('content').eq('course_id',cid).maybeSingle()
  if (error || !data) { toast(error ? 'Course content could not be opened.' : 'This course has no lessons yet.'); return null }
  Object.assign(course,normal({...course,...data.content,id:cid}),{contentLoaded:true})
  return course
}
async function saveCloudCourse(item){
  if (cloudError) throw new Error('Course database is unavailable. Please refresh and try again.')
  const user = await authUser()
  if (!user || !isAdmin()) throw new Error('Sign in as an administrator to publish courses.')
  const previous = cloudCourses.find(c => c.id === item.id)
  const id = uuid(item.id) ? item.id : crypto.randomUUID()
  const row = {id,title:item.title,class_level:item.class_level,category:item.category,duration:item.duration,cover_icon:item.cover_icon,cover_image:item.cover_image,featured:!!item.featured,summary:item.summary,status:'draft',created_by:previous?.created_by||user.id,updated_at:new Date().toISOString(),access_type:item.access_type,price:item.price,currency:'GHS',instructor:item.instructor,outcomes:item.outcomes,requirements:item.requirements,course_level:item.course_level,drip_mode:item.drip_mode,prerequisite_course_id:uuid(item.prerequisite_course_id)?item.prerequisite_course_id:null,completion_rules:item.completion_rules,course_document:{outline:publicOutline(item)}}
  const saved = await supabase.from('course_sessions').upsert(row).select('id').single()
  if (saved.error) throw saved.error
  const content = await supabase.from('course_content').upsert({course_id:id,content:{...item,id},updated_at:new Date().toISOString()}).select('course_id').single()
  if (content.error) throw content.error
  if (item.status === 'published') {
    const published = await supabase.from('course_sessions').update({status:'published'}).eq('id',id).select('id').single()
    if (published.error) throw published.error
  }
  return id
}
async function syncProgress(cid,p){
  const user = await authUser()
  if (!user) return
  const course = courses().find(c => c.id === cid)
  if (!course) return
  const {error} = await supabase.from('course_enrollments').update({progress_snapshot:p,progress_percent:Math.min(100,Math.max(0,Math.round(100*(p.completed||[]).length/Math.max(1,allLessons(course).length))))}).eq('student_id',user.id).eq('course_id',cid)
  if (error) toast('Progress could not be saved online. Please try again.')
}

function allLessons(c){ return (c.chapters || []).flatMap((ch, ci) => (ch.lessons || []).map((l, li) => ({...l, ci, li}))) }
function trialCount(c, type){ return (c.chapters || []).reduce((n,ch) => n + (ch[type] || []).length, 0) }
function enrolments(){ return read(K.enroll, {}) }
function enrolled(cid){ return cloudReady ? cloudEnrollmentIds.has(cid) : Boolean(enrolments()[`${userKey()}_${cid}`]) }
function progress(cid){ return read(K.progress, {})[`${userKey()}_${cid}`] || { completed:[], quizScores:{}, finalScore:null } }
function setProgress(cid, p){ const all = read(K.progress, {}); all[`${userKey()}_${cid}`] = p; save(K.progress, all); if (cloudReady) syncProgress(cid,p) }
function certs(){ return rows(K.certs) }
function hasCert(cid){ return certs().some(c => c.course_id === cid && c.user === userKey()) }
function purchase(cid){ return rows(K.purchases).some(p => p.user === userKey() && p.course_id === cid && p.status === 'success') }
function grant(cid){ return cloudReady ? cloudGrants.some(g => g.course_id === cid) : rows(K.grants).some(g => String(g.email || '').toLowerCase() === userKey() && (g.course_id === cid || g.course_id === 'all')) }
function prerequisiteMet(c){ return !c.prerequisite_course_id || hasCert(c.prerequisite_course_id) }
function access(c){ return c.access_type !== 'paid' || (cloudReady ? (grant(c.id) || enrolled(c.id)) : (subscribed() || purchase(c.id) || grant(c.id) || enrolled(c.id))) }
function canEnrol(c){ return (!supabase || cloudReady) && prerequisiteMet(c) && access(c) }
function pct(c){ const p = progress(c.id); return Math.round(((p.completed || []).length / Math.max(1, allLessons(c).length)) * 100) }
function avgRating(cid){ const r = rows(K.reviews).filter(x => x.course_id === cid); return r.length ? Math.round((r.reduce((a,b)=>a + Number(b.rating || 0),0)/r.length)*10)/10 : 0 }
function enrolCount(cid){ return Object.values(enrolments()).filter(e => e.course_id === cid).length }
function completed(c){
  const p = progress(c.id), r = { ...RULES, ...(c.completion_rules || {}) }
  const lessonOk = !r.allLessons || (p.completed || []).length >= allLessons(c).length
  const quizChapters = (c.chapters || []).map((ch,i)=>({ch,i})).filter(x => (x.ch.quiz || []).length)
  const quizOk = !r.minQuizScore || quizChapters.every(x => Number(p.quizScores?.[x.i] || 0) >= Number(r.minQuizScore || 0))
  const sub = rows(K.submissions).filter(s => s.user === userKey() && s.course_id === c.id)
  const homeOk = !r.requireHomework || sub.filter(s => s.trial_type === 'homework').length >= trialCount(c,'homework')
  const classOk = !r.requireClasswork || sub.filter(s => s.trial_type === 'classwork').length >= trialCount(c,'classwork')
  const finalOk = !r.requireFinal || Number(p.finalScore || 0) >= Number(r.finalPass || 70)
  return { ok: lessonOk && quizOk && homeOk && classOk && finalOk, lessonOk, quizOk, homeOk, classOk, finalOk, finalScore:p.finalScore }
}
function setupText(c){
  let out = (c.chapters || []).map((ch,ci) => {
    const a = [`CHAPTER: ${ch.title || `Chapter ${ci+1}`}${ch.unlock_date ? `|${ch.unlock_date}` : ''}`]
    ;(ch.lessons||[]).forEach(l => a.push(`LESSON: ${l.title||''}|${l.type||'Interactive Lesson'}|${l.content||''}|${l.video_url||''}|${l.resource_url||''}|${l.interactive||''}|${l.homework||''}|${l.classwork||''}|${l.unlock_date||''}|${l.audio_url||''}|${l.image_url||''}`))
    ;(ch.quiz||[]).forEach(q => a.push(`QUIZ: ${q.q||''}|${q.options?.[0]||''}|${q.options?.[1]||''}|${q.options?.[2]||''}|${q.options?.[3]||''}|${q.answer||'A'}|${q.explanation||''}`))
    ;(ch.homework||[]).forEach(t => a.push(`HOMEWORK: ${t.title||''}|${t.instructions||''}|${t.due||''}`))
    ;(ch.classwork||[]).forEach(t => a.push(`CLASSWORK: ${t.title||''}|${t.instructions||''}|${t.due||''}`))
    return a.join('\n')
  }).join('\n')
  ;(c.final || []).forEach(f => out += `\nFINAL: ${f.q||''}|${f.options?.[0]||''}|${f.options?.[1]||''}|${f.options?.[2]||''}|${f.options?.[3]||''}|${f.answer||'A'}|${f.explanation||''}`)
  return out
}
export function parseSetup(txt){
  const chapters = [], final = []; let current = null
  const makeChapter = () => { if (!current) { current = { title:`Chapter ${chapters.length+1}`, unlock_date:'', lessons:[], quiz:[], homework:[], classwork:[] }; chapters.push(current) } return current }
  lines(txt).forEach(line => {
    if (/^chapter:/i.test(line)) { const [title, unlock_date] = line.replace(/^chapter:/i,'').split('|').map(x => (x||'').trim()); current = { title:title || `Chapter ${chapters.length+1}`, unlock_date:unlock_date || '', lessons:[], quiz:[], homework:[], classwork:[] }; chapters.push(current); return }
    if (/^lesson:/i.test(line)) { const [title,type,content,video_url,resource_url,interactive,homework,classwork,unlock_date,audio_url,image_url] = line.replace(/^lesson:/i,'').split('|').map(x => (x||'').trim()); makeChapter().lessons.push({ title:title||'Untitled Lesson', type:type||'Interactive Lesson', content, video_url, resource_url, interactive, homework, classwork, unlock_date, audio_url, image_url }); return }
    if (/^quiz:/i.test(line)) { const [q,a,b,c,d,answer,explanation] = line.replace(/^quiz:/i,'').split('|').map(x => (x||'').trim()); makeChapter().quiz.push({ q:q||'Quiz question', options:[a||'A',b||'B',c||'C',d||'D'], answer:(answer||'A').toUpperCase().slice(0,1), explanation }); return }
    if (/^homework:/i.test(line)) { const [title,instructions,due] = line.replace(/^homework:/i,'').split('|').map(x => (x||'').trim()); makeChapter().homework.push({ title:title||'Homework', instructions, due }); return }
    if (/^classwork:/i.test(line)) { const [title,instructions,due] = line.replace(/^classwork:/i,'').split('|').map(x => (x||'').trim()); makeChapter().classwork.push({ title:title||'Classwork', instructions, due }); return }
    if (/^final:/i.test(line)) { const [q,a,b,c,d,answer,explanation] = line.replace(/^final:/i,'').split('|').map(x => (x||'').trim()); final.push({ q:q||'Final question', options:[a||'A',b||'B',c||'C',d||'D'], answer:(answer||'A').toUpperCase().slice(0,1), explanation }); return }
  })
  return { chapters, final }
}
function installButtons(){
  $$('.tab-scroll').forEach(nav => { if (nav.querySelector('[data-courses-page]')) return; const b = document.createElement('button'); b.className='screen-tab course-nav-button'; b.type='button'; b.dataset.coursesPage='true'; b.innerHTML='<span>🎓</span>Courses'; (nav.querySelector('[data-subscription-nav-button]') || nav.querySelector('[data-target="auth"]') || nav.lastElementChild)?.insertAdjacentElement('beforebegin', b) || nav.appendChild(b) })
  const grid = $('.home-screen .home-mode-grid'); if (grid && !grid.querySelector('.course-home-card')) grid.insertAdjacentHTML('beforeend', `<button class="home-mode-card game-mode-card course-home-card" data-courses-page="true"><i class="mode-shine"></i><div class="mode-top"><span class="mode-icon">🎓</span><em>LMS</em></div><h3>Course Sessions</h3><p>Free and paid courses with chapters, lessons, quizzes, homework, classwork and certificates.</p><div class="reward-pill">📚 Self enrol</div><strong>OPEN COURSES →</strong></button>`)
}
function adminPanel(){
  if (!isAdmin()) return
  const screen = $('.admin-screen'); if (!screen || screen.querySelector('[data-course-admin-panel]')) return
  const list = courses(), edit = editingCourseId ? list.find(c => c.id === editingCourseId) : null
  const pre = '<option value="">No prerequisite</option>' + list.filter(c => c.id !== edit?.id).map(c => `<option value="${c.id}" ${c.id === edit?.prerequisite_course_id ? 'selected' : ''}>${h(c.title)}</option>`).join('')
  const setup = edit ? setupText(edit) : ''
  const rules = { ...RULES, ...(edit?.completion_rules || {}) }
  const html = `<section class="course-admin-panel glass-card" data-course-admin-panel="true"><div class="course-admin-head"><div><span>🎓 Complete LMS</span><h2>Course Builder</h2><p>Mount free or paid courses with landing pages, chapters, interactive lessons, quizzes, trials, final assessment and certificates.</p></div><button class="btn btn-blue" data-courses-page="true">Preview Courses</button></div>${cloudError ? `<div class="course-cloud-notice">${h(cloudError)} <button type="button" data-reload-courses="true">Retry</button></div>` : !cloudReady && supabase ? '<div class="course-cloud-notice">Loading course database…</div>' : ''}<form id="courseAdminForm" class="course-admin-form"><input name="id" type="hidden" value="${h(edit?.id || '')}"><input name="course_structure" type="hidden" value="${h(JSON.stringify(edit ? {chapters:edit.chapters||[],final:edit.final||[],announcements:edit.announcements||[]} : null))}"><label><span>Title</span><input name="title" required value="${h(edit?.title || '')}"></label><label><span>Class</span><select name="class_level">${classOpts(edit?.class_level || 'Grade 8')}</select></label><label><span>Category</span><input name="category" value="${h(edit?.category || '')}"></label><label><span>Level</span><select name="course_level">${opts(LEVELS, edit?.course_level || 'Beginner')}</select></label><label><span>Instructor</span><input name="instructor" value="${h(edit?.instructor || 'Mezzo Maths Faculty')}"></label><label><span>Duration</span><input name="duration" value="${h(edit?.duration || '')}"></label><label><span>Free/Paid</span><select name="access_type"><option value="free" ${edit?.access_type !== 'paid' ? 'selected':''}>Free</option><option value="paid" ${edit?.access_type === 'paid' ? 'selected':''}>Paid</option></select></label><label><span>Price GHS</span><input name="price" type="number" min="0" value="${h(edit?.price || 0)}"></label><label><span>Status</span><select name="status"><option value="published" ${edit?.status !== 'draft' ? 'selected':''}>Published</option><option value="draft" ${edit?.status === 'draft' ? 'selected':''}>Draft</option></select></label><label><span>Icon</span><input name="cover_icon" value="${h(edit?.cover_icon || '🎓')}"></label><label class="wide"><span>Upload course cover image</span><input name="cover_image" type="hidden" value="${h(edit?.cover_image || '')}"><input name="cover_image_file" type="file" accept="image/jpeg,image/png,image/webp"><small>Choose a JPG, PNG or WebP image up to 5 MB.</small><small data-cover-status role="status"></small><img data-cover-preview alt="Course cover preview" hidden style="width:100%;max-width:320px;max-height:180px;object-fit:contain;border-radius:12px"></label><label><span>Featured course</span><select name="featured"><option value="no" ${!edit?.featured ? 'selected':''}>No</option><option value="yes" ${edit?.featured ? 'selected':''}>Yes</option></select></label><label><span>Drip Mode</span><select name="drip_mode"><option value="all" ${edit?.drip_mode === 'all' ? 'selected':''}>All open</option><option value="chapter" ${edit?.drip_mode === 'chapter' ? 'selected':''}>Chapter by chapter</option><option value="date" ${edit?.drip_mode === 'date' ? 'selected':''}>By date</option></select></label><label><span>Prerequisite</span><select name="prerequisite_course_id">${pre}</select></label><label class="wide"><span>Description</span><textarea name="summary" required>${h(edit?.summary || '')}</textarea></label><label class="wide"><span>What Students Will Learn</span><textarea name="outcomes">${h(edit?.outcomes || '')}</textarea></label><label class="wide"><span>Requirements</span><textarea name="requirements">${h(edit?.requirements || '')}</textarea></label><div class="completion-rule-grid wide"><label><span>All lessons</span><select name="allLessons"><option value="yes" ${rules.allLessons ? 'selected':''}>Yes</option><option value="no" ${!rules.allLessons ? 'selected':''}>No</option></select></label><label><span>Min quiz %</span><input name="minQuizScore" type="number" value="${h(rules.minQuizScore)}"></label><label><span>Homework</span><select name="requireHomework"><option value="no" ${!rules.requireHomework ? 'selected':''}>No</option><option value="yes" ${rules.requireHomework ? 'selected':''}>Yes</option></select></label><label><span>Classwork</span><select name="requireClasswork"><option value="no" ${!rules.requireClasswork ? 'selected':''}>No</option><option value="yes" ${rules.requireClasswork ? 'selected':''}>Yes</option></select></label><label><span>Final</span><select name="requireFinal"><option value="no" ${!rules.requireFinal ? 'selected':''}>No</option><option value="yes" ${rules.requireFinal ? 'selected':''}>Yes</option></select></label><label><span>Final pass %</span><input name="finalPass" type="number" value="${h(rules.finalPass)}"></label></div><label class="wide"><span>Chapters, Lessons, Quizzes, Homework, Classwork & Final</span><textarea name="course_setup" class="course-setup-textarea">${h(setup)}</textarea><small>Use CHAPTER, LESSON, QUIZ, HOMEWORK, CLASSWORK, FINAL lines. Lesson types: ${TYPES.join(', ')}.</small></label><button class="btn btn-gold wide" type="submit">${edit ? 'Update Course':'Mount Course'}</button>${edit ? '<button class="btn btn-ghost wide" type="button" data-cancel-course-edit="true">Cancel Edit</button>':''}</form>${cloudReady && rows(K.courses).length ? '<button class="btn btn-blue" type="button" data-import-local-courses="true">Import browser courses</button>' : ''}${commerceAdmin()}${analytics()}<div class="course-admin-list">${list.map(adminRow).join('')}</div></section>`
  ;(screen.querySelector('[data-admin-brand-staff-panel]') || screen.querySelector('.dashboard-hero') || screen.firstElementChild).insertAdjacentHTML('afterend', html)
  restoreCourseDraft($('#courseAdminForm'))
  updateCoverPreview($('#courseAdminForm'))
}
function adminRow(c){ const price = c.access_type === 'paid' ? `Paid GHS ${c.price}` : 'Free'; return `<article><div><strong>${h(c.cover_icon || '🎓')} ${h(c.title)}</strong><span>${h(c.class_level)} • ${h(c.category)} • ${price} • ${h(c.status)}</span><small>${(c.chapters||[]).length} chapters • ${allLessons(c).length} lessons • ⭐ ${avgRating(c.id)||'—'}</small></div><div><button class="btn btn-blue btn-small" data-edit-course="${c.id}">Edit</button><button class="btn btn-danger btn-small" data-delete-course="${c.id}">Delete</button></div></article>` }
function commerceAdmin(){ const options = courses().map(c => `<option value="${c.id}">${h(c.title)}</option>`).join(''); return `<section class="course-commerce-admin"><header><h3>Coupons & access grants</h3><p>Manage course offers and give individual learners access.</p></header><div class="commerce-grid"><form id="courseCouponForm"><h4>Create a coupon</h4><label>Coupon code<input name="code" required placeholder="e.g. MEZZO100"></label><label>Course<select name="course_id">${options}</select></label><label>Discount %<input name="discount" type="number" min="100" max="100" value="100" readonly></label><button class="btn btn-gold" type="submit">Save coupon</button></form><form id="courseGrantForm"><h4>Grant a learner access</h4><label>Student email<input name="email" type="email" required placeholder="learner@example.com"></label><label>Course<select name="course_id">${options}</select></label><button class="btn btn-blue" type="submit">Grant access</button></form></div></section>` }
function analytics(){ const e = Object.values(enrolments()).length, subs = rows(K.submissions).length, rev = rows(K.purchases).filter(p => p.status === 'success').reduce((n,p)=>n+Number(p.amount||0),0); return `<section class="course-analytics-panel"><div><strong>${courses().length}</strong><span>Courses</span></div><div><strong>${e}</strong><span>Enrolments</span></div><div><strong>${rows(K.certs).length}</strong><span>Certificates</span></div><div><strong>${subs}</strong><span>Submissions</span></div><div><strong>GHS ${rev}</strong><span>Revenue</span></div><button class="btn btn-ghost" data-download-course-analytics="true">Download CSV</button></section>` }
function updateCoverPreview(form){
  const preview=form.querySelector('[data-cover-preview]')
  const url=form.elements.namedItem('cover_image').value
  preview.hidden=!url
  if(url)preview.src=url
}
async function uploadCourseCover(input){
  const form=input.closest('form'), file=input.files?.[0]
  if(!file)return
  const status=form.querySelector('[data-cover-status]')
  const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}
  input.setCustomValidity('')
  if(!types[file.type]||file.size>5*1024*1024){
    input.setCustomValidity('Choose a JPG, PNG or WebP image up to 5 MB.')
    status.textContent=input.validationMessage
    input.reportValidity()
    return
  }
  form.dataset.coverUploading='true'
  input.disabled=true
  status.textContent='Uploading cover image…'
  try{
    const user=await authUser()
    if(!supabase||!user||!isAdmin())throw new Error('Sign in as an administrator to upload the cover.')
    const path='covers/'+user.id+'/'+crypto.randomUUID()+'.'+types[file.type]
    const {error}=await supabase.storage.from('course-media').upload(path,file,{contentType:file.type,upsert:false})
    if(error)throw error
    form.elements.namedItem('cover_image').value=supabase.storage.from('course-media').getPublicUrl(path).data.publicUrl
    input.value=''
    updateCoverPreview(form)
    rememberCourseDraft(form)
    form.dispatchEvent(new CustomEvent('course-studio-save-draft',{bubbles:true,detail:{saved:false}}))
    status.textContent='Cover uploaded. Mount course to save it with the course.'
  }catch(error){
    input.setCustomValidity('Cover upload failed. Choose the image again to retry.')
    status.textContent='Cover upload failed. Please choose the image again to retry.'
  }finally{
    input.disabled=false
    delete form.dataset.coverUploading
  }
}
document.addEventListener('change',event=>{
  if(event.target.matches('#courseAdminForm [name="cover_image_file"]'))uploadCourseCover(event.target)
},true)
async function saveCourse(form){
  if(form.dataset.coverUploading==='true'){toast('Please wait for the cover image upload to finish.');return}
  const current=form.querySelector('[data-studio-section]:not([hidden])')
  if(current&&current.dataset.studioSection!=='reviews'){current.querySelector('[data-studio-action="continue"]')?.click();return}
  if(form.dataset.fileUploading==='true'){toast('Please wait for the file upload to finish.');return}
  const validation={valid:true};form.dispatchEvent(new CustomEvent('course-studio-validate',{bubbles:true,detail:validation}));if(!validation.valid)return
  for(const field of form.querySelectorAll('input,select,textarea')){
    if(!field.checkValidity()){field.reportValidity();return}
  }
  const f = Object.fromEntries(new FormData(form).entries());let parsed
  try{parsed=f.course_structure?JSON.parse(f.course_structure):parseSetup(f.course_setup)}catch{toast('Course draft could not be read. Please retry.');return}
  if (!parsed.chapters.some(ch => ch.lessons.length)) { toast('Add at least one chapter and lesson before saving.'); return }
  const item = { id:f.id || id('course'), title:f.title, class_level:f.class_level, category:f.category, course_level:f.course_level, instructor:f.instructor, duration:f.duration, access_type:f.access_type, price:Number(f.price||0), status:f.status, cover_icon:f.cover_icon||'🎓', cover_image:f.cover_image||'', featured:f.featured==='yes', summary:f.summary, outcomes:f.outcomes, requirements:f.requirements, drip_mode:f.drip_mode, prerequisite_course_id:f.prerequisite_course_id, completion_rules:{ allLessons:f.allLessons !== 'no', minQuizScore:Number(f.minQuizScore||0), requireHomework:f.requireHomework==='yes', requireClasswork:f.requireClasswork==='yes', requireFinal:f.requireFinal==='yes', finalPass:Number(f.finalPass||70) }, chapters:parsed.chapters, final:parsed.final, announcements:parsed.announcements||[], updated_at:new Date().toISOString() }
  const button=form.querySelector('[type="submit"]'); if(button) button.disabled=true
  try {
    if (!supabase || !cloudReady) throw new Error('Course database is unavailable. Your draft is preserved; please retry when connected.')
    const savedId=await saveCloudCourse(item)
    form.elements.namedItem('id').value=savedId
    await loadCloudCourses()
    clearCourseDraft(f.id || ''); editingCourseId=''; $('[data-course-admin-panel]')?.remove(); adminPanel(); notify('Course saved.',item.id)
  } catch(error){ toast(error.message||'Course could not be saved.') }
  finally { if(button) button.disabled=false }
}
async function saveCoupon(form){ const f=Object.fromEntries(new FormData(form).entries()); if(cloudReady){ const user=await authUser(); if(!user||!isAdmin()) return toast('Administrator sign-in required.'); const {error}=await supabase.from('course_coupons').insert({code:String(f.code).trim().toUpperCase(),course_id:f.course_id,discount_percent:100,active:true}); if(error) return toast(error.message) } else if(supabase) return toast('Course database is unavailable.'); else saveRows(K.coupons,[{id:id('coupon'),code:String(f.code).toUpperCase(),course_id:f.course_id,discount:100,active:true},...rows(K.coupons)]); form.reset(); notify('Coupon saved.') }
async function saveGrant(form){ const f=Object.fromEntries(new FormData(form).entries()); if(cloudReady){ const admin=await authUser(); if(!admin||!isAdmin()) return toast('Administrator sign-in required.'); const email=String(f.email).trim().toLowerCase(); const found=await supabase.from('profiles').select('id,email').ilike('email',email).maybeSingle(); if(found.error||!found.data) return toast('Learner account not found. Ask them to register first.'); const {error}=await supabase.from('course_access_grants').insert({course_id:f.course_id,student_id:found.data.id,student_email:email,granted_by:admin.id}); if(error) return toast(error.message); const enrol=await supabase.from('course_enrollments').upsert({course_id:f.course_id,student_id:found.data.id,student_email:email,progress_snapshot:{completed:[],quizScores:{},finalScore:null}},{onConflict:'course_id,student_id',ignoreDuplicates:true}); if(enrol.error) return toast('Grant saved, but enrollment could not be created: '+enrol.error.message) } else if(supabase) return toast('Course database is unavailable.'); else saveRows(K.grants,[{id:id('grant'),email:String(f.email).toLowerCase(),course_id:f.course_id,created_at:new Date().toISOString()},...rows(K.grants)]); form.reset(); notify('Course access granted.') }
function filterCourses(){ let x = courses().filter(c => c.status !== 'draft'), q = filters.q.toLowerCase(); if (q) x = x.filter(c => [c.title,c.category,c.class_level,c.instructor].join(' ').toLowerCase().includes(q)); if (filters.classLevel) x = x.filter(c => c.class_level === filters.classLevel); if (filters.category) x = x.filter(c => c.category === filters.category); if (filters.access) x = x.filter(c => c.access_type === filters.access); if (filters.level) x = x.filter(c => c.course_level === filters.level); if (filters.sort === 'rating') x.sort((a,b)=>avgRating(b.id)-avgRating(a.id)); else if (filters.sort === 'price') x.sort((a,b)=>Number(a.price)-Number(b.price)); else if (filters.sort === 'popular') x.sort((a,b)=>enrolCount(b.id)-enrolCount(a.id)); else x.sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0)); return x }
function categories(){ return [...new Set(courses().map(c => c.category).filter(Boolean))] }
function renderCourses(){
  if (!canStaffOpen()) return toast('Courses are locked for Mezzo Staff. Ask admin to allow access.')
  const pub = courses().filter(c => c.status !== 'draft'), shown = filterCourses()
  selectedCourseId = ''
  const popular = [...pub].sort((a,b) => Number(b.featured)-Number(a.featured) || enrolCount(b.id)-enrolCount(a.id)).slice(0,4)
  $('#root').innerHTML = `<main class="app-shell course-app"><section class="app-frame course-page">
    <nav class="screen-tabs course-nav"><div class="brand-chip"><span class="brand-crown">${logo()}</span><div><strong>MEZZO</strong><small>Maths courses</small></div></div><div class="tab-scroll"><button class="screen-tab" data-target="home"><span>🏟️</span>Home</button><button class="screen-tab active" data-courses-page="true"><span>🎓</span>Courses</button><button class="screen-tab" data-course-dashboard="true"><span>📚</span>My learning</button></div></nav>
    <section class="course-catalog-intro"><div><span class="catalog-eyebrow">MEZZO LEARNING</span><h1>Find your next maths course</h1><p>Explore lessons, practice activities and challenges for your level.</p></div><div class="catalog-count"><strong>${pub.length}</strong><span>courses to explore</span></div></section>
    <div class="course-category-strip" role="group" aria-label="Course categories"><button data-course-category="" class="${!filters.category?'active':''}">All courses</button>${categories().map(cat=>`<button data-course-category="${h(cat)}" class="${filters.category===cat?'active':''}">${h(cat)}</button>`).join('')}</div>
    <section class="catalog-toolbar"><label class="catalog-search">Search courses<input data-course-filter="q" type="search" placeholder="Title, topic or instructor" value="${h(filters.q)}"></label><div class="course-filter-row"><label>Class<select data-course-filter="classLevel"><option value="">All classes</option>${classOpts(filters.classLevel)}</select></label><label>Access<select data-course-filter="access"><option value="">Free & paid</option><option value="free" ${filters.access==='free'?'selected':''}>Free</option><option value="paid" ${filters.access==='paid'?'selected':''}>Paid</option></select></label><label>Level<select data-course-filter="level"><option value="">All levels</option>${opts(LEVELS,filters.level)}</select></label><label>Sort<select data-course-filter="sort"><option value="newest" ${filters.sort==='newest'?'selected':''}>Newest</option><option value="popular" ${filters.sort==='popular'?'selected':''}>Popular</option><option value="rating" ${filters.sort==='rating'?'selected':''}>Top rated</option></select></label></div></section>
    ${cloudError ? `<div class="course-cloud-notice">${h(cloudError)} <button data-reload-courses="true">Retry</button></div>` : ''}
    ${!cloudReady&&supabase ? '<div class="course-cloud-notice">Loading courses…</div>' : ''}
    ${!filters.q&&!filters.category&&!filters.classLevel&&!filters.access&&!filters.level&&popular.length?`<section class="catalog-section"><div class="catalog-section-head"><div><span>START HERE</span><h2>Popular courses</h2></div></div><div class="course-grid">${popular.map(card).join('')}</div></section>`:''}
    <section class="catalog-section"><div class="catalog-section-head"><div><span>COURSE LIBRARY</span><h2>${filters.category?h(filters.category):'All courses'}</h2></div><small>${shown.length} available</small></div><div class="course-grid">${shown.map(card).join('') || '<div class="empty-course light-card"><h2>No matching courses</h2><p>Try another search or filter.</p></div>'}</div></section>
    ${(isAdmin()||isTeacher())?analytics():''}</section></main>`
}
function card(c){
  const rating = avgRating(c.id), image = /^https:\/\//i.test(c.cover_image || '')
  return `<article class="course-card catalog-card"><button class="catalog-cover" data-preview-course="${h(c.id)}" aria-label="View ${h(c.title)}">${image?`<img src="${h(c.cover_image)}" alt="" loading="lazy">`:`<span>${h(c.cover_icon||'🎓')}</span>`}<em>${h(c.course_level)}</em></button><div class="catalog-card-body"><span class="catalog-card-category">${h(c.category||'Mathematics')} · ${h(c.class_level)}</span><h3>${h(c.title)}</h3><p>${h(c.summary||'Explore this course and its lessons.')}</p><div class="catalog-instructor"><span>${h((c.instructor||'M').trim().charAt(0))}</span> By ${h(c.instructor||'Mezzo Maths Faculty')}</div><div class="catalog-rating">${rating?`★ ${rating}/5`:'New course'} <span>· ${enrolCount(c.id)} learners</span></div><div class="catalog-card-foot"><strong>${c.access_type==='paid'?`GHS ${h(c.price)}`:'Free'}</strong><button data-preview-course="${h(c.id)}">View course →</button></div></div></article>`
}
function renderPreview(cid){ const c = courses().find(x=>x.id===cid); if (!c) return renderCourses(); selectedCourseId=cid; const prereq = c.prerequisite_course_id ? courses().find(x=>x.id===c.prerequisite_course_id) : null; const rev = rows(K.reviews).filter(r=>r.course_id===cid); const action = canEnrol(c) ? `<button class="btn btn-gold" data-enrol-course="${cid}">${enrolled(cid)?'Continue Learning':'Self Enrol Now'}</button>` : c.access_type==='paid' ? `<p class="locked-warning">Paid checkout is being prepared. Enter a full-access coupon or ask an administrator for access.</p><form class="coupon-inline" data-coupon-form="${cid}"><input name="code" required placeholder="Coupon code"><button class="btn btn-ghost">Apply coupon</button></form>` : `<p class="locked-warning">Complete the prerequisite course to enrol.</p>`; $('#root').innerHTML = `<main class="app-shell course-app"><section class="app-frame course-page"><nav class="screen-tabs course-nav"><div class="brand-chip"><span class="brand-crown">${logo()}</span><div><strong>MEZZO</strong><small>Course Preview</small></div></div><div class="tab-scroll"><button class="screen-tab" data-courses-page="true"><span>🎓</span>Courses</button><button class="screen-tab" data-course-dashboard="true"><span>📚</span>My Courses</button></div></nav><section class="course-preview glass-card"><div class="course-preview-main"><span class="course-kicker">${c.access_type==='paid'?`Paid • GHS ${h(c.price)}`:'Free Course'} • ${h(c.class_level)}</span><h1>${h(c.cover_icon)} ${h(c.title)}</h1><p>${h(c.summary)}</p><div class="preview-meta"><span>👩🏾‍🏫 ${h(c.instructor)}</span><span>⏱️ ${h(c.duration)}</span><span>📚 ${allLessons(c).length} lessons</span><span>🧪 ${(c.final||[]).length + (c.chapters||[]).reduce((n,ch)=>n+(ch.quiz||[]).length,0)} assessments</span><span>⭐ ${avgRating(cid)||'No rating'}</span></div>${!prerequisiteMet(c)?`<div class="locked-warning">Prerequisite required: complete ${h(prereq?.title||'required course')} first.</div>`:''}<div class="course-actions">${action}</div></div><aside class="course-preview-side"><h3>What students will learn</h3>${bullets(c.outcomes)}<h3>Requirements</h3>${bullets(c.requirements)}</aside></section><section class="course-detail-grid"><article class="light-card"><h2>Chapter Outline</h2>${(c.chapters||[]).map((ch,i)=>`<div class="outline-row"><strong>${i+1}. ${h(ch.title)}</strong><span>${(ch.lessons||[]).length} lessons • ${(ch.quiz||[]).length} quiz • ${(ch.homework||[]).length} homework • ${(ch.classwork||[]).length} classwork</span></div>`).join('')}</article><article class="light-card"><h2>Reviews</h2>${rev.map(r=>`<p>⭐ ${r.rating}/5 — ${h(r.comment)} <small>${h(r.user)}</small></p>`).join('') || '<p>No reviews yet.</p>'}</article></section></section></main>` }
function bullets(txt){ const a = lines(txt); return a.length ? `<ul>${a.map(x=>`<li>${h(x)}</li>`).join('')}</ul>` : '<p>Not specified.</p>' }
async function enrolCourse(cid){
  const c=courses().find(x=>x.id===cid); if (!c || !canEnrol(c)) return renderPreview(cid)
  if (cloudReady) {
    const user=await authUser(); if(!user) return toast('Please sign in to save your course and progress.')
    if(c.access_type!=='free') return toast('Ask an administrator for access or redeem a full-access coupon.')
    const {error}=await supabase.from('course_enrollments').upsert({course_id:cid,student_id:user.id,student_email:user.email,progress_snapshot:{completed:[],quizScores:{},finalScore:null}},{onConflict:'course_id,student_id'})
    if(error) return toast(`Enrolment failed: ${error.message}`)
    cloudEnrollmentIds.add(cid)
  }
  const e=enrolments(); e[`${userKey()}_${cid}`]={course_id:cid,student:userKey(),enrolled_at:new Date().toISOString()}; save(K.enroll,e)
  notify('Enrolled in course.',cid); openCourse(cid)
}
function payCourse(cid){ notify('Course payment checkout is prepared. Backend Paystack course-product support is pending; use subscription, coupon, or admin grant now.', cid); $('[data-open-subscriptions]')?.click() }
async function applyCoupon(cid, form){ const code=String(new FormData(form).get('code')||'').toUpperCase().trim(); if(cloudReady){ if(!await authUser()) return toast('Sign in to redeem a coupon.'); const {error}=await supabase.rpc('redeem_course_coupon',{p_course_id:cid,p_code:code}); if(error) return toast(error.message); await loadCloudCourses(); notify('Coupon applied. Course unlocked.',cid); renderPreview(cid); return } if(supabase) return toast('Course database is unavailable.'); const cp=rows(K.coupons).find(x=>x.active && x.code===code && (x.course_id===cid || x.course_id==='all')); if(!cp) return toast('Invalid coupon.'); saveRows(K.purchases,[{id:id('purchase'),course_id:cid,user:userKey(),amount:0,coupon:code,status:'success',paid_at:new Date().toISOString()},...rows(K.purchases)]); notify('Coupon applied. Course unlocked.',cid); renderPreview(cid) }
function chapterLocked(c,ci){ if(ci===0) return false; const ch=c.chapters?.[ci]; if(c.drip_mode==='date' && ch?.unlock_date && new Date(ch.unlock_date)>new Date()) return true; if(c.drip_mode==='chapter'){ const p=progress(c.id), prev=c.chapters?.[ci-1]; return !(prev?.lessons||[]).every((_,li)=>(p.completed||[]).includes(`${ci-1}-${li}`)) } return false }
async function openCourse(cid){ if(!canStaffOpen()) return toast('Courses locked for staff.'); if(!enrolled(cid)) return renderPreview(cid); if(cloudReady && !await loadContent(cid)) return; selectedCourseId=cid; chapterIndex=0; lessonIndex=0; renderViewer() }
function lessonHtml(l){ const url=l.video_url||l.resource_url||''; const embed=/youtube|youtu\.be|vimeo/i.test(url)?`<iframe class="lesson-embed" src="${h(url.replace('watch?v=','embed/'))}" allowfullscreen></iframe>`:''; const audio=l.audio_url|| (l.type==='Audio Lesson'?url:''); const audioHtml=audio?`<audio controls src="${h(audio)}"></audio>`:''; const image=l.image_url||(/\.(png|jpg|jpeg|webp|gif)$/i.test(url)?url:''); const imageHtml=image?`<img class="lesson-image" src="${h(image)}" alt="Lesson diagram">`:''; return `<p>${h(l.content||'No lesson notes yet.')}</p>${embed}${audioHtml}${imageHtml}${l.interactive?`<section class="interactive-lesson-box"><h3>Interactive Lesson</h3><p>${h(l.interactive)}</p><textarea placeholder="Student response / working area"></textarea></section>`:''}${l.homework?`<section class="trial-box"><h3>Lesson Homework Trial</h3><p>${h(l.homework)}</p></section>`:''}${l.classwork?`<section class="trial-box"><h3>Lesson Classwork Trial</h3><p>${h(l.classwork)}</p></section>`:''}${l.video_url?`<a class="course-resource" href="${h(l.video_url)}" target="_blank">▶ Open Video</a>`:''}${l.resource_url?`<a class="course-resource" href="${h(l.resource_url)}" target="_blank">📄 Open Resource/PDF</a>`:''}` }
function renderViewer(){ const c=courses().find(x=>x.id===selectedCourseId); if(!c) return renderCourses(); const ch=c.chapters[chapterIndex]||c.chapters[0], l=ch.lessons[lessonIndex]||ch.lessons[0], p=progress(c.id), done=(p.completed||[]).includes(`${chapterIndex}-${lessonIndex}`), ok=completed(c); $('#root').innerHTML=`<main class="app-shell course-app"><section class="app-frame course-page"><nav class="screen-tabs course-nav"><div class="brand-chip"><span class="brand-crown">${logo()}</span><div><strong>MEZZO</strong><small>Course Lessons</small></div></div><div class="tab-scroll"><button class="screen-tab" data-courses-page="true"><span>🎓</span>Courses</button><button class="screen-tab" data-course-dashboard="true"><span>📚</span>My Courses</button></div></nav><section class="course-view-layout"><aside class="course-outline glass-card"><button class="btn btn-ghost" data-preview-course="${c.id}">← Course Preview</button><h2>${h(c.title)}</h2><p>${h(c.class_level)} • ${c.access_type==='paid'?`Paid GHS ${h(c.price)}`:'Free Course'}</p><div class="course-progress big"><i style="width:${pct(c)}%"></i></div>${c.chapters.map((chapter,ci)=>chapterNav(c,chapter,ci,p)).join('')}<button class="btn btn-blue" data-final-assessment="true">Final Assessment</button><button class="btn btn-gold" data-generate-certificate="true">${ok.ok?'Generate Certificate':'Certificate Locked'}</button></aside><article class="lesson-view light-card"><span class="course-kicker">${h(l.type)} • ${h(ch.title)}</span><h1>${h(l.title)}</h1>${lessonHtml(l)}<div class="course-actions"><button class="btn btn-gold" data-complete-lesson="${chapterIndex}-${lessonIndex}">${done?'Completed ✓':'Mark Lesson Complete'}</button><button class="btn btn-primary" data-next-lesson="true">Next Lesson ▶</button></div>${(c.announcements||[]).filter(a=>a.status==='published'&&a.message).map(a=>`<section class="course-announcement light-card"><h3>Announcement</h3><p>${h(a.message)}</p></section>`).join('')}${discussion(c.id,chapterIndex,lessonIndex)}${reviewForm(c.id)}</article></section></section></main>` }
function chapterNav(c,ch,ci,p){ const locked=chapterLocked(c,ci); return `<div class="chapter-group ${locked?'locked':''}"><button class="chapter-link ${ci===chapterIndex?'active':''}" data-chapter-index="${ci}" ${locked?'data-locked-chapter="true"':''}>📖 ${h(ch.title)}</button>${locked?'<small>🔒 Locked</small>':`${(ch.lessons||[]).map((l,li)=>`<button class="lesson-link ${ci===chapterIndex&&li===lessonIndex?'active':''} ${(p.completed||[]).includes(`${ci}-${li}`)?'done':''}" data-chapter-index="${ci}" data-lesson-index="${li}"><b>${(p.completed||[]).includes(`${ci}-${li}`)?'✓':li+1}</b><span>${h(l.title)}</span></button>`).join('')}<button class="chapter-tool" data-open-chapter-quiz="${ci}">🧪 Chapter Quiz</button><button class="chapter-tool" data-open-homework="${ci}">🏠 Homework</button><button class="chapter-tool" data-open-classwork="${ci}">🏫 Classwork</button>`}</div>` }
function completeLesson(key){ const p=progress(selectedCourseId); if(!p.completed.includes(key)) p.completed.push(key); setProgress(selectedCourseId,p); notify('Lesson completed.',selectedCourseId); renderViewer() }
function nextLesson(){ const c=courses().find(x=>x.id===selectedCourseId), ch=c?.chapters?.[chapterIndex]; if(!c) return; if(lessonIndex+1<(ch?.lessons||[]).length) lessonIndex++; else if(chapterIndex+1<c.chapters.length && !chapterLocked(c,chapterIndex+1)){ chapterIndex++; lessonIndex=0 } renderViewer() }
function assessment(type, ref){ const c=courses().find(x=>x.id===selectedCourseId); const qs=type==='final'?(c.final||[]):((c.chapters?.[Number(ref)]?.quiz)||[]); if(!qs.length) return toast('No assessment added yet.'); save(`lms_assess_${type}_${ref}`,{}); $('#root').innerHTML=`<main class="app-shell course-app"><section class="app-frame course-page"><section class="chapter-quiz-card light-card"><span class="course-kicker">${type==='final'?'🏁 Final':'🧪 Chapter Quiz'}</span><h1>${type==='final'?'Final Course Assessment':h(c.chapters[ref].title)}</h1>${qs.map((q,i)=>`<article class="chapter-quiz-question"><h3>${i+1}. ${h(q.q)}</h3>${q.options.map((o,oi)=>`<button data-assessment-answer="${String.fromCharCode(65+oi)}" data-assessment-index="${i}" data-assessment-type="${type}" data-assessment-ref="${ref}"><b>${String.fromCharCode(65+oi)}</b>${h(o)}</button>`).join('')}<small>${h(q.explanation||'')}</small></article>`).join('')}<button class="btn btn-gold" data-submit-assessment="${type}" data-assessment-ref="${ref}">Submit Assessment</button><button class="btn btn-primary" data-return-course="true">Back to Lesson</button></section></section></main>` }
function submitAssessment(type,ref){ const c=courses().find(x=>x.id===selectedCourseId), qs=type==='final'?(c.final||[]):((c.chapters?.[Number(ref)]?.quiz)||[]), a=read(`lms_assess_${type}_${ref}`,{}); let correct=0; qs.forEach((q,i)=>{ if(a[i]===q.answer) correct++ }); const score=qs.length?Math.round((correct/qs.length)*100):0, p=progress(c.id); if(type==='final') p.finalScore=score; else { p.quizScores ||= {}; p.quizScores[ref]=score } setProgress(c.id,p); notify(`${type==='final'?'Final assessment':'Chapter quiz'} completed: ${score}%`,c.id); renderViewer() }
function renderTrial(type,ci){ const c=courses().find(x=>x.id===selectedCourseId), ch=c?.chapters?.[Number(ci)], tasks=ch?.[type]||[]; $('#root').innerHTML=`<main class="app-shell course-app"><section class="app-frame course-page"><section class="chapter-quiz-card light-card"><span class="course-kicker">${type==='homework'?'🏠 Homework':'🏫 Classwork'} Trials</span><h1>${h(ch?.title||'Chapter')}</h1>${tasks.length?tasks.map((t,i)=>`<form class="trial-list-item" data-trial-form="${type}-${ci}-${i}"><h3>${i+1}. ${h(t.title)}</h3><p>${h(t.instructions)} ${t.due?`Due: ${h(t.due)}`:''}</p><textarea name="response" placeholder="Student answer / working area"></textarea><input name="file" type="file" accept="image/*,.pdf"><button class="btn btn-gold" type="button" data-submit-trial="${type}" data-trial-chapter="${ci}" data-trial-index="${i}">Submit</button></form>`).join(''):'<p>No trial added yet.</p>'}<button class="btn btn-primary" data-return-course="true">Back to Lesson</button></section></section></main>` }
function saveTrial(type,ci,ti,response,file){ saveRows(K.submissions,[{id:id('submission'),course_id:selectedCourseId,chapter:Number(ci),trial_index:Number(ti),trial_type:type,user:userKey(),response,file,status:'submitted',teacher_comment:'',score:'',submitted_at:new Date().toISOString()},...rows(K.submissions)]); notify(`${type} submitted.`,selectedCourseId) }
function submitTrial(type,ci,ti){ const form=$(`[data-trial-form="${type}-${ci}-${ti}"]`), fd=new FormData(form), file=fd.get('file'); if(file&&file.name){ const r=new FileReader(); r.onload=()=>saveTrial(type,ci,ti,fd.get('response'),{name:file.name,data:r.result}); r.readAsDataURL(file) } else saveTrial(type,ci,ti,fd.get('response'),null) }
function discussion(cid,ci,li){ const r=rows(K.discussions).filter(d=>d.course_id===cid&&d.chapter===ci&&d.lesson===li); return `<section class="course-discussion"><h3>Lesson Q&A</h3>${r.map(d=>`<p><strong>${h(d.user)}:</strong> ${h(d.comment)}</p>`).join('')||'<p>No questions yet.</p>'}<form data-discussion-form="true"><input name="comment" placeholder="Ask a question"><button class="btn btn-blue">Post</button></form></section>` }
function saveDiscussion(form){ const comment=new FormData(form).get('comment'); if(!comment) return; saveRows(K.discussions,[{id:id('discussion'),course_id:selectedCourseId,chapter:chapterIndex,lesson:lessonIndex,user:userKey(),role:profile().role||'student',comment,parent_id:'',created_at:new Date().toISOString()},...rows(K.discussions)]); renderViewer(); notify('Lesson question posted.',selectedCourseId) }
function reviewForm(cid){ if(!enrolled(cid)) return ''; return `<section class="course-review-form"><h3>Rate this course</h3><form data-review-form="${cid}"><select name="rating"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select><input name="comment" placeholder="Write review"><button class="btn btn-gold">Submit Review</button></form></section>` }
async function saveReview(form,cid){ const f=Object.fromEntries(new FormData(form).entries()); if(cloudReady){ const user=await authUser(); if(!user) return toast('Please sign in to review this course.'); const {error}=await supabase.from('course_reviews').insert({course_id:cid,student_id:user.id,student_email:user.email,rating:Number(f.rating||5),comment:f.comment||''}); if(error) return toast(error.message); await loadCloudCourses() } else saveRows(K.reviews,[{id:id('review'),course_id:cid,user:userKey(),rating:Number(f.rating||5),comment:f.comment||'',created_at:new Date().toISOString()},...rows(K.reviews)]); notify('Course review submitted.',cid); renderViewer() }
function certificate(){ const c=courses().find(x=>x.id===selectedCourseId), ok=completed(c); if(!ok.ok) return toast('Certificate locked. Complete the course requirements first.'); let cert=rows(K.certs).find(x=>x.user===userKey()&&x.course_id===c.id); if(!cert){ cert={id:id('cert'),cert_no:`MEZZO-${Date.now()}`,user:userKey(),student:profile().full_name||userKey(),course_id:c.id,course_title:c.title,class_level:c.class_level,score:ok.finalScore||'',completed_at:new Date().toISOString()}; saveRows(K.certs,[cert,...rows(K.certs)]); notify('Certificate ready.',c.id) } const html=`<!doctype html><html><head><title>Certificate</title><style>body{font-family:Arial;text-align:center;padding:60px}.cert{border:12px solid #1d4ed8;padding:60px}h1{font-size:42px;color:#1d4ed8}h2{font-size:34px}</style></head><body><section class="cert"><div style="font-size:60px">${logo()}</div><h1>Mezzo Maths Course Completion Certificate</h1><p>This certifies that</p><h2>${h(cert.student)}</h2><p>has completed</p><h2>${h(c.title)}</h2><p>${h(c.class_level)} • ${new Date(cert.completed_at).toLocaleDateString()}</p><p>Certificate ID: ${h(cert.cert_no)}</p><p>Score/Grade: ${h(cert.score||'Completed')}</p></section><script>window.print()</script></body></html>`; const w=window.open('','_blank'); if(w){ w.document.write(html); w.document.close() } }
function dashboard(){ const e=Object.values(enrolments()).filter(x=>x.student===userKey()), my=e.map(x=>courses().find(c=>c.id===x.course_id)).filter(Boolean), cs=rows(K.certs).filter(c=>c.user===userKey()), ns=rows(K.notifications).filter(n=>n.user===userKey()||n.role==='admin').slice(0,8); $('#root').innerHTML=`<main class="app-shell course-app"><section class="app-frame course-page"><nav class="screen-tabs course-nav"><div class="brand-chip"><span class="brand-crown">${logo()}</span><div><strong>MEZZO</strong><small>Student Course Dashboard</small></div></div><div class="tab-scroll"><button class="screen-tab" data-courses-page="true"><span>🎓</span>Courses</button><button class="screen-tab active" data-course-dashboard="true"><span>📚</span>My Courses</button><button class="screen-tab" data-target="dashboard"><span>👤</span>Dashboard</button></div></nav><section class="course-dashboard-grid"><article class="glass-card"><h2>Enrolled Courses</h2>${my.map(c=>`<div class="dash-course-row"><strong>${h(c.title)}</strong><span>${pct(c)}% complete • Final: ${progress(c.id).finalScore ?? 'Not taken'}</span><button class="btn btn-blue btn-small" data-enrol-course="${c.id}">Continue</button></div>`).join('')||'<p>No enrolled courses yet.</p>'}</article><article class="glass-card"><h2>Certificates</h2>${cs.map(c=>`<p>🏆 ${h(c.course_title)} — ${h(c.cert_no)}</p>`).join('')||'<p>No certificates yet.</p>'}</article><article class="glass-card"><h2>Notifications</h2>${ns.map(n=>`<p>🔔 ${h(n.message)}</p>`).join('')||'<p>No notifications.</p>'}</article><article class="glass-card"><h2>Recommended Next Courses</h2>${courses().filter(c=>!enrolled(c.id)&&c.status!=='draft').slice(0,3).map(c=>`<p>${h(c.title)} <button class="btn btn-ghost btn-small" data-preview-course="${c.id}">View</button></p>`).join('')}</article></section></section></main>` }
function downloadAnalytics(){ const data=[['Course','Class','Access','Price','Enrolled','Completion','Rating','Revenue'],...courses().map(c=>[c.title,c.class_level,c.access_type,c.price,enrolCount(c.id),pct(c),avgRating(c.id),rows(K.purchases).filter(p=>p.course_id===c.id&&p.status==='success').reduce((n,p)=>n+Number(p.amount||0),0)])]; const csv=data.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv'}), url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download='mezzo-course-analytics.csv'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),700) }
function sync(){ if(queued) return; queued=true; requestAnimationFrame(()=>{ queued=false; installButtons(); adminPanel() }) }

document.addEventListener('submit', e=>{ if(e.target?.getAttribute('id')==='courseAdminForm'){ e.preventDefault(); e.stopImmediatePropagation(); saveCourse(e.target) } if(e.target?.id==='courseCouponForm'){ e.preventDefault(); saveCoupon(e.target) } if(e.target?.id==='courseGrantForm'){ e.preventDefault(); saveGrant(e.target) } if(e.target?.matches('[data-discussion-form]')){ e.preventDefault(); saveDiscussion(e.target) } const r=e.target?.closest('[data-review-form]'); if(r){ e.preventDefault(); saveReview(e.target,r.dataset.reviewForm) } const cp=e.target?.closest('[data-coupon-form]'); if(cp){ e.preventDefault(); applyCoupon(cp.dataset.couponForm,cp) } }, true)
document.addEventListener('click', async e=>{ if(e.target.closest('[data-courses-page]')){ e.preventDefault(); e.stopImmediatePropagation(); renderCourses(); return } if(e.target.closest('[data-course-dashboard]')){ e.preventDefault(); e.stopImmediatePropagation(); dashboard(); return } const prev=e.target.closest('[data-preview-course]'); if(prev){ e.preventDefault(); renderPreview(prev.dataset.previewCourse); return } const en=e.target.closest('[data-enrol-course]'); if(en){ e.preventDefault(); enrolled(en.dataset.enrolCourse)?openCourse(en.dataset.enrolCourse):enrolCourse(en.dataset.enrolCourse); return } const pay=e.target.closest('[data-pay-course]'); if(pay){ e.preventDefault(); payCourse(pay.dataset.payCourse); return } const edit=e.target.closest('[data-edit-course]'); if(edit){ if (cloudReady && !await loadContent(edit.dataset.editCourse)) return; editingCourseId=edit.dataset.editCourse; $('[data-course-admin-panel]')?.remove(); adminPanel(); return } if(e.target.closest('[data-reload-courses]')){ cloudReady=false; cloudError=''; await loadCloudCourses(); return } if(e.target.closest('[data-import-local-courses]')){ if(!isAdmin() || !cloudReady) return; const legacy=rows(K.courses); if(!confirm(`Import ${legacy.length} browser courses to Supabase? Review and remove placeholders first.`)) return; const imported=read('mezzo_course_import_map',{}); for(const item of legacy){ if(imported[item.id]) continue; try{ imported[item.id]=await saveCloudCourse(normal(item)); save('mezzo_course_import_map',imported) } catch(error){ return toast(`Import stopped: ${error.message}`) } } saveRows(K.courses,[]); await loadCloudCourses(); $('[data-course-admin-panel]')?.remove(); adminPanel(); toast('Browser courses imported.'); return } const del=e.target.closest('[data-delete-course]'); if(del){ if(confirm('Delete this course?')){ if (cloudReady) { const {error}=await supabase.from('course_sessions').delete().eq('id',del.dataset.deleteCourse); if(error) return toast(error.message); await loadCloudCourses() } else saveCourses(courses().filter(c=>c.id!==del.dataset.deleteCourse)); $('[data-course-admin-panel]')?.remove(); adminPanel(); toast('Course deleted.') } return } if(e.target.closest('[data-cancel-course-edit]')){ editingCourseId=''; $('[data-course-admin-panel]')?.remove(); adminPanel(); return } if(e.target.closest('[data-locked-chapter]')){ toast('This chapter is locked.'); return } const lesson=e.target.closest('[data-lesson-index]'); if(lesson){ chapterIndex=Number(lesson.dataset.chapterIndex); lessonIndex=Number(lesson.dataset.lessonIndex); renderViewer(); return } const ch=e.target.closest('[data-chapter-index]'); if(ch && !lesson){ chapterIndex=Number(ch.dataset.chapterIndex); lessonIndex=0; renderViewer(); return } const complete=e.target.closest('[data-complete-lesson]'); if(complete){ completeLesson(complete.dataset.completeLesson); return } if(e.target.closest('[data-next-lesson]')){ nextLesson(); return } const q=e.target.closest('[data-open-chapter-quiz]'); if(q){ assessment('chapter',q.dataset.openChapterQuiz); return } if(e.target.closest('[data-final-assessment]')){ assessment('final','final'); return } const hw=e.target.closest('[data-open-homework]'); if(hw){ renderTrial('homework',hw.dataset.openHomework); return } const cw=e.target.closest('[data-open-classwork]'); if(cw){ renderTrial('classwork',cw.dataset.openClasswork); return } const tr=e.target.closest('[data-submit-trial]'); if(tr){ submitTrial(tr.dataset.submitTrial,tr.dataset.trialChapter,tr.dataset.trialIndex); return } const a=e.target.closest('[data-assessment-answer]'); if(a){ const k=`lms_assess_${a.dataset.assessmentType}_${a.dataset.assessmentRef}`, v=read(k,{}); v[a.dataset.assessmentIndex]=a.dataset.assessmentAnswer; save(k,v); a.closest('.chapter-quiz-question')?.querySelectorAll('button').forEach(b=>b.classList.remove('selected')); a.classList.add('selected'); return } const sub=e.target.closest('[data-submit-assessment]'); if(sub){ submitAssessment(sub.dataset.submitAssessment,sub.dataset.assessmentRef); return } if(e.target.closest('[data-return-course]')){ renderViewer(); return } if(e.target.closest('[data-generate-certificate]')){ certificate(); return } if(e.target.closest('[data-download-course-analytics]')){ downloadAnalytics(); return } }, true)
document.addEventListener('input', e=>{ const f=e.target.closest('[data-course-filter]'); if(!f || f.tagName !== 'INPUT') return; filters[f.dataset.courseFilter]=f.value; const pos=f.selectionStart; renderCourses(); const next=$('[data-course-filter=\"q\"]'); next?.focus(); next?.setSelectionRange(pos,pos) })
document.addEventListener('change', e=>{ const f=e.target.closest('[data-course-filter]'); if(!f || f.tagName === 'INPUT') return; filters[f.dataset.courseFilter]=f.value; renderCourses() })
document.addEventListener('input', e=>{ const form=e.target.closest('#courseAdminForm'); if(form) rememberCourseDraft(form) }, true)
document.addEventListener('change', e=>{ const form=e.target.closest('#courseAdminForm'); if(form) rememberCourseDraft(form) }, true)
document.addEventListener('click', e=>{ const b=e.target.closest('[data-course-category]'); if(!b) return; filters.category=b.dataset.courseCategory; renderCourses() }, true)
const observer=new MutationObserver(sync)
observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:false})
window.addEventListener('load',sync)
window.addEventListener('storage',sync)
setTimeout(sync,350)

loadCloudCourses()
supabase?.auth.onAuthStateChange(() => { setTimeout(loadCloudCourses,0) })
