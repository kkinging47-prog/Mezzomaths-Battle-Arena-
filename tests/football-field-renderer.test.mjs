import assert from 'node:assert/strict'
import {drawFootballField} from '../src/football-field-renderer.js'
import {createAttack} from '../src/football-career.js'
let calls=0,depth=0
const c=new Proxy({}, {get(_target,key){if(key==='createRadialGradient')return()=>({addColorStop(){}});return(...args)=>{calls++;if(key==='save')depth++;if(key==='restore')depth--;for(const value of args)if(typeof value==='number')assert(Number.isFinite(value),key+' nonfinite coordinate')}},set(){return true}})
for(const width of [320,390,900]){
 const canvas={clientWidth:width,width:0,height:0,getContext:()=>c}
 drawFootballField(canvas,null);assert.equal(canvas.height,Math.round(width*510/900))
 for(let level=1;level<=5;level++)for(const phase of ['question','aim','feedback']){const match={level,phase,aimX:535,field:createAttack(level)};match.field.result=phase==='feedback'?'goal':null;drawFootballField(canvas,match);drawFootballField(canvas,match,'#fff',true)}
}
assert.equal(depth,0);assert(calls>1000)
console.log('PASS football field renderer across phone/desktop sizes, five levels, question/action/celebration states, reduced motion and finite coordinates.')
