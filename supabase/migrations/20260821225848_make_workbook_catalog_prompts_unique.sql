
with ranked as (
  select id,source_page,question_text,
         count(*) over(partition by class_level,topic,question_text) duplicate_count
  from public.question_bank
  where source_type='original_generated'
    and source_name='Mezzo workbook catalog 500-topic bank v2'
), fixes as (
  select id,
    format('At the %s station, %s uses the %s activity card. %s',
      (array['Number','Pattern','Discovery','Practice','Challenge','Thinking','Skills','Puzzle','Learning','Revision'])[((source_page::int-1)/50)%10+1],
      (array['Ama','Kojo','Esi','Kofi','Adwoa'])[((source_page::int-1)%5)+1],
      (array['mango','book','pencil','counter','orange','star','ball','bead','crayon','bottle'])[((source_page::int-1)/5)%10+1],
      question_text) revised_question
  from ranked where duplicate_count>1
)
update public.question_bank q
set question_text=f.revised_question,updated_at=now()
from fixes f where q.id=f.id;
