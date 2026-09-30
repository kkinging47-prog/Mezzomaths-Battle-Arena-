import { createClient } from 'npm:@supabase/supabase-js@2.48.1'
const headers={'Access-Control-Allow-Origin':'https://play.mezzomaths.org','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Content-Type':'application/json'}
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers})
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers})
 if(req.method!=='POST')return reply({error:'Method not allowed'},405)
 try{
  const token=req.headers.get('Authorization')?.replace(/^Bearer /i,'');if(!token)return reply({error:'Sign in first'},401)
  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:`Bearer ${token}`}}})
  const {data:{user},error:authError}=await client.auth.getUser(token);if(authError||!user?.email)return reply({error:'Sign in first'},401)
  const {course_id,chapter_index:ci,lesson_index:li}=await req.json();if(!Number.isInteger(ci)||!Number.isInteger(li)||ci<0||li<0)return reply({error:'Invalid lesson'},400)
  const enrol=await client.from('course_enrollments').select('course_id').eq('course_id',course_id).eq('student_id',user.id).maybeSingle();if(enrol.error||!enrol.data)return reply({error:'Enrol in this course first'},403)
  const {data,error}=await client.from('course_content').select('content,updated_at').eq('course_id',course_id).single();if(error)return reply({error:'Lesson unavailable'},404)
  const lesson=data.content?.chapters?.[ci]?.lessons?.[li];const due=Date.parse(lesson?.homework_due||'');if(!lesson?.homework||(lesson.homework_due&&(!Number.isFinite(due)||due<Date.now())))return reply({error:'Homework unavailable or overdue'},400)
  const apiKey=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('HOMEWORK_FROM_EMAIL');if(!apiKey||!from)return reply({error:'Email delivery is not configured'},503)
  const url=new URL('https://play.mezzomaths.org');url.searchParams.set('homework',course_id);url.searchParams.set('chapter',ci);url.searchParams.set('lesson',li)
  const text=`${data.content.title}: ${lesson.title}\n\n${lesson.homework}\n\nDue: ${Number.isFinite(due)?new Date(due).toUTCString():'No deadline set'}\n\nOpen your homework: ${url.href}\nSign in with your enrolled account and submit your answer${Number.isFinite(due)?' before the due date':' when ready'}.`
  // Same assignment yields one email even when requests are retried. Recipient is always the authenticated learner.
  const sent=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':`homework-${user.id}-${course_id}-${ci}-${li}-${data.updated_at}`},body:JSON.stringify({from,to:[user.email],subject:`Homework: ${lesson.title}`,text})})
  if(!sent.ok)return reply({error:'Email delivery unavailable'},502)
  return reply({sent:true})
 }catch{return reply({error:'Could not process homework request'},400)}
})
