import assert from 'node:assert/strict'
import {loadGameBank,uniqueGameQuestions,gameBankTopics} from '../src/game-question-bank.js'
const q={id:'q',question_text:'2+2?',option_a:'4',option_b:'5',option_c:'6',option_d:'7',correct_answer:'A'}
assert.equal(uniqueGameQuestions([q,{...q,id:'duplicate'}, {...q,id:'invalid',correct_answer:'X'}]).length,1)
assert.deepEqual(gameBankTopics([{class_level:'Grade 4',curriculum:'Cambridge',topic:'Fractions'},{class_level:'Grade 4',curriculum:'GES',topic:'Addition'},{class_level:'Grade 4',curriculum:'Cambridge',topic:''}],'Grade 4','Cambridge'),['Fractions'])
let called=0
await assert.rejects(()=>loadGameBank(null,{},async()=>{called++}),/Sign in/);assert.equal(called,0)
const client={auth:{getSession:async()=>({data:{session:{access_token:'example-token'}}})}}
const rows=await loadGameBank(client,{class_level:'Grade 4',curriculum:'Cambridge'},async(url,options)=>{called++;assert.equal(new URL(url,'https://test').searchParams.has('topic'),false);assert.equal(options.headers.Authorization,'Bearer example-token');return{ok:true,json:async()=>({data:[q]})}})
assert.equal(rows[0].id,'q')
await assert.rejects(()=>loadGameBank(client,{},async()=>({ok:false,json:async()=>({error:'Question bank unavailable.'})})),/unavailable/)
console.log('PASS game-bank authentication, curriculum scoping, All topics, validation, duplicate prompts and request failures.')
