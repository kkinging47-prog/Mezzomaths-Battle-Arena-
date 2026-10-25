import {hydrateSundayEvidence} from './sunday-question-evidence.js'
import {enrichTopicAnswers} from './question-topic-analysis.js'
import {topicTotals} from '../src/question-topics.js'
import crypto from 'node:crypto'
import { verifyTrialSession, supabaseRows, safeQuestion, SUNDAY_QUESTION_COLUMNS } from '../api/_bece-sunday-security.js'
const secret=()=>String(process.env.BECE_SUNDAY_SESSION_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim()
export function signHistoryAccess(candidateId) {
 if(!secret()) throw new Error('Results access unavailable.')
 const body=Buffer.from(JSON.stringify({purpose:'sunday-results',candidateId,expiresAt:Date.now()+180*86400000})).toString('base64url')
 return body+'.'+crypto.createHmac('sha256',secret()).update(body).digest('base64url')
}
export function verifyHistoryAccess(token) {
 if(!secret()) throw new Error('Results access unavailable.')
 const [body,signature]=String(token||'').split('.')
 const expected=crypto.createHmac('sha256',secret()).update(body||'').digest('base64url')
 const a=Buffer.from(signature||''),b=Buffer.from(expected)
 if(a.length!==b.length||!crypto.timingSafeEqual(a,b)) throw new Error('Restore your candidate profile to view results.')
 const payload=JSON.parse(Buffer.from(body,'base64url').toString())
 if(payload.purpose!=='sunday-results'||payload.expiresAt<=Date.now()||!/^MSB-[0-9A-F]{18}$/.test(payload.candidateId)) throw new Error('Restore your candidate profile to view results.')
 return payload.candidateId
}
export default async function handler(req,res) {
 if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'})
 try {
  let candidateId,boundWeek=''
  if(req.body?.history_token)candidateId=verifyHistoryAccess(req.body.history_token)
  else {const proof=verifyTrialSession(req.body?.session_token,{allowExpired:true});if(proof.preview||!/^MSB-[0-9A-F]{18}$/.test(proof.candidateId)||Date.now()>Number(proof.expiresAt)+180*86400000)throw new Error('Restore your candidate profile to view results.');candidateId=proof.candidateId;boundWeek=proof.weekStart}
  const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/$/,'')
  const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'')
  const response=await fetch(url+'/rest/v1/rpc/sunday_candidate_history',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({p_candidate_id:candidateId})})
  const history=await response.json()
  if(!response.ok) throw new Error('Results could not be loaded. Please retry.')
  const weeks=[]
  const requested=String(req.body?.week_start||boundWeek||'');if(boundWeek&&requested!==boundWeek)throw new Error('This receipt only permits its own examination week.')
  if(requested && !/^\d{4}-\d{2}-\d{2}$/.test(requested)) throw new Error('Invalid week.')
  for(const row of history.weeks||[]) {
   if(requested && row.week_start!==requested) continue
   const {session_token,session_data,result,...week}=row
   week.answers=[]
   if(!requested) { weeks.push(week); continue }
   const evidence={candidate_id:row.candidate_id,week_start:row.week_start,completed_at:row.completed_at||true,score:row.score,total:row.total,review:result?.review,session_token,session_data};await hydrateSundayEvidence([evidence]);week.answers=evidence.review;week.evidence_status=evidence.evidence_status;week.reconstructed=evidence.evidence_status==='reconstructed';week.review_unavailable=!week.answers.length
   if(requested&&week.answers.length){const result=await enrichTopicAnswers(week.answers,{actor:'candidate:'+candidateId,maxNew:40});week.answers=result.answers;week.topic_coverage=topicTotals(result.answers);week.topics=week.topic_coverage.topics;week.topic_analysis_notice=result.notice;week.topic_report_loaded=true}
   weeks.push(week)
  }
  res.setHeader('Cache-Control','no-store')
  return res.status(200).json({summary:history.summary,weeks})
 } catch(error) {return res.status(403).json({error:error.message||'Unable to load results.'})}
}
