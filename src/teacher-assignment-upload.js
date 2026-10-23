import * as XLSX from 'xlsx'
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const drafts=new WeakMap()
export function assignmentUploadPanel(){return `<fieldset style="border:1px solid #cbd5e1;border-radius:14px;padding:16px;margin:16px 0;color:#142d4e;background:#f8fafc"><legend>Question source</legend><label>Use questions from<select name="question_source" data-assignment-source><option value="bank">Mezzo question bank</option><option value="excel">Upload Excel questions</option></select></label><div data-assignment-upload-panel hidden><p>Upload 1–100 multiple-choice questions. Required columns: question_text, option_a, option_b, option_c, option_d, correct_answer (A–D). Optional: explanation. The first worksheet is used; image-only questions are not supported.</p><button type="button" data-assignment-template>Download Excel template</button><label>Assignment topic<input name="upload_topic" placeholder="e.g. Fractions revision" maxlength="180"></label><label>Choose Excel file<input type="file" data-assignment-file accept=".xlsx,.xls"></label><button type="button" data-assignment-import>Upload questions to assignment</button><div data-assignment-upload-status role="status" aria-live="polite"></div></div></fieldset>`}
export function parseAssignmentRows(rows){
 const errors=[],questions=[]
 for(let i=1;i<rows.length;i++){
  if(!rows[i].some(v=>String(v??'').trim()))continue
  const row={};rows[0].forEach((k,j)=>row[String(k).trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')]=String(rows[i][j]??'').trim())
  const q={question_text:row.question_text||row.question||row.q||'',option_a:row.option_a||row.a||'',option_b:row.option_b||row.b||'',option_c:row.option_c||row.c||'',option_d:row.option_d||row.d||'',correct_answer:(row.correct_answer||row.answer||'').toUpperCase(),explanation:row.explanation||row.solution||''}
  const missing=['question_text','option_a','option_b','option_c','option_d'].filter(k=>!q[k])
  if(missing.length)errors.push(`Row ${i+1}: missing ${missing.join(', ')}.`)
  if(!/^[ABCD]$/.test(q.correct_answer))errors.push(`Row ${i+1}: correct_answer must be A, B, C or D.`)
  if(Object.values(q).some(v=>v.length>20000))errors.push(`Row ${i+1}: a cell exceeds 20,000 characters.`)
  if(Object.entries(row).some(([k,v])=>/image/.test(k)&&v))errors.push(`Row ${i+1}: image columns are not supported in assignments yet.`)
  questions.push(q)
 }
 if(!questions.length)errors.push('No question rows found. Use the first worksheet with column headings in row 1.')
 if(questions.length>100)errors.push('Upload at most 100 questions per assignment.')
 if(errors.length)throw new Error(errors.slice(0,12).join('\n'))
 return questions
}
export function uploadedAssignmentQuestions(form){const draft=drafts.get(form),file=form.querySelector('[data-assignment-file]')?.files?.[0];if(!draft||draft.file!==file)throw new Error('Choose an Excel file and click Upload questions to assignment first.');return draft.questions}
function syncSource(form){const excel=form.elements.question_source.value==='excel';form.querySelector('[data-assignment-upload-panel]').hidden=!excel;for(const name of ['topic','difficulty','question_count'])form.elements[name].disabled=excel;form.elements.topic.required=!excel;form.elements.upload_topic.required=excel;if(!excel)form.querySelector('[data-create-status]').textContent=''}
document.addEventListener('change',event=>{const form=event.target.closest('[data-create-assignment]');if(!form)return;if(event.target.matches('[data-assignment-source]'))syncSource(form);if(event.target.matches('[data-assignment-file]')){drafts.delete(form);form.querySelector('[data-assignment-upload-status]').textContent='File selected. Click Upload questions to assignment to validate and preview it.'}})
document.addEventListener('click',async event=>{
 const form=event.target.closest('[data-create-assignment]');if(!form)return
 if(event.target.closest('[data-assignment-template]')){event.preventDefault();const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([{question_text:'What is 12 × 8?',option_a:'86',option_b:'96',option_c:'108',option_d:'120',correct_answer:'B',explanation:'12 × 8 = 96.'}]),'Questions');XLSX.writeFile(wb,'Mezzo_Teacher_Assignment_Template.xlsx');return}
 const button=event.target.closest('[data-assignment-import]');if(!button)return;event.preventDefault();const out=form.querySelector('[data-assignment-upload-status]'),file=form.querySelector('[data-assignment-file]').files[0];drafts.delete(form);button.disabled=true
 try{if(!file||! /\.(xlsx|xls)$/i.test(file.name))throw new Error('Choose an .xlsx or .xls file.');if(file.size>5*1024*1024)throw new Error('Choose a file smaller than 5 MB.');out.textContent='Reading questions…';const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});if(form.querySelector('[data-assignment-file]').files[0]!==file)return;const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:'',raw:false,blankrows:true}),questions=parseAssignmentRows(rows);drafts.set(form,{file,questions});form.elements.question_count.value=questions.length;out.innerHTML=`<p><b>${questions.length} questions ready.</b> All uploaded questions will be used in worksheet order. Review below, set the schedule, then publish.</p><details><summary>Preview all ${questions.length} questions and answers</summary><ol>${questions.map(q=>`<li style="margin:12px 0"><b>${esc(q.question_text)}</b><div>${['a','b','c','d'].map(k=>esc(k.toUpperCase()+': '+q['option_'+k])).join(' · ')}</div><small>Answer: ${esc(q.correct_answer)} · ${esc(q.explanation)}</small></li>`).join('')}</ol></details>`}catch(error){out.textContent=error.message;out.style.whiteSpace='pre-line'}finally{button.disabled=false}
})
