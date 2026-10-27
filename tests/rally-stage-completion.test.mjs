import assert from 'node:assert/strict'
import {createRace,answerRace,tickRace,FINISH_DISTANCE} from '../src/maths-rally-engine.js'
const q=i=>({id:String(i),question_text:'1 + 1?',option_a:'2',option_b:'3',option_c:'4',option_d:'5',correct_answer:'A'})
for(const count of [5,10,55]){const race=createRace('club',count);for(let i=0;i<count-1;i++)answerRace(race,q(i),'A',1);for(let i=0;i<2000;i++){race.boost=60;tickRace(race,.05,false)}assert.equal(race.finished,false);assert.ok(race.distance<FINISH_DISTANCE);answerRace(race,q(count-1),'B',2);for(let i=0;i<20000&&!race.finished;i++)tickRace(race,.05,true);assert.equal(race.finished,true);assert.equal(race.distance,FINISH_DISTANCE);assert.equal(race.answers.length,count)}
console.log('PASS stages with 5, 10 and 55 questions cannot finish with an unanswered question; every submitted answer counts toward completion')
