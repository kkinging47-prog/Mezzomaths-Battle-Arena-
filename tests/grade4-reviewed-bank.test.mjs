import assert from 'node:assert/strict'
import fs from 'node:fs'
import {grade4Area,grade4TopicOptions,orderGrade4Topics,grade4FollowUp,isGrade4Reviewed} from '../src/grade4-reviewed-bank.js'
const legacy='Multiplication by 11 (2 & 3 dw)'
assert.deepEqual(orderGrade4Topics('Grade 4','GES',[legacy,'Fractions','Multiplication and division']),['Multiplication and division','Fractions',legacy])
assert.deepEqual(orderGrade4Topics('Grade 4','Cambridge',[legacy,'Fractions']),[legacy,'Fractions'])
assert.equal(grade4Area('Equations and unknowns'),'Equations and unknowns')
assert.equal(grade4Area('Mezzo Workbook'),null)
const html=grade4TopicOptions(['Fractions',legacy],'Fractions')
assert.match(html,/Reviewed Grade 4 topics/);assert.match(html,/awaiting review/);assert.match(html,/value="Fractions" selected/)
assert.equal(grade4FollowUp({class_level:'Grade 5',curriculum:'GES',source_type:'reviewed_ges_grade4_v1',ai_prompt:'{}'}),'')
assert.equal(grade4FollowUp({class_level:'Grade 4',curriculum:'GES',source_type:'reviewed_ges_grade4_v1',ai_prompt:'not-json'}),'')
assert.doesNotMatch(grade4FollowUp({class_level:'Grade 4',curriculum:'GES',source_type:'reviewed_ges_grade4_v1',ai_prompt:JSON.stringify({teaching_prompt:'<img src=x onerror=alert(1)>',teaching_guidance:'Safe'})}),/<img/)
const release=JSON.parse(fs.readFileSync(new URL('../supabase/data/ges-grade4-reviewed-v1.json',import.meta.url)))
assert.equal(release.length,100);assert.equal(new Set(release.map(x=>x.topic)).size,19)
assert.equal(release.filter(x=>x.question_image_url).length,19)
assert.equal(release.filter(x=>x.numeric_answer!==null).length,45)
for(const q of release){assert(isGrade4Reviewed(q));assert.equal(q.topic_area,q.topic);assert(q.topic_sublevel);const meta=JSON.parse(q.ai_prompt);assert(meta.previous_question_id);assert(meta.curriculum_reference);assert(meta.thinking_demand)}
console.log('Grade 4 category, curriculum isolation, lineage, image and numeric-mode checks passed.')
