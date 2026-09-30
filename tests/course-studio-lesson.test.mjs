import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const {parseHTML}=await import(process.env.LESSON_TEST_DOM||'linkedom')
const {window,document}=parseHTML('<html><body><section data-course-admin-panel><form id="courseAdminForm"></form></section></body></html>')
const form=document.querySelector('form'),names=['title','class_level','category','course_level','instructor','duration','cover_icon','cover_image','summary','access_type','price','status','featured','drip_mode','prerequisite_course_id','outcomes','requirements']
form.innerHTML='<input type="hidden" name="id" value="course-test"><input type="hidden" name="course_structure"><label>Setup<textarea name="course_setup"></textarea></label>'+names.map(n=>`<label>${n}<input name="${n}" value="Example"></label>`).join('')+'<div class="completion-rule-grid"></div><button type="submit">Mount</button>'
const model={chapters:[{title:'Angles',lessons:[{title:'An opening',content:'Retain these notes.',interactive:'Two strips',homework:'Draw an angle.',homework_due:'2026-10-04T18:00:00Z',classwork_questions:[]}],quiz:[]}],final:[],announcements:[]}
form.querySelector('[name=course_structure]').value=JSON.stringify(model)
Object.defineProperty(form,'elements',{get(){return {namedItem:n=>form.querySelector(`[name="${n}"]`)}}})
for(const tag of ['HTMLInputElement','HTMLTextAreaElement','HTMLSelectElement']){const prototype=window[tag]?.prototype;if(prototype){prototype.checkValidity=()=>true;prototype.reportValidity=()=>true}}
form.addEventListener('course-studio-save-draft',e=>e.detail.saved=true)
const context=vm.createContext({document,window,Event:window.Event,CustomEvent:window.CustomEvent,MutationObserver:class{observe(){}},setTimeout:()=>{},requestAnimationFrame:()=>{},confirm:()=>true,localStorage:{getItem:()=>null},supabase:null,parseSetup:()=>model,console})
vm.runInContext(fs.readFileSync('src/professional-course-builder.js','utf8').replace(/^import .*$/gm,''),context)
vm.runInContext('enhance()',context)
assert.equal(form.querySelectorAll('[data-studio-tab]').length,7)
const click=selector=>form.querySelector(selector).dispatchEvent(new window.Event('click',{bubbles:true,cancelable:true}))
click('[data-studio-tab="chapters"]');click('[data-studio-action="add-classwork:0:0"]')
const question=form.querySelector('[data-model="chapters.0.lessons.0.classwork_questions.0.q"]');question.value='Which point is shared?';question.dispatchEvent(new window.Event('input',{bubbles:true}))
const tool=form.querySelector('[data-model="chapters.0.lessons.0.interactive_tool"]');tool.querySelectorAll('option').forEach(o=>o.removeAttribute('selected'));tool.querySelector('[value=angle]').setAttribute('selected','');tool.dispatchEvent(new window.Event('input',{bubbles:true}))
const due=form.querySelector('[data-model="chapters.0.lessons.0.homework_due"]');due.value='2026-10-05T18:00';due.dispatchEvent(new window.Event('input',{bubbles:true}))
const saved=JSON.parse(form.querySelector('[name=course_structure]').value)
assert.equal(saved.chapters[0].lessons[0].content,'Retain these notes.')
assert.equal(saved.chapters[0].lessons[0].interactive_tool,'angle')
assert.equal(saved.chapters[0].lessons[0].homework_due,'2026-10-05T18:00:00Z')
assert.equal(saved.chapters[0].lessons[0].classwork_questions[0].q,'Which point is shared?')
assert.equal(saved.chapters[0].lessons[0].classwork_questions[0].options.length,4)
assert.equal(form.querySelectorAll('[name=course_structure]').length,1)
console.log('PASS: seven sections, lesson tool and MCQ authoring, UTC deadline, draft serialization without wiping notes.')
