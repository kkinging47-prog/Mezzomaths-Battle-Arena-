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
  const candidateId=verifyHistoryAccess(req.body?.history_token)
  const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/$/,'')
  const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'')
  const response=await fetch(url+'/rest/v1/rpc/sunday_candidate_history',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({p_candidate_id:candidateId})})
  const history=await response.json()
  if(!response.ok) throw new Error('Results could not be loaded. Please retry.')
  const weeks=[]
  const requested=String(req.body?.week_start||'')
  if(requested && !/^\d{4}-\d{2}-\d{2}$/.test(requested)) throw new Error('Invalid week.')
  for(const row of history.weeks||[]) {
   if(requested && row.week_start!==requested) continue
   const {session_token,session_data,result,...week}=row
   week.answers=[]
   if(!requested) { weeks.push(week); continue }
   if(Array.isArray(result?.review)) week.answers=result.review
   else if(session_token) {
    try {
     const session=verifyTrialSession(session_token,{allowExpired:true})
     if(session.candidateId!==row.candidate_id||session.weekStart!==row.week_start) throw new Error('Result identity mismatch')
     const questions=await supabaseRows('bece_question_bank?select='+encodeURIComponent(SUNDAY_QUESTION_COLUMNS)+'&id=in.('+session.ids.map(encodeURIComponent).join(',')+')')
     const byId=new Map(questions.map(q=>[String(q.id),q]))
     week.answers=session.ids.map(id=>{
      const q=byId.get(String(id));if(!q) return null
      const selected=String(session_data?.selections?.[id]||'')
      const correct=String(q.correct_answer||'').trim().toUpperCase().slice(0,1)
      return {...safeQuestion(q),selected_answer:selected,correct_answer:correct,correct:selected===correct,explanation:q.explanation||'A worked explanation is awaiting editor review.'}
     }).filter(Boolean)
     week.reconstructed=true
    } catch { week.review_unavailable=true }
   }
   weeks.push(week)
  }
  res.setHeader('Cache-Control','no-store')
  return res.status(200).json({summary:history.summary,weeks})
 } catch(error) {return res.status(403).json({error:error.message||'Unable to load results.'})}
}
