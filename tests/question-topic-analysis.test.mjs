import assert from 'node:assert/strict'
import {topicContentKey,topicTotals,classifiedTopic,questionContent} from '../src/question-topics.js'
import {classifyTopics,topicFingerprint,enrichTopicAnswers} from '../server/question-topic-analysis.js'
process.env.SUPABASE_URL='https://database.test';process.env.SUPABASE_SERVICE_ROLE_KEY='private-test';process.env.OPENAI_API_KEY='mock-key'
const cache=new Map();let calls=0,mode='valid',lastBody
const reply=data=>({ok:true,json:async()=>data})
globalThis.fetch=async(url,options={})=>{
 if(url.includes('/question_topic_analysis?')&&options.method==='POST'){for(const row of JSON.parse(options.body))cache.set(row.fingerprint,row);return reply(null)}
 if(url.includes('/question_topic_analysis?')){const keys=url.split('in.(')[1].split(')')[0].split(',');return reply(keys.map(k=>cache.get(k)).filter(Boolean))}
 if(url.includes('/consume_question_topic_budget'))return reply(true)
 if(url==='https://api.openai.com/v1/responses'){
  calls++;lastBody=JSON.parse(options.body);const data=JSON.parse(lastBody.input[0].content[0].text)
  if(mode==='error')return {ok:false,status:429,json:async()=>({})}
  const analyses=data.map(q=>({id:q.id,topic:mode==='source'?'Mezzo workbook':q.question_text.includes('probability')?'Probability':q.question_text.includes('half')?'Fractions':'Linear equations',skill:'Identify the required mathematical operation',confidence:mode==='low'?'low':'high'}))
  if(mode==='duplicate'&&analyses.length>1)analyses[1].id=analyses[0].id
  return reply({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({analyses})}]}]})
 }
 throw Error('Unexpected request '+url)
}
const q={question_text:'Solve 2x + 3 = 11',topic:'Mezzo workbook',source_name:'Book upload',correct_answer:'B',selected_answer:'A',student_name:'Private learner'}
assert.equal(topicFingerprint(q),topicFingerprint({...q,topic:'Some other book',source_name:'Other upload'}));assert.notEqual(topicFingerprint(q),topicFingerprint({...q,question_text:'Solve 3x + 3 = 11'}))
const one=await classifyTopics([q],{actor:'test'});assert.equal(one.analyses[0].topic,'Linear equations');assert(!lastBody.input[0].content[0].text.includes('workbook'));assert(!lastBody.input[0].content[0].text.includes('Private learner'));assert(!lastBody.input[0].content[0].text.includes('correct_answer'))
await classifyTopics([{...q,topic:'uploaded lesson'}]);assert.equal(calls,1)
const enriched=await enrichTopicAnswers([{...q,correct:true}],{generate:false});assert.equal(enriched.answers[0].source_topic,'Mezzo workbook');assert.equal(enriched.answers[0].topic,'Linear equations');assert.equal(enriched.answers[0].correct,true)
mode='low';const low=await classifyTopics([{question_text:'Find the value shown by an unavailable diagram.'}]);assert.equal(classifiedTopic(low.analyses[0]),null);assert.equal(topicTotals([{correct:false,topic_analysis:low.analyses[0]}]).pending,1)
mode='source';const source=await classifyTopics([{question_text:'What is half of 8?'}]);assert.equal(source.analyses[0].status,'pending');assert(source.notice.includes('unsupported topic'))
mode='duplicate';const dup=await classifyTopics([{question_text:'Find the probability of rolling six.'},{question_text:'Find the probability of rolling five.'}]);assert.equal(dup.analyses[0].status,'pending');assert(dup.notice.includes('incomplete'))
mode='error';const bad=await classifyTopics([{question_text:'What is half of ten?'}]);assert(bad.notice);assert.equal(bad.analyses[0].topic,null)
delete process.env.OPENAI_API_KEY;const missing=await classifyTopics([{question_text:'A new question'}]);assert(missing.notice.includes('not configured'));assert.equal(missing.analyses[0].topic,null)
const totals=topicTotals([{correct:true,topic_analysis:one.analyses[0]},{correct:false,topic_analysis:one.analyses[0]},{correct:false,topic:'Mezzo workbook'}]);assert.deepEqual(totals.topics,{'Linear equations':{total:2,correct:1}});assert.equal(totals.pending,1)
console.log('PASS content-only AI inputs, source-independent cache, changed-content invalidation, accepted taxonomy, confidence exclusion, incomplete/failed AI, no fabricated fallback, and unchanged student answers. Provider calls mocked.')
