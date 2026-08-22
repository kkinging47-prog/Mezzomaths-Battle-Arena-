create table backup_20260821_step9.question_bank_reconciliation_removed
(like public.question_bank including all);

alter table backup_20260821_step9.question_bank_reconciliation_removed
  add column removal_reason text not null,
  add column archived_at timestamptz not null default now();

revoke all on backup_20260821_step9.question_bank_reconciliation_removed
  from public, anon, authenticated;

insert into backup_20260821_step9.question_bank_reconciliation_removed
select q.*, 'legacy_unattributed_surplus', now()
from public.question_bank q
where q.ai_generated is true
  and q.source_type is null
  and q.source_name is null;

do $$
declare
  archived_count integer;
begin
  select count(*) into archived_count
  from backup_20260821_step9.question_bank_reconciliation_removed
  where removal_reason = 'legacy_unattributed_surplus';

  if archived_count <> 180 then
    raise exception 'Expected 180 legacy surplus rows, found %', archived_count;
  end if;
end
$$;

delete from public.question_bank q
using backup_20260821_step9.question_bank_reconciliation_removed a
where a.id = q.id
  and a.removal_reason = 'legacy_unattributed_surplus';

with ranked as (
  select
    q.*,
    row_number() over (
      partition by q.class_level, q.topic, lower(btrim(q.question_text))
      order by
        (q.source_type = 'original_generated') desc,
        exists (
          select 1 from public.session_answers s
          where s.question_id = q.id
        ) desc,
        exists (
          select 1 from public.teacher_assignment_questions t
          where t.question_id = q.id
        ) desc,
        (q.source_name is not null) desc,
        q.created_at asc,
        q.id asc
    ) as duplicate_rank
  from public.question_bank q
),
duplicate_rows as (
  select r.*
  from ranked r
  where r.duplicate_rank > 1
)
insert into backup_20260821_step9.question_bank_reconciliation_removed
select
  d.id, d.class_level, d.curriculum, d.topic, d.difficulty,
  d.question_text, d.option_a, d.option_b, d.option_c, d.option_d,
  d.correct_answer, d.explanation, d.image_url, d.is_active,
  d.created_by, d.created_at, d.topic_area, d.topic_sublevel,
  d.battle_mode, d.question_image_url, d.option_a_image_url,
  d.option_b_image_url, d.option_c_image_url, d.option_d_image_url,
  d.ai_generated, d.ai_prompt, d.updated_at, d.numeric_answer,
  d.source_type, d.source_name, d.source_page,
  'duplicate_question_text', now()
from duplicate_rows d;

do $$
declare
  duplicate_count integer;
  referenced_count integer;
begin
  select count(*) into duplicate_count
  from backup_20260821_step9.question_bank_reconciliation_removed
  where removal_reason = 'duplicate_question_text';

  if duplicate_count <> 203 then
    raise exception 'Expected 203 duplicate rows, found %', duplicate_count;
  end if;

  select count(*) into referenced_count
  from backup_20260821_step9.question_bank_reconciliation_removed a
  where a.removal_reason = 'duplicate_question_text'
    and (
      exists (
        select 1 from public.session_answers s
        where s.question_id = a.id
      )
      or exists (
        select 1 from public.teacher_assignment_questions t
        where t.question_id = a.id
      )
    );

  if referenced_count <> 0 then
    raise exception 'Refusing to delete % referenced duplicate rows', referenced_count;
  end if;
end
$$;

delete from public.question_bank q
using backup_20260821_step9.question_bank_reconciliation_removed a
where a.id = q.id
  and a.removal_reason = 'duplicate_question_text';

create unique index question_bank_unique_prompt_per_topic_idx
on public.question_bank (
  class_level,
  topic,
  lower(btrim(question_text))
);

do $$
declare
  total_rows bigint;
  group_count integer;
  correct_groups integer;
  duplicate_groups integer;
begin
  select count(*) into total_rows
  from public.question_bank;

  if total_rows <> 119297 then
    raise exception 'Expected 119297 question rows, found %', total_rows;
  end if;

  with groups as (
    select
      class_level,
      topic,
      count(*) as total,
      count(*) filter (where difficulty = 1) as easy,
      count(*) filter (where difficulty = 2) as medium,
      count(*) filter (where difficulty = 3) as hard
    from public.question_bank
    where ai_generated is true
    group by class_level, topic
  )
  select
    count(*),
    count(*) filter (
      where total = 700
        and easy = 350
        and medium = 210
        and hard = 140
    )
  into group_count, correct_groups
  from groups;

  if group_count <> 169 or correct_groups <> 169 then
    raise exception
      'Expected 169 balanced groups; found % groups and % balanced',
      group_count,
      correct_groups;
  end if;

  select count(*) into duplicate_groups
  from (
    select 1
    from public.question_bank
    group by class_level, topic, lower(btrim(question_text))
    having count(*) > 1
  ) duplicates;

  if duplicate_groups <> 0 then
    raise exception 'Expected zero duplicate groups, found %', duplicate_groups;
  end if;
end
$$;
