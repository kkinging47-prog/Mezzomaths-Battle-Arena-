export function validGameQuestion(q){return Boolean(q?.id&&typeof q.question_text==='string'&&q.question_text.trim()&&/^[ABCD]$/.test(q.correct_answer)&&['a','b','c','d'].every(k=>q['option_'+k]||q['option_'+k+'_image_url']))}
export function uniqueGameQuestions(rows){return [...new Map(rows.filter(validGameQuestion).map(q=>[q.question_text.trim(),q])).values()]}
export function gameBankTopics(rows,classLevel,curriculum){return [...new Set(rows.filter(q=>q.class_level===classLevel&&q.curriculum===curriculum).map(q=>String(q.topic||'').trim()).filter(Boolean))].sort()}
export async function loadGameBank(client,params,request=fetch){
 const session=await client?.auth.getSession(),token=session?.data?.session?.access_token
 if(!token)throw Error('Sign in to load questions for your class and curriculum, or try the training demo.')
 const response=await request('/api/rally-questions'+(params?'?'+new URLSearchParams(params):''),{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(25000)})
 const body=await response.json()
 if(!response.ok)throw Error(String(body.error||'Question bank unavailable. Please retry.').replace('real race questions','the question bank'))
 return body.data||[]
}
