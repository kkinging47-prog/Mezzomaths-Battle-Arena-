import assert from 'node:assert/strict'
import handler from '../api/class-assignment.js'
process.env.SUPABASE_URL='https://assignment.test';process.env.SUPABASE_SERVICE_ROLE_KEY='server-test-only'
const id='11111111-1111-4111-8111-111111111111',key='22222222-2222-4222-8222-222222222222',attempt='33333333-3333-4333-8333-333333333333'
const a={id,code:'TESTABCD',title:'Test',status:'published',opens_at:new Date(Date.now()-60000).toISOString(),closes_at:new Date(Date.now()+60000).toISOString(),duration_minutes:30,max_attempts:1,pass_mark:50,feedback_mode:'after_submit',shuffle_questions:false}
const questions=[{position:1,question_text:'Half?',question_type:'number',correct_answer:'.5',acceptable_answers:[],marking:'auto',marks:2},{position:2,question_text:'Explain',question_type:'reasoning',correct_answer:'Model',marking:'teacher_review',marks:3}]
let saved=null,recordCalls=0,lastResponses
const json=data=>({ok:true,json:async()=>data})
globalThis.fetch=async(url,options={})=>{
 if(url.endsWith('/auth/v1/user'))return json({id})
 if(url.includes('/rpc/record_mixed_assignment')){recordCalls++;const body=JSON.parse(options.body);lastResponses=body.p_responses;assert.equal(lastResponses[0].awarded_marks,2);assert.equal(lastResponses[1].awarded_marks,null);assert.equal(lastResponses[1].selected_answer,'This is my written working.');saved={id:attempt,score:2,total:5,percent:40,grading_status:'pending',pending_marks:3,time_seconds:20};return json(saved)}
 if(url.includes('/rpc/grade_mixed_assignment'))return json({...saved,grading_status:'graded',score:4,pending_marks:0})
 if(url.includes('teacher_assignments?'))return json([a])
 if(url.includes('teacher_assignment_attempts?'))return json(saved?[saved]:[])
 if(url.includes('teacher_assignment_responses?'))return json(lastResponses||[])
 if(url.includes('teacher_assignment_questions?')){const projection=decodeURIComponent(url).split('&select=')[1]?.split('&')[0].split(',');return json(questions.map(q=>Object.fromEntries(projection.map(k=>[k,q[k]]))))}
 throw Error('Unexpected request '+url)
}
async function call(method,body={},query={code:'TESTABCD'},headers={}){let status,data;const res={setHeader(){},status(s){status=s;return this},json(v){data=v;return this}};await handler({method,body,query,headers},res);return {status,data}}
const get=await call('GET');assert.equal(get.status,200);assert(!JSON.stringify(get.data.questions).includes('correct_answer'));assert(!JSON.stringify(get.data.questions).includes('Model'))
const body={code:'TESTABCD',participant_name:'Test Learner',participant_class:'Year 5',submission_key:key,time_seconds:20,answers:[{position:1,answer:'1/2'},{position:2,answer:'This is my written working.'}]}
const first=await call('POST',body);assert.equal(first.status,201);assert.equal(first.data.grading_status,'pending');assert.equal(first.data.passed,null)
const retry=await call('POST',body);assert.equal(retry.status,200);assert.equal(recordCalls,1)
const status=await call('POST',{action:'result',code:'TESTABCD',submission_key:key});assert.equal(status.data.score,2)
const noAuth=await call('POST',{action:'grade',attempt_id:attempt,grades:[{response_id:key,marks:2}]});assert.equal(noAuth.status,403)
const badGrade=await call('POST',{action:'grade',attempt_id:attempt,grades:[{response_id:key,marks:NaN}]},{},{authorization:'Bearer test'});assert.equal(badGrade.status,400)
const grade=await call('POST',{action:'grade',attempt_id:attempt,grades:[{response_id:key,marks:2,feedback:'Good working'}]},{},{authorization:'Bearer test'});assert.equal(grade.status,200)
console.log('PASS API question secrecy, numeric/written submission, provisional marks, retry idempotency, result receipt, teacher authentication and grade validation. Database permissions tested separately.')
