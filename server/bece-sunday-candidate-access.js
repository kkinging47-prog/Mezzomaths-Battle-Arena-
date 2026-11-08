import {sundaySchoolDirectory} from './sunday-school-directory.js'
import {matchingSchool,validSchoolName} from '../src/school-names.js'
import {sundayContactDetails} from '../src/sunday-contact-details.js'
import { signHistoryAccess,verifyHistoryAccess } from './bece-sunday-history.js'
import { supabaseRows } from '../api/_bece-sunday-security.js'
export default async function handler(req,res) {
 if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'})
 try {
  if(req.body?.action==='school-suggestions') {
   const schools=await sundaySchoolDirectory()
   res.setHeader('Cache-Control','public, max-age=60')
   return res.status(200).json({schools})
  }
  if(req.body?.action==='update-contacts') {
   let candidateId,contacts
   try{candidateId=verifyHistoryAccess(req.body.history_token)}catch{return res.status(403).json({error:'Restore your candidate profile before updating contact details.'})}
   try{contacts=sundayContactDetails(req.body)}catch(error){return res.status(400).json({error:error.message})}
   const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/$/,''),key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'')
   const previous=await supabaseRows('bece_sunday_trial_registrations?select=reminder_opt_in,reminder_consent_at&candidate_id=eq.'+encodeURIComponent(candidateId)+'&limit=1')
   if(!previous.length)return res.status(404).json({error:'Candidate profile not found.'})
   const response=await fetch(url+'/rest/v1/bece_sunday_trial_registrations?candidate_id=eq.'+encodeURIComponent(candidateId),{method:'PATCH',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({...contacts,reminder_consent_at:contacts.reminder_opt_in?(previous[0].reminder_consent_at||new Date().toISOString()):null})})
   const rows=await response.json();if(!response.ok||rows.length!==1)throw Error('Contacts could not be saved.')
   res.setHeader('Cache-Control','no-store');return res.status(200).json({...contacts})
  }
  if (['register','restore-legacy'].includes(req.body?.action)) {
    const details=Object.fromEntries(['full_name','contact','school_name','location','region','class_level'].map(key=>[key,String(req.body[key]||'').trim()]))
    if(req.body.action==='register'){try{Object.assign(details,sundayContactDetails(req.body));details.contact=details.phone_number}catch(error){return res.status(400).json({error:error.message})}}
    if(details.full_name.length<3 || details.full_name.length>200 || details.contact.length<5 || details.contact.length>254 || Object.values(details).some(value=>typeof value==='string'&&value.length>254)) return res.status(400).json({error:'Enter your full name and original phone number or email.'})
    if(req.body.action==='register' && (!details.school_name || !details.location || !details.region)) return res.status(400).json({error:'Complete your school, town and region.'})
    if(req.body.action==='register') {
     if(!validSchoolName(details.school_name))return res.status(400).json({error:'Enter your school’s full name or select a registered school.'})
     try {details.school_name=matchingSchool(details.school_name,await sundaySchoolDirectory())||details.school_name} catch { /* A directory outage must not prevent candidate registration. */ }
    }
    const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/$/,'')
    const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'')
    const response=await fetch(url+'/rest/v1/rpc/register_or_recover_sunday_candidate',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({p_details:{...details,recover_only:req.body.action==='restore-legacy'}})})
    const result=await response.json()
    if(!response.ok) return res.status(400).json({error:'Registration could not be confirmed. Check your original details or contact Mezzo support.'})
    res.setHeader('Cache-Control','no-store')
    return res.status(200).json({...result,history_token:signHistoryAccess(result.candidate_id)})
  }
  const id=String(req.body?.candidate_id||'').trim().toUpperCase()
  const ref=String(req.body?.student_reference||'').trim()
  if(!/^MSB-[0-9A-F]{18}$/.test(id)||ref.length<2||ref.length>60) return res.status(400).json({error:'Invalid student credentials.'})
  const roster=await supabaseRows('bece_sunday_school_students?select=school_id,full_name,class_level,student_reference&candidate_id=eq.'+encodeURIComponent(id)+'&limit=1')
  if(!roster.length||roster[0].student_reference!==ref) return res.status(403).json({error:'Candidate ID or admission number is incorrect.'})
  const schools=await supabaseRows('bece_sunday_schools?select=school_name,location,region&id=eq.'+encodeURIComponent(roster[0].school_id)+'&limit=1')
  if(!schools.length) return res.status(404).json({error:'School not found.'})
  res.setHeader('Cache-Control','no-store')
  return res.status(200).json({candidate_id:id,full_name:roster[0].full_name,class_level:roster[0].class_level,contact:'school:'+roster[0].school_id+':'+ref,school_name:schools[0].school_name,location:schools[0].location,region:schools[0].region,registration_status:'confirmed',school_managed:true,history_token:signHistoryAccess(id)})
 } catch {return res.status(500).json({error:'Unable to verify student access.'})}
}
