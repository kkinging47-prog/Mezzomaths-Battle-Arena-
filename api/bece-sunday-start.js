import { signTrialSession, sundayWindowOpen, safeQuestion, supabaseRows } from './_bece-sunday-security.js'

const QUESTION_COUNT = 40

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!sundayWindowOpen()) return res.status(403).json({ error: 'The Sunday BECE Trial opens from 6:00pm to 8:00pm Ghana time.' })

  try {
    const sunday = new Date().toISOString().slice(0, 10)
    const scheduled = await supabaseRows(`sunday_bece_sets?select=id,set_number&scheduled_sunday=eq.${sunday}&status=eq.ready&limit=1`)
    if (!scheduled.length) return res.status(503).json({ error: 'No Sunday BECE set is scheduled for today.' })
    const columns = [
      'id','topic','topic_area','question_text','question_image_url',
      'option_a','option_b','option_c','option_d',
      'option_a_image_url','option_b_image_url','option_c_image_url','option_d_image_url',
      'correct_answer','explanation','status'
    ].join(',')
    const rows = await supabaseRows(`bece_question_bank?select=${encodeURIComponent(columns)}&sunday_set_id=eq.${encodeURIComponent(scheduled[0].id)}&status=eq.Published&order=created_at.asc,id.asc&limit=40`)
    const usable = rows.filter(row =>
      row.question_text &&
      row.correct_answer &&
      [row.option_a,row.option_b,row.option_c,row.option_d].every(Boolean)
    )
    if (usable.length !== QUESTION_COUNT) return res.status(503).json({ error: 'The scheduled BECE set must contain 40 complete published questions.' })

    const selected = usable
    const now = Date.now()
    const token = signTrialSession({
      ids: selected.map(row => row.id),
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
