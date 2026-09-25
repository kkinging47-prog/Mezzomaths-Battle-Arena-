create table if not exists public.sunday_bece_sets (
  id uuid primary key default gen_random_uuid(),
  set_number integer not null unique check (set_number > 0),
  status text not null default 'draft' check (status in ('draft','ready','solved')),
  scheduled_sunday date unique,
  notes text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sunday_bece_sets_sunday_only check (scheduled_sunday is null or extract(dow from scheduled_sunday) = 0)
);
alter table public.sunday_bece_sets enable row level security;
revoke all on public.sunday_bece_sets from public, anon;
grant select, insert, update, delete on public.sunday_bece_sets to authenticated;
create policy "BECE managers read sets" on public.sunday_bece_sets for select to authenticated using ((select public.can_manage_sunday_bece_questions()));
create policy "Admins create sets" on public.sunday_bece_sets for insert to authenticated with check ((select public.is_sunday_bece_admin()));
create policy "Admins update sets" on public.sunday_bece_sets for update to authenticated using ((select public.is_sunday_bece_admin())) with check ((select public.is_sunday_bece_admin()));
create policy "Admins delete sets" on public.sunday_bece_sets for delete to authenticated using ((select public.is_sunday_bece_admin()));

alter table public.bece_question_bank add column if not exists sunday_set_id uuid references public.sunday_bece_sets(id) on delete set null;
create index if not exists bece_question_bank_sunday_set_id_idx on public.bece_question_bank(sunday_set_id);
create unique index if not exists bece_assigned_question_text_unique_idx
  on public.bece_question_bank (lower(regexp_replace(btrim(question_text), '[[:space:]]+', ' ', 'g')))
  where sunday_set_id is not null;

create or replace function public.check_sunday_bece_set_capacity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.sunday_set_id is not null and
     (select count(*) from public.bece_question_bank q where q.sunday_set_id = new.sunday_set_id and q.id <> new.id) >= 40 then
    raise exception 'A Sunday BECE set can contain at most 40 questions.';
  end if;
  return new;
end;
$$;
create trigger check_sunday_bece_set_capacity before insert or update of sunday_set_id on public.bece_question_bank
for each row execute function public.check_sunday_bece_set_capacity();

create or replace function public.check_sunday_bece_set_ready()
returns trigger language plpgsql set search_path = '' as $$
declare question_count integer;
begin
  if new.status <> 'draft' or new.scheduled_sunday is not null then
    select count(*) into question_count from public.bece_question_bank q
    where q.sunday_set_id = new.id and q.status = 'Published'
      and q.question_text <> '' and q.correct_answer in ('A','B','C','D')
      and nullif(btrim(q.option_a),'') is not null and nullif(btrim(q.option_b),'') is not null
      and nullif(btrim(q.option_c),'') is not null and nullif(btrim(q.option_d),'') is not null;
    if question_count <> 40 then
      raise exception 'A scheduled, ready or solved set requires exactly 40 published complete questions (found %).', question_count;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger check_sunday_bece_set_ready before insert or update on public.sunday_bece_sets
for each row execute function public.check_sunday_bece_set_ready();

create or replace function public.protect_sunday_bece_ready_set()
returns trigger language plpgsql set search_path = '' as $$
declare old_set uuid;
declare set_status text;
declare set_date date;
declare question_count integer;
begin
  old_set := old.sunday_set_id;
  if old_set is null then return null; end if;
  select status, scheduled_sunday into set_status, set_date from public.sunday_bece_sets where id = old_set;
  if set_status = 'draft' and set_date is null then return null; end if;
  select count(*) into question_count from public.bece_question_bank q
  where q.sunday_set_id = old_set and q.status = 'Published'
    and nullif(btrim(q.question_text),'') is not null
    and nullif(btrim(q.option_a),'') is not null and nullif(btrim(q.option_b),'') is not null
    and nullif(btrim(q.option_c),'') is not null and nullif(btrim(q.option_d),'') is not null;
  if question_count <> 40 then raise exception 'Return the set to draft and remove its schedule before reducing its 40 published questions.'; end if;
  return null;
end;
$$;
create trigger protect_sunday_bece_ready_set after update of sunday_set_id,status,question_text,option_a,option_b,option_c,option_d or delete on public.bece_question_bank
for each row execute function public.protect_sunday_bece_ready_set();

insert into public.sunday_bece_sets(set_number)
select generate_series(1, (select ceil(count(*) / 40.0)::int from public.bece_question_bank where status='Published' and sunday_set_id is null))
on conflict (set_number) do nothing;
with ordered as (
 select id, ((row_number() over(order by created_at,id)-1)/40 + 1)::int as n
 from public.bece_question_bank where status='Published' and sunday_set_id is null
)
update public.bece_question_bank q set sunday_set_id=s.id
from ordered o join public.sunday_bece_sets s on s.set_number=o.n
where q.id=o.id;
