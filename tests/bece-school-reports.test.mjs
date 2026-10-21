import assert from 'node:assert/strict'
import handler from '../server/bece-school-reports.js'
import {buildSchoolReports,schoolReportCsv,schoolReportHtml} from '../src/bece-school-report-utils.js'
process.env.SUPABASE_URL='https://mock.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test';process.env.RESEND_API_KEY='test';process.env.RESEND_FROM_EMAIL='Mezzo <reports@example.org>'
const registrations=[{candidate_id:'a1',full_name:'Student A',contact:'private-a@example.org',school_name:'School Alpha',class_level:'JHS 3',identity_key:'a'},{candidate_id:'a2',full_name:'Student A',contact:'private-a@example.org',school_name:'School Alpha',identity_key:'a'},{candidate_id:'b',full_name:'Student B',contact:'private-b@example.org',school_name:' school alpha ',identity_key:'b'},{candidate_id:'c',full_name:'=DANGEROUS()',contact:'private-c@example.org',school_name:'School Beta',identity_key:'c'}]
const claims=[{candidate_id:'a1',claimed_at:'2026-10-18T18:00:00Z',completed_at:null},{candidate_id:'a2',claimed_at:'2026-10-18T18:10:00Z',completed_at:'2026-10-18T18:40:00Z',score:37,total:40,time_taken_seconds:1800,topics:{Algebra:{correct:8,total:10}}},{candidate_id:'b',claimed_at:'2026-10-18T18:01:00Z',completed_at:'2026-10-18T18:21:00Z',score:20,total:40,time_taken_seconds:1200,topics:{Algebra:{correct:5,total:10}}}]
const report=buildSchoolReports(registrations,claims,{week:'2026-10-18',mode:'sunday'});assert.equal(report.schools.length,2);const alpha=report.schools.find(s=>s.school_key==='school alpha');assert.equal(alpha.summary.registered,2);assert.equal(alpha.summary.submitted,2);assert.equal(alpha.summary.average_score,28.5);assert.equal(alpha.summary.duplicate_profiles,1);assert.equal(alpha.topics[0].accuracy,65);assert.equal(alpha.students[0].weekly_rank,1);assert.equal(alpha.students[0].school_rank,1)
const csv=schoolReportCsv(report,[alpha]);assert.ok(!csv.includes('DANGEROUS'));assert.ok(!csv.includes('private-a'));assert.ok(schoolReportCsv(report).includes("'=DANGEROUS()"));assert.ok(schoolReportHtml(report,{...alpha,school_name:'<script>bad</script>'}).includes('&lt;script&gt;'))
let admin=true,emailCalls=0,keys=[],payloads=[],aliases={};globalThis.fetch=async(url,options={})=>{
 let data
 if(url.includes('/auth/v1/user'))data={id:'admin-user'}
 else if(url.includes('/profiles?'))data=[{role:admin?'admin':'student'}]
 else if(url.includes('/app_settings?')){if(options.method==='POST'){aliases=JSON.parse(options.body).value;data=[]}else data=[{value:aliases}]}
 else if(url.includes('bece_sunday_trial_registrations?'))data=registrations
 else if(url.includes('bece_sunday_weekly_claims?'))data=claims
 else if(url==='https://api.resend.com/emails'){emailCalls++;keys.push(options.headers['Idempotency-Key']);payloads.push(JSON.parse(options.body));data={id:'mock-email-id'}}
 else throw Error('Unexpected URL '+url)
 return new Response(JSON.stringify(data),{status:200})
}
async function run(body,headers={authorization:'Bearer test'}){let r;await handler({method:'POST',headers,body},{status(n){this.code=n;return this},json(body){r={status:this.code,body}},setHeader(){}});return r}
let r=await run({week_start:'2026-10-18'});assert.equal(r.status,200);assert.ok(!JSON.stringify(r.body).includes('private-a'));assert.equal(r.body.summary.submitted,2);const digest=r.body.report_digest
admin=false;assert.equal((await run({week_start:'2026-10-18'})).status,403);admin=true
const send={operation:'send',week_start:'2026-10-18',school_key:'school alpha',head_email:'head@alpha.example',reviewed:true,report_digest:digest}
assert.equal((await run({...send,reviewed:false})).status,409);assert.equal(emailCalls,0);assert.equal((await run({...send,report_digest:'wrong'})).status,409)
r=await run(send);assert.equal(r.status,200);assert.equal(r.body.accepted,true);await run(send);assert.equal(keys[0],keys[1]);assert.deepEqual(payloads[0],payloads[1]);assert.deepEqual(payloads[0].to,['head@alpha.example']);assert.ok(!payloads[0].html.includes('DANGEROUS'));assert.ok(!Buffer.from(payloads[0].attachments[0].content,'base64').toString().includes('DANGEROUS'))
r=await run({operation:'group-schools',week_start:'2026-10-18',from_school:'school beta',to_school:'school alpha'});assert.equal(r.status,200);r=await run({week_start:'2026-10-18'});assert.equal(r.body.schools.length,1);assert.equal(r.body.schools[0].summary.registered,3);assert.equal(r.body.schools[0].summary.submitted,2);await run({operation:'reset-school-groups',week_start:'2026-10-18'});assert.deepEqual(aliases,{});
delete process.env.RESEND_API_KEY;assert.equal((await run(send)).status,503);assert.equal((await run({week_start:'2026-10-19'})).status,400)
console.log('PASS school grouping, deduplicated results, ranks/topics, private contacts excluded, safe CSV/HTML, admin-only access, reviewed recipient, school isolation, idempotency and missing sender. Mocked emails only.')
