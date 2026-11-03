import assert from 'node:assert/strict'
import {racePlan,quickRace} from '../src/rally-race-modes.js'
import {createRace,answerRace,tickRace,raceFinishDistance} from '../src/maths-rally-engine.js'
import {mergeRallyProgress} from '../src/rally-progress-model.js'

const question=i=>({id:String(i),question_text:'2 + 2?',option_a:'4',option_b:'5',option_c:'6',option_d:'7',correct_answer:'A'})
for(const [mode,count,distance] of [['quick5',5,600],['quick10',10,900],['cup',55,1200]]){
 const plan=racePlan('monster',{race_mode:mode})
 assert.equal(plan.questions,count);assert.equal(plan.distance,distance)
 const race=createRace('club',count);race.finishDistance=distance
 for(let i=0;i<count-1;i++)answerRace(race,question(i),'A',1)
 for(let i=0;i<500;i++)tickRace(race,.1,false)
 assert.equal(race.finished,false);assert(race.distance<distance)
 answerRace(race,question(count-1),'B',1)
 for(let i=0;i<10000&&!race.finished;i++)tickRace(race,.1,true)
 assert.equal(race.finished,true);assert.equal(race.distance,distance)
 assert.ok(race.bots.every(b=>b.distance<=distance))
}
assert.equal(racePlan('sprint',{}).questions,5)
assert.equal(racePlan('oval',{}).questions,10)
assert.equal(quickRace({race_mode:'invalid'}),false)
assert.equal(raceFinishDistance({finishDistance:0}),1200)
const history=mergeRallyProgress({}, {history:[{id:'quick',completedAt:'2026-11-03T17:00:00Z',mode:'quick5',total:5,stars:0}]}).history
assert.equal(history[0].mode,'quick5');assert.equal(history[0].total,5)
console.log('PASS five/ten-question short races, Cup compatibility, required-answer finish gates, shortened bot/player finish lines and persisted mode labels.')
