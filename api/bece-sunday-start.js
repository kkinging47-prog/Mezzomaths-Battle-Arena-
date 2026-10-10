import { signTrialSession, sundayWindowOpen, safeQuestion, supabaseRows, SUNDAY_QUESTION_COLUMNS } from './_bece-sunday-security.js'

const QUESTION_COUNT = 40
async function claimCandidate(candidateId, sunday) {
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
  if (!sundayWindowOpen()) return res.status(403).json({ error: 'The Sunday BECE Trial opens from 6:00pm to 8:00pm Ghana time.' })

  try {
    const sunday = new Date().toISOString().slice(0, 10)
    const candidateId = String(req.body?.candidate_id || '').trim()
    if (!/^MSB-[0-9A-F]{18}$/.test(candidateId)) return res.status(400).json({ error: 'A valid registered candidate ID is required.' })
    const scheduled = await supabaseRows(`sunday_bece_sets?select=id,set_number&scheduled_sunday=eq.${sunday}&status=eq.ready&limit=1`)
    if (!scheduled.length) return res.status(503).json({ error: 'No Sunday BECE set is scheduled for today.' })
    const rows = await supabaseRows(`bece_question_bank?select=${encodeURIComponent(SUNDAY_QUESTION_COLUMNS)}&sunday_set_id=eq.${encodeURIComponent(scheduled[0].id)}&status=eq.Published&order=created_at.asc,id.asc&limit=40`)
    const usable = rows.filter(row =>
      row.question_text &&
      row.correct_answer &&
      [row.option_a,row.option_b,row.option_c,row.option_d].every(Boolean)
    )
    if (usable.length !== QUESTION_COUNT) return res.status(503).json({ error: 'The scheduled BECE set must contain 40 complete published questions.' })

    if (!(await claimCandidate(candidateId, sunday))) return res.status(409).json({ error: 'This candidate has already started the Sunday trial this week. A second attempt is not permitted.' })
    const selected = usable
    const now = Date.now()
    const token = signTrialSession({
      ids: selected.map(row => row.id),
      candidateId,
      weekStart: sunday,
      index: 0,
      startedAt: now,
      expiresAt: now + (2 * 60 * 60 * 1000)
    })

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({
      questions: selected.map(safeQuestion),
      set_number: scheduled[0].set_number,
      session_token: token
    })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to start the Sunday BECE Trial.' })
  }
}
