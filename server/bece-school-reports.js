import {hydrateSundayEvidence} from './sunday-question-evidence.js'
import {enrichTopicAnswers} from './question-topic-analysis.js'
import {topicTotals} from '../src/question-topics.js'
import crypto from 'node:crypto'
import {requireSundayAdmin,supabaseRows} from '../api/_bece-sunday-security.js'
import {buildSchoolReports,schoolReportCsv,schoolReportHtml,schoolKey} from '../src/bece-school-report-utils.js'
const hash=value=>crypto.createHash('sha256').update(value).digest('hex')
function identity(r) {
 const name=String(r.full_name||'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'')
 let contact=String(r.contact||'').trim().toLowerCase().replace(/\s+/g,'')
 if(!contact.includes('@')&&!contact.startsWith('school:')) contact=contact.replace(/\D/g,'').replace(/^00233/,'233').replace(/^0/,'233')
 return hash(name+'|'+contact)
}
async function allRows(query) {
 const rows=[]
 for(let offset=0;offset<100000;offset+=1000){const page=await supabaseRows(query+'&limit=1000&offset='+offset);if(!Array.isArray(page))throw new Error('Results service returned an invalid response.');rows.push(...page);if(page.length<1000)return rows}
 throw new Error('Results volume is too large. Contact support.')
}
const mailConfigured=()=>Boolean(process.env.RESEND_API_KEY&&process.env.RESEND_FROM_EMAIL&&!/yourdomain|resend\.dev|placeholder/i.test(process.env.RESEND_FROM_EMAIL))
export default async function handler(req,res) {
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'})
 let adminUser
 try {adminUser=await requireSundayAdmin(req)} catch {return res.status(403).json({error:'Sign in as an administrator to view or send school reports.'})}
 try {
  const operation=String(req.body?.operation||'list')
  if(!['list','send','group-schools','reset-school-groups'].includes(operation))return res.status(400).json({error:'Unknown report operation.'})
  const week=String(req.body?.week_start||'')
  const day=new Date(week+'T00:00:00Z')
  if(!/^\d{4}-\d{2}-\d{2}$/.test(week)||!Number.isFinite(day.getTime())||day.toISOString().slice(0,10)!==week||day.getUTCDay()!==0)return res.status(400).json({error:'Choose the Sunday date for the report week.'})
  const mode=String(req.body?.mode||'sunday')
  if(!['sunday','school_lab'].includes(mode))return res.status(400).json({error:'Invalid examination mode.'})
  const cutoff=new Date(day);cutoff.setUTCDate(cutoff.getUTCDate()+(mode==='school_lab'?6:0));cutoff.setUTCHours(mode==='school_lab'?0:20)
  const [registrations,claims,settings]=await Promise.all([
   allRows('bece_sunday_trial_registrations?select=candidate_id,full_name,contact,school_name,class_level,region,created_at&candidate_id=not.is.null&created_at=lte.'+encodeURIComponent(cutoff.toISOString())+'&order=created_at.asc,id.asc'),
   allRows('bece_sunday_weekly_claims?select='+encodeURIComponent('candidate_id,week_start,claimed_at,completed_at,score:result->>score,total:result->>total,time_taken_seconds:result->>time_taken_seconds,topics:result->topics,review:result->review,session_token,session_data')+'&week_start=eq.'+week+'&mode=eq.'+mode+'&order=claimed_at.asc,candidate_id.asc'),
   supabaseRows('app_settings?select=value&key=eq.bece_report_school_aliases&limit=1')
  ])
  await hydrateSundayEvidence(claims)
  const reviewRows=claims.flatMap(c=>Array.isArray(c.review)?c.review:[])
  const classified=await enrichTopicAnswers(reviewRows,{actor:adminUser.id,limit:10000,maxNew:40})
  let offset=0
  for(const claim of claims){const count=Array.isArray(claim.review)?claim.review.length:0;const answers=classified.answers.slice(offset,offset+count);offset+=count;const coverage=topicTotals(answers);claim.answers=answers;claim.topics=coverage.topics;claim.topic_coverage=count?coverage:{total:Number(claim.total)||0,classified:0,pending:Number(claim.total)||0};delete claim.review}
  const aliases=settings[0]?.value && typeof settings[0].value==='object' && !Array.isArray(settings[0].value) ? settings[0].value : {}
  const canonical=name=>{let result=String(name||'School not provided').trim();const seen=new Set();for(let i=0;i<30;i++){const key=schoolKey(result);if(seen.has(key)||!Object.hasOwn(aliases,key)||typeof aliases[key]!=='string')break;seen.add(key);result=aliases[key]}return result}
  const registrationIds=new Set(registrations.map(r=>r.candidate_id)),claimedIds=new Set(claims.map(c=>c.candidate_id))
  const eligible=mode==='school_lab'?registrations.filter(r=>String(r.contact||'').startsWith('school:')||claimedIds.has(r.candidate_id)):registrations
  const grouped=eligible.map(r=>({...r,school_name:canonical(r.school_name)}))
  const missing=claims.filter(c=>!registrationIds.has(c.candidate_id)).map(c=>({candidate_id:c.candidate_id,full_name:'Candidate '+c.candidate_id,school_name:'School not provided'}))
  const report=buildSchoolReports([...grouped,...missing].map(r=>({...r,identity_key:r.contact?identity(r):r.candidate_id})),claims,{week,mode})
  report.topic_analysis_notice=classified.notice||(reviewRows.length?'':'Question evidence could not be restored for these results. Recorded scores are retained; question-level support cannot be inferred.')
  report.is_final=Date.now()>=cutoff.getTime()
  report.custom_school_groups=Object.keys(aliases).length>0
  if(operation==='group-schools'||operation==='reset-school-groups') {
   let value={}
   if(operation==='group-schools') {
    const from=report.schools.find(s=>s.school_key===req.body?.from_school),to=report.schools.find(s=>s.school_key===req.body?.to_school)
    if(!from||!to||from.school_key===to.school_key)return res.status(400).json({error:'Choose two different name variants belonging to the same school.'})
    value={...aliases,[from.school_key]:to.school_name}
    for(const [key,label] of Object.entries(value)) if(schoolKey(label)===from.school_key)value[key]=to.school_name
   }
   const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/$/,'')
   const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'')
   const saved=await fetch(url+'/rest/v1/app_settings?on_conflict=key',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'},body:JSON.stringify({key:'bece_report_school_aliases',value,updated_by:adminUser.id,updated_at:new Date().toISOString()})})
   if(!saved.ok)throw new Error('School grouping could not be saved.')
   return res.status(200).json({grouping_saved:true})
  }
  const digest=hash(JSON.stringify(report))
  if(operation==='send') {
   const school=report.schools.find(s=>s.school_key===req.body?.school_key)
   const to=String(req.body?.head_email||'').trim().toLowerCase()
   if(!school||!to||to.length>254||!/^([^\s@,;<>]+)@([^\s@,;<>]+\.[^\s@,;<>]+)$/.test(to)||/[\r\n]/.test(to))return res.status(400).json({error:'Select one school and enter its authorised head’s email address.'})
   if(req.body?.reviewed!==true||req.body?.report_digest!==digest)return res.status(409).json({error:'Refresh and review the school report before sending. Results may have changed.'})
   if(!mailConfigured())return res.status(503).json({error:'Direct email is not configured. Download the PDF/CSV report and use Open email draft, or configure the verified report sender.'})
   const subject='Mezzo Maths BECE Report — '+school.school_name.replace(/[\r\n]/g,' ')+' — '+week
   const csv=schoolReportCsv(report,[school]),html=schoolReportHtml(report,school)
   const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(20000),headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'bece-report/'+hash(digest+'|'+school.school_key+'|'+to)},body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL,to:[to],subject,html,text:`Dear School Head,\nPlease find the BECE results for ${school.school_name}, week ${week}.\n${school.summary.submitted} submitted; average ${school.summary.average_percent==null?'not available':school.summary.average_percent.toFixed(1)+'%'}.\nA CSV results report is attached.\nMezzo Maths — Mezzo House Limited`,attachments:[{filename:'BECE-school-results-'+week+'.csv',content:Buffer.from(csv).toString('base64')}]})})
   const sent=await response.json().catch(()=>({}))
   if(!response.ok||!sent.id)return res.status(502).json({error:'The email provider did not accept the report. Check the verified sender and try again. Download remains available.'})
   res.setHeader('Cache-Control','no-store');return res.status(200).json({accepted:true,email_id:sent.id})
  }
  res.setHeader('Cache-Control','no-store')
  return res.status(200).json({...report,report_digest:digest,email_available:mailConfigured()})
 } catch(error){return res.status(500).json({error:error.name==='TimeoutError'?'Email request timed out. Retry the same report and recipient; duplicate protection applies.':error.message||'Unable to load school reports.'})}
}
