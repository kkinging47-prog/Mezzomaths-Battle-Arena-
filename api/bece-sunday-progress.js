import {verifyTrialSession,supabaseRows} from './_bece-sunday-security.js'

export default async function handler(req,res) {
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'})
  try {
    const token=String(req.body?.session_token||'')
    const session=verifyTrialSession(token)
    if(session.preview || !session.candidateId || !session.weekStart) return res.status(403).json({error:'Official candidate session required.'})
    const selections=req.body?.selections
    if(!selections || typeof selections!=='object' || Array.isArray(selections)) return res.status(400).json({error:'Invalid answer selections.'})
    const ids=new Set(session.ids.map(String))
    const entries=Object.entries(selections)
    if(entries.length>session.ids.length || entries.some(([id,answer])=>!ids.has(String(id)) || !/^[ABCD]$/.test(String(answer)))) return res.status(400).json({error:'Invalid answer selections.'})
    const index=Number(req.body?.index||0)
    if(!Number.isInteger(index)||index<0||index>=session.ids.length) return res.status(400).json({error:'Invalid question position.'})
    const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/$/,'')
    const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'')
    const endpoint=url+'/rest/v1/bece_sunday_weekly_claims?candidate_id=eq.'+encodeURIComponent(session.candidateId)+'&week_start=eq.'+encodeURIComponent(session.weekStart)+'&session_token=eq.'+encodeURIComponent(token)+'&completed_at=is.null&session_expires_at=gt.'+encodeURIComponent(new Date().toISOString())
    const response=await fetch(endpoint,{method:'PATCH',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({session_data:{selections,index,updated_at:new Date().toISOString()}})})
    const data=await response.json().catch(()=>[])
    if(!response.ok) throw new Error('Could not save examination progress.')
    if(!Array.isArray(data)||data.length!==1) return res.status(409).json({error:'The examination session has ended or was already submitted.'})
    res.setHeader('Cache-Control','no-store')
    return res.status(200).json({saved:true})
  } catch(e) {return res.status(401).json({error:e.message||'Unable to save examination progress.'})}
}
