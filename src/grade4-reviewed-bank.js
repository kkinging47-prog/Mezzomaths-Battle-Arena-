export const GRADE4_REVIEWED_SOURCE = 'reviewed_ges_grade4_v1'
export const GRADE4_REVIEWED_TOPICS = ['Multiplication and division','Whole-number operations','Place value','Rounding','Roman numerals','Positive and negative numbers','Factors and multiples','Fractions','Decimals','Percentages','Number patterns','Equations and unknowns','Line symmetry','Position and direction','Area','Perimeter','Area and perimeter','Time','Data handling']
export const isGrade4Reviewed = q => q?.class_level === 'Grade 4' && q?.curriculum === 'GES' && q?.source_type === GRADE4_REVIEWED_SOURCE
export const grade4Area = topic => GRADE4_REVIEWED_TOPICS.includes(topic) ? topic : null
export function orderGrade4Topics(level,curriculum,topics) {
  if(level !== 'Grade 4' || curriculum !== 'GES') return topics
  const available=new Set(topics)
  return [...GRADE4_REVIEWED_TOPICS.filter(t=>available.has(t)),...topics.filter(t=>!GRADE4_REVIEWED_TOPICS.includes(t))]
}
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function grade4TopicOptions(topics,selected) {
 const option=t=>`<option value="${escape(t)}" ${t===selected?'selected':''}>${escape(t)}</option>`
 const reviewed=topics.filter(t=>GRADE4_REVIEWED_TOPICS.includes(t)),legacy=topics.filter(t=>!GRADE4_REVIEWED_TOPICS.includes(t))
 return (reviewed.length?`<optgroup label="Reviewed Grade 4 topics">${reviewed.map(option).join('')}</optgroup>`:'')+(legacy.length?`<optgroup label="Workbook practice — awaiting review">${legacy.map(option).join('')}</optgroup>`:'')
}
export function grade4FollowUp(question) {
 if(!isGrade4Reviewed(question))return ''
 let metadata;try{metadata=JSON.parse(question.ai_prompt||'{}')}catch{return ''}
 if(!metadata.teaching_prompt)return ''
 return `<details class="grade4-follow-up"><summary>Explain, draw or investigate</summary><p>${escape(metadata.teaching_prompt)}</p><details><summary>Suggested approach</summary><p>${escape(metadata.teaching_guidance||'Discuss your method with your teacher.')}</p></details></details>`
}
