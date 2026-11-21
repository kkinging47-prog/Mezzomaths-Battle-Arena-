import assert from 'node:assert/strict'
import {drawRiver,riverPoint} from '../src/river-rally-renderer.js'
import {createRiverRace,answerRiver,launchRiver,tickRiver} from '../src/river-rally-engine.js'
globalThis.devicePixelRatio=2
let calls=0,depth=0
const ctx=new Proxy({}, {get(_t,k){if(k==='createLinearGradient')return()=>({addColorStop(){}});return(...args)=>{calls++;if(k==='save')depth++;if(k==='restore')depth--;for(const v of args)if(typeof v==='number')assert(Number.isFinite(v),k)}},set(_t,k,v){if(typeof v==='number')assert(Number.isFinite(v),String(k));return true}})
for(const width of [320,390,960])for(const level of [1,2,3,4,5]){const canvas={width:0,height:0,getBoundingClientRect:()=>({width,height:width/1.62}),getContext:()=>ctx};drawRiver(canvas,null,0,true);const g=createRiverRace(level);drawRiver(canvas,g);answerRiver(g,g.questions[0].answer);launchRiver(g);tickRiver(g,.1,1);drawRiver(canvas,g,12);drawRiver(canvas,g,0,true);assert.equal(depth,0);assert.equal(canvas.width,width*2)}
for(let t=0;t<=1;t+=.01){const p=riverPoint(t,.85);assert(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.angle))}
assert(calls>1000);console.log('PASS all river themes at phone/desktop canvas sizes, finite coordinates, balanced draw state, obstacles, boats, reduced motion')
