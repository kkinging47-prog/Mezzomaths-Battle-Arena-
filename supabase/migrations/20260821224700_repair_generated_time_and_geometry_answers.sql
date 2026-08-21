
do $$
declare
  i integer;
  d integer;
  duration_minutes integer;
  start_minutes integer;
  end_minutes integer;
  correct_text text;
  wrong1 text;
  wrong2 text;
  wrong3 text;
  pos integer;
  oa text; ob text; oc text; od text;
begin
  for i in 1..500 loop
    d := case when i <= 250 then 1 when i <= 400 then 2 else 3 end;
    start_minutes := 360 + i;
    duration_minutes := case
      when d=1 then 15*((i-1)%4+1)
      when d=2 then 25+5*((i-1)%18)
      else 65+5*((i-1)%30)
    end;
    end_minutes := start_minutes + duration_minutes;

    correct_text := format('%s:%s',
      case when floor(end_minutes/60.0)::int % 12 = 0 then 12 else floor(end_minutes/60.0)::int % 12 end,
      lpad((end_minutes%60)::text,2,'0'));
    wrong1 := format('%s:%s',
      case when floor((end_minutes+15)/60.0)::int % 12 = 0 then 12 else floor((end_minutes+15)/60.0)::int % 12 end,
      lpad(((end_minutes+15)%60)::text,2,'0'));
    wrong2 := format('%s:%s',
      case when floor((end_minutes+30)/60.0)::int % 12 = 0 then 12 else floor((end_minutes+30)/60.0)::int % 12 end,
      lpad(((end_minutes+30)%60)::text,2,'0'));
    wrong3 := format('%s:%s',
      case when floor((end_minutes+60)/60.0)::int % 12 = 0 then 12 else floor((end_minutes+60)/60.0)::int % 12 end,
      lpad(((end_minutes+60)%60)::text,2,'0'));

    pos := ((i-1)%4)+1;
    oa := case pos when 1 then correct_text when 2 then wrong1 when 3 then wrong2 else wrong3 end;
    ob := case pos when 1 then wrong1 when 2 then correct_text when 3 then wrong3 else wrong2 end;
    oc := case pos when 1 then wrong2 when 2 then wrong3 when 3 then correct_text else wrong1 end;
    od := case pos when 1 then wrong3 when 2 then wrong2 when 3 then wrong1 else correct_text end;

    update public.question_bank set
      question_text=format('A lesson starts at %s:%s and lasts %s minutes. At what time does it end?',
        case when floor(start_minutes/60.0)::int % 12=0 then 12 else floor(start_minutes/60.0)::int % 12 end,
        lpad((start_minutes%60)::text,2,'0'),duration_minutes),
      option_a=oa,option_b=ob,option_c=oc,option_d=od,
      correct_answer=substr('ABCD',pos,1),
      explanation=format('Adding %s minutes gives %s.',duration_minutes,correct_text),
      numeric_answer=null,updated_at=now()
    where class_level='Grade 3' and topic='Calculation of Time'
      and source_type='original_generated'
      and source_name='Mezzo original 500-topic bank v1'
      and source_page=i::text;
  end loop;
end $$;

update public.question_bank
set option_a = case when correct_answer='A' then to_char(numeric_answer,'FM9999999990.9999') else option_a end,
    option_b = case when correct_answer='B' then to_char(numeric_answer,'FM9999999990.9999') else option_b end,
    option_c = case when correct_answer='C' then to_char(numeric_answer,'FM9999999990.9999') else option_c end,
    option_d = case when correct_answer='D' then to_char(numeric_answer,'FM9999999990.9999') else option_d end,
    updated_at=now()
where class_level='Grade 9' and topic='Geometry'
  and source_type='original_generated'
  and source_name='Mezzo original 500-topic bank v1'
  and numeric_answer is not null;
