create table public.bece_solution_videos (
 id uuid primary key default gen_random_uuid(),
 collection text not null check(collection in ('past','sunday')),
 exam_year integer,
 set_number integer,
 question_number integer not null check(question_number between 1 and 200),
 paper_section text not null default 'Objective' check(paper_section in ('Objective','Theory')),
 title text not null check(length(btrim(title)) between 1 and 160),
 topic text not null default '' check(length(topic)<=100),
 description text not null default '' check(length(description)<=3000),
 youtube_id text not null check(youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
 start_seconds integer not null default 0 check(start_seconds between 0 and 86400),
 is_published boolean not null default false,
 updated_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 constraint bece_video_collection_metadata check(
  (collection='past' and exam_year is not null and exam_year between 1980 and 2100 and set_number is null) or
  (collection='sunday' and set_number is not null and set_number between 1 and 999 and exam_year is null)
 ),
 unique(youtube_id,start_seconds)
);
alter table public.bece_solution_videos enable row level security;
create policy "Everyone can watch published BECE solutions" on public.bece_solution_videos for select to anon,authenticated using(is_published);
create policy "Admins manage BECE solution videos" on public.bece_solution_videos for all to authenticated using((select public.is_sunday_bece_admin())) with check((select public.is_sunday_bece_admin()));
grant select on public.bece_solution_videos to anon;
grant select,insert,update,delete on public.bece_solution_videos to authenticated;
create index bece_solution_videos_published_collection on public.bece_solution_videos(collection,exam_year desc,set_number desc,question_number) where is_published;
