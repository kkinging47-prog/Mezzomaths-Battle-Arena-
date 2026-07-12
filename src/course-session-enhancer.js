import './course-session.css'

const COURSES_KEY = 'mezzo_courses_bank'
const ENROLL_KEY = 'mezzo_course_enrollments'
const PROGRESS_KEY = 'mezzo_course_progress'
const ACCESS_KEY = 'mezzo_staff_access'
const DEFAULT_ACCESS = { courses: true }
const CLASSES = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','SHS 1','SHS 2','SHS 3']
let queued = false
let selectedCourseId = ''
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
function courses() { return seedCourses(readJson(COURSES_KEY, [])) }
function saveCourses(list) { saveJson(COURSES_KEY, list) }
function enrollments() { return readJson(ENROLL_KEY, {}) }
function progress() { return readJson(PROGRESS_KEY, {}) }
function profileId() { const p = profile(); return p.email || p.full_name || 'demo-student' }
function currentClass() { return profile().class_level || 'Grade 8' }
function classOptions(selected) { return CLASSES.map(c => `<option value="${c}" ${c === selected ? 'selected' : ''}>${c}</option>`).join('') }
function toast(message) { const old = document.querySelector('.course-toast'); if (old) old.remove(); const node = document.createElement('div'); node.className = 'course-toast'; node.textContent = message; document.body.appendChild(node); setTimeout(() => node.remove(), 4200) }
function seedCourses(existing) {
  if (existing.length) return existing
  const starter = [
    { id: uid(), title: 'Multiplication Mastery Basics', class_level: 'Grade 4', category: 'Number Work', duration: '2 hours', status: 'published', cover_icon: '✖️', summary: 'Self-paced lessons on multiplication facts, arrays and word problems.', lessons: [
      { title: 'Understanding Multiplication', type: 'Text Lesson', content: 'Multiplication means equal groups. Example: 4 groups of 3 means 4 × 3 = 12.', video_url: '', resource_url: '' },
      { title: 'Practice Drill', type: 'Practice Task', content: 'Solve 10 multiplication questions from the solo practice page after this lesson.', video_url: '', resource_url: '' }
    ]},
    { id: uid(), title: 'BECE Percentages Quick Course', class_level: 'Grade 9', category: 'BECE Prep', duration: '3 hours', status: 'published', cover_icon: '📊', summary: 'A short course on percentages, discounts, profit, loss and exam-style percentage questions.', lessons: [
      { title: 'Percent of a Quantity', type: 'Text Lesson', content: 'To find a percentage of a number, divide by 100 and multiply. Example: 20% of 250 = 20/100 × 250 = 50.', video_url: '', resource_url: '' },
      { title: 'Discounts and Profit', type: 'Text Lesson', content: 'Discount is reduction in price. Profit is selling price minus cost price.', video_url: '', resource_url: '' }
    ]}
  ]
  saveCourses(starter)
  return starter
}
function courseProgress(courseId) {
  const all = progress()
  const key = `${profileId()}_${courseId}`
  return all[key] || { completed: [] }
}
function enrolled(courseId) { return Boolean(enrollments()[`${profileId()}_${courseId}`]) }
function percentComplete(course) {
  const p = courseProgress(course.id)
  const total = course.lessons?.length || 1
  return Math.round(((p.completed || []).length / total) * 100)
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
  grid.insertAdjacentHTML('beforeend', `<button class="home-mode-card game-mode-card course-home-card" data-courses-page="true"><i class="mode-shine"></i><div class="mode-top"><span class="mode-icon">🎓</span><em>Self Enrol</em></div><h3>Course Sessions</h3><p>Self-taught class-based courses mounted by admin for students to enrol and learn.</p><div class="reward-pill">📚 Learn at your pace</div><strong>OPEN COURSES →</strong></button>`)
}
function installAdminCoursePanel() {
  if (!isAdmin()) return
  const admin = document.querySelector('.admin-screen')
  if (!admin || admin.querySelector('[data-course-admin-panel]')) return
  const target = admin.querySelector('[data-admin-brand-staff-panel]') || admin.querySelector('.dashboard-hero') || admin.firstElementChild
  target?.insertAdjacentHTML('afterend', courseAdminHtml())
}
function courseAdminHtml() {
  const list = courses()
  const edit = editingCourseId ? list.find(c => c.id === editingCourseId) : null
  const lessonsText = edit?.lessons?.map(l => `${l.title}|${l.type || 'Text Lesson'}|${l.content || ''}|${l.video_url || ''}|${l.resource_url || ''}`).join('\n') || ''
  return `<section class="course-admin-panel glass-card" data-course-admin-panel="true"><div class="course-admin-head"><div><span>🎓 Course Session Admin</span><h2>Mount Self-Taught Courses</h2><p>Create courses by class, add lessons, video links, notes and resource links. Students will self-enrol and learn at their own pace.</p></div><button class="btn btn-blue" type="button" data-courses-page="true">Preview Courses</button></div><form id="courseAdminForm" class="course-admin-form"><input type="hidden" name="id" value="${escapeHtml(edit?.id || '')}"><label><span>Course Title</span><input name="title" required value="${escapeHtml(edit?.title || '')}" placeholder="e.g. Fractions Mastery"></label><label><span>Class</span><select name="class_level">${classOptions(edit?.class_level || 'Grade 8')}</select></label><label><span>Category</span><input name="category" value="${escapeHtml(edit?.category || '')}" placeholder="e.g. Algebra"></label><label><span>Duration</span><input name="duration" value="${escapeHtml(edit?.duration || '')}" placeholder="e.g. 3 hours"></label><label><span>Status</span><select name="status"><option value="published" ${edit?.status !== 'draft' ? 'selected' : ''}>Published</option><option value="draft" ${edit?.status === 'draft' ? 'selected' : ''}>Draft</option></select></label><label><span>Icon</span><input name="cover_icon" value="${escapeHtml(edit?.cover_icon || '🎓')}" placeholder="🎓"></label><label class="wide"><span>Course Summary</span><textarea name="summary" required placeholder="Brief description of the course">${escapeHtml(edit?.summary || '')}</textarea></label><label class="wide"><span>Lessons, one per line</span><textarea name="lessons" placeholder="Lesson Title|Type|Lesson notes|Video URL|Resource URL">${escapeHtml(lessonsText)}</textarea><small>Format: Lesson Title | Type | Notes | Video URL | Resource/PDF URL</small></label><button class="btn btn-gold wide" type="submit">${edit ? 'Update Course' : 'Mount Course'}</button>${edit ? '<button class="btn btn-ghost wide" type="button" data-cancel-course-edit="true">Cancel Edit</button>' : ''}</form><div class="course-admin-list">${list.map(c => `<article><div><strong>${escapeHtml(c.cover_icon || '🎓')} ${escapeHtml(c.title)}</strong><span>${escapeHtml(c.class_level)} • ${escapeHtml(c.category || 'General')} • ${escapeHtml(c.status || 'published')}</span><small>${(c.lessons || []).length} lesson(s) • ${escapeHtml(c.duration || '')}</small></div><div><button class="btn btn-blue btn-small" data-edit-course="${c.id}">Edit</button><button class="btn btn-danger btn-small" data-delete-course="${c.id}">Delete</button></div></article>`).join('')}</div></section>`
}
function parseLessons(value = '') {
  const rows = String(value).split('\n').map(x => x.trim()).filter(Boolean)
  if (!rows.length) return [{ title: 'Course Introduction', type: 'Text Lesson', content: 'Add lesson notes, video links and resource links from the admin panel.', video_url: '', resource_url: '' }]
  return rows.map(row => {
    const [title, type, content, video_url, resource_url] = row.split('|').map(x => (x || '').trim())
    return { title: title || 'Untitled Lesson', type: type || 'Text Lesson', content: content || '', video_url: video_url || '', resource_url: resource_url || '' }
  })
}
function saveCourse(form) {
  const f = Object.fromEntries(new FormData(form).entries())
  const list = courses()
  const item = { id: f.id || uid(), title: f.title, class_level: f.class_level, category: f.category, duration: f.duration, status: f.status, cover_icon: f.cover_icon || '🎓', summary: f.summary, lessons: parseLessons(f.lessons), updated_at: new Date().toISOString() }
  const idx = list.findIndex(c => c.id === item.id)
  if (idx >= 0) list[idx] = item
  else list.unshift(item)
  editingCourseId = ''
  saveCourses(list)
  document.querySelector('[data-course-admin-panel]')?.remove()
  installAdminCoursePanel()
  toast('Course saved successfully.')
}
function deleteCourse(id) {
  if (!confirm('Delete this course?')) return
  saveCourses(courses().filter(c => c.id !== id))
  document.querySelector('[data-course-admin-panel]')?.remove()
  installAdminCoursePanel()
  toast('Course deleted.')
}
function filteredCourses() {
  const pClass = document.getElementById('courseClassFilter')?.value || currentClass()
  return courses().filter(c => c.status !== 'draft' && (pClass === 'All Classes' || c.class_level === pClass))
}
function coursesPageHtml() {
  const p = profile()
  const selected = currentClass()
  const list = courses().filter(c => c.status !== 'draft' && c.class_level === selected)
  const allCount = courses().filter(c => c.status !== 'draft').length
  return `<main class="app-shell course-app"><section class="app-frame course-page"><nav class="screen-tabs course-nav"><div class="brand-chip"><span class="brand-crown">♛</span><div><strong>MEZZO</strong><small>Course Sessions</small></div></div><div class="tab-scroll"><button class="screen-tab" data-target="home"><span>🏟️</span>Home</button><button class="screen-tab active" data-courses-page="true"><span>🎓</span>Courses</button><button class="screen-tab" data-target="dashboard"><span>👤</span>Dashboard</button><button class="screen-tab" data-target="auth"><span>🔐</span>Login / Sign Up</button></div></nav><section class="course-hero glass-card"><div><span class="course-kicker">🎓 Self-Taught Courses</span><h1>Learn by Class, at Your Pace</h1><p>Students can self-enrol into class-based lessons mounted by Mezzo/admin, complete lessons and track progress.</p><div class="course-filter-row"><label><span>Filter by class</span><select id="courseClassFilter"><option>All Classes</option>${classOptions(selected)}</select></label><button class="btn btn-gold" data-refresh-courses="true">Load Courses</button></div></div><div class="course-hero-stat"><strong>${allCount}</strong><small>Published courses</small><em>${escapeHtml(p.full_name || 'Student')}</em></div></section><section class="course-grid">${(list.length ? list : courses().filter(c => c.status !== 'draft').slice(0, 8)).map(courseCard).join('') || '<div class="empty-course light-card"><h2>No courses mounted yet</h2><p>Admin can add courses from the Admin page.</p></div>'}</section></section></main>`
}
function courseCard(course) {
  const pct = percentComplete(course)
  const isEnrolled = enrolled(course.id)
  return `<article class="course-card glass-card"><div class="course-icon">${escapeHtml(course.cover_icon || '🎓')}</div><span>${escapeHtml(course.class_level)} • ${escapeHtml(course.category || 'General')}</span><h2>${escapeHtml(course.title)}</h2><p>${escapeHtml(course.summary || '')}</p><div class="course-progress"><i style="width:${pct}%"></i></div><small>${pct}% complete • ${(course.lessons || []).length} lesson(s) • ${escapeHtml(course.duration || '')}</small><button class="btn ${isEnrolled ? 'btn-primary' : 'btn-gold'}" data-open-course="${course.id}">${isEnrolled ? 'Continue Learning' : 'Self Enrol'}</button></article>`
}
function renderCoursesPage() { if (!canOpenCourses()) { toast('Courses are locked for Mezzo Staff. Ask admin to allow access.'); return } selectedCourseId = ''; document.getElementById('root').innerHTML = coursesPageHtml() }
function openCourse(id) {
  if (!canOpenCourses()) { toast('Courses are locked for Mezzo Staff. Ask admin to allow access.'); return }
  const course = courses().find(c => c.id === id)
  if (!course) return
  selectedCourseId = id
  activeLessonIndex = 0
  const enroll = enrollments()
  const key = `${profileId()}_${id}`
  if (!enroll[key]) { enroll[key] = { course_id: id, student: profileId(), enrolled_at: new Date().toISOString() }; saveJson(ENROLL_KEY, enroll); toast('You have self-enrolled in this course.') }
  renderCourseViewer()
}
function renderCourseViewer() {
  const course = courses().find(c => c.id === selectedCourseId)
  if (!course) return renderCoursesPage()
  const lesson = course.lessons?.[activeLessonIndex] || course.lessons?.[0]
  const p = courseProgress(course.id)
  const done = (p.completed || []).includes(activeLessonIndex)
  document.getElementById('root').innerHTML = `<main class="app-shell course-app"><section class="app-frame course-page"><nav class="screen-tabs course-nav"><div class="brand-chip"><span class="brand-crown">♛</span><div><strong>MEZZO</strong><small>Course Sessions</small></div></div><div class="tab-scroll"><button class="screen-tab" data-courses-page="true"><span>🎓</span>Courses</button><button class="screen-tab" data-target="dashboard"><span>👤</span>Dashboard</button></div></nav><section class="course-view-layout"><aside class="course-outline glass-card"><button class="btn btn-ghost" data-courses-page="true">← All Courses</button><h2>${escapeHtml(course.title)}</h2><p>${escapeHtml(course.class_level)} • ${escapeHtml(course.category || 'General')}</p><div class="course-progress big"><i style="width:${percentComplete(course)}%"></i></div>${(course.lessons || []).map((l, i) => `<button class="lesson-link ${i === activeLessonIndex ? 'active' : ''} ${(p.completed || []).includes(i) ? 'done' : ''}" data-lesson-index="${i}"><b>${(p.completed || []).includes(i) ? '✓' : i + 1}</b><span>${escapeHtml(l.title)}</span></button>`).join('')}</aside><article class="lesson-view light-card"><span class="course-kicker">${escapeHtml(lesson?.type || 'Lesson')}</span><h1>${escapeHtml(lesson?.title || 'Lesson')}</h1><p>${escapeHtml(lesson?.content || 'No lesson notes yet.')}</p>${lesson?.video_url ? `<a class="course-resource" href="${escapeHtml(lesson.video_url)}" target="_blank" rel="noreferrer">▶ Open Video Lesson</a>` : ''}${lesson?.resource_url ? `<a class="course-resource" href="${escapeHtml(lesson.resource_url)}" target="_blank" rel="noreferrer">📄 Open Resource / PDF</a>` : ''}<div class="course-actions"><button class="btn btn-gold" data-complete-lesson="${activeLessonIndex}">${done ? 'Completed ✓' : 'Mark Lesson Complete'}</button><button class="btn btn-primary" data-next-lesson="true">Next Lesson ▶</button></div></article></section></section></main>`
}
function completeLesson(index) {
  const course = courses().find(c => c.id === selectedCourseId)
  if (!course) return
  const all = progress()
  const key = `${profileId()}_${course.id}`
  const p = all[key] || { completed: [] }
  if (!p.completed.includes(Number(index))) p.completed.push(Number(index))
  p.updated_at = new Date().toISOString()
  all[key] = p
  saveJson(PROGRESS_KEY, all)
  toast('Lesson marked complete.')
  renderCourseViewer()
}
function nextLesson() {
  const course = courses().find(c => c.id === selectedCourseId)
  if (!course) return
  activeLessonIndex = Math.min((course.lessons || []).length - 1, activeLessonIndex + 1)
  renderCourseViewer()
}
function sync() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; installCourseNav(); installCourseHomeCard(); installAdminCoursePanel() })
}

