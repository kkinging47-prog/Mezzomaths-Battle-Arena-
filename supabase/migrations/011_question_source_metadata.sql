alter table public.question_bank
  add column if not exists source_type text default 'app_generated',
  add column if not exists workbook_source text,
  add column if not exists workbook_year text,
  add column if not exists workbook_page text,
  add column if not exists term text;

create index if not exists question_bank_source_idx on public.question_bank(source_type, class_level, topic);
create index if not exists question_bank_workbook_idx on public.question_bank(workbook_year, workbook_source);
