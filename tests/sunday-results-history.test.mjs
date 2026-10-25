import assert from 'node:assert/strict'
import history,{signHistoryAccess,verifyHistoryAccess} from '../server/bece-sunday-history.js'
import {signTrialSession,verifyTrialSession} from '../api/_bece-sunday-security.js'
process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test';process.env.BECE_SUNDAY_SESSION_SECRET='test'
const id='MSB-1234567890ABCDEF12',week='2026-10-18'
const exam=signTrialSession({ids:['q1'],candidateId:id,weekStart:week,index:0,expiresAt:Date.now()-1000,startedAt:Date.now()-60000})
assert.throws(()=>verifyTrialSession(exam),/expired/)
const token=signHistoryAccess(id);assert.equal(verifyHistoryAccess(token),id);assert.throws(()=>verifyHistoryAccess(exam))
let questionRequests=0,snapshot=false,empty=false
const reply=x=>new Response(JSON.stringify(x),{status:200})
globalThis.fetch=async(url,options)=>{
 if(url.includes('rpc/sunday_candidate_history')) {assert.equal(JSON.parse(options.body).p_candidate_id,id);return reply({summary:empty?null:{average_score:37,overall_rank:3},weeks:empty?[]:[{week_start:week,candidate_id:id,score:1,total:1,session_token:exam,session_data:{selections:{q1:'A'}},result:snapshot?{review:[{question_text:'Snapshot',selected_answer:'A',correct_answer:'A',correct:true}]}:{}}]})}
 if(url.includes('bece_question_bank')){questionRequests++;return reply([{id:'q1',question_text:'1+1',option_a:'2',option_b:'3',option_c:'4',option_d:'5',correct_answer:'A',explanation:'Add one and one.'}])}
 throw Error('Unexpected URL')
}
async function run(body){let result;await history({method:'POST',body},{status(n){this.code=n;return this},json(body){result={status:this.code,body}},setHeader(){}});return result}
let r=await run({history_token:token});assert.equal(r.status,200);assert.equal(questionRequests,0);assert.equal(r.body.weeks[0].session_token,undefined);assert.equal(r.body.weeks[0].session_data,undefined)
r=await run({history_token:token,week_start:week});assert.equal(r.status,200);assert.equal(r.body.weeks[0].answers[0].correct,true);assert.equal(r.body.weeks[0].answers[0].explanation,'Add one and one.');assert.equal(r.body.weeks[0].reconstructed,true)
snapshot=true;r=await run({history_token:token,week_start:week});assert.equal(r.body.weeks[0].answers[0].question_text,'Snapshot');assert.equal(questionRequests,1)
assert.equal((await run({history_token:token+'x'})).status,403);assert.equal((await run({history_token:exam})).status,403);assert.equal((await run({candidate_id:id})).status,403)
r=await run({session_token:exam,week_start:week});assert.equal(r.status,200);assert.equal(r.body.weeks[0].score,1);assert.equal((await run({session_token:exam,week_start:'2026-10-25'})).status,403);assert.equal((await run({session_token:exam+'x',week_start:week})).status,403);
empty=true;r=await run({history_token:token});assert.equal(r.status,200);assert.deepEqual(r.body.weeks,[])
console.log('PASS: signed ownership, expired exam rejection, metadata privacy, historical reconstruction, immutable snapshots, tampering and empty history.')
