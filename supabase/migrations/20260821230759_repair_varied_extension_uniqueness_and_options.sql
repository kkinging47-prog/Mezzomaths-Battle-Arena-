
with v as (
 select id,class_level,topic,question_text,source_page,
 count(*) over(partition by class_level,topic,question_text) v3_count
 from public.question_bank
 where source_type='original_generated'
 and source_name='Mezzo varied web-guided 200-topic extension v3'
), needs_context as (
 select v.id,v.source_page,v.question_text
 from v
 where v.v3_count>1
 or exists(
  select 1 from public.question_bank old
  where old.source_type='original_generated'
  and old.source_name<>'Mezzo varied web-guided 200-topic extension v3'
  and old.class_level=v.class_level and old.topic=v.topic and old.question_text=v.question_text
 )
), fixed as (
 select id,format('At the %s station, %s selects the %s challenge card. %s',
  (array['Number','Pattern','Discovery','Practice'])[((source_page::int-1)/50)%4+1],
  (array['Ama','Kojo','Esi','Kofi','Adwoa'])[((source_page::int-1)%5)+1],
  (array['book','pencil','mango','counter','bead','orange','bottle','sticker','notebook','ball'])[((source_page::int-1)/5)%10+1],
  question_text) revised
 from needs_context
)
update public.question_bank q set question_text=f.revised,updated_at=now()
from fixed f where q.id=f.id;

with bad as (
 select id,numeric_answer,correct_answer
 from public.question_bank
 where source_type='original_generated'
 and source_name='Mezzo varied web-guided 200-topic extension v3'
 and numeric_answer is not null
 and (option_a=option_b or option_a=option_c or option_a=option_d or option_b=option_c or option_b=option_d or option_c=option_d)
)
update public.question_bank q set
 option_a=case b.correct_answer when 'A' then to_char(b.numeric_answer,'FM9999999990.9999')
   when 'B' then to_char(b.numeric_answer+1,'FM9999999990.9999')
   when 'C' then to_char(b.numeric_answer+2,'FM9999999990.9999')
   else to_char(b.numeric_answer+3,'FM9999999990.9999') end,
 option_b=case b.correct_answer when 'A' then to_char(b.numeric_answer+1,'FM9999999990.9999')
   when 'B' then to_char(b.numeric_answer,'FM9999999990.9999')
   when 'C' then to_char(b.numeric_answer+3,'FM9999999990.9999')
   else to_char(b.numeric_answer+2,'FM9999999990.9999') end,
 option_c=case b.correct_answer when 'A' then to_char(b.numeric_answer+2,'FM9999999990.9999')
   when 'B' then to_char(b.numeric_answer+3,'FM9999999990.9999')
   when 'C' then to_char(b.numeric_answer,'FM9999999990.9999')
   else to_char(b.numeric_answer+1,'FM9999999990.9999') end,
 option_d=case b.correct_answer when 'A' then to_char(b.numeric_answer+3,'FM9999999990.9999')
   when 'B' then to_char(b.numeric_answer+2,'FM9999999990.9999')
   when 'C' then to_char(b.numeric_answer+1,'FM9999999990.9999')
   else to_char(b.numeric_answer,'FM9999999990.9999') end,
 updated_at=now()
from bad b where q.id=b.id;
