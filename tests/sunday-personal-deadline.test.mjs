import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import resume from '../server/bece-sunday-resume.js'
import progress from '../server/bece-sunday-progress.js'
import {signTrialSession,sundayWindowOpen,trialDeadline} from '../api/_bece-sunday-security.js'
process.env.SUPABASE_URL='https://mock.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test';process.env.BECE_SUNDAY_SESSION_SECRET='test'
const RealDate=Date;let now='2026-11-08T20:10:00Z'
globalThis.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[now]))}static now(){return RealDate.parse(now)}}
const id='MSB-1234567890ABCDEF12',startedAt=Date.parse('2026-11-08T19:50:00Z'),expiresAt=startedAt+3600000
const token=signTrialSession({ids:['q1'],candidateId:id,weekStart:'2026-11-08',mode:'sunday',index:0,startedAt,expiresAt})
const claim={session_token:token,session_expires_at:new Date(expiresAt).toISOString(),week_start:'2026-11-08',completed_at:null,school_id:null,session_data:{selections:{q1:'B'},index:0}}
let writes=0
globalThis.fetch=async(url,options={})=>{
 if(url.includes('bece_sunday_weekly_claims')) {if(options.method==='PATCH'){writes++;return new Response('[{}]')}return new Response(JSON.stringify([claim]))}
 if(url.includes('bece_question_bank'))return new Response(JSON.stringify([{id:'q1',question_text:'Test',option_a:'1',option_b:'2',option_c:'3',option_d:'4'}]))
 throw Error('Unexpected request')
}
const run=async(fn,body)=>{let result;await fn({method:'POST',body},{setHeader(){},status(code){this.code=code;return this},json(body){result={code:this.code,body}}});return result}
let r=await run(resume,{candidate_id:id,session_token:token});assert.equal(r.code,200);assert.equal(r.body.started_at,startedAt);assert.equal(r.body.session_expires_at,claim.session_expires_at);assert.equal(r.body.selections.q1,'B')
assert.equal((await run(resume,{candidate_id:id,session_token:'wrong'})).code,403)
assert.equal((await run(progress,{session_token:token,selections:{q1:'A'},index:0})).code,200)
assert.equal(sundayWindowOpen(new Date('2026-11-08T17:59:59Z')),false)
assert.equal(sundayWindowOpen(new Date('2026-11-08T18:00:00Z')),true)
assert.equal(sundayWindowOpen(new Date('2026-11-08T19:59:59Z')),true)
assert.equal(sundayWindowOpen(new Date('2026-11-08T20:00:00Z')),false)
const source=fs.readFileSync(new URL('../src/bece-sunday-trial-window-v2.js',import.meta.url),'utf8')
const saved={candidate:{candidate_id:id},started_at:startedAt,expires_at:claim.session_expires_at,mode:'sunday'}
let rendered=0
const context=vm.createContext({Date,Number,Infinity,active:null,starting:false,candidate:()=>({candidate_id:id,registration_status:'confirmed'}),currentAttempt:()=>null,activeForCandidate:()=>saved,trialWindow:()=>({open:false}),labOpen:()=>false,renderQuestion:()=>rendered++,renderSundayHome:()=>{throw Error('Active session must resume after admissions close')}})
vm.runInContext(source.slice(source.indexOf('function officialDeadline('),source.indexOf('async function startAdminPreview(')),context)
await vm.runInContext('startTrial()',context);assert.equal(rendered,1);assert.equal(vm.runInContext('officialDeadline()',context),expiresAt)
now='2026-11-08T20:50:00Z'
assert.equal(vm.runInContext('examinationClosed()',context),true)
assert.equal((await run(resume,{candidate_id:id,session_token:token})).code,409)
assert.equal((await run(progress,{session_token:token,selections:{q1:'A'},index:0})).code,401);assert.equal(writes,1)
assert.equal(trialDeadline({mode:'school_lab',startedAt,expiresAt:startedAt+7200000}),startedAt+7200000)
globalThis.Date=RealDate
console.log('PASS after-8PM resume and progress, original deadline and saved answers preserved, UI cached resume, exact personal expiry, 6–8PM admission boundaries, and unchanged school lab duration. Mock data only.')
