import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import {SET_IMPORT_COLUMNS,validateSetImport,readSetImportWorkbook,setImportTemplate} from '../src/sunday-set-import.js'
const question={question_text:'What is 3 × 4?',option_a:'7',option_b:'12',option_c:'16',option_d:'34',correct_answer:'b',explanation:'Three groups of four.',question_image_url:'https://example.org/diagram.png'}
const options={setId:'selected-set',capacity:40,existing:[]}
let checked=validateSetImport([question],options);assert.deepEqual(checked.errors,[]);assert.equal(checked.rows[0].correct_answer,'B');assert.equal(checked.rows[0].sunday_set_id,'selected-set');assert.equal(checked.rows[0].status,'Published')
assert.equal(validateSetImport([{...question,sunday_set_id:'wrong-set',id:'wrong-id'}],options).rows[0].sunday_set_id,'selected-set');assert.equal(validateSetImport([{...question,id:'wrong-id'}],options).rows[0].id,undefined)
assert.match(validateSetImport([{...question,option_d:''}],options).errors.join(),/option_d/)
assert.match(validateSetImport([{...question,correct_answer:'12'}],options).errors.join(),/A, B, C or D/)
assert.match(validateSetImport([{...question,question_image_url:'javascript:alert(1)'}],options).errors.join(),/http or https/)
assert.match(validateSetImport([question,question],options).errors.join(),/already exists/)
assert.match(validateSetImport([question],{...options,existing:[{question_text:' WHAT IS 3 × 4?  '}]}).errors.join(),/already exists/)
assert.match(validateSetImport([question],{...options,capacity:0}).errors.join(),/available places/)
assert.equal(validateSetImport([{year:'2027 Prep'},question],options).rows.length,1)
const template=setImportTemplate(XLSX);assert.deepEqual(template.SheetNames,['Questions','Instructions']);assert.deepEqual(XLSX.utils.sheet_to_json(template.Sheets.Questions,{header:1})[0],SET_IMPORT_COLUMNS)
const empty=readSetImportWorkbook(XLSX,XLSX.write(template,{type:'array',bookType:'xlsx'}));assert.equal(validateSetImport(empty,options).rows.length,0)
const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet([question]),'Questions');const roundTrip=readSetImportWorkbook(XLSX,XLSX.write(book,{type:'array',bookType:'xlsx'}));assert.equal(validateSetImport(roundTrip,options).rows[0].question_text,question.question_text)
const csv=XLSX.utils.sheet_to_csv(book.Sheets.Questions);assert.equal(readSetImportWorkbook(XLSX,new TextEncoder().encode(csv))[0].explanation,question.explanation)
const wrong=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wrong,XLSX.utils.aoa_to_sheet([['Question','Answer'],['Hello','A']]),'Sheet1');assert.throws(()=>readSetImportWorkbook(XLSX,XLSX.write(wrong,{type:'array',bookType:'xlsx'})),/Missing columns/)
console.log('PASS template round-trip, Excel/CSV parsing, required fields, answers, duplicates, capacity, safe image URLs and selected-set assignment.')
