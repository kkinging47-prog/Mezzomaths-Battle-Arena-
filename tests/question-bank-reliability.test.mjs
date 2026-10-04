import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {selectVariedQuestions} from '../src/question-selection.js'
const {parseHTML}=await import(process.env.LESSON_TEST_DOM||'/tmp/question-check/node_modules/linkedom/esm/index.js')
const {document,window}=parseHTML('<html><body><div id="root"></div></body></html>')
const storage=new Map(),localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}
let rows=[],dbError=null,filters={}
const query={select(){return this},eq(k,v){filters[k]=v;return this},order(){return this},limit(){return this},not(){return this},then(resolve){return Promise.resolve({data:rows,error:dbError}).then(resolve)}}
const context=vm.createContext({document,window,localStorage,console,Math,Date,JSON,selectVariedQuestions,supabase:{from:()=>query,rpc:async()=>({data:[{class_level:'Grade 4',curriculum:'GES',topic:'Database-only topic'}]})},setTimeout(){},clearInterval(){},setInterval(){}})
let code=fs.readFileSync('src/main.jsx','utf8').replace(/^import .*$/gm,'').replace(/\nrender\(\)\s*\nloadTopicCoverage\(\)\s*$/,'')
vm.runInContext(code,context)
vm.runInContext('render=()=>{}',context)
await context.loadTopicCoverage()
assert.equal(vm.runInContext("topicOptionsFor('Grade 4','GES')[0]",context),'Database-only topic')
assert.equal(vm.runInContext("topicOptionsFor('Grade 4','Cambridge').length",context),0)
assert.match(vm.runInContext("learnerTopicOptions('Grade 4','Cambridge','')",context),/No questions available/)
assert.equal((await context.loadQuestionSet({classLevel:'Grade 4',curriculum:'Cambridge',topic:'Algebra'})).length,0)
assert.equal(filters.curriculum,'Cambridge')
dbError={message:'Network failure'};assert.equal((await context.loadQuestionSet({classLevel:'Grade 4',curriculum:'GES',topic:'Algebra'})).length,0);dbError=null
rows=[{id:'exact-record',question_text:'Same wording',class_level:'Grade 4',curriculum:'GES',topic:'Database-only topic',option_a:'8',option_b:'5',option_c:'9',option_d:'7',correct_answer:'A'}]
assert.equal((await context.loadQuestionSet({classLevel:'Grade 4',curriculum:'GES',topic:'Database-only topic'}))[0].id,'exact-record')
// A stale bank record with identical wording must never determine the current key.
localStorage.setItem('mezzo_question_bank',JSON.stringify([{question_text:'Same wording',correct_answer:'D'}]))
const randomizer=fs.readFileSync('src/answer-option-randomizer.js','utf8').split("document.addEventListener('click'")[0]
vm.runInContext(randomizer,context)
function card(correct='A',selected=false){const node=document.createElement('article');node.dataset.correctAnswer=correct;node.innerHTML='<h2>Same wording</h2>'+['A','B','C','D'].map((key,i)=>`<button data-solo-answer="${key}" class="${selected&&key===correct?'correct':''}"><span>${key}</span><strong>${['8','5','9','7'][i]}</strong></button>`).join('');return node}
for(const selected of [false,true]){const node=card('A',selected);context.randomizeCard(node,'practice');const correct=node.querySelector('[data-solo-answer="A"]');assert.equal(correct.querySelector('strong').textContent,'8');if(selected)assert.ok(correct.classList.contains('correct'));assert.equal(new Set([...node.querySelectorAll('button')].map(b=>b.dataset.soloAnswer)).size,4);context.randomizeCard(node,'practice');assert.equal(correct.querySelector('strong').textContent,'8')}
const pool=Array.from({length:40},(_,i)=>({id:i,difficulty:i%3+1,source_name:i%2?'Workbook':'Extension',question_text:i<20?`Calculate ${i}+2`:`Find the missing number ${i}+__=50`}))
const selected=selectVariedQuestions(pool,15,()=>0.5);assert.equal(selected.length,15);assert.equal(new Set(selected.map(q=>q.id)).size,15);assert.equal(new Set(selected.map(q=>q.difficulty)).size,3);assert.equal(new Set(selected.map(q=>q.source_name)).size,2)
assert.equal(selectVariedQuestions([{question_text:'Duplicate'},{question_text:'Duplicate'}],15).length,1)
console.log('PASS: exact-record shuffled marking, feedback after redraw, curriculum-aware topics, missing-topic/error handling and varied unique sets.')
