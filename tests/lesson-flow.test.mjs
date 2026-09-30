// Run with LESSON_TEST_DOM pointing at a linkedom installation.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const {parseHTML}=await import(process.env.LESSON_TEST_DOM||'linkedom')
const {window,document}=parseHTML('<html><body><article><div data-lesson-body></div></article></body></html>')
const values=new Map(),localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)}
localStorage.setItem('mezzo_profile',JSON.stringify({id:'student-one'}))
const context=vm.createContext({document,window,URL,URLSearchParams,location:{origin:'https://play.mezzomaths.org',search:''},localStorage,supabase:null,console,Event:window.Event})
vm.runInContext(fs.readFileSync('src/lesson-experience.js','utf8').replace(/^import .*$/gm,'').replace(/export /g,''),context)
assert.equal(vm.runInContext('clampAngle(-10)',context),5)
assert.equal(vm.runInContext('clampAngle(200)',context),175)
assert.equal(vm.runInContext("gradeClasswork([{answer:'B'}],{})",context),null)
assert.equal(vm.runInContext("gradeClasswork([{answer:'B'},{answer:'A'}],{0:'B',1:'D'}).score",context),50)
assert.equal(vm.runInContext("new URL(homeworkLink('abc',1,2)).searchParams.get('lesson')",context),'2')
const lesson={interactive:'Move two strips and identify the vertex.',interactive_tool:'angle',classwork_questions:[{q:'What stays fixed?',options:['Vertex','Opening','Both sides','Angle'],answer:'A',explanation:'The vertex is the shared endpoint.'}]}
let saves=0,completed='',next=0;const progress={completed:[]}
context.args={course:{id:'course-one'},lesson,ci:0,li:0,progress,saveProgress:()=>saves++,media:'<p>Lesson notes</p>',complete:k=>completed=k,next:()=>next++}
vm.runInContext('mountLessonExperience(document.querySelector("article"),args)',context)
const click=s=>document.querySelector(s).onclick()
assert.equal(document.querySelector('[data-lesson-stage="0"]').hidden,false)
click('[data-lesson-forward]');assert.equal(document.querySelector('[data-lesson-stage="1"]').hidden,false)
const response=document.querySelector('[data-activity-response]');response.value='The opening becomes wider.';response.dispatchEvent(new window.Event('input',{bubbles:true}))
const range=document.querySelector('[data-angle-range]');range.value='120';range.dispatchEvent(new window.Event('input'))
assert.equal(document.querySelector('[data-angle-output]').textContent,'120°')
assert.match(document.querySelector('[data-angle-description]').textContent,/Obtuse/)
click('[data-lesson-forward]');click('[data-lesson-forward]');assert.match(document.querySelector('[data-flow-status]').textContent,/Answer all/)
const option=document.querySelector('input[type=radio]');option.dispatchEvent(new window.Event('input',{bubbles:true}));document.querySelector('[data-classwork-form]').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}))
assert.equal(progress.lessonClasswork['0-0'].score,100)
assert.match(document.querySelector('[data-question-feedback]').textContent,/shared endpoint/)
click('[data-lesson-forward]');assert.equal(progress.lessonSteps['0-0'],3)
click('[data-lesson-forward]');assert.equal(completed,'0-0');assert.equal(next,1)
vm.runInContext('mountLessonExperience(document.querySelector("article"),args)',context)
assert.equal(document.querySelector('[data-activity-response]').value,'The opening becomes wider.')
assert.equal(document.querySelector('[data-lesson-stage="3"]').hidden,false)
assert.ok(saves>0)
console.log('PASS: angle geometry, grading, blocked unanswered classwork, next steps, saved responses and reopening.')
