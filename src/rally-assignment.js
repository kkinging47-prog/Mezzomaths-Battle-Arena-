import {RALLY_TRACKS} from './maths-rally-tracks.js'

export function rallySettings(questions){
 const first=questions?.[0]?.source_metadata?.rally
 if(!first||first.version!==1||!RALLY_TRACKS.some(t=>t.id===first.track)||!['rookie','club','expert'].includes(first.pace))return null
 if(!questions.length||questions.length>100||questions.some(q=>q.source_metadata?.rally?.version!==1||q.source_metadata.rally.track!==first.track||q.source_metadata.rally.pace!==first.pace||(q.question_type||'single_select')!=='single_select'||(q.marking||'auto')!=='auto'||Number(q.marks??1)!==1))return null
 return {version:1,track:first.track,pace:first.pace}
}

export function validateRallyQuestions(questions){
 if(!Array.isArray(questions)||!questions.length||questions.length>100)throw Error('Choose 1–100 questions for a class race.')
 if(questions.some(q=>(q.question_type||'single_select')!=='single_select'||(q.marking||'auto')!=='auto'||Number(q.marks??1)!==1||!/^[ABCD]$/.test(q.correct_answer)||['a','b','c','d'].some(k=>!String(q['option_'+k]||'').trim())))throw Error('Rally needs four-choice, automatically marked questions worth one mark each. Use a worksheet for written or mixed-mark questions.')
}

export function rallyDeadline(participant){return Math.min(participant.startedAt+Number(participant.assignment.duration_minutes)*60000,Date.parse(participant.assignment.closes_at))}

export function savedRallyAnswers(participant){
 return Object.fromEntries((participant.rallyCompleted||[]).map(pos=>[pos,participant.answers[pos]||'']))
}
