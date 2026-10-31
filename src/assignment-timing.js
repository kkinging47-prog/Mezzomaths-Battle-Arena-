export function questionSeconds(q){
 const value=Number(q.time_limit_seconds??q.source_metadata?.time_limit_seconds??q.source_metadata?.seconds??0)
 return Number.isInteger(value)&&value>=1&&value<=3600?value:0
}
// Accumulate time across visits and refreshes. Wall-clock time counts while a question is active.
export function checkpointQuestion(p,now=Date.now()){
 p.questionTimes||={}
 if(p.activeQuestion!=null&&p.questionStartedAt){
  p.questionTimes[p.activeQuestion]=(p.questionTimes[p.activeQuestion]||0)+Math.max(0,now-p.questionStartedAt)
 }
 p.questionStartedAt=now
}
export function questionRemaining(p,q,now=Date.now()){
 const limit=questionSeconds(q);if(!limit)return null
 const elapsed=(p.questionTimes?.[q.position]||0)+(p.activeQuestion===q.position&&p.questionStartedAt?Math.max(0,now-p.questionStartedAt):0)
 return Math.max(0,Math.ceil(limit-elapsed/1000))
}
