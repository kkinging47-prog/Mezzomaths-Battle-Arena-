import assert from 'node:assert/strict'
import {createAdaptivePractice,nextAdaptiveQuestion,recordAdaptiveAnswer,placeAdaptiveQuestion,adaptiveQuestionLabel} from '../src/rally-adaptive-practice.js'
import {mergeRallyProgress} from '../src/rally-progress-model.js'

const q=(id,difficulty,topic='Fractions')=>({id,question_text:`Question ${id}`,difficulty,topic,option_a:'1',option_b:'2',option_c:'3',option_d:'4',correct_answer:'A'})
for(const levels of [[1,2,3],[4,10,16]]){
 const pool=levels.flatMap(level=>Array.from({length:8},(_,i)=>q(`${level}-${i}`,level)))
 const state=createAdaptivePractice(pool)
 let first=nextAdaptiveQuestion(state,()=>0);assert.equal(first.difficulty,levels[1])
 recordAdaptiveAnswer(state,first,true);assert.equal(state.target,1)
 recordAdaptiveAnswer(state,first,true);assert.equal(state.streak,1,'duplicate answers must not raise the challenge')
 const second=nextAdaptiveQuestion(state,()=>0);recordAdaptiveAnswer(state,second,true);assert.equal(state.target,2)
 const harder=nextAdaptiveQuestion(state,()=>0);assert.equal(harder.difficulty,levels[2]);recordAdaptiveAnswer(state,harder,false);assert.equal(state.target,1)
 const support=nextAdaptiveQuestion(state,()=>0);assert.equal(support.difficulty,levels[1]);recordAdaptiveAnswer(state,support,false);assert.equal(state.target,0)
 const easier=nextAdaptiveQuestion(state,()=>0);assert.equal(easier.difficulty,levels[0])
 const used=[];let next;while((next=nextAdaptiveQuestion(state,()=>0)))used.push(next.question_text)
 assert.equal(new Set(used).size,used.length);assert.equal(state.used.size,pool.length)
}
const focused=createAdaptivePractice([q('start',2),q('target',1,'Fractions'),q('other',1,'Time'),q('high',3)])
recordAdaptiveAnswer(focused,q('start',2),false);assert.equal(nextAdaptiveQuestion(focused,()=>0).topic,'Fractions')
const sparse=createAdaptivePractice([q('a',4),q('b',16)])
const low=nextAdaptiveQuestion(sparse,()=>0);recordAdaptiveAnswer(sparse,low,false)
const high=nextAdaptiveQuestion(sparse,()=>0);assert.equal(high.difficulty,16);assert.match(adaptiveQuestionLabel(sparse,high),/nearest available/)
const tie=createAdaptivePractice([q('low',4),q('middle',10),q('upper',16)])
nextAdaptiveQuestion(tie,()=>0);assert.equal(nextAdaptiveQuestion(tie,()=>0).difficulty,4,'prefer support when equally near levels remain')
const single=createAdaptivePractice([q('a',null),q('b',null)])
assert(nextAdaptiveQuestion(single));assert.match(adaptiveQuestionLabel(single,q('x',null)),/One difficulty level/)
const repeated=createAdaptivePractice([q('same',1),q('same',2)]);assert.equal(repeated.pool.length,1)
const planned=[q('one',1),q('two',2),q('three',3)]
placeAdaptiveQuestion(planned,1,q('three',3));assert.deepEqual(planned.map(q=>q.id),['one','three','two'])
placeAdaptiveQuestion(planned,2,q('external',2));assert.equal(planned.length,3)
assert.throws(()=>placeAdaptiveQuestion(planned,2,planned[0]),/repeat/)
const saved=mergeRallyProgress({}, {history:[{id:'adaptive',completedAt:'2026-11-03T18:00:00Z',mode:'quick5',questionMode:'adaptive'}]})
assert.equal(saved.history[0].questionMode,'adaptive')
console.log('PASS authored difficulty scales, two-correct promotion, wrong-answer support, duplicate guards, missed-topic priority, sparse/single-level fallback, unique questions, fixed counts and saved adaptive history.')
