import assert from 'node:assert/strict'
import {uploadMetadata,coverageRows} from '../src/question-upload-metadata.js'

const defaults={class_level:'Grade 2',curriculum:'GES'}
assert.deepEqual(uploadMetadata({class_level:'Grade 3',curriculum:'Cambridge',is_active:'false'},defaults),{class_level:'Grade 3',curriculum:'Cambridge',is_active:false})
assert.deepEqual(uploadMetadata({},defaults),{...defaults,is_active:true})
assert.equal(uploadMetadata({is_active:false},defaults).is_active,false)
assert.equal(uploadMetadata({is_active:'0'},defaults).is_active,false)
assert.equal(uploadMetadata({is_active:'TRUE'},defaults).is_active,true)
assert.throws(()=>uploadMetadata({class_level:'Stage 4'},defaults),/Invalid class/)
assert.throws(()=>uploadMetadata({curriculum:'Other'},defaults),/Invalid curriculum/)
assert.throws(()=>uploadMetadata({is_active:'maybe'},defaults),/is_active/)
const rows=coverageRows([{class_level:'Grade 4',curriculum:'Cambridge',topic:'Fractions',question_count:10},{class_level:'Grade 4',curriculum:'Cambridge',topic:'',question_count:5},{class_level:'Grade 4',curriculum:'GES',topic:'Addition',question_count:700}],'Cambridge')
assert.deepEqual(rows.find(r=>r.class_level==='Grade 4'),{class_level:'Grade 4',questions:15,topics:1,smallTopics:1})
assert.deepEqual(rows.find(r=>r.class_level==='Grade 3'),{class_level:'Grade 3',questions:0,topics:0,smallTopics:0})
console.log('PASS file class/curriculum and inactive flags are preserved; defaults fill blanks; coverage includes missing classes and unassigned questions.')
