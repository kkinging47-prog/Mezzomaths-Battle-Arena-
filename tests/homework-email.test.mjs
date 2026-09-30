import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
let handler,sentPayload,sentHeaders,authenticated=true,enrolled=true,configured=true
const lesson={title:'Angles',homework:'Draw two sides.',homework_due:'2099-10-04T18:00:00Z'}
const context=vm.createContext({URL,Response,console,Date,Number,Deno:{env:{get:k=>k==='RESEND_API_KEY'||k==='HOMEWORK_FROM_EMAIL'?(configured?'configured':undefined):'config'},serve:f=>handler=f},createClient:()=>({auth:{getUser:async()=>({data:{user:authenticated?{id:'learner-id',email:'learner@example.test'}:null}})},from:table=>{const chain={select:()=>chain,eq:()=>chain,maybeSingle:async()=>({data:enrolled?{course_id:'course-id'}:null}),single:async()=>({data:{content:{title:'Course',chapters:[{lessons:[lesson]}]},updated_at:'2026-09-30'}})};return chain}}),fetch:async(url,options)=>{sentPayload=JSON.parse(options.body);sentHeaders=options.headers;return {ok:true}}})
const code=fs.readFileSync('supabase/functions/course-homework-email/index.ts','utf8').replace(/^import .*$/gm,'').replace('body:unknown','body').replace(/\)!/g,')')
vm.runInContext(code,context)
const request=(token=true)=>({method:'POST',headers:new Headers(token?{Authorization:'Bearer test'}:{}),json:async()=>({course_id:'course-id',chapter_index:0,lesson_index:0,to:'attacker@example.test'})})
assert.equal((await handler(request(false))).status,401)
authenticated=false;assert.equal((await handler(request())).status,401);authenticated=true
enrolled=false;assert.equal((await handler(request())).status,403);enrolled=true
lesson.homework_due='2000-01-01';assert.equal((await handler(request())).status,400);lesson.homework_due='2099-10-04T18:00:00Z'
configured=false;assert.equal((await handler(request())).status,503);configured=true
const res=await handler(request());assert.equal(res.status,200);assert.deepEqual(sentPayload.to,['learner@example.test']);assert.match(sentPayload.text,/homework=course-id/);assert.match(sentPayload.text,/Due:/);assert.match(sentHeaders['Idempotency-Key'],/^homework-learner-id/)
console.log('PASS: email authentication, enrollment, due date, unavailable configuration, safe recipient and idempotency.')
