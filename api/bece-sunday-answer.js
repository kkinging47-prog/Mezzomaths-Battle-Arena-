import { signTrialSession, verifyTrialSession, supabaseRows, requireSundayAdmin } from './_bece-sunday-security.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { session_token: token, question_id: questionId, selected_answer: selectedAnswer } = req.body || {}
    const session = verifyTrialSession(token)
    if (session.preview) await requireSundayAdmin(req)
    if (Array.isArray(req.body?.answers)) {
      const answers = req.body.answers
      if (answers.length !== session.ids.length || session.ids.length > 40 || session.ids.length < 1 || session.index !== 0) {
        return res.status(400).json({ error: 'Answer every question before submitting.' })
      }
      if (answers.some((a, i) => String(a.question_id) !== String(session.ids[i]) || !/^[ABCD]$/.test(String(a.selected_answer || '')))) {
        return res.status(400).json({ error: 'The submitted answers do not match this set.' })
      }
      const ids = session.ids.map(id => encodeURIComponent(id)).join(',')
      const rows = await supabaseRows(`bece_question_bank?select=id,topic,topic_area,correct_answer,explanation&id=in.(${ids})`)
      const byId = new Map(rows.map(row => [String(row.id), row]))
      if (byId.size !== answers.length) return res.status(409).json({ error: 'A question changed during this trial. Please start again.' })
      const results = answers.map(answer => {
        const row = byId.get(String(answer.question_id))
        const correctAnswer = String(row.correct_answer || '').trim().toUpperCase().slice(0, 1)
        return {
          question_id: row.id,
          selected_answer: answer.selected_answer,
          correct_answer: correctAnswer,
          correct: answer.selected_answer === correctAnswer,
          topic: row.topic || 'General',
          topic_area: row.topic_area || row.topic || 'General',
          explanation: row.explanation || 'A worked explanation is awaiting editor review.'
        }
      })
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ results, score: results.filter(result => result.correct).length })
    }
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
