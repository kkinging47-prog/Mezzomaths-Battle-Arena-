import { verifyTrialSession, safeQuestion, supabaseRows, SUNDAY_QUESTION_COLUMNS } from './_bece-sunday-security.js'

export default async function handler(req,res) {
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'})
  try {
    const candidateId=String(req.body?.candidate_id||'').trim()
    const providedSession=String(req.body?.session_token||'').trim()
    if(!/^MSB-[0-9A-F]{18}$/.test(candidateId)) return res.status(400).json({error:'Invalid candidate ID.'})
    const claims=await supabaseRows('bece_sunday_weekly_claims?select=session_token,session_expires_at,completed_at,week_start,school_id,session_data&candidate_id=eq.'+encodeURIComponent(candidateId)+'&order=week_start.desc&limit=1')
    const claim=claims[0]
    if(!claim || claim.completed_at || !claim.session_token || new Date(claim.session_expires_at)<=new Date()) return res.status(409).json({error:'No recoverable active examination. Contact the examination supervisor.'})
    if(!claim.school_id && (!providedSession || providedSession!==claim.session_token)) return res.status(403).json({error:'Resume requires the original examination session on this device. Contact support if it is unavailable.'})
    if(claim.school_id) {
      const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'').trim()
      const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/$/,'')
      const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'')
      const auth=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token}})
      const user=await auth.json().catch(()=>({}))
      if(!auth.ok||!user.id) return res.status(403).json({error:'School sign-in required.'})
      const schools=await supabaseRows('bece_sunday_schools?select=id&id=eq.'+encodeURIComponent(claim.school_id)+'&owner_id=eq.'+encodeURIComponent(user.id)+'&limit=1')
      if(!schools.length) return res.status(403).json({error:'This is not your school candidate.'})
    }
    const session=verifyTrialSession(claim.session_token)
    if(session.candidateId!==candidateId) return res.status(403).json({error:'Candidate mismatch.'})
    const ids=session.ids.map(encodeURIComponent).join(',')
    const rows=await supabaseRows('bece_question_bank?select='+encodeURIComponent(SUNDAY_QUESTION_COLUMNS)+'&id=in.('+ids+')')
    const byId=new Map(rows.map(x=>[String(x.id),x]))
    if(session.ids.some(id=>!byId.has(String(id)))) return res.status(409).json({error:'Question set unavailable.'})
    res.setHeader('Cache-Control','no-store')
    return res.status(200).json({questions:session.ids.map(id=>safeQuestion(byId.get(String(id)))),session_token:claim.session_token,week_start:claim.week_start,mode:session.mode||'sunday',started_at:session.startedAt,selections:claim.session_data?.selections||{},index:claim.session_data?.index||0})
  } catch { return res.status(500).json({error:'Unable to recover the examination session.'}) }
}
