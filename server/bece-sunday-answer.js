import {classifiedTopic} from '../src/question-topics.js'
import {enrichTopicAnswers} from './question-topic-analysis.js'
import { verifyTrialSession, supabaseRows, requireSundayAdmin, trialDeadline, safeQuestion, SUNDAY_QUESTION_COLUMNS } from '../api/_bece-sunday-security.js'

async function persistOfficialResult(session, score, total, results) {
  if (!session.candidateId || !session.weekStart) throw new Error('Candidate session is missing identity.')
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/,'')
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '')
  if (!url || !key) throw new Error('Results database is not configured.')
  if (Date.now() >= trialDeadline(session)) throw new Error('The examination closed at 8 PM. Submission is no longer available.')
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - Number(session.startedAt)) / 1000))
  const endpoint = url+'/rest/v1/bece_sunday_weekly_claims?candidate_id=eq.'+encodeURIComponent(session.candidateId)+'&week_start=eq.'+encodeURIComponent(session.weekStart)+'&completed_at=is.null&session_expires_at=gt.'+encodeURIComponent(new Date().toISOString())+'&session_token=eq.'+encodeURIComponent(session.rawToken)
  const response = await fetch(endpoint,{method:'PATCH',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({completed_at:new Date().toISOString(),result:{score,total,review:results,time_taken_seconds:elapsedSeconds,topics:results.reduce((acc,item)=>{const t=classifiedTopic(item.topic_analysis);if(!t)return acc;acc[t] ||= {total:0,correct:0};acc[t].total++;if(item.correct)acc[t].correct++;return acc},{})},mode:session.mode||'sunday',school_id:session.schoolId||null})})
  const saved = await response.json().catch(()=>[])
  if (!response.ok) throw new Error('Official result could not be saved.')
  if (!Array.isArray(saved) || saved.length!==1) throw new Error('This candidate has already submitted this weekly paper, or the session is no longer valid.')
  return elapsedSeconds
}
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { session_token: token } = req.body || {}
    const session = verifyTrialSession(token)
    session.rawToken = token
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
      const rows = await supabaseRows(`bece_question_bank?select=${encodeURIComponent(SUNDAY_QUESTION_COLUMNS)}&id=in.(${ids})`)
      const byId = new Map(rows.map(row => [String(row.id), row]))
      if (byId.size !== answers.length) return res.status(409).json({ error: 'A question changed during this trial. Please start again.' })
      const results = answers.map(answer => {
        const row = byId.get(String(answer.question_id))
        const correctAnswer = String(row.correct_answer || '').trim().toUpperCase().slice(0, 1)
        return {
          ...safeQuestion(row),
          question_id: row.id,
          selected_answer: answer.selected_answer,
          correct_answer: correctAnswer,
          correct: answer.selected_answer === correctAnswer,
          topic: row.topic || 'General',
          topic_area: row.topic_area || row.topic || 'General',
          explanation: row.explanation || 'A worked explanation is awaiting editor review.'
        }
      })
      const score = results.filter(result => result.correct).length
      const elapsedSeconds = session.preview ? Math.max(0, Math.floor((Date.now()-session.startedAt)/1000)) : await persistOfficialResult(session,score,results.length,results)
      const labelled=await enrichTopicAnswers(results,{generate:false})
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ results:labelled.answers, score, time_taken_seconds:elapsedSeconds })
    }
    return res.status(400).json({ error: 'Submit the complete set to receive feedback.' })
  } catch (error) {
    return res.status(401).json({ error: error.message || 'Unable to verify this answer.' })
  }
}
