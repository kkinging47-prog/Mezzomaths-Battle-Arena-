import assert from 'node:assert/strict'
import {rallySettings,validateRallyQuestions,rallyDeadline,savedRallyAnswers} from '../src/rally-assignment.js'
import {checkpointQuestion,questionRemaining} from '../src/assignment-timing.js'
import {assignmentAnswersCsv} from '../src/assignment-answer-review.js'
import {createRace,answerRace,tickRace} from '../src/maths-rally-engine.js'

const q={id:'q1',position:1,question_text:'2 + 2?',option_a:'4',option_b:'5',option_c:'6',option_d:'7',correct_answer:'A',question_type:'single_select',marking:'auto',marks:1,time_limit_seconds:10,source_metadata:{rally:{version:1,track:'monster',pace:'club'}}}
assert.deepEqual(rallySettings([q]),{version:1,track:'monster',pace:'club'})
assert.equal(rallySettings([{...q,source_metadata:{}}]),null)
assert.equal(rallySettings([q,{...q,marks:2}]),null)
assert.equal(rallySettings([q,{...q,source_metadata:{rally:{version:1,track:'oval',pace:'club'}}}]),null)
validateRallyQuestions([q])
for(const bad of [{...q,question_type:'reasoning'},{...q,marks:2},{...q,correct_answer:'5'},{...q,option_d:''}])assert.throws(()=>validateRallyQuestions([bad]))
const p={startedAt:1000,assignment:{duration_minutes:5,closes_at:new Date(500000).toISOString()},answers:{1:'B'},rallyCompleted:[1,2],activeQuestion:1,questionStartedAt:1000}
assert.equal(rallyDeadline(p),301000)
p.assignment.closes_at=new Date(200000).toISOString();assert.equal(rallyDeadline(p),200000)
assert.deepEqual(savedRallyAnswers(p),{1:'B',2:''})
checkpointQuestion(p,5000);p.activeQuestion=null;assert.equal(questionRemaining(p,q,9000),6)
p.activeQuestion=1;p.questionStartedAt=9000;assert.equal(questionRemaining(p,q,15000),0)
const race=createRace('club',1);race.maxSeconds=600;for(let i=0;i<2400;i++)tickRace(race,.1,false);assert.equal(race.finished,false)
answerRace(race,q,'',0);assert.equal(race.correct,0);assert.equal(race.answers.length,1)
const csv=assignmentAnswersCsv([{id:'a',participant_name:'=DANGEROUS()',participant_class:'Grade 4'}],[q,{...q,position:2}],[{attempt_id:'a',question_position:1,selected_answer:'B',correct_answer:'A',is_correct:false,awarded_marks:0,max_marks:1}])
assert(csv.includes("'=DANGEROUS()"));assert(csv.includes('B. 5'));assert(csv.includes('A. 4'));assert(csv.includes('Wrong'));assert(csv.includes('Not recorded'))
console.log('PASS class-race settings, MCQ restrictions, fixed deadline, resumed/timed-out answers, question timers, custom race duration and detailed safe CSV export.')
