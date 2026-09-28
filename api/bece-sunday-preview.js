import { requireSundayAdmin, safeQuestion, signTrialSession, supabaseRows, SUNDAY_QUESTION_COLUMNS } from './_bece-sunday-security.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Cache-Control', 'no-store')
  try {
    await requireSundayAdmin(req)
    const setId = String(req.body?.set_id || '')
    if (!/^[0-9a-f-]{36}$/i.test(setId)) return res.status(400).json({ error: 'Select a valid set.' })
    const sets = await supabaseRows(`sunday_bece_sets?select=id,set_number&id=eq.${encodeURIComponent(setId)}&limit=1`)
    if (!sets.length) return res.status(404).json({ error: 'Set not found.' })
    const rows = await supabaseRows(`bece_question_bank?select=${encodeURIComponent(SUNDAY_QUESTION_COLUMNS)}&sunday_set_id=eq.${encodeURIComponent(setId)}&order=created_at.asc,id.asc&limit=41`)
    if (!rows.length) return res.status(409).json({ error: 'This set has no questions to preview.' })
    if (rows.length > 40) return res.status(409).json({ error: 'A set cannot contain more than 40 questions.' })
    const now = Date.now()
    return res.status(200).json({
      set_number: sets[0].set_number,
      questions: rows.map(safeQuestion),
      session_token: signTrialSession({ ids: rows.map(row => row.id), index: 0, preview: true, startedAt: now, expiresAt: now + 2 * 60 * 60 * 1000 })
    })
  } catch (error) {
    return res.status(403).json({ error: error.message || 'Unable to preview this set.' })
  }
}
