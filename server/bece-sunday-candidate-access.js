import { supabaseRows } from '../api/_bece-sunday-security.js'
export default async function handler(req,res) {
 if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'})
 try {
  if (req.body?.action === 'restore-legacy') {
    const fullName=String(req.body.full_name||'')
    const contact=String(req.body.contact||'')
    const permittedNames=['michealla nana gyekyiwaa benyin','eliezer nkrumah','adebiyi precious abena adenike adom']
    if(new Date().toISOString().slice(0,10)!=='2026-10-18' || !permittedNames.includes(fullName.trim().toLowerCase()) || !contact.trim() || contact.length>254) return res.status(403).json({error:'Legacy registration could not be restored.'})
    const rows=await supabaseRows('bece_sunday_trial_registrations?select=candidate_id,full_name,contact,school_name,location,region,class_level&full_name=ilike.'+encodeURIComponent(fullName.trim().replace(/[*%_]/g,'')+'*')+'&candidate_id=not.is.null&order=created_at.desc&limit=10')
    const match=rows.find(row=>row.full_name.trim().toLowerCase()===fullName.trim().toLowerCase() && row.contact.trim().toLowerCase()===contact.trim().toLowerCase())
    if(!match) return res.status(403).json({error:'Registration details do not match. Please register again or contact Mezzo support.'})
    res.setHeader('Cache-Control','no-store')
    return res.status(200).json({...match,registration_status:'confirmed'})
  }
  const id=String(req.body?.candidate_id||'').trim().toUpperCase()
  const ref=String(req.body?.student_reference||'').trim()
  if(!/^MSB-[0-9A-F]{18}$/.test(id)||ref.length<2||ref.length>60) return res.status(400).json({error:'Invalid student credentials.'})
  const roster=await supabaseRows('bece_sunday_school_students?select=school_id,full_name,class_level,student_reference&candidate_id=eq.'+encodeURIComponent(id)+'&limit=1')
  if(!roster.length||roster[0].student_reference!==ref) return res.status(403).json({error:'Candidate ID or admission number is incorrect.'})
  const schools=await supabaseRows('bece_sunday_schools?select=school_name,location,region&id=eq.'+encodeURIComponent(roster[0].school_id)+'&limit=1')
  if(!schools.length) return res.status(404).json({error:'School not found.'})
  res.setHeader('Cache-Control','no-store')
  return res.status(200).json({candidate_id:id,full_name:roster[0].full_name,class_level:roster[0].class_level,contact:'school:'+roster[0].school_id+':'+ref,school_name:schools[0].school_name,location:schools[0].location,region:schools[0].region,registration_status:'confirmed',school_managed:true})
 } catch {return res.status(500).json({error:'Unable to verify student access.'})}
}
