export const SET_IMPORT_COLUMNS = ['question_text','option_a','option_b','option_c','option_d','correct_answer','explanation','topic','topic_area','difficulty','year','question_image_url','option_a_image_url','option_b_image_url','option_c_image_url','option_d_image_url','source_page','editor_notes']
const text=value=>String(value??'').trim()
const key=value=>text(value).toLowerCase().replace(/[\s-]+/g,'_')
const fingerprint=row=>['question_text','option_a','option_b','option_c','option_d','question_image_url','option_a_image_url','option_b_image_url','option_c_image_url','option_d_image_url'].map(name=>text(row[name]).toLowerCase().replace(/\s+/g,' ')).join('|')
export function validateSetImport(input,{setId,capacity,existing=[]}={}) {
 const errors=[],rows=[]
 if(!Array.isArray(input)) return {rows,errors:['The file must contain a table of questions.']}
 const seen=new Set()
 const assigned=new Map(existing.filter(row=>row.sunday_set_id).map(row=>[fingerprint(row),row.sunday_set_id]))
 input.forEach((raw,index)=>{
  const source=Object.fromEntries(Object.entries(raw||{}).map(([name,value])=>[key(name),text(value)]))
  const row=Object.fromEntries(SET_IMPORT_COLUMNS.map(name=>[name,source[name]||'']))
  if(!['question_text','option_a','option_b','option_c','option_d','correct_answer'].some(name=>row[name])) return
  const line=index+2
  for(const name of ['question_text','option_a','option_b','option_c','option_d']) if(!row[name]) errors.push(`Row ${line}: ${name} is required.`)
  row.correct_answer=row.correct_answer.toUpperCase()
  if(!/^[ABCD]$/.test(row.correct_answer)) errors.push(`Row ${line}: correct_answer must be A, B, C or D.`)
  if(row.difficulty&&!['easy','medium','hard'].includes(row.difficulty.toLowerCase())) errors.push(`Row ${line}: difficulty must be Easy, Medium or Hard.`)
  row.difficulty=row.difficulty?row.difficulty[0].toUpperCase()+row.difficulty.slice(1).toLowerCase():'Medium'
  for(const name of SET_IMPORT_COLUMNS.filter(name=>name.endsWith('_url'))) {
   if(row[name]) {try {const url=new URL(row[name]);if(!['https:','http:'].includes(url.protocol)) throw Error()} catch {errors.push(`Row ${line}: ${name} must be an http or https image URL.`)}}
  }
  const fp=fingerprint(row)
  if(fp&&seen.has(fp)) errors.push(`Row ${line}: this question appears more than once in this upload.`)
  else if(assigned.has(fp)) errors.push(`Row ${line}: this question is already assigned to ${assigned.get(fp)===setId?'the selected Sunday set':'another Sunday set'}. Choose a different question to avoid repeating Sunday papers.`)
  if(fp) seen.add(fp)
  rows.push({...row,year:row.year||'2027 Prep',topic:row.topic||'BECE Exam Practice',topic_area:row.topic_area||row.topic||'BECE Exam Practice',type:'pastStyle',status:'Published',source_name:'Sunday BECE Special',math_format:'unicode',sunday_set_id:setId})
 })
 if(!rows.length) errors.push('No questions found. Fill the Questions sheet before uploading.')
 if(rows.length>capacity) errors.push(`This file contains ${rows.length} questions, but the selected set has ${Math.max(0,capacity)} available places.`)
 return {rows,errors}
}
export function readSetImportWorkbook(XLSX,buffer) {
 const book=XLSX.read(buffer,{type:'array'})
 const name=book.SheetNames.find(name=>name.toLowerCase()==='questions')||book.SheetNames[0]
 if(!name) throw new Error('The workbook has no worksheets.')
 const sheet=book.Sheets[name]
 const headers=XLSX.utils.sheet_to_json(sheet,{header:1,defval:''})[0]||[]
 const normalized=headers.map(key)
 const missing=['question_text','option_a','option_b','option_c','option_d','correct_answer'].filter(name=>!normalized.includes(name))
 if(missing.length) throw new Error('Missing columns: '+missing.join(', ')+'. Download the set upload template.')
 return XLSX.utils.sheet_to_json(sheet,{defval:'',raw:false})
}
export function setImportTemplate(XLSX) {
 const book=XLSX.utils.book_new()
 const sheet=XLSX.utils.aoa_to_sheet([SET_IMPORT_COLUMNS,...Array.from({length:40},()=>SET_IMPORT_COLUMNS.map(()=>''))])
 sheet['!cols']=SET_IMPORT_COLUMNS.map(name=>({wch:name==='question_text'||name==='explanation'?65:name.endsWith('_url')?38:22}))
 XLSX.utils.book_append_sheet(book,sheet,'Questions')
 const notes=[['Sunday BECE set upload instructions'],['Fill one question per row in the Questions sheet. Blank rows are ignored.'],['Required: question_text, option_a, option_b, option_c, option_d, correct_answer.'],['correct_answer must be A, B, C or D. Use text formatting for fractions, leading zeros and mathematical expressions.'],['Optional: explanation, topic, topic_area, difficulty (Easy/Medium/Hard), year, image URLs, source_page and editor_notes.'],['Image columns accept public http/https URLs, not local file paths. Add images through the individual editor if needed.'],['Set assignment comes from the selected set in the app; do not add a set ID.'],['Imports append to draft sets and cannot exceed 40 total questions. Duplicate question text is rejected.'],['Imported questions are Published within the draft set. Review them before marking the set ready.'],['Preview the file, fix all reported errors, then click Import into set.'],['Example question_text','option_a','option_b','option_c','option_d','correct_answer','explanation'],['What is 3 × 4?','7','12','16','34','B','Three groups of four equal twelve.']]
 const instructions=XLSX.utils.aoa_to_sheet(notes);instructions['!cols']=[{wch:110},...Array.from({length:6},()=>({wch:24}))]
 XLSX.utils.book_append_sheet(book,instructions,'Instructions')
 return book
}
