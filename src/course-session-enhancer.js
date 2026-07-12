import './course-session.css'

const COURSES_KEY = 'mezzo_courses_bank'
const ENROLL_KEY = 'mezzo_course_enrollments'
const PROGRESS_KEY = 'mezzo_course_progress'
const ACCESS_KEY = 'mezzo_staff_access'
const DEFAULT_ACCESS = { courses: true }
const CLASSES = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','SHS 1','SHS 2','SHS 3']
let queued = false
let selectedCourseId = ''
let activeChapterIndex = 0
let activeLessonIndex = 0
let editingCourseId = ''

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
function uid() { return `course_${Date.now()}_${Math.random().toString(16).slice(2)}` }
function profile() { return readJson('mezzo_profile', null) || {} }
function isAdmin() { return profile().role === 'admin' }
function isStaff() { return profile().role === 'mezzo_staff' }
function staffAccess() { return { ...DEFAULT_ACCESS, ...readJson(ACCESS_KEY, DEFAULT_ACCESS) } }
function canOpenCourses() { return !isStaff() || staffAccess().courses !== false }
function saveCourses(list) { saveJson(COURSES_KEY, list) }
function enrollments() { return readJson(ENROLL_KEY, {}) }
function progress() { return readJson(PROGRESS_KEY, {}) }
function subscriptions() { return readJson('mezzo_subscription', null) }
function isSubscribed() { const sub = subscriptions(); return Boolean(sub?.active && (!sub.expires_at || new Date(sub.expires_at) > new Date())) }
function profileId() { const p = profile(); return p.email || p.full_name || 'demo-student' }
function currentClass() { return profile().class_level || 'Grade 8' }
function classOptions(selected) { return CLASSES.map(c => `<option value="${c}" ${c === selected ? 'selected' : ''}>${c}</option>`).join('') }
function toast(message) { const old = document.querySelector('.course-toast'); if (old) old.remove(); const node = document.createElement('div'); node.className = 'course-toast'; node.textContent = message; document.body.appendChild(node); setTimeout(() => node.remove(), 4200) }
function legacyToChapters(course) {
  if (course.chapters?.length) return course
  const lessons = course.lessons?.length ? course.lessons : [{ title: 'Course Introduction', type: 'Text Lesson', content: 'Add lesson notes, video links and resource links from the admin panel.', interactive: 'Answer the quick check after reading the notes.', homework: 'Revise this lesson and write two examples.', classwork: 'Solve three practice questions in class.', video_url: '', resource_url: '' }]
  return { ...course, access_type: course.access_type || 'free', price: course.price || 0, chapters: [{ title: 'Chapter 1', lessons, quiz: [], homework: [], classwork: [] }] }
}
function seedCourses(existing) {
  if (existing.length) return existing.map(legacyToChapters)
  const starter = [
    { id: uid(), title: 'Multiplication Mastery Basics', class_level: 'Grade 4', category: 'Number Work', duration: '2 hours', status: 'published', access_type: 'free', price: 0, cover_icon: '✖️', summary: 'Self-paced lessons on multiplication facts, arrays, classwork trials and word problems.', chapters: [{ title: 'Understanding Multiplication', lessons: [{ title: 'Equal Groups', type: 'Interactive Lesson', content: 'Multiplication means equal groups. Example: 4 groups of 3 means 4 × 3 = 12.', interactive: 'Drag or count equal groups in your book, then type the total.', homework: 'Create 5 equal-group examples at home.', classwork: 'Solve 10 multiplication drills with your teacher.', video_url: '', resource_url: '' }], quiz: [{ q: 'What is 4 × 3?', options: ['7','10','12','16'], answer: 'C', explanation: '4 groups of 3 gives 12.' }], homework: [{ title: 'Home Trial', instructions: 'Write the 2, 3, 4 and 5 times tables.' }], classwork: [{ title: 'Class Trial', instructions: 'Complete a 10-question multiplication speed drill.' }] }] },
    { id: uid(), title: 'BECE Percentages Quick Course', class_level: 'Grade 9', category: 'BECE Prep', duration: '3 hours', status: 'published', access_type: 'paid', price: 35, cover_icon: '📊', summary: 'A paid short course on percentages, discounts, profit, loss and BECE exam-style percentage questions.', chapters: [{ title: 'Percentages for BECE', lessons: [{ title: 'Percent of a Quantity', type: 'Interactive Lesson', content: 'To find a percentage of a number, divide by 100 and multiply. Example: 20% of 250 = 20/100 × 250 = 50.', interactive: 'Try changing the percent and quantity, then calculate the answer before checking.', homework: 'Solve 10 percentage-of-quantity questions.', classwork: 'Pair work: explain discount calculation to a friend.', video_url: '', resource_url: '' }], quiz: [{ q: 'Find 20% of 250.', options: ['25','40','50','60'], answer: 'C', explanation: '20/100 × 250 = 50.' }], homework: [{ title: 'BECE Homework Trial', instructions: 'Solve 10 percentage questions from your workbook.' }], classwork: [{ title: 'BECE Classwork Trial', instructions: 'Complete a timed 5-question percentage drill.' }] }] }
  ]
  saveCourses(starter)
  return starter
}
function courses() { return seedCourses(readJson(COURSES_KEY, [])) }
function allLessons(course) { return (course.chapters || []).flatMap((chapter, ci) => (chapter.lessons || []).map((lesson, li) => ({ ...lesson, ci, li, chapter: chapter.title }))) }
function courseProgress(courseId) { return progress()[`${profileId()}_${courseId}`] || { completed: [], quizScores: {}, homeworkDone: [], classworkDone: [] } }
function enrolled(courseId) { return Boolean(enrollments()[`${profileId()}_${courseId}`]) }
function paidLocked(course) { return course.access_type === 'paid' && !isSubscribed() && !enrolled(course.id) }
function percentComplete(course) { const p = courseProgress(course.id); const total = Math.max(1, allLessons(course).length); return Math.round(((p.completed || []).length / total) * 100) }
function courseSetupText(course) {
  return (course.chapters || []).map((chapter, ci) => {
    const lines = [`CHAPTER: ${chapter.title || `Chapter ${ci + 1}`}`]
    ;(chapter.lessons || []).forEach(l => lines.push(`LESSON: ${l.title || ''}|${l.type || 'Interactive Lesson'}|${l.content || ''}|${l.video_url || ''}|${l.resource_url || ''}|${l.interactive || ''}|${l.homework || ''}|${l.classwork || ''}`))
    ;(chapter.quiz || []).forEach(q => lines.push(`QUIZ: ${q.q || ''}|${q.options?.[0] || ''}|${q.options?.[1] || ''}|${q.options?.[2] || ''}|${q.options?.[3] || ''}|${q.answer || 'A'}|${q.explanation || ''}`))
    ;(chapter.homework || []).forEach(h => lines.push(`HOMEWORK: ${h.title || ''}|${h.instructions || ''}`))
    ;(chapter.classwork || []).forEach(c => lines.push(`CLASSWORK: ${c.title || ''}|${c.instructions || ''}`))
    return lines.join('\n')
  }).join('\n')
}
function parseCourseSetup(value = '') {
  const lines = String(value).split('\n').map(x => x.trim()).filter(Boolean)
  const chapters = []
  let current = null
  function ensureChapter() { if (!current) { current = { title: `Chapter ${chapters.length + 1}`, lessons: [], quiz: [], homework: [], classwork: [] }; chapters.push(current) } return current }
  lines.forEach(line => {
    if (/^chapter:/i.test(line)) { current = { title: line.replace(/^chapter:/i, '').trim() || `Chapter ${chapters.length + 1}`, lessons: [], quiz: [], homework: [], classwork: [] }; chapters.push(current); return }
    const chapter = ensureChapter()
    if (/^lesson:/i.test(line)) { const [title, type, content, video_url, resource_url, interactive, homework, classwork] = line.replace(/^lesson:/i, '').split('|').map(x => (x || '').trim()); chapter.lessons.push({ title: title || 'Untitled Lesson', type: type || 'Interactive Lesson', content: content || '', video_url: video_url || '', resource_url: resource_url || '', interactive: interactive || '', homework: homework || '', classwork: classwork || '' }); return }
    if (/^quiz:/i.test(line)) { const [q, a, b, c, d, answer, explanation] = line.replace(/^quiz:/i, '').split('|').map(x => (x || '').trim()); chapter.quiz.push({ q: q || 'Quiz question', options: [a || 'A', b || 'B', c || 'C', d || 'D'], answer: (answer || 'A').toUpperCase().slice(0, 1), explanation: explanation || '' }); return }
    if (/^homework:/i.test(line)) { const [title, instructions] = line.replace(/^homework:/i, '').split('|').map(x => (x || '').trim()); chapter.homework.push({ title: title || 'Homework Trial', instructions: instructions || '' }); return }
    if (/^classwork:/i.test(line)) { const [title, instructions] = line.replace(/^classwork:/i, '').split('|').map(x => (x || '').trim()); chapter.classwork.push({ title: title || 'Classwork Trial', instructions: instructions || '' }); return }
  })
  return chapters.length ? chapters : [{ title: 'Chapter 1', lessons: [{ title: 'Course Introduction', type: 'Interactive Lesson', content: 'Add lesson notes, video links and resource links.', interactive: 'Write one thing you learnt.', homework: 'Complete the homework trial.', classwork: 'Complete the classwork trial.', video_url: '', resource_url: '' }], quiz: [], homework: [], classwork: [] }]
}
function installCourseNav() {
  document.querySelectorAll('.tab-scroll').forEach(nav => {
    if (nav.querySelector('[data-courses-page]')) return
    const btn = document.createElement('button')
    btn.className = 'screen-tab course-nav-button'
    btn.type = 'button'
    btn.dataset.coursesPage = 'true'
    btn.innerHTML = '<span>🎓</span>Courses'
    const subscription = nav.querySelector('[data-subscription-nav-button]')
    const auth = nav.querySelector('[data-target="auth"]')
    if (subscription) subscription.insertAdjacentElement('beforebegin', btn)
    else if (auth) auth.insertAdjacentElement('beforebegin', btn)
    else nav.appendChild(btn)
  })
}
function installCourseHomeCard() {
  const grid = document.querySelector('.home-screen .home-mode-grid')
  if (!grid || grid.querySelector('.course-home-card')) return
  grid.insertAdjacentHTML('beforeend', `<button class="home-mode-card game-mode-card course-home-card" data-courses-page="true"><i class="mode-shine"></i><div class="mode-top"><span class="mode-icon">🎓</span><em>Self Enrol</em></div><h3>Course Sessions</h3><p>Self-taught free and paid courses with chapters, lessons, quizzes, homework and classwork trials.</p><div class="reward-pill">📚 Learn at your pace</div><strong>OPEN COURSES →</strong></button>`)
}
function installAdminCoursePanel() { if (!isAdmin()) return; const admin = document.querySelector('.admin-screen'); if (!admin || admin.querySelector('[data-course-admin-panel]')) return; const target = admin.querySelector('[data-admin-brand-staff-panel]') || admin.querySelector('.dashboard-hero') || admin.firstElementChild; target?.insertAdjacentHTML('afterend', courseAdminHtml()) }
function courseAdminHtml() {
  const list = courses()
  const edit = editingCourseId ? list.find(c => c.id === editingCourseId) : null
  const setupText = edit ? courseSetupText(edit) : 'CHAPTER: Chapter 1 - Introduction\nLESSON: Lesson 1|Interactive Lesson|Type the lesson notes here|https://video-link.com|https://resource-link.com|Interactive activity instruction|Homework instruction|Classwork instruction\nQUIZ: What is 2 + 3?|4|5|6|7|B|2 + 3 = 5\nHOMEWORK: Homework Trial 1|Solve the assigned practice questions at home.\nCLASSWORK: Classwork Trial 1|Complete this class activity during the lesson.'
  return `<section class="course-admin-panel glass-card" data-course-admin-panel="true"><div class="course-admin-head"><div><span>🎓 Course Session Admin</span><h2>Mount Self-Taught Courses</h2><p>Create free or paid courses with chapters, interactive lessons, chapter quizzes, homework trials and classwork trials.</p></div><button class="btn btn-blue" type="button" data-courses-page="true">Preview Courses</button></div><form id="courseAdminForm" class="course-admin-form"><input type="hidden" name="id" value="${escapeHtml(edit?.id || '')}"><label><span>Course Title</span><input name="title" required value="${escapeHtml(edit?.title || '')}" placeholder="e.g. Fractions Mastery"></label><label><span>Class</span><select name="class_level">${classOptions(edit?.class_level || 'Grade 8')}</select></label><label><span>Category</span><input name="category" value="${escapeHtml(edit?.category || '')}" placeholder="e.g. Algebra"></label><label><span>Duration</span><input name="duration" value="${escapeHtml(edit?.duration || '')}" placeholder="e.g. 3 hours"></label><label><span>Course Access</span><select name="access_type"><option value="free" ${edit?.access_type !== 'paid' ? 'selected' : ''}>Free Course</option><option value="paid" ${edit?.access_type === 'paid' ? 'selected' : ''}>Paid Course</option></select></label><label><span>Price GHS</span><input name="price" type="number" min="0" value="${escapeHtml(edit?.price || 0)}" placeholder="0"></label><label><span>Status</span><select name="status"><option value="published" ${edit?.status !== 'draft' ? 'selected' : ''}>Published</option><option value="draft" ${edit?.status === 'draft' ? 'selected' : ''}>Draft</option></select></label><label><span>Icon</span><input name="cover_icon" value="${escapeHtml(edit?.cover_icon || '🎓')}" placeholder="🎓"></label><label class="wide"><span>Course Summary</span><textarea name="summary" required placeholder="Brief description of the course">${escapeHtml(edit?.summary || '')}</textarea></label><label class="wide"><span>Chapters, Lessons, Quizzes, Homework & Classwork</span><textarea name="course_setup" class="course-setup-textarea" placeholder="CHAPTER: ...">${escapeHtml(setupText)}</textarea><small>Use lines starting with CHAPTER, LESSON, QUIZ, HOMEWORK, CLASSWORK. Lesson format: title | type | notes | video URL | resource URL | interactive activity | homework | classwork.</small></label><button class="btn btn-gold wide" type="submit">${edit ? 'Update Course' : 'Mount Course'}</button>${edit ? '<button class="btn btn-ghost wide" type="button" data-cancel-course-edit="true">Cancel Edit</button>' : ''}</form><div class="course-admin-list">${list.map(c => `<article><div><strong>${escapeHtml(c.cover_icon || '🎓')} ${escapeHtml(c.title)}</strong><span>${escapeHtml(c.class_level)} • ${escapeHtml(c.category || 'General')} • ${c.access_type === 'paid' ? `Paid GHS ${escapeHtml(c.price || 0)}` : 'Free'} • ${escapeHtml(c.status || 'published')}</span><small>${(c.chapters || []).length} chapter(s) • ${allLessons(c).length} lesson(s) • ${escapeHtml(c.duration || '')}</small></div><div><button class="btn btn-blue btn-small" data-edit-course="${c.id}">Edit</button><button class="btn btn-danger btn-small" data-delete-course="${c.id}">Delete</button></div></article>`).join('')}</div></section>`
}
function saveCourse(form) {
  const f = Object.fromEntries(new FormData(form).entries())
  const list = courses()
  const item = { id: f.id || uid(), title: f.title, class_level: f.class_level, category: f.category, duration: f.duration, access_type: f.access_type || 'free', price: Number(f.price || 0), status: f.status, cover_icon: f.cover_icon || '🎓', summary: f.summary, chapters: parseCourseSetup(f.course_setup), updated_at: new Date().toISOString() }
  const idx = list.findIndex(c => c.id === item.id)
  if (idx >= 0) list[idx] = item
  else list.unshift(item)
  editingCourseId = ''
  saveCourses(list)
  document.querySelector('[data-course-admin-panel]')?.remove()
  installAdminCoursePanel()
  toast('Course saved successfully.')
}
function deleteCourse(id) { if (!confirm('Delete this course?')) return; saveCourses(courses().filter(c => c.id !== id)); document.querySelector('[data-course-admin-panel]')?.remove(); installAdminCoursePanel(); toast('Course deleted.') }
function coursesPageHtml() {
  const p = profile(); const selected = currentClass(); const published = courses().filter(c => c.status !== 'draft'); const list = published.filter(c => c.class_level === selected)
  return `<main class="app-shell course-app"><section class="app-frame course-page"><nav class="screen-tabs course-nav"><div class="brand-chip"><span class="brand-crown">♛</span><div><strong>MEZZO</strong><small>Course Sessions</small></div></div><div class="tab-scroll"><button class="screen-tab" data-target="home"><span>🏟️</span>Home</button><button class="screen-tab active" data-courses-page="true"><span>🎓</span>Courses</button><button class="screen-tab" data-target="dashboard"><span>👤</span>Dashboard</button><button class="screen-tab" data-target="auth"><span>🔐</span>Login / Sign Up</button></div></nav><section class="course-hero glass-card"><div><span class="course-kicker">🎓 Self-Taught Courses</span><h1>Learn by Class, at Your Pace</h1><p>Self-enrol into free or paid courses with chapters, interactive lessons, quizzes, homework and classwork trials.</p><div class="course-filter-row"><label><span>Filter by class</span><select id="courseClassFilter"><option>All Classes</option>${classOptions(selected)}</select></label><button class="btn btn-gold" data-refresh-courses="true">Load Courses</button></div></div><div class="course-hero-stat"><strong>${published.length}</strong><small>Published courses</small><em>${escapeHtml(p.full_name || 'Student')}</em></div></section><section class="course-grid">${(list.length ? list : published.slice(0, 8)).map(courseCard).join('') || '<div class="empty-course light-card"><h2>No courses mounted yet</h2><p>Admin can add courses from the Admin page.</p></div>'}</section></section></main>`
}
function courseCard(course) { const pct = percentComplete(course); const isEnrolled = enrolled(course.id); const locked = paidLocked(course); return `<article class="course-card glass-card ${course.access_type === 'paid' ? 'paid-course-card' : ''}"><div class="course-icon">${escapeHtml(course.cover_icon || '🎓')}</div><span>${escapeHtml(course.class_level)} • ${escapeHtml(course.category || 'General')}</span><h2>${escapeHtml(course.title)}</h2><p>${escapeHtml(course.summary || '')}</p><div class="course-price-badge ${course.access_type === 'paid' ? 'paid' : 'free'}">${course.access_type === 'paid' ? `Paid • GHS ${escapeHtml(course.price || 0)}` : 'Free Course'}</div><div class="course-progress"><i style="width:${pct}%"></i></div><small>${pct}% complete • ${(course.chapters || []).length} chapter(s) • ${allLessons(course).length} lesson(s) • ${escapeHtml(course.duration || '')}</small><button class="btn ${locked ? 'btn-blue' : isEnrolled ? 'btn-primary' : 'btn-gold'}" data-open-course="${course.id}">${locked ? 'Subscribe to Unlock' : isEnrolled ? 'Continue Learning' : 'Self Enrol'}</button></article>` }
function renderCoursesPage() { if (!canOpenCourses()) { toast('Courses are locked for Mezzo Staff. Ask admin to allow access.'); return } selectedCourseId = ''; document.getElementById('root').innerHTML = coursesPageHtml() }
function openCourse(id) {
  if (!canOpenCourses()) { toast('Courses are locked for Mezzo Staff. Ask admin to allow access.'); return }
  const course = courses().find(c => c.id === id)
  if (!course) return
  if (paidLocked(course)) { toast('This is a paid course. Subscribe to unlock access.'); document.querySelector('[data-open-subscriptions]')?.click(); return }
  selectedCourseId = id; activeChapterIndex = 0; activeLessonIndex = 0
  const enroll = enrollments(); const key = `${profileId()}_${id}`
  if (!enroll[key]) { enroll[key] = { course_id: id, student: profileId(), enrolled_at: new Date().toISOString(), access_type: course.access_type }; saveJson(ENROLL_KEY, enroll); toast('You have self-enrolled in this course.') }
  renderCourseViewer()
}
function renderCourseViewer() {
  const course = courses().find(c => c.id === selectedCourseId); if (!course) return renderCoursesPage()
  const chapter = course.chapters?.[activeChapterIndex] || course.chapters?.[0]; const lesson = chapter?.lessons?.[activeLessonIndex] || chapter?.lessons?.[0]; const p = courseProgress(course.id); const done = (p.completed || []).includes(`${activeChapterIndex}-${activeLessonIndex}`)
  document.getElementById('root').innerHTML = `<main class="app-shell course-app"><section class="app-frame course-page"><nav class="screen-tabs course-nav"><div class="brand-chip"><span class="brand-crown">♛</span><div><strong>MEZZO</strong><small>Course Sessions</small></div></div><div class="tab-scroll"><button class="screen-tab" data-courses-page="true"><span>🎓</span>Courses</button><button class="screen-tab" data-target="dashboard"><span>👤</span>Dashboard</button></div></nav><section class="course-view-layout"><aside class="course-outline glass-card"><button class="btn btn-ghost" data-courses-page="true">← All Courses</button><h2>${escapeHtml(course.title)}</h2><p>${escapeHtml(course.class_level)} • ${course.access_type === 'paid' ? `Paid GHS ${escapeHtml(course.price || 0)}` : 'Free Course'}</p><div class="course-progress big"><i style="width:${percentComplete(course)}%"></i></div>${(course.chapters || []).map((ch, ci) => `<div class="chapter-group"><button class="chapter-link ${ci === activeChapterIndex ? 'active' : ''}" data-chapter-index="${ci}">📖 ${escapeHtml(ch.title)}</button>${(ch.lessons || []).map((l, li) => `<button class="lesson-link ${ci === activeChapterIndex && li === activeLessonIndex ? 'active' : ''} ${(p.completed || []).includes(`${ci}-${li}`) ? 'done' : ''}" data-lesson-index="${li}" data-chapter-index="${ci}"><b>${(p.completed || []).includes(`${ci}-${li}`) ? '✓' : li + 1}</b><span>${escapeHtml(l.title)}</span></button>`).join('')}<button class="chapter-tool" data-open-chapter-quiz="${ci}">🧪 Chapter Quiz</button><button class="chapter-tool" data-open-homework="${ci}">🏠 Homework</button><button class="chapter-tool" data-open-classwork="${ci}">🏫 Classwork</button></div>`).join('')}</aside><article class="lesson-view light-card"><span class="course-kicker">${escapeHtml(lesson?.type || 'Interactive Lesson')} • ${escapeHtml(chapter?.title || 'Chapter')}</span><h1>${escapeHtml(lesson?.title || 'Lesson')}</h1><p>${escapeHtml(lesson?.content || 'No lesson notes yet.')}</p>${lesson?.interactive ? `<section class="interactive-lesson-box"><h3>Interactive Lesson</h3><p>${escapeHtml(lesson.interactive)}</p><textarea placeholder="Student response / working area"></textarea></section>` : ''}${lesson?.homework ? `<section class="trial-box"><h3>Lesson Homework Trial</h3><p>${escapeHtml(lesson.homework)}</p></section>` : ''}${lesson?.classwork ? `<section class="trial-box"><h3>Lesson Classwork Trial</h3><p>${escapeHtml(lesson.classwork)}</p></section>` : ''}${lesson?.video_url ? `<a class="course-resource" href="${escapeHtml(lesson.video_url)}" target="_blank" rel="noreferrer">▶ Open Video Lesson</a>` : ''}${lesson?.resource_url ? `<a class="course-resource" href="${escapeHtml(lesson.resource_url)}" target="_blank" rel="noreferrer">📄 Open Resource / PDF</a>` : ''}<div class="course-actions"><button class="btn btn-gold" data-complete-lesson="${activeChapterIndex}-${activeLessonIndex}">${done ? 'Completed ✓' : 'Mark Lesson Complete'}</button><button class="btn btn-primary" data-next-lesson="true">Next Lesson ▶</button></div></article></section></section></main>`
}
function renderChapterQuiz(ci) { const course = courses().find(c => c.id === selectedCourseId); const chapter = course?.chapters?.[Number(ci)]; const quiz = chapter?.quiz || []; if (!quiz.length) { toast('No quiz has been added for this chapter yet.'); return } document.getElementById('root').innerHTML = `<main class="app-shell course-app"><section class="app-frame course-page"><section class="chapter-quiz-card light-card"><span class="course-kicker">🧪 Chapter Quiz</span><h1>${escapeHtml(chapter.title)}</h1>${quiz.map((q, i) => `<article class="chapter-quiz-question"><h3>${i + 1}. ${escapeHtml(q.q)}</h3>${(q.options || []).map((o, oi) => `<button data-course-quiz-answer="${String.fromCharCode(65 + oi)}" data-course-quiz-correct="${q.answer}" data-course-quiz-index="${i}"><b>${String.fromCharCode(65 + oi)}</b>${escapeHtml(o)}</button>`).join('')}<small>${escapeHtml(q.explanation || '')}</small></article>`).join('')}<button class="btn btn-gold" data-return-course="true">Back to Lesson</button></section></section></main>` }
function renderTrial(type, ci) { const course = courses().find(c => c.id === selectedCourseId); const chapter = course?.chapters?.[Number(ci)]; const tasks = chapter?.[type] || []; document.getElementById('root').innerHTML = `<main class="app-shell course-app"><section class="app-frame course-page"><section class="chapter-quiz-card light-card"><span class="course-kicker">${type === 'homework' ? '🏠 Homework Trials' : '🏫 Classwork Trials'}</span><h1>${escapeHtml(chapter?.title || 'Chapter')}</h1>${tasks.length ? tasks.map((t, i) => `<article class="trial-list-item"><h3>${i + 1}. ${escapeHtml(t.title)}</h3><p>${escapeHtml(t.instructions)}</p><textarea placeholder="Student answer / working area"></textarea></article>`).join('') : '<p>No trial has been added for this chapter yet.</p>'}<button class="btn btn-gold" data-return-course="true">Back to Lesson</button></section></section></main>` }
function completeLesson(key) { const course = courses().find(c => c.id === selectedCourseId); if (!course) return; const all = progress(); const pkey = `${profileId()}_${course.id}`; const p = all[pkey] || { completed: [], quizScores: {}, homeworkDone: [], classworkDone: [] }; if (!p.completed.includes(key)) p.completed.push(key); p.updated_at = new Date().toISOString(); all[pkey] = p; saveJson(PROGRESS_KEY, all); toast('Lesson marked complete.'); renderCourseViewer() }
function nextLesson() { const course = courses().find(c => c.id === selectedCourseId); if (!course) return; const chapter = course.chapters?.[activeChapterIndex]; if (activeLessonIndex + 1 < (chapter?.lessons || []).length) activeLessonIndex += 1; else if (activeChapterIndex + 1 < (course.chapters || []).length) { activeChapterIndex += 1; activeLessonIndex = 0 } renderCourseViewer() }
function sync() { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; installCourseNav(); installCourseHomeCard(); installAdminCoursePanel() }) }

