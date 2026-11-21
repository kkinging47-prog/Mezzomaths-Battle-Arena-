import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import * as engine from '../src/river-rally-engine.js'
const listeners={},windows={};let persisted=''
const widget=()=>({innerHTML:'',textContent:'',dataset:{},style:{},hidden:false,disabled:false,isConnected:true,focus(){},remove(){},querySelector(){return widget()},querySelectorAll(){return[]},setAttribute(){},removeAttribute(){}})
const context=vm.createContext({...engine,console,Math,JSON,Object,Number,String,Boolean,Map,Set,Date,performance:{now:()=>1000},drawRiver(){},matchMedia:()=>({matches:true}),localStorage:{getItem:()=>null,setItem(_k,v){persisted=v}},document:{body:{style:{}},activeElement:widget(),getElementById:()=>widget(),querySelector:()=>null,addEventListener(k,fn){(listeners[k]||=[]).push(fn)}},window:{addEventListener(k,fn){windows[k]=fn}},MutationObserver:class{observe(){}},requestAnimationFrame:()=>1,cancelAnimationFrame(){},history:{replaceState(){}},location:{hash:'',pathname:'/',search:''},confirm:()=>true,widget})
vm.runInContext(fs.readFileSync(new URL('../src/river-rally.js',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/export /g,''),context)
vm.runInContext("root=widget();game=createRiverRace();answerRiver(game,game.questions[0].answer);launchRiver(game);paused=false",context)
const emit=(type,key)=>listeners[type].forEach(fn=>fn({key,repeat:false,target:{matches:()=>false},preventDefault(){}}))
emit('keydown','ArrowRight');context.frame(1000);context.frame(1100);assert(vm.runInContext('game.lane',context)>0);emit('keyup','ArrowRight');assert.equal(vm.runInContext('held.size',context),0)
const touch={disabled:false,dataset:{rrSteer:'-1'},hasAttribute:()=>false,setPointerCapture(){}};listeners.pointerdown[0]({pointerId:1,target:{closest:()=>touch},preventDefault(){}});context.frame(1200);assert.equal(vm.runInContext('pointers.size',context),1);listeners.pointercancel[0]({pointerId:1});assert.equal(vm.runInContext('pointers.size',context),0)
windows.blur();assert(vm.runInContext('paused',context));const before=vm.runInContext('game.distance',context);context.frame(1400);assert.equal(vm.runInContext('game.distance',context),before);context.pause(false)
vm.runInContext("while(game.phase!=='finished'){if(game.phase==='question')answerRiver(game,game.questions[game.round].answer);if(game.phase==='feedback')launchRiver(game);tickRiver(game,.1)}",context);context.finish();assert.equal(JSON.parse(persisted).core.unlocked,2);assert.equal(JSON.parse(persisted).core.best[1],100)
console.log('PASS keyboard steering/release, touch capture/cancel, blur pause freezes race, completed-run unlock and device persistence')
