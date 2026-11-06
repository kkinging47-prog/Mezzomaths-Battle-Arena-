import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import * as engine from '../src/puzzle-escape-engine.js'
import {escapeScene} from '../src/puzzle-escape-scene.js'
import {footballDemoQuestions} from '../src/maths-football-engine.js'
const listeners={},windows={};let saves=0
const widget=()=>({innerHTML:'',textContent:'',dataset:{},style:{},focus(){},remove(){},querySelector(){return widget()},querySelectorAll(){return[]},setAttribute(){}})
const context=vm.createContext({...engine,escapeScene,footballDemoQuestions,widget,fixture:footballDemoQuestions(),console,Math,JSON,Object,Number,String,Boolean,Array,Date,FormData,renderVectorText:s=>s,localStorage:{},supabase:{auth:{onAuthStateChange(){}}},document:{body:{style:{}},activeElement:{focus(){}},querySelector(){return null},querySelectorAll(){return[]},addEventListener(t,f){(listeners[t]||=[]).push(f)}},window:{addEventListener(t,f){windows[t]=f}},MutationObserver:class{observe(){}},requestAnimationFrame:()=>1,cancelAnimationFrame(){},confirm:()=>true,createFootballResultsStore:()=>({getOwner:()=>null,getUnlockedLevel:()=>1,getRecords:()=>[],getStatus:()=>'signed-out',cacheFailed:()=>false,save(){saves++}})})
vm.runInContext(fs.readFileSync(new URL('../src/puzzle-escape.js',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/export /g,''),context)
vm.runInContext("overlay=widget();game=createPuzzleEscape(fixture);config={class_level:'Training demo',curriculum:'Sample arithmetic',topic:'Sample arithmetic'};training=true;",context)
context.frame(1000);context.frame(1500);const elapsed=vm.runInContext('game.elapsed',context);assert.equal(elapsed,.5)
context.pause(true);context.frame(3000);assert.equal(vm.runInContext('game.elapsed',context),elapsed);context.pause(false)
vm.runInContext("inspectEscape(game,'desk');inspectEscape(game,'mural');inspectEscape(game,'console');",context);context.frame(4000);context.frame(4500);assert.equal(vm.runInContext('game.elapsed',context),elapsed)
const correct=vm.runInContext('fixture[0].correct_answer',context);listeners.keydown[0]({key:String('ABCD'.indexOf(correct)+1),repeat:false,target:{matches:()=>false},preventDefault(){}});assert.equal(vm.runInContext('game.answers.length',context),1);assert.equal(vm.runInContext('game.answers[0].correct',context),true)
windows.blur();assert.equal(vm.runInContext('paused',context),true);context.frame(6000);assert.equal(vm.runInContext('game.elapsed',context),elapsed)
vm.runInContext('game.finished=true;game.phase="finished";',context);context.finish();assert.equal(saves,0,'training does not save a receipt');context.close();assert.equal(vm.runInContext('overlay',context),null)
for(let room=0;room<5;room++){const html=escapeScene(room,{key:true,clue:true,solved:true,disabled:true});assert.equal((html.match(/data-escape-object=/g)||[]).length,4);assert.equal((html.match(/ disabled/g)||[]).length,4);assert(html.includes('Door unlocked'))}
console.log('PASS real escape controller active clock, maths/pause freeze, keyboard answers, blur pause, demo no-save, closure and five room scenes')
