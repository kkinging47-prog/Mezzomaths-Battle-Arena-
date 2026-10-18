import assert from 'node:assert/strict'
import start from '../api/bece-sunday-start.js'
import answer from '../server/bece-sunday-answer.js'
import legacy from '../server/bece-sunday-candidate-access.js'
import {verifyTrialSession} from '../api/_bece-sunday-security.js'
process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test';process.env.BECE_SUNDAY_SESSION_SECRET='test'
const RealDate=Date;let now='2026-10-18T19:59:00Z';globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[now]))}static now(){return new RealDate(now).getTime()}}
const rows=Array.from({length:40},(_,i)=>({id:String(i),question_text:'Test',option_a:'1',option_b:'2',option_c:'3',option_d:'4',correct_answer:'A'}))
let savedResult,patches=0,legacyFound=true
const reply=x=>new Response(JSON.stringify(x),{status:200})
globalThis.fetch=async(url,options={})=>{
 if(url.includes('register_or_recover_sunday_candidate')){const d=JSON.parse(options.body).p_details;assert.equal(d.recover_only,true);return new Response(JSON.stringify(legacyFound?{candidate_id:'MSB-1234567890ABCDEF12',registration_status:'confirmed'}:{message:'No match'}),{status:legacyFound?200:400})}
 if(url.includes('begin_bece_sunday_session')){let body=JSON.parse(options.body);assert.equal(body.p_session_expires_at,'2026-10-18T20:00:00.000Z');return reply(true)}
 if(url.includes('bece_sunday_trial_registrations'))return reply(legacyFound?[{candidate_id:'MSB-1234567890ABCDEF12'}]:[])
 if(url.includes('sunday_bece_sets'))return reply([{id:'set1',set_number:1}])
 if(url.includes('bece_question_bank'))return reply(rows)
 if(url.includes('bece_sunday_weekly_claims')){patches++;savedResult=JSON.parse(options.body).result;return reply([{}])}
 throw Error('Unexpected URL')
}
async function run(fn,body){let result;const res={status(n){this.code=n;return this},json(body){result={status:this.code,body};return result},setHeader(){}};await fn({method:'POST',headers:{},body},res);return result}
let r=await run(start,{candidate_id:'MSB-1234567890ABCDEF12'});assert.equal(r.status,200);assert.equal(r.body.session_expires_at,'2026-10-18T20:00:00.000Z');let token=r.body.session_token
now='2026-10-18T19:59:30Z';r=await run(answer,{session_token:token,answers:rows.map(q=>({question_id:q.id,selected_answer:'A'}))});assert.equal(r.status,200);assert.equal(savedResult.time_taken_seconds,30)
now='2026-10-18T20:00:00Z';assert.throws(()=>verifyTrialSession(token),/expired/);r=await run(answer,{session_token:token,answers:rows.map(q=>({question_id:q.id,selected_answer:'A'}))});assert.equal(r.status,401);assert.equal(patches,1)
now='2026-10-18T14:00:00Z';r=await run(legacy,{action:'restore-legacy',full_name:'Eliezer Nkrumah',contact:'synthetic-contact'});assert.equal(r.status,200);assert.equal(r.body.registration_status,'confirmed')
legacyFound=false;r=await run(legacy,{action:'restore-legacy',full_name:'Eliezer Nkrumah',contact:'wrong-contact'});assert.equal(r.status,400)
legacyFound=true;now='2026-10-19T10:00:00Z';r=await run(legacy,{action:'restore-legacy',full_name:'Eliezer Nkrumah',contact:'synthetic-contact'});assert.equal(r.status,200)
console.log('PASS: late start expires at 8 PM; server elapsed time; submission rejected exactly at cutoff; matching recovery; wrong-contact rejection; recovery available after launch day. No production writes.')
