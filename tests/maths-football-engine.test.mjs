import assert from 'node:assert/strict'
import {createFootballMatch,answerFootball,shootFootball,tickFootball,advanceFootball,summariseFootball,footballDemoQuestions,FOOTBALL_ZONES} from '../src/maths-football-engine.js'
const questions=footballDemoQuestions(),finishKick=match=>{for(let i=0;i<30&&match.phase==='flight';i++)tickFootball(match,.1)}
const win=createFootballMatch(questions,{pace:'training'},()=>1)
for(const q of questions){
 assert.equal(win.phase,'question');assert.equal(shootFootball(win,'left'),false)
 assert(answerFootball(win,q.correct_answer).correct);assert.equal(answerFootball(win,'B'),null)
 assert(shootFootball(win,FOOTBALL_ZONES[(win.keeperZone+1)%3]));assert.equal(shootFootball(win,'right'),false)
 finishKick(win);assert.equal(win.answers.at(-1).goal,true);assert.equal(win.phase,'feedback');assert(advanceFootball(win))
}
assert.equal(win.finished,true);assert.equal(win.goals,5);assert.equal(win.opponentGoals,0)
assert.equal(summariseFootball(win).correct,5);assert.equal(summariseFootball(win).outcome,'Win')
const before=JSON.stringify(win);tickFootball(win,1);answerFootball(win,'A');shootFootball(win,'left');advanceFootball(win);assert.equal(JSON.stringify(win),before)
const saved=createFootballMatch(questions,{pace:'club'},()=>0)
answerFootball(saved,questions[0].correct_answer);shootFootball(saved,FOOTBALL_ZONES[saved.keeperZone]);finishKick(saved)
assert.equal(saved.goals,0);assert.equal(saved.answers[0].correct,true);assert.equal(saved.answers[0].saved,true);assert.equal(saved.opponentGoals,1)
advanceFootball(saved);answerFootball(saved,'A');assert.equal(saved.answers[1].correct,false);assert.equal(saved.phase,'flight');assert.equal(shootFootball(saved,'left'),false);finishKick(saved)
assert.equal(saved.answers[1].goal,false);assert.equal(saved.answers[1].selected,'A');assert.equal(saved.answers[1].correct_answer,'C')
const ten=questions.concat(questions.map(q=>({...q,id:q.id+'-second',question_text:q.question_text+' Again.'})))
assert.equal(createFootballMatch(ten).questions.length,10)
assert.throws(()=>createFootballMatch(questions.slice(0,4)),/five or ten/)
assert.throws(()=>createFootballMatch([...questions.slice(0,4),questions[0]]),/unique/)
assert.throws(()=>createFootballMatch(questions.map(q=>({...q,correct_answer:'Z'}))),/missing answers/)
assert.throws(()=>createFootballMatch([null,...questions.slice(1)]),/missing answers/)
assert.equal(createFootballMatch(questions,{pace:'constructor'}).pace,'club')
const keeper=createFootballMatch(questions,{pace:'challenge'},()=>1);tickFootball(keeper,-10);assert.equal(keeper.elapsed,0);for(let i=0;i<10;i++)tickFootball(keeper,.1);assert.equal(keeper.keeperZone,1)
console.log('PASS five/ten-kick matches, answer/shot locks, goals/saves, wrong-answer misses, maths accuracy, computer kicks, finish immutability, keeper movement and malformed input.')
