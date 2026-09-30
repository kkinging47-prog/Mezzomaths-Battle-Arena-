import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const {parseHTML}=await import(process.env.LESSON_TEST_DOM||'linkedom')
const {window,document}=parseHTML('<html><body><div id="assistant"></div></body></html>')
const context=vm.createContext({document,window,supabase:null,console})
vm.runInContext(fs.readFileSync('src/lesson-tool-assistant.js','utf8').replace(/^import .*$/gm,'').replace(/export /g,''),context)
assert.equal(vm.runInContext("inferLessonTools({interactive:'Use a rectangular book corner as reference.'}).tool",context),'angle_compare')
assert.equal(vm.runInContext("inferLessonTools({interactive:'Start with a right angle and open the strips wider.'}).initial_angle",context),90)
assert.equal(vm.runInContext("inferLessonTools({interactive:'Complete an Angle Hunt and photograph or sketch each example.'}).tool",context),'angle_hunt')
assert.equal(vm.runInContext("inferLessonTools({interactive:'Drag counters into equal groups.'}).tool",context),'counters')
assert.equal(vm.runInContext("validToolPlan({tool:'execute-code',initial_angle:60,steps:['run'],guidance:'unsafe'})",context),false)
const draft={};let saves=0
context.args={course:{id:'c'},lesson:{interactive:'Complete an Angle Hunt.'},ci:0,li:0,draft,persist:()=>saves++,angleHtml:()=>'',bindAngle:()=>{}}
vm.runInContext('mountToolAssistant(document.querySelector("#assistant"),args)',context)
assert.equal(document.querySelectorAll('.angle-hunt-board fieldset').length,4)
const example=document.querySelector('[data-workspace]');example.value='A book corner';example.dispatchEvent(new window.Event('input',{bubbles:true}));assert.equal(draft.workspace.hunt[0].example,'A book corner')
const angle=document.querySelector('[data-hunt-angle="3"]');assert.equal(angle.value,'180')
context.args.lesson={interactive:'Move counters into equal groups.'};context.args.draft={}
vm.runInContext('mountToolAssistant(document.querySelector("#assistant"),args)',context)
assert.equal(document.querySelectorAll('[data-counter-group]').length,2)
document.querySelector('[data-add-group]').onclick();assert.equal(document.querySelectorAll('[data-counter-group]').length,3)
document.querySelector('[data-counter="0:0"]').dispatchEvent(new window.Event('click',{bubbles:true}));document.querySelector('[data-counter-group="2"]').dispatchEvent(new window.Event('click',{bubbles:true}));assert.deepEqual(Array.from(context.args.draft.workspace.groups),[2,3,1])
assert.ok(saves>0)
console.log('PASS: lesson-aware tool selection, supported tool validation, angle hunt drafts, counters and touch/keyboard alternative.')
