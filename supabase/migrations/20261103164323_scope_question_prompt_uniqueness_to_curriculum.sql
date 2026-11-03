-- The same prompt may be authored for different curricula. Keep duplicate
-- protection within the exact class, curriculum and topic.
SET lock_timeout = '5s';
CREATE UNIQUE INDEX question_bank_unique_prompt_per_curriculum_topic_idx ON public.question_bank (class_level, curriculum, topic, lower(btrim(question_text)));
DROP INDEX public.question_bank_unique_prompt_per_topic_idx;
