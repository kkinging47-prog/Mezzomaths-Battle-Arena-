import {supabaseRows} from '../api/_bece-sunday-security.js'
export async function expiredSundayResult(session,token){
 if(!Number.isFinite(Number(session.expiresAt))||Date.now()>Number(session.expiresAt)+180*86400000)throw Error('Restore your candidate profile to view results.')
 if(session.preview||session.mode==='school_lab'||!session.candidateId||!session.weekStart)throw Error('Official Sunday session required.')
 const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/$/,''),key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'')
 if(!url||!key)throw Error('Results database is not configured.')
 const response=await fetch(url+'/rest/v1/rpc/finalize_expired_sunday_sessions',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({p_candidate_id:session.candidateId,p_week_start:session.weekStart})})
 if(!response.ok)throw Error('Automatic submission is pending. Retry shortly; answers are locked.')
 const claims=await supabaseRows('bece_sunday_weekly_claims?select=result,completed_at&candidate_id=eq.'+encodeURIComponent(session.candidateId)+'&week_start=eq.'+encodeURIComponent(session.weekStart)+'&session_token=eq.'+encodeURIComponent(token)+'&limit=1')
 const saved=claims[0]
 if(!saved?.completed_at||!Array.isArray(saved.result?.review))throw Error('Automatic submission is pending. Retry shortly; answers are locked.')
 return {results:saved.result.review,score:saved.result.score,time_taken_seconds:saved.result.time_taken_seconds,auto_submitted:Boolean(saved.result.auto_submitted)}
}