document.addEventListener('submit', event => {
  if (event.target?.id === 'courseAdminForm') { event.preventDefault(); event.stopImmediatePropagation(); saveCourse(event.target) }
}, true)
document.addEventListener('click', event => {
  if (event.target.closest('[data-courses-page]')) { event.preventDefault(); event.stopImmediatePropagation(); renderCoursesPage(); return }
  const open = event.target.closest('[data-open-course]')
  if (open) { event.preventDefault(); openCourse(open.dataset.openCourse); return }
  const edit = event.target.closest('[data-edit-course]')
  if (edit) { editingCourseId = edit.dataset.editCourse; document.querySelector('[data-course-admin-panel]')?.remove(); installAdminCoursePanel(); return }
  const del = event.target.closest('[data-delete-course]')
  if (del) { deleteCourse(del.dataset.deleteCourse); return }
  if (event.target.closest('[data-cancel-course-edit]')) { editingCourseId = ''; document.querySelector('[data-course-admin-panel]')?.remove(); installAdminCoursePanel(); return }
  const lesson = event.target.closest('[data-lesson-index]')
  if (lesson) { activeLessonIndex = Number(lesson.dataset.lessonIndex); renderCourseViewer(); return }
  const complete = event.target.closest('[data-complete-lesson]')
  if (complete) { completeLesson(complete.dataset.completeLesson); return }
  if (event.target.closest('[data-next-lesson]')) { nextLesson(); return }
  if (event.target.closest('[data-refresh-courses]')) { renderCoursesPage(); return }
}, true)
document.addEventListener('change', event => { if (event.target?.id === 'courseClassFilter') renderCoursesPage() })

const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false })
window.addEventListener('load', sync)
window.addEventListener('storage', sync)
setTimeout(sync, 350)
