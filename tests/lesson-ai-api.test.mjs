import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
let auth=true,access=true,requests=0,requestBody,explanationMode=false
const plan={tool:'angle_compare',initial_angle:45,steps:['Compare the opening with the square corner.'],guidance:'Use the reference corner.'}
const course={title:'Angles',chapters:[{lessons:[{title:'Square corners',content:'Lesson notes',interactive:'Use a rectangular book corner.',classwork_questions:[{answer:'SECRET_ANSWER',explanation:'SECRET_EXPLANATION'}]}]}]}
const context=vm.createContext({console,process:{env:{SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'public-key',OPENAI_API_KEY:'test-key',OPENAI_MODEL:'configured-model'}},AbortSignal,Map,Date,createClient:()=>({auth:{getUser:async()=>({data:{user:auth?{id:'student'}:null}})},from:()=>{const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:access?{content:course,updated_at:'version1'}:null})};return query}}),fetch:async(url,args)=>{requests++;requestBody=JSON.parse(args.body);return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify(explanationMode?{explanations:[{index:0,explanation:'Worked solution'}]}:plan)}]}]})}}})
vm.runInContext(fs.readFileSync('api/course-lesson-assistant.js','utf8').replace(/^import .*$/gm,'').replace(/export default /g,'').replace(/export /g,''),context)
const req={method:'POST',headers:{authorization:'Bearer test'},body:{course_id:'8b08135b-dc93-48b2-9ebe-e8bad232c8b6',chapter_index:0,lesson_index:0}}
const run=async request=>{let status=200,body;await context.handler(request,{setHeader(){},status(n){status=n;return this},json(value){body=value;return this}});return {status,body}}
assert.equal((await run({...req,headers:{}})).status,401)
auth=false;assert.equal((await run(req)).status,401);auth=true
access=false;assert.equal((await run(req)).status,403);access=true
assert.equal((await run({...req,body:{...req.body,lesson_index:-1}})).status,400)
const result=await run(req);assert.equal(result.status,200);assert.equal(result.body.plan.tool,'angle_compare');assert.equal(requests,1)
assert.ok(!requestBody.input.includes('SECRET_ANSWER'));assert.ok(!requestBody.input.includes('SECRET_EXPLANATION'));assert.match(requestBody.instructions,/Do not answer assessment questions/)
await run(req);assert.equal(requests,1)
access=false;assert.equal((await run(req)).status,403);assert.equal(requests,1)
assert.equal(context.validatePlan({...plan,tool:'execute-code'}),false)
console.log('PASS: AI session validation, course access including cached requests, safe context, supported tools and response caching.')

access=true;course.chapters[0].lessons[0].classwork_questions=[{q:'2+2?',options:['1','2','3','4'],answer:'D',explanation:''}];explanationMode=true;const explanationReq={...req,body:{...req.body,mode:'explanations',assessment_type:'classwork',answers:{0:'D'}}};assert.equal((await run({...explanationReq,body:{...explanationReq.body,answers:{}}})).status,400);assert.equal((await run(explanationReq)).body.explanations[0].explanation,'Worked solution');delete context.process.env.OPENAI_API_KEY;assert.equal((await run(explanationReq)).body.code,'ai_not_configured');console.log('PASS: missing explanations generated after full submission; missing AI key reported accurately.');

context.process.env.OPENAI_API_KEY='test-key'
for(const [status,providerCode,expected] of [[401,'invalid_api_key','ai_key_rejected'],[429,'insufficient_quota','ai_quota_exhausted'],[429,'rate_limit_exceeded','ai_rate_limited'],[404,'model_not_found','ai_model_unavailable'],[403,'permission_denied','ai_access_denied'],[400,'invalid_request','ai_request_rejected'],[500,'server_error','ai_provider_error']]){
 context.fetch=async()=>({ok:false,status,headers:{get:()=> 'safe-request-id'},json:async()=>({error:{code:providerCode,message:'SECRET_PROVIDER_DETAILS'}})})
 const failed=await run(explanationReq);assert.equal(failed.status,503);assert.equal(failed.body.code,expected);assert.ok(!JSON.stringify(failed.body).includes('SECRET_PROVIDER_DETAILS'))
}
context.fetch=async()=>{throw Object.assign(Error(),{name:'TimeoutError'})};assert.equal((await run(explanationReq)).body.code,'ai_timeout')
console.log('PASS: safe diagnostics for rejected keys, quota, rate limits, model access, provider failures and timeouts.')