document.addEventListener('submit', event => { if (event.target?.id === 'courseAdminForm') { event.preventDefault(); event.stopImmediatePropagation(); saveCourse(event.target) } }, true)
document.addEventListener('click', event => {
  if (event.target.closest('[data-courses-page]')) { event.preventDefault(); event.stopImmediatePropagation(); renderCoursesPage(); return }
  const open = event.target.closest('[data-open-course]'); if (open) { event.preventDefault(); openCourse(open.dataset.openCourse); return }
  const edit = event.target.closest('[data-edit-course]'); if (edit) { editingCourseId = edit.dataset.editCourse; document.querySelector('[data-course-admin-panel]')?.remove(); installAdminCoursePanel(); return }
  const del = event.target.closest('[data-delete-course]'); if (del) { deleteCourse(del.dataset.deleteCourse); return }
  if (event.target.closest('[data-cancel-course-edit]')) { editingCourseId = ''; document.querySelector('[data-course-admin-panel]')?.remove(); installAdminCoursePanel(); return }
  const lesson = event.target.closest('[data-lesson-index]'); if (lesson) { activeChapterIndex = Number(lesson.dataset.chapterIndex); activeLessonIndex = Number(lesson.dataset.lessonIndex); renderCourseViewer(); return }
  const chapter = event.target.closest('[data-chapter-index]'); if (chapter && !lesson) { activeChapterIndex = Number(chapter.dataset.chapterIndex); activeLessonIndex = 0; renderCourseViewer(); return }
  const complete = event.target.closest('[data-complete-lesson]'); if (complete) { completeLesson(complete.dataset.completeLesson); return }
  if (event.target.closest('[data-next-lesson]')) { nextLesson(); return }
  const quiz = event.target.closest('[data-open-chapter-quiz]'); if (quiz) { renderChapterQuiz(quiz.dataset.openChapterQuiz); return }
  const homework = event.target.closest('[data-open-homework]'); if (homework) { renderTrial('homework', homework.dataset.openHomework); return }
  const classwork = event.target.closest('[data-open-classwork]'); if (classwork) { renderTrial('classwork', classwork.dataset.openClasswork); return }
  if (event.target.closest('[data-return-course]')) { renderCourseViewer(); return }
  const ans = event.target.closest('[data-course-quiz-answer]'); if (ans) { ans.classList.add(ans.dataset.courseQuizAnswer === ans.dataset.courseQuizCorrect ? 'course-quiz-correct' : 'course-quiz-wrong'); return }
  if (event.target.closest('[data-refresh-courses]')) { renderCoursesPage(); return }
}, true)
document.addEventListener('change', event => { if (event.target?.id === 'courseClassFilter') renderCoursesPage() })
const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false })
window.addEventListener('load', sync)
window.addEventListener('storage', sync)
setTimeout(sync, 350)
