import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {createArcadeGame,answerArcade,tickArcade,advanceArcade,summariseArcade,useKartNitro,kartPosition,ARCADE_LEVELS,KART_COURSES} from '../src/arcade-engines.js'
import {footballDemoQuestions} from '../src/maths-football-engine.js'
const listeners={},windows={};let returnCalls=0,saves=0
const widget=()=>({innerHTML:'',textContent:'',dataset:{},style:{},classList:{toggle(){}},focus(){},remove(){},querySelector(){return widget()},querySelectorAll(){return[]},setAttribute(){}})
const context=vm.createContext({console,Math,JSON,Object,Number,String,Boolean,Map,Set,Date,ARCADE_LEVELS,KART_COURSES,createArcadeGame,answerArcade,tickArcade,advanceArcade,summariseArcade,useKartNitro,kartPosition,footballDemoQuestions,renderVectorText:s=>s,drawKartRacing(){},drawSpaceDefender(){},supabase:{auth:{onAuthStateChange(){}}},localStorage:{},document:{body:{style:{}},activeElement:{focus(){}},querySelector(){return null},querySelectorAll(){return[]},addEventListener(type,handler){(listeners[type]||=[]).push(handler)}},window:{addEventListener(type,handler){windows[type]=handler},matchMedia:()=>({matches:false})},MutationObserver:class{observe(){}},requestAnimationFrame(){return 1},cancelAnimationFrame(){},createFootballAudio:()=>({play(){},enable(){},update(){}}),createFootballResultsStore:()=>({getOwner:()=>null,getUnlockedLevel:()=>1,getRecords:()=>[],getStatus:()=>'signed-out',cacheFailed:()=>false,save(){saves++}}),widget,fixture:footballDemoQuestions(),confirm:()=>true,onReturn:()=>returnCalls++})
const source=fs.readFileSync(new URL('../src/mezzo-arcade.js',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/export /g,'')
vm.runInContext(source,context)
vm.runInContext("kind='space';overlay=widget();game=createArcadeGame(kind,fixture);answerArcade(game,fixture[0].correct_answer);paused=false;",context)
const emit=(type,key)=>listeners[type].forEach(fn=>fn({key,repeat:false,target:{matches:()=>false},preventDefault(){}}))
emit('keydown','ArrowRight');context.frame(1000);context.frame(1500);assert(vm.runInContext('game.world.player.x',context)>.7,'holding a keyboard direction moves the ship')
emit('keyup','ArrowRight');const position=vm.runInContext('game.world.player.x',context);context.frame(1700);assert.equal(vm.runInContext('game.world.player.x',context),position)
emit('keydown',' ');context.frame(1800);assert(vm.runInContext('game.world.shotCount',context)>0,'held Space fires lasers');emit('keyup',' ')
context.pause(true);const frozen=vm.runInContext('game.elapsed',context);emit('keydown','ArrowLeft');context.frame(2100);assert.equal(vm.runInContext('game.elapsed',context),frozen);context.pause(false)
const touch={dataset:{arcadeMove:'left'},disabled:false,hasAttribute:()=>false,setPointerCapture(){}};listeners.pointerdown[0]({pointerId:2,target:{closest:()=>touch},preventDefault(){}});context.frame(2200);context.frame(2500);assert(vm.runInContext('game.world.player.x',context)<position,'held touch direction moves the ship');listeners.pointercancel[0]({pointerId:2});const stopped=vm.runInContext('game.world.player.x',context);context.frame(2800);assert.equal(vm.runInContext('game.world.player.x',context),stopped)
emit('keydown','ArrowRight');windows.blur();context.frame(3200);assert.equal(vm.runInContext('paused',context),true);assert.equal(vm.runInContext('held.size',context),0)
vm.runInContext('returnAction=onReturn;demo=true;game.finished=true;',context);context.closeArcade();assert.equal(returnCalls,1,'kart closure can return to Rally');assert.equal(saves,0)
console.log('PASS real arcade controller keyboard holds/releases, Space firing, touch capture/cancel, pause/blur safeguards, return callback and demo no-save path.')
