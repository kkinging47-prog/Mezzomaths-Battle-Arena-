import assert from 'node:assert/strict'
import {createRace,answerRace,tickRace,useTurbo,racePosition,summariseRace,FINISH_DISTANCE} from '../src/maths-rally-engine.js'
const question=i=>({id:String(i),question_text:'2 + 2?',option_a:'1',option_b:'2',option_c:'3',option_d:'4',correct_answer:'D',topic:'Addition',explanation:'2 + 2 = 4.'})
const r=createRace();assert.equal(useTurbo(r),false)
answerRace(r,question(1),'D',2);const fast=r.boost;assert.equal(r.correct,1);assert.equal(answerRace(r,question(1),'D',2),null);assert.equal(r.answers.length,1)
const slow=createRace();answerRace(slow,question(1),'D',20);assert.ok(fast>slow.boost);const wrong=createRace();answerRace(wrong,question(1),'A',.1);assert.equal(wrong.boost,0);assert.equal(wrong.correct,0)
for(let i=2;i<=4;i++)answerRace(r,question(i),'D',3);assert.equal(r.turbo,100);assert.equal(useTurbo(r),true);assert.equal(useTurbo(r),false);tickRace(r,.05);assert.ok(r.speed>60)
answerRace(r,question(5),'B',1);assert.equal(r.streak,0);assert.equal(r.bestStreak,4);assert.equal(r.answers.at(-1).correct,false)
const run=(correct)=>{const state=createRace();for(let i=0;i<20;i++)answerRace(state,question(i),correct?'D':'A',4);for(let i=0;i<4000&&!state.finished;i++)tickRace(state,.05,true);return state};const good=run(true),bad=run(false);assert.equal(good.distance,FINISH_DISTANCE);assert.equal(good.finished,true);assert.equal(racePosition(good),1);assert.ok(good.finishTime<bad.finishTime);assert.ok(racePosition(bad)>=3)
const stopped=createRace();for(let i=0;i<4000;i++)tickRace(stopped,.05);assert.equal(stopped.finished,true);assert.equal(stopped.finishTime,null);const atEnd=JSON.stringify(stopped);tickRace(stopped,.05);assert.equal(JSON.stringify(stopped),atEnd);assert.equal(answerRace(stopped,question(1),'D',1),null)
const summary=summariseRace(wrong,[question(1),question(2)]);assert.equal(summary.gaps.length,1);assert.equal(summary.unanswered.length,1);assert.equal(summary.accuracy,0);assert.equal(summary.gaps[0].correct_answer,'D');assert.equal(summary.gaps[0].selected,'A')
console.log('PASS correctness/speed boosts, duplicate-answer lock, turbo charge/use, streak reset, finish order, race cutoff, immutable finished state, and missed/unanswered evidence')
