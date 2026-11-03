import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {RALLY_TRACKS,getTrack} from '../src/maths-rally-tracks.js'
import {validateRallyQuestions} from '../src/rally-assignment.js'
import {createRace,answerRace,tickRace,summariseRace} from '../src/maths-rally-engine.js'

// Exercise the real class-race controller with inert rendering and storage.
// No DOM package, network, learner records or personal-progress writes are used.
let now=Date.now(),personalWrites=0,finished=null,answered=[],activated=[]
const widget=()=>({innerHTML:'',textContent:'',style:{},dataset:{},classList:{toggle(){}},focus(){},querySelector(){return widget()},querySelectorAll(){return[]},setAttribute(){},remove(){}})
const body={style:{overflow:''},append(){}}
const document={body,activeElement:{focus(){}},createElement:widget,addEventListener(){},querySelector(){return widget()},querySelectorAll(){return[]}}
class Clock extends Date {static now(){return now}}
const context=vm.createContext({document,window:{addEventListener(){},confirm(){return true}},localStorage:{getItem(){return null}},Date:Clock,console,Math,JSON,Object,Number,String,Boolean,Map,Set,
 MutationObserver:class{observe(){}},requestAnimationFrame(){return 1},cancelAnimationFrame(){},
 supabase:{auth:{onAuthStateChange(){}}},createRallyProgressStore:()=>({getState:()=>({cup:{},history:[],garage:{},progress:{}}),getOwner:()=>null,update(){personalWrites++}}),
 RALLY_TRACKS,getTrack,validateRallyQuestions,createRace,answerRace,tickRace,summariseRace,renderVectorText:x=>x,worldFor:()=>({name:'Test world'}),colourFor:()=>({hex:'#fff'}),FINISH_DISTANCE:1200})
let source=fs.readFileSync(new URL('../src/maths-rally.js',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace('export async function','async function')
vm.runInContext(source,context)
vm.runInContext('drawTrack=()=>{};updateHud=()=>{}',context)
const q=(id,position)=>({id,position,question_text:'2+2?',option_a:'4',option_b:'5',option_c:'6',option_d:'7',correct_answer:'A'})
const assigned={assignment:{title:'Class test',class_level:'Grade 4',curriculum:'Cambridge',topic:'All topics',duration_minutes:5,rally:{track:'monster',pace:'club'}},questions:[q('q1',1),q('q2',2)],answers:{},deadline:now+60000,remaining:()=>null,onQuestion:q=>activated.push(q.position),onAnswer:(q,a)=>answered.push([q.position,a]),onFinish:summary=>{finished=summary}}
await context.openAssignedRally(assigned)
assert.equal(vm.runInContext('race.requiredQuestions',context),2)
assert.equal(vm.runInContext('race.stageTrackId',context),'monster')
context.frame(1000);context.frame(4100)
context.chooseAnswer('A');context.frame(5300);context.chooseAnswer('B')
assert.deepEqual(answered,[[1,'A'],[2,'B']]);assert.deepEqual(activated,[1,2])
context.togglePause(true);now+=61000;context.frame(5400)
assert.equal(finished.correct,1);assert.equal(finished.answered,2)
assert.equal(personalWrites,0);assert.equal(vm.runInContext('classRace',context),null)
assert.equal(vm.runInContext('selectedTrackId',context),'sprint')
assert.equal(vm.runInContext('lastConfig',context),null)
// Completed and timed-out positions remain completed after a refresh.
answered=[];activated=[];finished=null
assigned.answers={1:'',2:'A'};assigned.deadline=now+60000
await context.openAssignedRally(assigned)
assert.equal(vm.runInContext('index',context),2)
assert.equal(vm.runInContext('race.answers.length',context),2)
assert.equal(answered.length,0)
context.finishAssignedRace();assert.equal(finished.correct,1);assert.equal(personalWrites,0)
console.log('PASS real game controller: assigned snapshots/count/course, answer callbacks, deadline during pause, no personal writes, restored personal selection, and resumed expired positions.')
