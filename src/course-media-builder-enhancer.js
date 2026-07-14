import './course-media-builder.css'

let queued = false

function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])) }
function toast(message) { document.querySelector('.course-media-toast')?.remove(); document.body.insertAdjacentHTML('beforeend', `<div class="course-media-toast">${escapeHtml(message)}</div>`); setTimeout(() => document.querySelector('.course-media-toast')?.remove(), 4200) }
function setupTextarea() { return document.querySelector('#courseAdminForm textarea[name="setup"]') || document.querySelector('#courseAdminForm textarea') }
async function fileToDataUrl(id) {
  const file = document.getElementById(id)?.files?.[0]
  if (!file) return ''
  if (file.size > 18 * 1024 * 1024) { toast('This file is large. Use a YouTube/Drive/Supabase Storage link for production videos.'); return '' }
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => resolve('')
    reader.readAsDataURL(file)
  })
}
function enhanceCourseBuilder() {
  const form = document.getElementById('courseAdminForm')
  if (!form || form.querySelector('[data-course-media-builder]')) return
  const target = setupTextarea()?.closest('label') || form.lastElementChild
  target?.insertAdjacentHTML('beforebegin', `
    <section class="course-media-builder" data-course-media-builder="true">
      <div class="course-media-head"><div><span>🎥 Course Media & Interactive Lesson Builder</span><h3>Lecture Videos, Mini Quizzes, Classwork & Homework</h3><p>Add video lessons, notes, resources, mini quizzes, classwork and homework into the Course Setup box automatically.</p></div></div>
      <div class="course-media-grid">
        <label><span>Chapter Title</span><input id="courseMediaChapter" placeholder="e.g. Chapter 1 - Fractions"></label>
        <label><span>Lesson Title</span><input id="courseMediaLesson" placeholder="e.g. Lesson 1 - Equivalent Fractions"></label>
        <label><span>Lecture Video Link</span><input id="courseMediaVideoUrl" placeholder="YouTube, Vimeo, Google Drive or Supabase Storage URL"></label>
        <label><span>Upload Lecture Video</span><input id="courseMediaVideoFile" type="file" accept="video/*"></label>
        <label><span>Upload Audio Lesson</span><input id="courseMediaAudioFile" type="file" accept="audio/*"></label>
        <label><span>Upload Lesson Image/Diagram</span><input id="courseMediaImageFile" type="file" accept="image/*"></label>
        <label><span>Resource Link / PDF Link</span><input id="courseMediaResourceUrl" placeholder="Worksheet/PDF/resource URL"></label>
        <label><span>Upload PDF/Resource</span><input id="courseMediaResourceFile" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.png"></label>
        <label class="wide"><span>Lesson Notes</span><textarea id="courseMediaNotes" placeholder="Type or paste the notes for this lesson"></textarea></label>
        <label class="wide"><span>Interactive Prompt</span><textarea id="courseMediaInteractive" placeholder="e.g. Learners should pause the video and solve question 1 in their notebooks"></textarea></label>
      </div>
      <div class="mini-assessment-box">
        <h4>Mini Quiz</h4>
        <div class="course-media-grid"><label class="wide"><span>Quiz Question</span><input id="courseMiniQuizQ" placeholder="Type mini quiz question"></label><label><span>Option A</span><input id="courseMiniQuizA"></label><label><span>Option B</span><input id="courseMiniQuizB"></label><label><span>Option C</span><input id="courseMiniQuizC"></label><label><span>Option D</span><input id="courseMiniQuizD"></label><label><span>Correct Answer</span><select id="courseMiniQuizAnswer"><option>A</option><option>B</option><option>C</option><option>D</option></select></label><label class="wide"><span>Explanation</span><input id="courseMiniQuizExplanation" placeholder="Short explanation"></label></div>
      </div>
      <div class="course-media-grid">
        <label class="wide"><span>Classwork Task</span><textarea id="courseClassworkTask" placeholder="Classwork instructions/questions"></textarea></label>
        <label class="wide"><span>Homework Task</span><textarea id="courseHomeworkTask" placeholder="Homework instructions/questions"></textarea></label>
        <label class="wide"><span>Final / Exit Ticket Question</span><textarea id="courseFinalQuestion" placeholder="Optional final check question"></textarea></label>
      </div>
      <div class="course-media-actions">
        <button type="button" class="btn btn-blue" data-add-media-lesson="true">Add Lesson + Media</button>
        <button type="button" class="btn btn-gold" data-add-mini-quiz="true">Add Mini Quiz</button>
        <button type="button" class="btn btn-primary" data-add-classwork="true">Add Classwork</button>
        <button type="button" class="btn btn-ghost" data-add-homework="true">Add Homework</button>
        <button type="button" class="btn btn-ghost" data-preview-media-lesson="true">Preview Media</button>
      </div>
      <div id="courseMediaPreview" class="course-media-preview"></div>
    </section>
  `)
}
function appendSetup(line) {
  const area = setupTextarea()
  if (!area) { toast('Course setup box not found yet.'); return }
  area.value = `${area.value || ''}${area.value?.trim() ? '\n' : ''}${line}`
  area.dispatchEvent(new Event('input', { bubbles: true }))
}
async function mediaValues() {
  const videoUpload = await fileToDataUrl('courseMediaVideoFile')
  const audioUpload = await fileToDataUrl('courseMediaAudioFile')
  const imageUpload = await fileToDataUrl('courseMediaImageFile')
  const resourceUpload = await fileToDataUrl('courseMediaResourceFile')
  return {
    chapter: document.getElementById('courseMediaChapter')?.value || 'Chapter 1 - Introduction',
    lesson: document.getElementById('courseMediaLesson')?.value || 'Lesson 1',
    notes: document.getElementById('courseMediaNotes')?.value || 'Lesson notes',
    video: videoUpload || document.getElementById('courseMediaVideoUrl')?.value || '',
    resource: resourceUpload || document.getElementById('courseMediaResourceUrl')?.value || '',
    interactive: document.getElementById('courseMediaInteractive')?.value || '',
    audio: audioUpload,
    image: imageUpload,
    classwork: document.getElementById('courseClassworkTask')?.value || '',
    homework: document.getElementById('courseHomeworkTask')?.value || '',
    final: document.getElementById('courseFinalQuestion')?.value || ''
  }
}
async function addLesson() {
  const v = await mediaValues()
  appendSetup(`CHAPTER: ${v.chapter}`)
  appendSetup(`LESSON: ${v.lesson}|Interactive Lesson|${v.notes}|${v.video}|${v.resource}|${v.interactive}|${v.homework}|${v.classwork}|${v.audio}|${v.image}`)
  toast('Lesson media added to Course Setup.')
}
function addMiniQuiz() {
  const q = document.getElementById('courseMiniQuizQ')?.value || ''
  if (!q.trim()) return toast('Type the mini quiz question first.')
  const a = document.getElementById('courseMiniQuizA')?.value || 'A'
  const b = document.getElementById('courseMiniQuizB')?.value || 'B'
  const c = document.getElementById('courseMiniQuizC')?.value || 'C'
  const d = document.getElementById('courseMiniQuizD')?.value || 'D'
  const ans = document.getElementById('courseMiniQuizAnswer')?.value || 'A'
  const exp = document.getElementById('courseMiniQuizExplanation')?.value || ''
  appendSetup(`QUIZ: ${q}|${a}|${b}|${c}|${d}|${ans}|${exp}`)
  toast('Mini quiz added to Course Setup.')
}
function addTask(type) {
  const id = type === 'CLASSWORK' ? 'courseClassworkTask' : type === 'HOMEWORK' ? 'courseHomeworkTask' : 'courseFinalQuestion'
  const value = document.getElementById(id)?.value || ''
  if (!value.trim()) return toast(`Type the ${type.toLowerCase()} task first.`)
  appendSetup(`${type}: ${type === 'FINAL' ? 'Final Check' : type === 'CLASSWORK' ? 'Classwork Trial' : 'Homework Trial'}|${value}|`)
  toast(`${type.charAt(0)}${type.slice(1).toLowerCase()} added to Course Setup.`)
}
async function previewMedia() {
  const v = await mediaValues()
  const box = document.getElementById('courseMediaPreview')
  if (!box) return
  box.innerHTML = `<h4>Media Preview</h4>${v.video ? `<video src="${v.video}" controls></video>` : '<p>No video selected yet.</p>'}${v.audio ? `<audio src="${v.audio}" controls></audio>` : ''}${v.image ? `<img src="${v.image}" alt="Lesson image">` : ''}<p><b>Lesson:</b> ${escapeHtml(v.lesson)}</p><p>${escapeHtml(v.notes)}</p>`
}
function sync() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; enhanceCourseBuilder() })
}

document.addEventListener('click', event => {
  if (event.target.closest('[data-add-media-lesson]')) { event.preventDefault(); addLesson(); return }
  if (event.target.closest('[data-add-mini-quiz]')) { event.preventDefault(); addMiniQuiz(); return }
  if (event.target.closest('[data-add-classwork]')) { event.preventDefault(); addTask('CLASSWORK'); return }
  if (event.target.closest('[data-add-homework]')) { event.preventDefault(); addTask('HOMEWORK'); return }
  if (event.target.closest('[data-preview-media-lesson]')) { event.preventDefault(); previewMedia(); return }
}, true)

const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false })
window.addEventListener('load', sync)
setTimeout(sync, 350)
