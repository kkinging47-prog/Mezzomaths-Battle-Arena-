import { signTrialSession, verifyTrialSession, supabaseRows } from './_bece-sunday-security.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { session_token: token, question_id: questionId, selected_answer: selectedAnswer } = req.body || {}
    const session = verifyTrialSession(token)
    const expectedId = session.ids[session.index]
    if (!expectedId || String(expectedId) !== String(questionId)) {
      return res.status(409).json({ error: 'This question is not the current question in the secured trial session.' })
    }
    const selected = String(selectedAnswer || '').trim().toUpperCase()
    if (!/^[ABCD]$/.test(selected)) return res.status(400).json({ error: 'Select answer A, B, C or D.' })

    const columns = 'id,correct_answer,explanation'
    const rows = await supabaseRows(`bece_question_bank?select=${encodeURIComponent(columns)}&id=eq.${encodeURIComponent(questionId)}&limit=1`)
    const row = rows[0]
    if (!row) return res.status(404).json({ error: 'Question not found.' })
    const correctAnswer = String(row.correct_answer || '').trim().toUpperCase().slice(0, 1)
    const correct = selected === correctAnswer

    const nextSession = { ...session, index: session.index + 1 }
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({
      correct,
      correct_answer: correctAnswer,
      explanation: row.explanation || 'Review the method and practise a similar question.',
      session_token: signTrialSession(nextSession)
    })
  } catch (error) {
    return res.status(401).json({ error: error.message || 'Unable to verify this answer.' })
  }
}
