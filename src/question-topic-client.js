import {supabase} from './supabaseClient.js'
import {TOPIC_VERSION,topicContentKey,classifiedTopic,questionContent} from './question-topics.js'
const KEY='mezzo_content_topics_v'+TOPIC_VERSION
let cache={};try{cache=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{}
export const cachedQuestionTopic=q=>cache[topicContentKey(q)]||null
function save(){try{const entries=Object.entries(cache).slice(-1500);cache=Object.fromEntries(entries);localStorage.setItem(KEY,JSON.stringify(cache))}catch{}}
export async function analyseQuestionTopics(questions,{onProgress=()=>{},maxQuestions=100}={}){
 const unique=[...new Map(questions.filter(q=>q.question_text||q.question||q.q).map(q=>[topicContentKey(q),q])).values()]
 const missing=unique.filter(q=>!cache[topicContentKey(q)]).slice(0,maxQuestions);let notice=''
 if(missing.length){const {data}=await supabase.auth.getSession();if(!data?.session?.access_token)throw new Error('Sign in to analyse the mathematical topics in your questions.')
  for(let i=0;i<missing.length;i+=20){const batch=missing.slice(i,i+20),response=await fetch('/api/class-assignment',{method:'POST',signal:AbortSignal.timeout(45000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify({action:'analyse-topics',questions:batch.map(questionContent)})}),result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'AI topic analysis is unavailable.');if(!Array.isArray(result.analyses)||result.analyses.length!==batch.length)throw new Error('AI returned an incomplete topic report.');result.analyses.forEach((a,j)=>{if(a.status!=='pending'&&a.version===TOPIC_VERSION)cache[topicContentKey(batch[j])]=a});save();onProgress();if(result.notice){notice=result.notice;break}}
 }
 const classified=questions.filter(q=>classifiedTopic(cachedQuestionTopic(q))).length
 return {classified,total:questions.length,pending:questions.length-classified,notice}
}
