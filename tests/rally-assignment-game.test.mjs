import {createAdaptivePractice,nextAdaptiveQuestion,recordAdaptiveAnswer,placeAdaptiveQuestion,adaptiveQuestionLabel} from '../src/rally-adaptive-practice.js'
import {randomUUID} from 'node:crypto'
import {RALLY_CARS,garagePrefs} from '../src/maths-rally-adventure.js'
import {raceStars} from '../src/maths-rally-tracks.js'
import {RALLY_MODES,quickRace,racePlan} from '../src/rally-race-modes.js'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {RALLY_TRACKS,getTrack} from '../src/maths-rally-tracks.js'
import {validateRallyQuestions} from '../src/rally-assignment.js'
import {createRace,answerRace,tickRace,summariseRace} from '../src/maths-rally-engine.js'

// Exercise the real class-race controller with inert rendering and storage.
// No DOM package, network, learner records or personal-progress writes are used.
let now=Date.now(),personalWrites=0,patches=[],finished=null,answered=[],activated=[]
const widget=()=>({innerHTML:'',textContent:'',style:{},dataset:{},classList:{toggle(){}},focus(){},querySelector(){return widget()},querySelectorAll(){return[]},setAttribute(){},remove(){}})
const body={style:{overflow:''},append(){}}
const document={body,activeElement:{focus(){}},createElement:widget,addEventListener(){},querySelector(){return widget()},querySelectorAll(){return[]}}
class Clock extends Date {static now(){return now}}
const context=vm.createContext({document,window:{addEventListener(){},confirm(){return true}},localStorage:{getItem(){return null}},Date:Clock,console,Math,JSON,Object,Number,String,Boolean,Map,Set,
 MutationObserver:class{observe(){}},requestAnimationFrame(){return 1},cancelAnimationFrame(){},
 supabase:{auth:{onAuthStateChange(){}}},createRallyProgressStore:()=>({getState:()=>({cup:{},history:[],garage:{},progress:{}}),getOwner:()=>null,getStatus:()=>'saved',update(patch){personalWrites++;patches.push(patch)}}),
 createAdaptivePractice,nextAdaptiveQuestion,recordAdaptiveAnswer,placeAdaptiveQuestion,adaptiveQuestionLabel,crypto:{randomUUID},RALLY_CARS,garagePrefs,raceStars,selectVariedQuestions:(pool,n)=>pool.slice(0,n),RALLY_MODES,quickRace,racePlan,RALLY_TRACKS,getTrack,validateRallyQuestions,createRace,answerRace,tickRace,summariseRace,renderVectorText:x=>x,worldFor:()=>({name:'Test world'}),colourFor:()=>({hex:'#fff'}),FINISH_DISTANCE:1200})
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

context.quickPool=Array.from({length:10},(_,i)=>q('quick'+i,i+1))
vm.runInContext('overlay=document.createElement("section");questionPool=quickPool',context)
assert.equal(context.canPlayStage('monster',{race_mode:'quick5'}),true)
assert.equal(context.canPlayStage('monster',{race_mode:'cup'}),false)
await context.startRace(false,{race_mode:'quick5',rally_course:'monster',class_level:'Grade 4',curriculum:'Cambridge',topic:'__all_topics__',difficulty:'club',race_view:'2d'})
assert.equal(vm.runInContext('race.requiredQuestions',context),5)
assert.equal(vm.runInContext('race.finishDistance',context),600)
vm.runInContext('questions.forEach(q=>answerRace(race,q,"A",1));race.finished=true;race.finishTime=10',context)
context.showResults()
assert.equal(patches.length,1)
assert.deepEqual(Object.keys(patches[0]),['history'])
assert.equal(patches[0].history[0].mode,'quick5')
assert.equal(patches[0].history[0].stars,0)
assert.equal(patches[0].history[0].correct,5)
assert.equal(patches[0].history[0].total,5)
console.log('PASS quick races can use later courses, use five questions and 600 metres, save labelled history, and never grant Cup stars or unlocks.')

context.adaptivePool=Array.from({length:24},(_,i)=>({...q('adaptive'+i,i+1),question_text:`Adaptive question ${i}`,difficulty:[4,10,16][Math.floor(i/8)],topic:'Fractions'}))
vm.runInContext('questionPool=adaptivePool',context)
await context.startRace(false,{race_mode:'quick5',question_mode:'adaptive',rally_course:'monster',class_level:'Grade 4',curriculum:'Cambridge',topic:'Fractions',difficulty:'club',race_view:'2d'})
assert.equal(vm.runInContext('questions[0].difficulty',context),10)
context.frame(1000);context.frame(4100);context.chooseAnswer('A');context.frame(5300);context.chooseAnswer('A')
assert.equal(vm.runInContext('questions[2].difficulty',context),16)
context.frame(6500);context.chooseAnswer('B')
assert.equal(vm.runInContext('questions[3].difficulty',context),10)
assert.equal(vm.runInContext('questions.length',context),5)
assert.equal(vm.runInContext('new Set(questions.map(q=>q.question_text)).size',context),5)
assert.equal(vm.runInContext('race.answers[2].question_text',context),vm.runInContext('questions[2].question_text',context))
vm.runInContext('race.finished=true;race.finishTime=10',context)
context.showResults()
assert.equal(patches[1].history[0].questionMode,'adaptive')
assert.deepEqual(Object.keys(patches[1]),['history'])
console.log('PASS real adaptive controller raises/lowers the next authored question, keeps five unique snapshots, preserves answered evidence and saves an adaptive history label.')
await context.startRace(false,{race_mode:'cup',question_mode:'adaptive',rally_course:'sprint',class_level:'Grade 4',curriculum:'Cambridge',topic:'Fractions',difficulty:'club',race_view:'2d'})
assert.equal(vm.runInContext('adaptivePractice',context),null)
assert.equal(vm.runInContext('race.requiredQuestions',context),5)
console.log('PASS Circuit Cup ignores adaptive selection and retains its prescribed question count.')
