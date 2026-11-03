import assert from 'node:assert/strict'
import {drawFootballPitch} from '../src/maths-football-renderer.js'
import {createFootballMatch,footballDemoQuestions,answerFootball,shootFootball} from '../src/maths-football-engine.js'
let calls=0,depth=0
const c=new Proxy({}, {get(_target,key){if(key==='createLinearGradient')return()=>({addColorStop(){}});return(...args)=>{calls++;if(key==='save')depth++;if(key==='restore')depth--;for(const value of args)if(typeof value==='number')assert(Number.isFinite(value),key+' received a nonfinite coordinate')}},set(){return true}})
for(const width of [360,900]){
 const canvas={clientWidth:width,width:0,height:0,getContext:()=>c};drawFootballPitch(canvas,null);assert.equal(canvas.height,Math.round(width*510/900))
 const match=createFootballMatch(footballDemoQuestions());drawFootballPitch(canvas,match)
 answerFootball(match,'B');drawFootballPitch(canvas,match);shootFootball(match,'right');match.phaseElapsed=.6;drawFootballPitch(canvas,match);drawFootballPitch(canvas,match,'#fff',true)
}
assert.equal(depth,0);assert(calls>200)
console.log('PASS desktop/mobile pitch scaling, preview/aim/flight states, reduced-motion rendering, finite drawing coordinates and balanced canvas state.')
