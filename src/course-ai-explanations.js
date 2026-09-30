import { supabase } from './supabaseClient.js'
export async function fillAIExplanations(courseId,ci,li,type,questions,answers){
 if(!questions.some(q=>!String(q.explanation||'').trim()))return
 const {data:{session}}=await supabase.auth.getSession()
 if(!session)throw Error('Sign in again to generate AI explanations.')
 const response=await fetch('/api/course-lesson-assistant',{method:'POST',signal:AbortSignal.timeout(30000),headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({course_id:courseId,chapter_index:ci,lesson_index:li,mode:'explanations',assessment_type:type,answers})})
 const result=await response.json().catch(()=>({}))
 if(!response.ok)throw Error(result.error||'AI explanations could not load. Your score is saved.')
 for(const entry of result.explanations||[])if(questions[entry.index]&&!questions[entry.index].explanation)questions[entry.index].explanation=entry.explanation
}
