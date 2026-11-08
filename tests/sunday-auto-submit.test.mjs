import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import answer from '../server/bece-sunday-answer.js'
import {signTrialSession} from '../api/_bece-sunday-security.js'
process.env.SUPABASE_URL='https://mock.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test';process.env.BECE_SUNDAY_SESSION_SECRET='test'
const RealDate=Date;let now=Date.parse('2026-11-08T20:00:00Z');globalThis.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
const id='MSB-1234567890ABCDEF12',week='2026-11-08',startedAt=now-3600000
const token=signTrialSession({ids:['q1','q2'],candidateId:id,weekStart:week,mode:'sunday',index:0,startedAt,expiresAt:now})
let rpcCalls=0,patches=0,reads=0
const review=[{question_id:'q1',selected_answer:'A',correct_answer:'A',correct:true},{question_id:'q2',selected_answer:'',correct_answer:'B',correct:false}]
globalThis.fetch=async(url,options={})=>{
 if(url.includes('rpc/finalize_expired_sunday_sessions')){rpcCalls++;assert.deepEqual(JSON.parse(options.body),{p_candidate_id:id,p_week_start:week});return new Response('{"processed":1}')}
 if(url.includes('bece_sunday_weekly_claims')){if(options.method==='PATCH')patches++;else reads++;assert(url.includes(encodeURIComponent(token)));return new Response(JSON.stringify([{completed_at:new Date(now).toISOString(),result:{score:1,total:2,review,time_taken_seconds:3600,auto_submitted:true}}]))}
 throw Error('Unexpected request')
}
const run=async body=>{let r;await answer({method:'POST',body,headers:{}},{setHeader(){},status(n){this.code=n;return this},json(body){r={status:this.code,body}}});return r}
let r=await run({session_token:token,auto_submit:true,answers:[]});assert.equal(r.status,200);assert.equal(r.body.score,1);assert.equal(r.body.results[1].selected_answer,'');assert.equal(r.body.time_taken_seconds,3600);assert(r.body.auto_submitted)
r=await run({session_token:token,answers:[{question_id:'q1',selected_answer:'D'},{question_id:'q2',selected_answer:'B'}]});assert.equal(r.status,200);assert.equal(r.body.score,1,'late body cannot replace saved answers');assert.equal(patches,0);assert.equal(reads,2)
assert.equal((await run({session_token:token+'bad',auto_submit:true})).status,401);assert.equal(rpcCalls,2,'tampered proof never calls finalizer')
now-=1;assert.equal((await run({session_token:token,auto_submit:true})).status,409,'cannot force early partial submission');assert.equal(rpcCalls,2)
now+=1;const lab=signTrialSession({ids:['q1'],candidateId:id,weekStart:week,mode:'school_lab',index:0,startedAt,expiresAt:now});assert.equal((await run({session_token:lab,auto_submit:true})).status,401);assert.equal(rpcCalls,2)
const source=fs.readFileSync(new URL('../src/bece-sunday-trial-window-v2.js',import.meta.url),'utf8');let requests=0,reports=0,removed=0,confirmCalls=0
const context=vm.createContext({Date,Number,Math,Map,Boolean,Infinity,ACTIVE_KEY:'active-key',active:{id:'active',candidate:{candidate_id:id},questions:[{id:'q1'},{id:'q2'}],selections:{q1:'A'},session_token:token,started_at:startedAt,expires_at:new Date(now).toISOString(),mode:'sunday'},submitting:false,lastAutoSubmitTry:0,selectedCount:()=>1,examinationClosed:()=>true,renderClosedExamination(){throw Error('automatic must bypass recursive closure')},document:{querySelector:()=>null},window:{confirm(){confirmCalls++;return false}},fetch:async(_url,opts)=>{requests++;assert.equal(JSON.parse(opts.body).auto_submit,true);return new Response(JSON.stringify({score:1,results:review,time_taken_seconds:3600,auto_submitted:true}))},analyse:()=>({}),saveAttempt:async()=>{},renderReport:()=>reports++,localStorage:{removeItem(){removed++}},alert(){throw Error('Unexpected alert')},esc:s=>s,shell(html){throw Error(html)}})
vm.runInContext(source.slice(source.indexOf('async function finishTrial('),source.indexOf('function renderReport(')),context);await vm.runInContext('finishTrial(true)',context);assert.equal(requests,1);assert.equal(reports,1);assert.equal(removed,1);assert.equal(confirmCalls,0,'no confirmation at expiry');assert.equal(vm.runInContext('active',context),null)
globalThis.Date=RealDate
console.log('PASS expiry submission at exact cutoff, partial/unanswered marking, authoritative server answers, tamper/early/lab rejection, repeat retrieval and real UI automatic no-confirmation result flow')
