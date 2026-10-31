import {questionSeconds} from '../src/assignment-timing.js'
import topicAnalysisHandler,{topicAIConfigured,classifyTopics} from '../server/question-topic-analysis.js'
import {randomUUID} from 'node:crypto'
import {markAssignmentQuestion} from '../src/assignment-question-types.js'
const WINDOW_MS=10*60*1000,MAX_REQUESTS=150,requests=new Map()
const clean=(v,limit=180)=>String(v??'').trim().slice(0,limit)
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||''))
function allowed(ip){const now=Date.now();if(requests.size>5000)for(const [key,times] of requests)if(!times.some(t=>now-t<WINDOW_MS))requests.delete(key);const recent=(requests.get(ip)||[]).filter(t=>now-t<WINDOW_MS);if(recent.length>=MAX_REQUESTS)return false;recent.push(now);requests.set(ip,recent);return true}
function config(){return {url:clean(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,300).replace(/\/$/,''),key:clean(process.env.SUPABASE_SERVICE_ROLE_KEY,3000)}}
async function db(path,options={}){const {url,key}=config();if(!url||!key)throw new Error('Assignment service is not configured.');const r=await fetch(`${url}/rest/v1/${path}`,{...options,signal:AbortSignal.timeout(25000),headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...options.headers}});const data=await r.json().catch(()=>null);if(!r.ok)throw new Error(data?.message||'Assignment database request failed.');return data}
const postRpc=(name,body)=>db('rpc/'+name,{method:'POST',body:JSON.stringify(body)})
async function assignmentByCode(code){const rows=await db(`teacher_assignments?code=eq.${encodeURIComponent(code)}&select=id,code,title,instructions,class_level,curriculum,topic,question_count,duration_minutes,opens_at,closes_at,status,show_leaderboard,assignment_type,target_group,max_attempts,pass_mark,feedback_mode,shuffle_questions&limit=1`);return rows?.[0]||null}
function availability(a){const now=Date.now();if(a.status!=='published')return 'This assignment is not available.';if(now<new Date(a.opens_at).getTime())return 'This assignment has not opened yet.';if(now>new Date(a.closes_at).getTime())return 'This assignment has closed.';return ''}
async function actor(req){const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');if(!token)throw new Error('Sign in as a teacher to manage assignments.');const {url,key}=config();const r=await fetch(url+'/auth/v1/user',{signal:AbortSignal.timeout(15000),headers:{apikey:key,Authorization:'Bearer '+token}});const u=await r.json();if(!r.ok||!uuid(u.id))throw new Error('Please sign in again.');return u.id}
async function resultFor(a,key){const rows=await db(`teacher_assignment_attempts?assignment_id=eq.${a.id}&submission_key=eq.${key}&select=id,score,total,percent,time_seconds,grading_status,pending_marks&limit=1`);const t=rows?.[0];if(!t)return null;const show=['immediate','after_submit'].includes(a.feedback_mode)||(a.feedback_mode==='after_close'&&Date.now()>new Date(a.closes_at).getTime());const corrections=show?await db(`teacher_assignment_responses?attempt_id=eq.${t.id}&select=question_position,selected_answer,correct_answer,is_correct,awarded_marks,max_marks,grading_status,teacher_feedback&order=question_position.asc`):[];return {attempt_id:t.id,score:t.score,total:t.total,percent:t.percent,time_seconds:t.time_seconds,grading_status:t.grading_status,pending_marks:t.pending_marks,passed:t.grading_status==='graded'?Number(t.percent)>=Number(a.pass_mark??50):null,corrections}}
export default async function handler(req,res){
 res.setHeader?.('Cache-Control','no-store')
 const ip=clean(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];if(!allowed(ip))return res.status(429).json({error:'Too many requests. Please wait and try again.'})
 try{
  if(req.method==='GET'&&req.query?.action==='topic-status'){if(req.query?.verify!=='1')return res.status(200).json({configured:topicAIConfigured()});const check=await classifyTopics([{question_text:'What is one half plus one quarter?'},{question_text:'Solve the equation 2x + 3 = 11.'}],{actor:'fixed-topic-health-check',limit:6,maxNew:2});return res.status(200).json({configured:topicAIConfigured(),ready:check.analyses.every(a=>a.status==='classified'),topics:check.analyses.map(a=>a.topic),notice:check.notice})}
  if(req.method==='POST'&&req.body?.action==='analyse-topics')return topicAnalysisHandler(req,res)
  if(req.method==='POST'&&req.body?.action==='edit'){
   const id=await actor(req),body=req.body,s=body.settings,qs=body.questions
   if(!uuid(body.assignment_id)||!Number.isFinite(Date.parse(body.version))||!s||!Array.isArray(qs)||!qs.length||qs.length>100||qs.some(q=>!uuid(q.id)||!Number.isInteger(q.seconds)||q.seconds<0||q.seconds>3600||['question_text','option_a','option_b','option_c','option_d','correct_answer','explanation'].some(k=>typeof q[k]!=='string'||q[k].length>20000))||!Number.isInteger(s.duration_minutes)||s.duration_minutes<1||s.duration_minutes>180||!Number.isInteger(s.max_attempts)||s.max_attempts<1||s.max_attempts>10||!Number.isInteger(s.pass_mark)||s.pass_mark<0||s.pass_mark>100||!['immediate','after_submit','after_close','score_only'].includes(s.feedback_mode))return res.status(400).json({error:'Check the assignment settings, questions and seconds (0–3600).'})
   const result=await postRpc('edit_teacher_assignment',{p_actor:id,p_id:body.assignment_id,p_version:body.version,p_settings:s,p_questions:qs})
   return res.status(200).json({id:result})
  }
  if(req.method==='POST'&&req.body?.action==='grade'){
   if(!uuid(req.body.attempt_id))return res.status(400).json({error:'Invalid attempt.'})
   const id=await actor(req),grades=req.body.grades
   if(!Array.isArray(grades)||!grades.length||grades.length>100||grades.some(g=>!uuid(g.response_id)||typeof g.marks!=='number'||!Number.isFinite(g.marks)||g.marks<0||g.marks>100||Math.abs(g.marks*100-Math.round(g.marks*100))>1e-7))return res.status(400).json({error:'Enter valid marks for each selected response.'})
   const result=await postRpc('grade_mixed_assignment',{p_actor:id,p_attempt:req.body.attempt_id,p_grades:grades.map(g=>({response_id:g.response_id,marks:g.marks,feedback:clean(g.feedback,4000)}))})
   return res.status(200).json({attempt_id:result.id,score:result.score,total:result.total,grading_status:result.grading_status,pending_marks:result.pending_marks})
  }
  if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed.'})
  const code=clean(req.method==='GET'?req.query?.code:req.body?.code,16).toUpperCase();if(!/^[A-Z0-9]{6,12}$/.test(code))return res.status(400).json({error:'Enter a valid assignment code.'})
  const a=await assignmentByCode(code);if(!a)return res.status(404).json({error:'Assignment code not found.'})
  if(req.method==='POST'&&req.body?.action==='result'){
   if(!uuid(req.body.submission_key))return res.status(400).json({error:'Invalid result receipt.'})
   const result=await resultFor(a,req.body.submission_key);return result?res.status(200).json(result):res.status(404).json({error:'No recorded submission for this receipt.'})
  }
  if(req.method==='GET'){
   const unavailable=availability(a);if(unavailable)return res.status(403).json({error:unavailable})
   let rows=await db(`teacher_assignment_questions?assignment_id=eq.${a.id}&select=id,position,question_text,option_a,option_b,option_c,option_d,question_type,marks,question_image_url,hint,source_metadata&order=position.asc`)
   if(!rows?.length)return res.status(409).json({error:'This assignment has no questions.'})
   rows=(rows||[]).map(({source_metadata,...q})=>({...q,time_limit_seconds:questionSeconds({source_metadata})}))
   if(a.shuffle_questions)for(let i=rows.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[rows[i],rows[j]]=[rows[j],rows[i]]}
   return res.status(200).json({assignment:a,questions:rows})
  }
  const name=clean(req.body?.participant_name),classLevel=clean(req.body?.participant_class,80),school=clean(req.body?.participant_school)
  if(!name||!classLevel)return res.status(400).json({error:'Name and class are required.'})
  // Older clients without a key still submit; new clients retain a UUID across retries.
  const key=req.body.submission_key||randomUUID();if(!uuid(key))return res.status(400).json({error:'Invalid submission receipt.'})
  const previous=await resultFor(a,key);if(previous)return res.status(200).json(previous)
  const unavailable=availability(a);if(unavailable)return res.status(403).json({error:unavailable})
  const answers=req.body?.answers;if(!Array.isArray(answers)||answers.length>100)return res.status(400).json({error:'Invalid answers.'})
  const selected=new Map();for(const answer of answers){if(!Number.isInteger(answer.position)||selected.has(answer.position)||typeof answer.answer!=='string'||answer.answer.length>20000)return res.status(400).json({error:'Invalid or duplicate answer position.'});selected.set(answer.position,answer.answer)}
  const questions=await db(`teacher_assignment_questions?assignment_id=eq.${a.id}&select=position,correct_answer,question_type,marking,marks,acceptable_answers,numeric_tolerance&order=position.asc`)
  if(!questions.length||[...selected.keys()].some(pos=>!questions.some(q=>q.position===pos)))return res.status(400).json({error:'The answers do not match this assignment.'})
  const corrections=questions.map(q=>({position:q.position,...markAssignmentQuestion(q,selected.get(q.position)||'')}))
  const elapsed=Number(req.body.time_seconds??0);if(!Number.isFinite(elapsed)||elapsed<0)return res.status(400).json({error:'Invalid completion time.'})
  await postRpc('record_mixed_assignment',{p_assignment_id:a.id,p_name:name,p_class:classLevel,p_school:school,p_key:key,p_elapsed:Math.min(Math.round(elapsed),Number(a.duration_minutes)*60),p_responses:corrections})
  return res.status(201).json(await resultFor(a,key))
 }catch(error){const message=String(error.message||'Assignment service failed.');const code=/not authorised|Sign in|sign in/i.test(message)?403:/maximum attempts|not open|locked|Assignment changed/i.test(message)?409:/Award between|Incomplete response|Duplicate responses|Response format|Provide marks/i.test(message)?400:500;return res.status(code).json({error:message})}
}
