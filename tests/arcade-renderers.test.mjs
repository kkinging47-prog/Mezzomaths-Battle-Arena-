import assert from 'node:assert/strict'
import {drawKartRacing,drawSpaceDefender} from '../src/arcade-renderers.js'
import {createArcadeGame,answerArcade,tickArcade} from '../src/arcade-engines.js'
import {footballDemoQuestions} from '../src/maths-football-engine.js'
let calls=0,depth=0
const ctx=new Proxy({}, {get(_t,key){if(['createLinearGradient','createRadialGradient'].includes(key))return()=>({addColorStop(){}});return(...args)=>{calls++;if(key==='save')depth++;if(key==='restore')depth--;for(const v of args)if(typeof v==='number')assert(Number.isFinite(v),key+' nonfinite drawing input')}},set(_t,key,v){if(typeof v==='number')assert(Number.isFinite(v),String(key));return true}})
for(const width of [320,390,960])for(const kind of ['kart','space']){
 const canvas={clientWidth:width,width:0,height:0,getContext:()=>ctx},render=kind==='kart'?drawKartRacing:drawSpaceDefender
 render(canvas,null);assert.equal(canvas.height,Math.round(width*600/960))
 const game=createArcadeGame(kind,footballDemoQuestions(),{level:5,course:'night'});render(canvas,game);answerArcade(game,game.questions[0].correct_answer);tickArcade(game,.025,{fire:true,x:1});render(canvas,game);render(canvas,game,true);game.phase='feedback';game.answers[0].outcome='Complete';render(canvas,game)
 if(kind==='space'){game.round=4;game.phase='question';answerArcade(game,game.questions[4].correct_answer);render(canvas,game)}
}
assert.equal(depth,0);assert(calls>1000)
console.log('PASS kart road/rivals/obstacles/pads and space enemies/boss rendering at phone/desktop sizes, all phases, reduced motion and finite canvas operations.')
