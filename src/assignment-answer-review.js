const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function responseOutcome(r){
 if(!r)return {key:'missing',label:'Not recorded'}
 if(r.grading_status==='pending')return {key:'pending',label:'Awaiting marking'}
 if(!String(r.selected_answer??'').trim())return {key:'unanswered',label:'Unanswered'}
 const earned=r.awarded_marks==null?null:Number(r.awarded_marks),max=Number(r.max_marks??1)
 if(earned!==null&&earned>0&&earned<max)return {key:'partial',label:'Partly correct'}
 if(r.is_correct===true||(earned!==null&&earned>=max))return {key:'correct',label:'Correct'}
 return {key:'wrong',label:'Wrong'}
}
export function displayAnswer(q,value){
 const text=String(value??'').trim();if(!text)return 'No answer'
 if((q.question_type||'single_select')==='single_select'&&/^[ABCD]$/i.test(text)){
  const letter=text.toUpperCase(),option=q['option_'+letter.toLowerCase()]
  return option?`${letter}. ${option}`:letter
 }
 return text
}
export function studentAnswerReview(attempt,questions,responses){
 const byPosition=new Map(responses.filter(r=>r.attempt_id===attempt.id).map(r=>[Number(r.question_position),r]))
 const items=[...questions].sort((a,b)=>a.position-b.position).map(q=>{const response=byPosition.get(Number(q.position));return {q,response,outcome:responseOutcome(response)}})
 const counts={};for(const item of items)counts[item.outcome.label]=(counts[item.outcome.label]||0)+1
 return `<details class="ta-answer-review" data-attempt-review="${h(attempt.id)}"><summary><strong>${h(attempt.participant_name)}</strong><span>${h(attempt.participant_class)} · ${h(attempt.submitted_at?new Date(attempt.submitted_at).toLocaleString('en-GH'):'Submission')} · ${h(attempt.score)}/${h(attempt.total)} marks</span></summary><p class="ta-answer-summary">${Object.entries(counts).map(([label,n])=>`${n} ${h(label.toLowerCase())}`).join(' · ')}</p>${items.map(({q,response:r,outcome})=>`<article class="ta-answer-item ${outcome.key}"><header><strong>Question ${h(q.position)}</strong><span class="ta-answer-status ${outcome.key}">${outcome.label}</span></header><p class="ta-review-question">${h(q.question_text)}</p>${q.question_image_url&&/^https:\/\/[^\s]+$/i.test(q.question_image_url)?`<img src="${h(q.question_image_url)}" alt="Question ${h(q.position)} diagram" loading="lazy">`:''}<dl><dt>Student's answer</dt><dd>${h(r?displayAnswer(q,r.selected_answer):'No response recorded')}</dd><dt>${q.marking==='teacher_review'?'Model answer':'Correct answer'}</dt><dd>${h(displayAnswer(q,r?.correct_answer??q.correct_answer))}</dd><dt>Marks</dt><dd>${r?(r.grading_status==='pending'?`Awaiting marking (${h(r.max_marks??q.marks??1)} available)`:`${h(r.awarded_marks??(r.is_correct?1:0))} / ${h(r.max_marks??q.marks??1)}`):'Not recorded'}</dd></dl>${q.explanation?`<p><b>Explanation:</b> ${h(q.explanation)}</p>`:''}${r?.teacher_feedback?`<p><b>Teacher feedback:</b> ${h(r.teacher_feedback)}</p>`:''}</article>`).join('')||'<p>No question snapshots are available for this assignment.</p>'}</details>`
}
export function assignmentAnswerReviews(attempts,questions,responses){
 if(!attempts.length)return ''
 return `<section class="ta-answer-reviews"><h2>Student answer review</h2><p>Open a student's submission to see every question, their answer and the correct or model answer. Work awaiting teacher marking is shown separately.</p>${attempts.map(a=>studentAnswerReview(a,questions,responses)).join('')}</section>`
}
