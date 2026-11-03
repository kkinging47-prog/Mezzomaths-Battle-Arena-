import fs from 'node:fs'
import assert from 'node:assert/strict'

const bank=JSON.parse(fs.readFileSync(new URL('../data/cambridge-primary-coverage-2026-11-03.json',import.meta.url)))
const seen=new Set()
for(const q of bank.questions){
 assert.equal(q.curriculum,'Cambridge')
 assert.ok(['Grade 3','Grade 4'].includes(q.class_level))
 assert.equal(q.is_active,true)
 for(const key of ['question_text','option_a','option_b','option_c','option_d','explanation','topic','source_page'])assert.ok(q[key]?.trim(),`${q.source_page}: missing ${key}`)
 assert.match(q.correct_answer,/^[ABCD]$/)
 assert.equal(new Set(['a','b','c','d'].map(k=>q['option_'+k].trim().toLowerCase())).size,4,`${q.source_page}: repeated options`)
 assert.ok(Number.isInteger(q.difficulty)&&q.difficulty>=1&&q.difficulty<=20)
 assert.ok(!seen.has(q.source_page),`Duplicate source: ${q.source_page}`)
 assert.ok(!bank.held.some(h=>h.source_page===q.source_page))
 seen.add(q.source_page)
}
assert.equal(bank.questions.filter(q=>q.class_level==='Grade 3').length,86)
assert.equal(bank.questions.filter(q=>q.class_level==='Grade 4').length,75)
assert.equal(bank.held.length,39)
if(process.argv.includes('--sql')){
 const json=JSON.stringify([...bank.questions,...bank.held.map(h=>h.question)]).replaceAll("'","''")
 console.log(`BEGIN;
SELECT pg_advisory_xact_lock(hashtext('mezzo-cambridge-primary-coverage-2026-11-03'));
CREATE TEMP TABLE cambridge_coverage_source ON COMMIT DROP AS SELECT * FROM jsonb_populate_recordset(NULL::public.question_bank,'${json}'::jsonb);
UPDATE public.question_bank q SET class_level=s.class_level,curriculum=s.curriculum,is_active=s.is_active,updated_at=now()
FROM cambridge_coverage_source s WHERE q.source_name=s.source_name AND q.source_page=s.source_page AND q.question_text=s.question_text AND q.option_a=s.option_a AND q.option_b=s.option_b AND q.option_c=s.option_c AND q.option_d=s.option_d AND coalesce(q.question_image_url,'')='' AND (q.class_level<>s.class_level OR q.curriculum<>s.curriculum OR q.is_active IS DISTINCT FROM s.is_active);
WITH inserted AS (
 INSERT INTO public.question_bank (class_level,curriculum,topic,difficulty,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,is_active,topic_area,topic_sublevel,battle_mode,source_type,source_name,source_page)
 SELECT s.class_level,s.curriculum,s.topic,s.difficulty,s.question_text,s.option_a,s.option_b,s.option_c,s.option_d,s.correct_answer,s.explanation,s.is_active,s.topic_area,s.topic_sublevel,s.battle_mode,s.source_type,s.source_name,s.source_page FROM cambridge_coverage_source s
 WHERE NOT EXISTS (SELECT 1 FROM public.question_bank q WHERE q.class_level=s.class_level AND q.curriculum=s.curriculum AND ((q.source_name=s.source_name AND q.source_page=s.source_page) OR (q.question_text=s.question_text AND q.option_a=s.option_a AND q.option_b=s.option_b AND q.option_c=s.option_c AND q.option_d=s.option_d AND coalesce(q.question_image_url,'')='')))
 RETURNING class_level
) SELECT class_level,count(*) AS inserted FROM inserted GROUP BY class_level;
COMMIT;`)
}else console.log('PASS 161 text-ready Cambridge questions; 39 diagram questions withheld; keys, options, source IDs and class/curriculum validated.')
