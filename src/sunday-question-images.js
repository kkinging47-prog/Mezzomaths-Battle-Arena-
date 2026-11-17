const REQUIREMENT_TAG = /\[question-image:\s*(required|optional)\]/gi
const DIAGRAM_REFERENCE = /\b(?:in|from|use|using|study|observe|shown in|based on|look at)\s+(?:the|this|following)\s+(?:venn\s+diagram|diagram|figure|picture|graph|chart|table|mapping|stem[- ]and[- ]leaf plot|number line)\b|\b(?:diagram|figure|picture|graph|chart|table|mapping|stem[- ]and[- ]leaf plot|number line)\s+(?:above|below|shows|represents|illustrates|given)\b|\bthe\s+(?:diagram|figure|picture)\s+is\b|\brule\s+(?:for|of)\s+the\s+mapping\b/i
const hasValue = value => Boolean(String(value ?? '').trim())

export function questionImageRequirement(question) {
  const notes = String(question.editor_notes ?? '')
  const explicit = [...notes.matchAll(REQUIREMENT_TAG)].at(-1)?.[1].toLowerCase()
  if (explicit) return explicit
  return DIAGRAM_REFERENCE.test(question.question_text || '') ||
    DIAGRAM_REFERENCE.test(notes) || /\bimage\s+(?:required|needed)\b/i.test(notes) ? 'required' : 'optional'
}

export function withQuestionImageRequirement(notes, requirement) {
  const clean = String(notes ?? '').replace(REQUIREMENT_TAG, '').trim()
  const tag = `[question-image: ${requirement === 'required' ? 'required' : 'optional'}]`
  return clean ? clean + '\n' + tag : tag
}

export function questionImageStatus(question) {
  const uploaded = []
  const missing = []
  if (hasValue(question.question_image_url)) uploaded.push('Question')
  else if (questionImageRequirement(question) === 'required' || !hasValue(question.question_text)) missing.push('Question')
  for (const letter of ['a', 'b', 'c', 'd']) {
    const label = 'Option ' + letter.toUpperCase()
    if (hasValue(question[`option_${letter}_image_url`])) uploaded.push(label)
    else if (!hasValue(question[`option_${letter}`])) missing.push(label)
  }
  return { uploaded, missing }
}
