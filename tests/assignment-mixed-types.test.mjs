import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as XLSX from 'xlsx'
import {parseAssignmentRows,numericValue,markAssignmentQuestion as mark} from '../src/assignment-question-types.js'
const h=['question_id','question_type','question','option_a','option_b','option_c','option_d','correct_option','correct_answer','acceptable_answers','marking','marks','explanation']
const rows=[h,['q1','single_select','12 × 8?','86','96','108','120','B','96','','auto',1,'Multiply'],['q2','number','One half?','','','','','','0.5','','auto',2,'Divide'],['q3','reasoning','Explain your method','','','','','','A valid model answer','','teacher_review',3,'Teacher rubric'],['q4','short_text','Name a shape','','','','','','square','rectangle | rhombus','auto',.5,''],['q5','investigation','Investigate a rule','','','','','','Many answers are valid','','auto',4,'']]
const q=parseAssignmentRows(rows);assert.equal(q.length,5);assert.equal(q[0].correct_answer,'B');assert.equal(q[2].marking,'teacher_review');assert.equal(q[4].marking,'teacher_review');assert.equal(q[2].marks,3)
assert.equal(mark(q[0],'b').awarded_marks,1);assert.equal(mark(q[0],'A').awarded_marks,0)
for(const v of ['0.5','1/2','50%','½'])assert.equal(mark(q[1],v).awarded_marks,2,v)
assert.equal(numericValue('-1 1/2'),-1.5);assert.equal(numericValue('1½'),1.5);assert.equal(numericValue('1,200'),1200)
for(const v of ['','1/0','1,2','12 cats','2+2','Infinity','NaN'])assert.equal(numericValue(v),null,v)
assert.equal(mark(q[1],'').awarded_marks,0);assert.equal(mark(q[3],'RHOMBUS').awarded_marks,.5)
assert.equal(mark(q[2],'My working').grading_status,'pending');assert.equal(mark(q[2],'').awarded_marks,null)
assert.equal(mark({...q[1],numeric_tolerance:.01},'.509').is_correct,true);assert.equal(mark(q[1],'.509').is_correct,false)
assert.throws(()=>parseAssignmentRows([h,rows[1],rows[1]]),/duplicate question_id/)
assert.throws(()=>parseAssignmentRows([h,[...rows[2].slice(0,11),-1]]),/marks/)
assert.throws(()=>parseAssignmentRows([h,['x','unknown','q']]),/unsupported question_type/)
assert.throws(()=>parseAssignmentRows([['question','question'],['q','q']]),/Repeated/)
assert.throws(()=>parseAssignmentRows([['question','question_type','correct_answer','diagram_file'],['q','number','1','diagram.jpg']]),/HTTPS/)
assert.throws(()=>parseAssignmentRows([h,...Array.from({length:101},(_,i)=>[String(i),...rows[1].slice(1)])]),/100 questions/)
const originalPath=process.argv[2]
if(originalPath){const wb=XLSX.read(fs.readFileSync(originalPath,'utf8').replace(/^\uFEFF/,''),{type:'string',raw:true}),original=parseAssignmentRows(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:'',raw:false}));assert.equal(original.length,20);assert.equal(original[3].correct_answer,'D');assert.equal(original[10].question_type,'reasoning');assert.equal(original[10].marks,2);assert.equal(original[18].question_type,'investigation');console.log('Original 20-question template accepted without conversion:',Object.fromEntries(['single_select','number','short_text','reasoning','investigation'].map(t=>[t,original.filter(q=>q.question_type===t).length])))}
console.log('PASS mixed-type import, original column mapping, equivalent numeric answers, alternatives, partial marks, manual marking and invalid-file boundaries.')
