import {verifyTrialSession,supabaseRows,safeQuestion,SUNDAY_QUESTION_COLUMNS} from '../api/_bece-sunday-security.js'
// Reconstruct older papers from their signed question order and saved selections.
// No stored score, answer, ranking or source record is changed.
export async function hydrateSundayEvidence(claims){
 const sessions=new Map(),ids=new Set()
 for(const claim of claims){
  if(Array.isArray(claim.review)&&claim.review.length){claim.review=claim.review.map((a,i)=>({...a,question_number:a.question_number||i+1}));claim.evidence_status='snapshot';continue}
  claim.review=[];claim.evidence_status='unavailable'
  if(!claim.completed_at||!claim.session_token)continue
  try{const session=verifyTrialSession(claim.session_token,{allowExpired:true});if(session.preview||session.candidateId!==claim.candidate_id||session.weekStart!==claim.week_start||session.ids.length>40)continue;sessions.set(claim,session);session.ids.forEach(id=>ids.add(String(id)))}catch{}
 }
 const questions=[];const keys=[...ids]
 for(let i=0;i<keys.length;i+=100)questions.push(...await supabaseRows('bece_question_bank?select='+encodeURIComponent(SUNDAY_QUESTION_COLUMNS)+'&id=in.('+keys.slice(i,i+100).map(encodeURIComponent).join(',')+')'))
 const byId=new Map(questions.map(q=>[String(q.id),q]))
 for(const [claim,session] of sessions){
  const answers=session.ids.map((id,i)=>{const q=byId.get(String(id));if(!q)return null;const selected=String(claim.session_data?.selections?.[id]||'').toUpperCase(),answer=String(q.correct_answer||'').trim().toUpperCase();return {...safeQuestion(q),question_id:q.id,question_number:i+1,selected_answer:selected,correct_answer:answer,correct:selected===answer,explanation:q.explanation||''}}).filter(Boolean)
  const matches=answers.length===Number(claim.total)&&answers.filter(a=>a.correct).length===Number(claim.score)
  if(matches){claim.review=answers;claim.evidence_status='reconstructed'}else {claim.review=[];claim.evidence_status='score_mismatch'}
 }
 return claims
}
