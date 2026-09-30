import './professional-course-builder.css'

const sections = [
  ['identity', 'Course details', 'Title, cover and instructor', ['title','class_level','category','course_level','instructor','duration','cover_icon','cover_image']],
  ['publishing', 'Publishing', 'Access, visibility and schedule', ['access_type','price','status','featured','drip_mode','prerequisite_course_id']],
  ['description', 'Course information', 'Overview and learning goals', ['summary','outcomes','requirements']],
  ['curriculum', 'Curriculum', 'Chapters, lessons and assessments', ['course_setup']],
  ['completion', 'Completion', 'Assessment and certificate rules', []]
]
let active = 'identity'
function enhance() {
  const panel = document.querySelector('[data-course-admin-panel]')
  const form = panel?.querySelector('#courseAdminForm')
  if (!form || form.dataset.professional) return
  form.dataset.professional = 'true'
  form.noValidate = true
  for(const name of ['title','category','instructor','duration','summary','outcomes','course_setup'])form.elements.namedItem(name).required=true
  panel.classList.add('professional-course-studio')
  const fields = [...form.children]
  const shell = document.createElement('div')
  shell.className = 'course-studio-shell'
  shell.innerHTML = '<aside><span>COURSE STUDIO</span><h3>Build your course</h3><nav aria-label="Course builder sections"></nav><p class="studio-help">Save each step, then mount the course on Completion.</p></aside><main><div class="studio-panel"></div></main>'
  const nav = shell.querySelector('nav')
  const main = shell.querySelector('.studio-panel')
  sections.forEach(([key,title,desc,names], index) => {
    nav.insertAdjacentHTML('beforeend', `<button type="button" data-studio-tab="${key}">${String(index+1).padStart(2,'0')} <span>${title}</span></button>`)
    const section = document.createElement('section')
    section.className = 'course-studio-section'
    section.dataset.studioSection = key
    section.innerHTML = `<header><div><h3>${title}</h3><p>${desc}</p></div></header><div class="course-studio-fields"></div>`
    const body = section.querySelector('.course-studio-fields')
    names.forEach(name => { const el = fields.find(item => item.querySelector?.(`[name="${name}"]`)); if (el) body.appendChild(el) })
    if (key === 'completion') { const rule = form.querySelector('.completion-rule-grid'); if (rule) body.appendChild(rule) }
    if (key === 'curriculum') {
      // The media helper can mount before or after this studio enhancer.
      // Keep it in the curriculum step in either order.
      const media = form.querySelector('[data-course-media-builder]')
      if (media) body.appendChild(media)
      const tools = document.createElement('div')
      tools.className = 'curriculum-tools'
      tools.innerHTML = '<button type="button" data-course-line="CHAPTER: New Chapter">+ Chapter</button><button type="button" data-course-line="LESSON: New Lesson|Interactive Lesson|Lesson notes||||||">+ Lesson</button><button type="button" data-course-line="QUIZ: Question?|A|B|C|D|A|Explanation">+ Quiz</button><button type="button" data-course-line="FINAL: Final question?|A|B|C|D|A|Explanation">+ Final question</button>'
      body.prepend(tools)
    }
    main.appendChild(section)
    if(index < sections.length-1) section.insertAdjacentHTML('beforeend', '<div class="course-studio-actions"><button type="button" class="btn btn-blue" data-studio-continue>Save and continue →</button></div>')
  })
  const actions = document.createElement('div')
  actions.className = 'course-studio-actions'
  fields.filter(item => item.tagName === 'BUTTON').forEach(item => actions.appendChild(item))
  actions.insertAdjacentHTML('afterbegin','<button type="button" class="btn btn-blue" data-studio-save>Save draft</button><p>Step drafts stay in this browser tab. Mount course saves the complete course online.</p>')
  main.querySelector('[data-studio-section="completion"]').appendChild(actions)
  fields.filter(item => item.tagName === 'INPUT' && item.type === 'hidden').forEach(item => main.prepend(item))
  form.appendChild(shell)
  showTab(panel, active)
}
function showTab(panel, key) {
  active = sections.some(section => section[0] === key) ? key : 'identity'
  panel.querySelectorAll('[data-studio-section]').forEach(el => { el.hidden = el.dataset.studioSection !== active })
  panel.querySelectorAll('[data-studio-tab]').forEach(el => {
    const current = el.dataset.studioTab === active
    el.classList.toggle('active', current)
    el.setAttribute('aria-current', current ? 'step' : 'false')
  })
}
function validateStep(panel,key){
  const section=panel.querySelector(`[data-studio-section="${key}"]`)
  if(key==='curriculum'){
    const setup=section.querySelector('[name="course_setup"]')
    setup.setCustomValidity(/^CHAPTER:/im.test(setup.value)&&/^LESSON:/im.test(setup.value)?'':'Add at least one chapter and lesson.')
  }
  for(const field of section.querySelectorAll('input,select,textarea')){
    if(!field.checkValidity()){showTab(panel,key);field.reportValidity();return false}
  }
  return true
}
function saveStep(form){
  if(form.dataset.coverUploading==='true'){form.querySelector('[data-cover-status]').textContent='Please wait for the cover image upload to finish.';return false}
  const detail={saved:false}
  form.dispatchEvent(new CustomEvent('course-studio-save-draft',{bubbles:true,detail}))
  return detail.saved
}
document.addEventListener('click', event => {
  const save=event.target.closest('[data-studio-save]')
  if(save){saveStep(save.closest('form'));return}
  const next=event.target.closest('[data-studio-continue]')
  if(next){
    const panel=next.closest('[data-course-admin-panel]'),form=next.closest('form')
    if(!validateStep(panel,active)||!saveStep(form))return
    showTab(panel,sections[sections.findIndex(([key])=>key===active)+1][0])
    return
  }
  const tab = event.target.closest('[data-studio-tab]')
  if (tab) {
    const panel=tab.closest('[data-course-admin-panel]'),form=panel.querySelector('form')
    const destination=sections.findIndex(([key])=>key===tab.dataset.studioTab)
    for(let i=0;i<destination;i++)if(!validateStep(panel,sections[i][0]))return
    if(!saveStep(form))return
    showTab(panel, tab.dataset.studioTab); return
  }
  const line = event.target.closest('[data-course-line]')
  if (!line) return
  const area = document.querySelector('#courseAdminForm [name="course_setup"]')
  if (!area) return
  area.value = [area.value.trim(), line.dataset.courseLine].filter(Boolean).join('\n')
  area.dispatchEvent(new Event('input', { bubbles: true }))
  area.focus()
  area.setSelectionRange(area.value.length, area.value.length)
}, true)
document.addEventListener('input',event=>{if(event.target.matches('#courseAdminForm [name="course_setup"]'))event.target.setCustomValidity('')},true)
document.addEventListener('invalid', event => {
  const section = event.target.closest('[data-studio-section]')
  const panel = event.target.closest('[data-course-admin-panel]')
  if (section && panel) showTab(panel, section.dataset.studioSection)
}, true)
const observer = new MutationObserver(() => {
  if (!document.querySelector('#courseAdminForm:not([data-professional])')) return
  requestAnimationFrame(enhance)
})
observer.observe(document.body, {childList:true, subtree:true})
window.addEventListener('load', enhance)
setTimeout(enhance, 600)
