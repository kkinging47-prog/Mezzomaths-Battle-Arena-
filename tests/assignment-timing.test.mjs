import assert from 'node:assert/strict'
import {questionSeconds,checkpointQuestion,questionRemaining} from '../src/assignment-timing.js'
const q={position:1,source_metadata:{time_limit_seconds:20}}
assert.equal(questionSeconds(q),20)
for(const value of [-1,3601,1.5,'bad'])assert.equal(questionSeconds({time_limit_seconds:value}),0)
assert.equal(questionRemaining({},{}),null)
const p={activeQuestion:1,questionStartedAt:1000,questionTimes:{}}
assert.equal(questionRemaining(p,q,11000),10)
checkpointQuestion(p,11000);p.activeQuestion=2
assert.equal(questionRemaining(p,q,16000),10)
checkpointQuestion(p,16000);p.activeQuestion=1
assert.equal(questionRemaining(p,q,21000),5)
// Reload preserves the active interval instead of granting a fresh budget.
const resumed=JSON.parse(JSON.stringify(p))
assert.equal(questionRemaining(resumed,q,26000),0)
checkpointQuestion(resumed,26000);assert.equal(resumed.questionTimes[1],20000)
assert.equal(questionRemaining(resumed,q,99999),0)
console.log('PASS per-question limits, invalid limits, cumulative navigation, reload and expiry.')
