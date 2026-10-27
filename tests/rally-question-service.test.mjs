import assert from 'node:assert/strict'
import handler from '../api/rally-questions.js'
const oldFetch=globalThis.fetch,env={...process.env};let request
process.env.SUPABASE_URL='https://test.supabase.co';process.env.VITE_SUPABASE_ANON_KEY='test-key'
globalThis.fetch=async(url,options)=>{request={url,options};return{ok:true,json:async()=>[{id:'q1'}]}}
const invoke=async query=>{const result={};const res={status(n){result.status=n;return this},json(x){result.body=x;return this},setHeader(){}};await handler({method:'GET',query},res);return result}
try{assert.equal((await invoke({})).status,200);assert.ok(request.url.endsWith('/rpc/question_topic_coverage'));assert.equal((await invoke({class_level:'Grade 4',curriculum:'GES',topic:'Addition'})).status,200);const query=new URL(request.url).searchParams;assert.equal(query.get('is_active'),'eq.true');assert.equal(query.get('class_level'),'eq.Grade 4');assert.equal(query.get('topic'),'eq.Addition');assert.equal(query.get('limit'),'1000');assert.equal((await invoke({class_level:'invalid',curriculum:'GES',topic:'Addition'})).status,400)}finally{globalThis.fetch=oldFetch;process.env=env}
console.log('PASS live question service filters active records and selected class/curriculum/topic and rejects invalid selection')
