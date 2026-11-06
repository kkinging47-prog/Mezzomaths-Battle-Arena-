import assert from 'node:assert/strict'
import {createArcadeGame,answerArcade,tickArcade,advanceArcade,summariseArcade} from '../src/arcade-engines.js'
import {startBasketballShot,releaseBasketballShot,cancelBasketballShot,basketballGreenWindow} from '../src/basketball-engine.js'
import {footballDemoQuestions} from '../src/maths-football-engine.js'
const create=level=>createArcadeGame('basketball',footballDemoQuestions(),{level})
const step=(g,t,input={})=>{for(let left=t;left>1e-8&&g.phase==='playing';left-=.01)tickArcade(g,Math.min(.01,left),input)}
for(let level=1;level<=5;level++){
 const g=create(level)
 for(let round=0;round<5;round++){
  answerArcade(g,g.questions[round].correct_answer);step(g,1,{x:g.world.player.x>0?1:-1,y:1});assert(startBasketballShot(g));step(g,.748);const contested=g.world.defenders.some(d=>Math.hypot(d.x-g.world.player.x,d.z-g.world.player.z)<1.4);assert(releaseBasketballShot(g,contested?-.4/.9:0));step(g,4)
  assert.equal(g.phase,'feedback');assert.match(g.answers.at(-1).outcome,/Basket/);assert.equal(g.world.points,3*(round+1));assert(!releaseBasketballShot(g));advanceArcade(g)
 }
 assert(g.finished&&g.passed);assert.equal(summariseArcade(g).made,5)
}
const early=create(1);answerArcade(early,early.questions[0].correct_answer);startBasketballShot(early);step(early,.2);releaseBasketballShot(early);step(early,4);assert.equal(early.world.points,0);assert.match(early.answers[0].outcome,/Short/)
const short=create(1);answerArcade(short,short.questions[0].correct_answer);short.world.player={x:0,z:5,vx:0,vz:0};startBasketballShot(short);step(short,.748);releaseBasketballShot(short);step(short,4);assert.equal(short.world.points,2)
const stolen=create(5);answerArcade(stolen,stolen.questions[0].correct_answer);step(stolen,8);assert.match(stolen.answers[0].outcome,/stolen/);assert.equal(stolen.world.turnovers,1)
const clock=create(1);answerArcade(clock,clock.questions[0].correct_answer);step(clock,23);assert.match(clock.answers[0].outcome,/clock expired/)
const focus=create(1);answerArcade(focus,focus.questions[0].correct_answer);const wide=basketballGreenWindow(focus.world,1);focus.world.focus=false;assert(wide>basketballGreenWindow(focus.world,1));startBasketballShot(focus);step(focus,.4);cancelBasketballShot(focus);assert.equal(focus.world.attempts,0);assert.equal(focus.world.charging,false)
const frozen=focus.elapsed;focus.phase='question';tickArcade(focus,.025,{x:1});assert.equal(focus.elapsed,frozen)
console.log('PASS five basketball levels, trajectories, 2/3 points, early miss, steal, clock, focus, cancellation and frozen question time')
