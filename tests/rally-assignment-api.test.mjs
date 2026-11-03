import assert from 'node:assert/strict'
import handler from '../api/class-assignment.js'
process.env.SUPABASE_URL='https://rally.test';process.env.SUPABASE_SERVICE_ROLE_KEY='server-only-test'
const id='11111111-1111-4111-8111-111111111111'
const a={id,code:'RALLYTEST',status:'published',opens_at:new Date(Date.now()-1000).toISOString(),closes_at:new Date(Date.now()+60000).toISOString(),feedback_mode:'immediate',duration_minutes:5,shuffle_questions:false}
const q={id,position:1,question_text:'2+2?',option_a:'4',option_b:'5',option_c:'6',option_d:'7',correct_answer:'A',explanation:'Two and two make four.',question_type:'single_select',marking:'auto',marks:1,source_metadata:{rally:{version:1,track:'oval',pace:'rookie'},time_limit_seconds:15}}
let recorded=null,saved=false
globalThis.fetch=async(url,options={})=>{
 const json=data=>({ok:true,json:async()=>data})
 if(url.includes('teacher_assignments?'))return json([a])
 if(url.includes('teacher_assignment_questions?')){const projection=new URL(url).searchParams.get('select').split(',');return json([Object.fromEntries(projection.map(k=>[k,q[k]]))])}
 if(url.includes('teacher_assignment_attempts?'))return json(saved?[{id,score:0,total:1,percent:0,time_seconds:10,grading_status:'graded'}]:[])
 if(url.includes('teacher_assignment_responses?'))return json(recorded)
 if(url.includes('/rpc/record_mixed_assignment')){recorded=JSON.parse(options.body).p_responses;saved=true;return json({id})}
 throw Error('Unexpected request '+url)
}
async function call(query,body){let status,data;await handler({method:body?'POST':'GET',query,body,headers:{}},{setHeader(){},status(n){status=n;return this},json(v){data=v;return this}});return {status,data}}
const safe=await call({code:a.code});assert.equal(safe.status,200);assert.equal(safe.data.assignment.rally.track,'oval');assert(!JSON.stringify(safe.data.questions).includes('correct_answer'))
const play=await call({code:a.code,play:'rally'});assert.equal(play.status,200);assert.equal(play.data.questions[0].correct_answer,'A');assert.equal(play.data.questions[0].time_limit_seconds,15);assert.equal(play.data.questions[0].position,1);assert(!JSON.stringify(play.data.questions).includes('source_metadata'))
const original=q.source_metadata;q.source_metadata={};assert.equal((await call({code:a.code,play:'rally'})).status,400);q.source_metadata=original
a.status='closed';assert.equal((await call({code:a.code,play:'rally'})).status,403);a.status='published'
const result=await call({}, {code:a.code,participant_name:'Learner',participant_class:'Grade 4',submission_key:'22222222-2222-4222-8222-222222222222',answers:[{position:1,answer:'B'}],score:999,time_seconds:10})
assert.equal(result.status,201);assert.equal(recorded[0].is_correct,false);assert.equal(recorded[0].awarded_marks,0);assert.equal(recorded[0].correct_answer,'A');assert.equal(recorded[0].selected_answer,'B')
console.log('PASS Rally requires explicit teacher metadata and an open assignment; worksheet keys stay private; game questions carry stable positions; final marks are server-computed.')
