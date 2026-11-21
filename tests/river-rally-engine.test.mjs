import assert from 'node:assert/strict'
import {createRiverRace,answerRiver,launchRiver,tickRiver,riverStroke,riverSummary,riverTarget,REFERENCE_GATES} from '../src/river-rally-engine.js'
let seed=7342;const rng=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296)
for(const difficulty of ['foundation','core','challenge'])for(let level=1;level<=5;level++){
 const g=createRiverRace(level,difficulty,rng);assert.equal(g.questions.length,6+2*(level-1));assert.equal(new Set(g.questions.map(q=>q.text)).size,g.questions.length)
 for(const q of g.questions){assert.equal(new Set(q.options).size,4);assert(q.options.includes(q.answer));assert(q.options.every(v=>Number.isInteger(v)&&v>=0))}
 while(g.phase!=='finished'){
  const target=riverTarget(g),before=g.distance,q=g.questions[g.round];assert.equal(tickRiver(g,1),false);assert.equal(g.distance,before)
  assert.equal(answerRiver(g,-123),false);assert(answerRiver(g,q.answer,4));assert.equal(answerRiver(g,q.answer),false);assert.equal(tickRiver(g,.1),false);assert(launchRiver(g));assert(riverStroke(g));assert.equal(riverStroke(g),false)
  for(let i=0;g.phase==='rowing'&&i<3000;i++){riverStroke(g);tickRiver(g,.1,i%30<15?1:-1)}
  assert.equal(g.distance,target);assert(Math.abs(g.lane)<=.85)
 }
 const s=riverSummary(g);assert(s.complete&&s.passed);assert.equal(s.correct,s.total);assert.equal(g.distance,3000);assert.equal(s.level,level)
}
const wrong=createRiverRace(1,'core',rng);while(wrong.phase!=='finished'){const q=wrong.questions[wrong.round];answerRiver(wrong,q.options.find(v=>v!==q.answer));launchRiver(wrong);while(wrong.phase==='rowing')tickRiver(wrong,.1)}assert(riverSummary(wrong).complete);assert.equal(riverSummary(wrong).passed,false)
const incomplete=createRiverRace();assert.equal(riverSummary(incomplete).passed,false);assert.deepEqual(REFERENCE_GATES,[495,950,1600,1950,2495,3000]);assert.equal(tickRiver(incomplete,Infinity),false)
console.log('PASS all 15 level/difficulty combinations, unique questions/options, checkpoint pauses, anti-double-answer, strokes, boundaries, full completion and unlock threshold')
