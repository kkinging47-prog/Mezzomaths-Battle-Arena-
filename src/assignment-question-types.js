// Shared by the workbook importer and server marking; never evaluate answer text as code.
export const QUESTION_TYPES=['single_select','number','short_text','reasoning','investigation']
export const headerKey=value=>String(value??'').replace(/^\uFEFF/,'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')
export const normaliseAnswer=value=>String(value??'').replace(/(\d)([¼½¾⅓⅔⅛⅜⅝⅞])/g,'$1 $2').normalize('NFKC').replace(/⁄/g,'/').replace(/[−–]/g,'-').trim().replace(/\s+/g,' ').toLowerCase()
export function numericValue(value){
 let s=normaliseAnswer(value);if(s.includes(',')){if(!/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?%?$/.test(s))return null;s=s.replace(/,/g,'')}if(!s||s.length>100)return null
 const percent=s.endsWith('%');if(percent)s=s.slice(0,-1).trim()
 let n
 if(/^[+-]?\d+\s+\d+\s*\/\s*\d+$/.test(s)){const m=s.match(/^([+-]?\d+)\s+(\d+)\s*\/\s*(\d+)$/);if(!Number(m[3]))return null;n=(Number(m[1])<0||m[1].startsWith('-')?-1:1)*(Math.abs(Number(m[1]))+Number(m[2])/Number(m[3]))}
 else if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)\s*\/\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)){const [a,b]=s.split('/').map(Number);if(!b)return null;n=a/b}
 else if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/.test(s))n=Number(s)
 else return null
 if(percent)n/=100
 return Number.isFinite(n)?n:null
}
function alternatives(value){if(!value)return [];if(Array.isArray(value))return value.map(String);const s=String(value).trim();if(s.startsWith('[')){let parsed;try{parsed=JSON.parse(s)}catch{throw new Error('acceptable_answers must be a JSON array or alternatives separated by |.')}if(!Array.isArray(parsed))throw new Error('acceptable_answers must be an array.');return parsed.map(String)}return s.split('|').map(v=>v.trim()).filter(Boolean)}
export function parseAssignmentRows(rows){
 if(!rows?.length)throw new Error('No question rows found.')
 const headers=rows[0].map(headerKey),errors=[],questions=[],ids=new Set()
 const duplicates=headers.filter((h,i)=>h&&headers.indexOf(h)!==i);if(duplicates.length)throw new Error('Repeated column headings: '+[...new Set(duplicates)].join(', '))
 if(!headers.some(h=>['question_text','question','q'].includes(h)))throw new Error('The first row must contain a question_text or question column.')
 for(let i=1;i<rows.length;i++){
  if(!rows[i]?.some(v=>String(v??'').trim()))continue
  const row={};headers.forEach((k,j)=>{if(k)row[k]=String(rows[i][j]??'').trim()})
  try{
   const get=(...names)=>names.map(n=>row[n]).find(v=>v!==undefined&&v!=='')||''
   const options=['a','b','c','d'].map(k=>get('option_'+k,k)),rawType=headerKey(get('question_type','type'))
   const aliases={mcq:'single_select',multiple_choice:'single_select',multiplechoice:'single_select',numeric:'number',numeric_answer:'number',short_answer:'short_text',text:'short_text',written:'short_text',essay:'reasoning'}
   const type=aliases[rawType]||rawType||(options.some(Boolean)?'single_select':'number')
   if(!QUESTION_TYPES.includes(type))throw new Error('unsupported question_type '+rawType+'. Use '+QUESTION_TYPES.join(', ')+'.')
   let expected=get('correct_answer','answer','numeric_answer','model_answer'),letter=get('correct_option','answer_letter').toUpperCase()
   if(type==='single_select'){
    const missing=options.map((v,j)=>v?'':String.fromCharCode(65+j)).filter(Boolean);if(missing.length)throw new Error('missing options '+missing.join(', ')+'.')
    if(!letter){if(/^[ABCD]$/i.test(expected))letter=expected.toUpperCase();else {const matches=options.map((v,j)=>normaliseAnswer(v)===normaliseAnswer(expected)?String.fromCharCode(65+j):'').filter(Boolean);if(matches.length===1)letter=matches[0]}}
    if(!/^[ABCD]$/.test(letter))throw new Error('provide correct_option A–D or a correct_answer matching one option.')
    if(get('correct_option','answer_letter')&&expected){const target=options[letter.charCodeAt(0)-65],a=numericValue(expected),b=numericValue(target);if(!(/^[ABCD]$/i.test(expected)?expected.toUpperCase()===letter:normaliseAnswer(expected)===normaliseAnswer(target)||(a!==null&&b!==null&&Math.abs(a-b)<1e-10)))throw new Error('correct_option conflicts with correct_answer. Check the answer key.')}
    if(new Set(options.map(normaliseAnswer)).size!==4)throw new Error('answer options must be distinct.')
    expected=letter
   }
   const requestedMarking=headerKey(get('marking','marking_mode'))
   if(requestedMarking&&!['auto','automatic','teacher_review','manual','teacher'].includes(requestedMarking))throw new Error('marking must be auto or teacher_review.')
   const manual=['teacher_review','manual','teacher'].includes(requestedMarking)||['reasoning','investigation'].includes(type)||(type==='short_text'&&!['auto','automatic'].includes(requestedMarking))
   const marking=manual?'teacher_review':'auto',accepted=alternatives(get('acceptable_answers','alternative_answers'))
   if(marking==='auto'&&!expected&&!accepted.length)throw new Error('an automatically marked question needs correct_answer.')
   if(type==='number'&&marking==='auto'&&[expected,...accepted].filter(Boolean).some(a=>numericValue(a)===null))throw new Error('numeric answers must be numbers, fractions or percentages. Use teacher_review for answers containing words.')
   const marks=Number(get('marks','max_marks')||1),tolerance=Number(get('tolerance','numeric_tolerance')||0)
   if(!Number.isFinite(marks)||marks<=0||marks>100||Math.abs(marks*100-Math.round(marks*100))>1e-7)throw new Error('marks must be greater than 0 and at most 100, with up to 2 decimal places.')
   if(!Number.isFinite(tolerance)||tolerance<0||tolerance>100)throw new Error('numeric_tolerance must be between 0 and 100.')
   const question=get('question_text','question','q');if(!question)throw new Error('missing question text.')
   const image=get('question_image_url','image_url','diagram_file');if(image&&!/^https:\/\/[^\s]+$/i.test(image))throw new Error('diagram_file must be a public HTTPS image URL. A local image filename cannot display for students.')
   if(Object.values(row).some(v=>v.length>20000))throw new Error('a cell exceeds 20,000 characters.')
   if(Object.entries(row).some(([k,v])=>/^option_[abcd]_image/.test(k)&&v))throw new Error('option image columns are not supported. Put a diagram in question_image_url instead.')
   const id=get('question_id','id');if(id&&ids.has(id))throw new Error('duplicate question_id '+id+'.');if(id)ids.add(id)
   questions.push({question_text:question,option_a:options[0],option_b:options[1],option_c:options[2],option_d:options[3],correct_answer:expected,explanation:get('explanation','solution'),question_type:type,marking,marks,acceptable_answers:accepted,numeric_tolerance:tolerance,question_image_url:image,hint:get('hint'),source_metadata:row})
  }catch(error){errors.push(`Row ${i+1}: ${error.message}`)}
 }
 if(rows.slice(1).filter(r=>r?.some(v=>String(v??'').trim())).length>100)errors.push('Upload at most 100 questions per assignment. Split larger banks into assignment files.')
 if(!questions.length&&!errors.length)errors.push('No question rows found.')
 if(errors.length)throw new Error(errors.slice(0,20).join('\n')+(errors.length>20?`\n…and ${errors.length-20} more errors.`:''))
 return questions
}
export function markAssignmentQuestion(question,answer){
 const selected=String(answer??'').trim(),max=Number(question.marks??1)
 if(question.marking==='teacher_review')return {selected_answer:selected,correct_answer:question.correct_answer||'',is_correct:null,awarded_marks:null,max_marks:max,grading_status:'pending'}
 const expected=[question.correct_answer,...(question.acceptable_answers||[])].filter(v=>v!==''&&v!=null)
 const correct=selected!==''&&expected.some(value=>{if(question.question_type==='number'){const a=numericValue(selected),b=numericValue(value);return a!==null&&b!==null&&Math.abs(a-b)<=Math.max(Number(question.numeric_tolerance||0),1e-10*Math.max(1,Math.abs(b)))}return normaliseAnswer(selected)===normaliseAnswer(value)})
 return {selected_answer:selected,correct_answer:question.correct_answer||'',is_correct:correct,awarded_marks:correct?max:0,max_marks:max,grading_status:'graded'}
}
