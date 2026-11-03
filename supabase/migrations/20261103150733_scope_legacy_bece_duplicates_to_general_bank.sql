-- Keep the legacy general-bank rule; Sunday sets use their complete-question identity index.
drop index public.bece_question_bank_content_key;
create unique index bece_question_bank_content_key on public.bece_question_bank(year,type,topic,question_text) where sunday_set_id is null;
