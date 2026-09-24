import { signTrialSession, sundayWindowOpen, safeQuestion, supabaseRows } from './_bece-sunday-security.js'

const QUESTION_COUNT = 40

function shuffle(list) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!sundayWindowOpen()) return res.status(403).json({ error: 'The Sunday BECE Trial opens from 6:00pm to 8:00pm Ghana time.' })

  try {
    const columns = [
      'id','topic','topic_area','question_text','question_image_url',
      'option_a','option_b','option_c','option_d',
      'option_a_image_url','option_b_image_url','option_c_image_url','option_d_image_url',
      'correct_answer','explanation','status'
    ].join(',')
    const rows = await supabaseRows(`bece_question_bank?select=${encodeURIComponent(columns)}&limit=500`)
    const usable = rows.filter(row =>
      row.question_text &&
      row.correct_answer &&
      !/^archived$/i.test(String(row.status || '')) &&
      [row.option_a,row.option_b,row.option_c,row.option_d].every(Boolean)
    )
    if (usable.length < QUESTION_COUNT) return res.status(503).json({ error: 'Not enough published BECE questions are available for this trial.' })

    const selected = shuffle(usable).slice(0, QUESTION_COUNT)
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
      session_token: token
    })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to start the Sunday BECE Trial.' })
  }
}
