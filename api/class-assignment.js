const WINDOW_MS = 10 * 60 * 1000
const MAX_REQUESTS = 80
const requests = new Map()

const clean = (value, limit = 180) => String(value || '').trim().slice(0, limit)
const ipOf = req => clean(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0]
function allowed(ip) { const now = Date.now(), recent = (requests.get(ip) || []).filter(t => now - t < WINDOW_MS); if (recent.length >= MAX_REQUESTS) return false; recent.push(now); requests.set(ip, recent); return true }
function config() { return { url: clean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, 300).replace(/\/$/, ''), key: clean(process.env.SUPABASE_SERVICE_ROLE_KEY, 3000) } }
async function db(path, options = {}) { const { url, key } = config(); if (!url || !key) throw new Error('Assignment service is not configured.'); const response = await fetch(`${url}/rest/v1/${path}`, { ...options, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(options.headers || {}) } }); const data = await response.json().catch(() => null); if (!response.ok) throw new Error(data?.message || data?.hint || `Database request failed (${response.status}).`); return data }
async function assignmentByCode(code) { const rows = await db(`teacher_assignments?code=eq.${encodeURIComponent(code)}&select=id,code,title,instructions,class_level,curriculum,topic,question_count,duration_minutes,opens_at,closes_at,status,show_leaderboard,assignment_type,target_group,max_attempts,pass_mark,feedback_mode,shuffle_questions&limit=1`); return rows?.[0] || null }
function availability(a) { const now = Date.now(), opens = new Date(a.opens_at).getTime(), closes = new Date(a.closes_at).getTime(); if (a.status !== 'published') return 'This assignment is not available.'; if (now < opens) return `This assignment opens at ${new Date(opens).toLocaleString('en-GH')}.`; if (now > closes) return 'This assignment has closed.'; return '' }

export default async function handler(req, res) {
  if (!allowed(ipOf(req))) return res.status(429).json({ error: 'Too many requests. Please wait and try again.' })
  try {
    if (req.method === 'GET') {
      const code = clean(req.query?.code, 16).toUpperCase()
      if (!/^[A-Z0-9]{6,12}$/.test(code)) return res.status(400).json({ error: 'Enter a valid assignment code.' })
      const assignment = await assignmentByCode(code)
      if (!assignment) return res.status(404).json({ error: 'Assignment code not found.' })
      const unavailable = availability(assignment)
      if (unavailable) return res.status(403).json({ error: unavailable, assignment })
      let rows = await db(`teacher_assignment_questions?assignment_id=eq.${assignment.id}&select=id,position,question_text,option_a,option_b,option_c,option_d&order=position.asc`)
      if (assignment.shuffle_questions) rows = [...rows].sort(() => Math.random() - .5)
      return res.status(200).json({ assignment, questions: rows })
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const code = clean(req.body?.code, 16).toUpperCase(), name = clean(req.body?.participant_name), classLevel = clean(req.body?.participant_class, 80), school = clean(req.body?.participant_school)
    const answers = Array.isArray(req.body?.answers) ? req.body.answers.slice(0, 100) : []
    if (!name || !classLevel) return res.status(400).json({ error: 'Name and class are required.' })
    const assignment = await assignmentByCode(code)
    if (!assignment) return res.status(404).json({ error: 'Assignment code not found.' })
    const unavailable = availability(assignment)
    if (unavailable) return res.status(403).json({ error: unavailable })
    const prior = await db(`teacher_assignment_attempts?assignment_id=eq.${assignment.id}&select=participant_name`)
    const used = (prior || []).filter(x => clean(x.participant_name).toLowerCase() === name.toLowerCase()).length
    if (used >= Number(assignment.max_attempts || 1)) return res.status(409).json({ error: `The maximum of ${assignment.max_attempts || 1} attempt(s) has been reached for this learner name.` })
    const questions = await db(`teacher_assignment_questions?assignment_id=eq.${assignment.id}&select=id,position,correct_answer,explanation&order=position.asc`)
    if (!questions.length) return res.status(409).json({ error: 'This assignment has no questions.' })
    const selected = new Map(answers.map(a => [Number(a.position), clean(a.answer, 1).toUpperCase()]))
    const corrections = questions.map(q => ({ position: q.position, selected_answer: selected.get(q.position) || '', correct_answer: q.correct_answer, is_correct: selected.get(q.position) === q.correct_answer, explanation: q.explanation || '' }))
    const score = corrections.filter(x => x.is_correct).length, total = questions.length, percent = Math.round(score / total * 10000) / 100
    const elapsed = Math.max(0, Math.min(Number(req.body?.time_seconds || 0), Number(assignment.duration_minutes) * 60))
    const attempts = await db('teacher_assignment_attempts?select=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ assignment_id: assignment.id, participant_name: name, participant_class: classLevel, participant_school: school, score, total, percent, time_seconds: elapsed }) })
    const attempt = attempts?.[0]
    if (!attempt?.id) throw new Error('The result could not be recorded.')
    await db('teacher_assignment_responses', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(corrections.map(row => ({ attempt_id: attempt.id, assignment_id: assignment.id, question_position: row.position, selected_answer: row.selected_answer || null, correct_answer: row.correct_answer, is_correct: row.is_correct, response_seconds: 0 }))) })
    const showCorrections = assignment.feedback_mode === 'immediate' || assignment.feedback_mode === 'after_submit' || (assignment.feedback_mode === 'after_close' && Date.now() > new Date(assignment.closes_at).getTime())
    return res.status(201).json({ attempt_id: attempt.id, score, total, percent, passed: percent >= Number(assignment.pass_mark || 50), time_seconds: elapsed, corrections: showCorrections ? corrections : [] })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Assignment service failed.' })
  }
}
