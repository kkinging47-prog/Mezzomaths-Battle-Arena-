import { signTrialSession, sundayWindowOpen, safeQuestion, supabaseRows, SUNDAY_QUESTION_COLUMNS } from './_bece-sunday-security.js'

const QUESTION_COUNT = 40
async function schoolOwner(req, candidateId) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i,'').trim()
  if (!token) throw new Error('School sign-in is required for supervised lab sessions.')
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/,'')
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '')
  const response = await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token}})
  const user = await response.json().catch(()=>({}))
  if (!response.ok || !user.id) throw new Error('School sign-in expired.')
  const schools = await supabaseRows('bece_sunday_schools?select=id&owner_id=eq.'+encodeURIComponent(user.id)+'&limit=1')
  if (!schools.length) throw new Error('No school is linked to this account.')
  const roster = await supabaseRows('bece_sunday_school_students?select=candidate_id&school_id=eq.'+encodeURIComponent(schools[0].id)+'&candidate_id=eq.'+encodeURIComponent(candidateId)+'&limit=1')
  if (!roster.length) throw new Error('This candidate is not on your school roster.')
  return schools[0].id
}
async function claimCandidate(candidateId, sunday, schoolId, mode) {
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '')
  if (!url || !key) throw new Error('Sunday BECE database service is not configured.')
  const response = await fetch(url + '/rest/v1/rpc/claim_bece_sunday_week', {
    method: 'POST', headers: { apikey:key, Authorization:'Bearer '+key, 'Content-Type':'application/json' },
    body: JSON.stringify({ p_candidate_id:candidateId, p_week_start:sunday })
  })
  if (!response.ok) throw new Error('Unable to verify the candidate or reserve this week’s attempt.')
  return response.json()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const nowDate = new Date()
  const lab = nowDate.getUTCDay() >= 1 && nowDate.getUTCDay() <= 5 && nowDate >= new Date('2026-10-19T00:00:00Z')
  if (!sundayWindowOpen() && !lab) return res.status(403).json({ error: 'The Sunday trial runs Sunday 6–8 PM; supervised school labs run Monday–Friday.' })

  try {
    const sundayDate = new Date()
    if (lab) sundayDate.setUTCDate(sundayDate.getUTCDate()-sundayDate.getUTCDay())
    const sunday = sundayDate.toISOString().slice(0, 10)
    const candidateId = String(req.body?.candidate_id || '').trim()
    if (!/^MSB-[0-9A-F]{18}$/.test(candidateId)) return res.status(400).json({ error: 'A valid registered candidate ID is required.' })
    const registrations = await supabaseRows('bece_sunday_trial_registrations?select=candidate_id&candidate_id=eq.'+encodeURIComponent(candidateId)+'&limit=1')
    if (!registrations.length) return res.status(403).json({ error: 'Candidate is not registered.' })
    const schoolId = lab ? await schoolOwner(req,candidateId) : null
    const scheduled = await supabaseRows(`sunday_bece_sets?select=id,set_number&scheduled_sunday=eq.${sunday}&status=in.(ready,solved)&limit=1`)
    if (!scheduled.length) return res.status(503).json({ error: 'No Sunday BECE set is scheduled for today.' })
    const rows = await supabaseRows(`bece_question_bank?select=${encodeURIComponent(SUNDAY_QUESTION_COLUMNS)}&sunday_set_id=eq.${encodeURIComponent(scheduled[0].id)}&status=eq.Published&order=created_at.asc,id.asc&limit=40`)
    const usable = rows.filter(row =>
      row.question_text &&
      row.correct_answer &&
      [row.option_a,row.option_b,row.option_c,row.option_d].every(Boolean)
    )
    if (usable.length !== QUESTION_COUNT) return res.status(503).json({ error: 'The scheduled BECE set must contain 40 complete published questions.' })

    if (!(await claimCandidate(candidateId, sunday, schoolId, lab?'school_lab':'sunday'))) return res.status(409).json({ error: 'This candidate has already started the Sunday trial this week. A second attempt is not permitted.' })
    const selected = usable
    const now = Date.now()
    const token = signTrialSession({
      ids: selected.map(row => row.id),
      candidateId,
      weekStart: sunday,
      mode: lab?'school_lab':'sunday',
      schoolId,
      index: 0,
      startedAt: now,
      expiresAt: now + (2 * 60 * 60 * 1000)
    })

    const serviceUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/,'')
    const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '')
    const stored = await fetch(serviceUrl+'/rest/v1/bece_sunday_weekly_claims?candidate_id=eq.'+encodeURIComponent(candidateId)+'&week_start=eq.'+sunday,{
      method:'PATCH',headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json',Prefer:'return=representation'},
      body:JSON.stringify({session_token:token,session_expires_at:new Date(now+7200000).toISOString(),school_id:schoolId,mode:lab?'school_lab':'sunday'})
    })
    if(!stored.ok) throw new Error('Unable to save the examination session.')
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({
      questions: selected.map(safeQuestion),
      set_number: scheduled[0].set_number,
      week_start: sunday,
      mode: lab?'school_lab':'sunday',
      session_token: token
    })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to start the Sunday BECE Trial.' })
  }
}
