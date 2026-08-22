create or replace function pg_temp.build_junior_question(
  p_level text,
  p_activity text,
  p_number integer
)
returns jsonb
language plpgsql
as $$
declare
  v_difficulty text;
  v_band_number integer;
  v_topic text;
  v_skill text;
  v_prompt text;
  v_spoken text;
  v_explanation text;
  v_answer text;
  v_d1 text;
  v_d2 text;
  v_d3 text;
  v_options jsonb;
  v_correct_position integer := 1 + ((p_number - 1) % 4);
  v_correct_letter text;
  v_visual jsonb := '{}'::jsonb;
  v_object text;
  v_name text;
  v_a integer;
  v_b integer;
  v_c integer;
  v_result integer;
  v_cap integer;
  v_hour integer;
  v_minute integer;
  v_shape text;
  v_card text := format(' Junior challenge card %s.', p_number);
begin
  v_difficulty := case
    when p_number <= 350 then 'Easy'
    when p_number <= 560 then 'Medium'
    else 'Hard'
  end;

  v_band_number := case
    when p_number <= 350 then p_number
    when p_number <= 560 then p_number - 350
    else p_number - 560
  end;

  v_object := (array['mango','orange','ball','star','book','biscuit','pencil','bag'])
    [1 + ((p_number - 1) % 8)];
  v_name := (array['Ama','Kojo','Abena','Kwame','Esi','Kofi','Adwoa','Yaw'])
    [1 + ((p_number - 1) % 8)];

  if p_activity = 'count' then
    v_topic := 'counting';
    v_skill := case v_difficulty when 'Easy' then 'count objects' when 'Medium' then 'compare quantities' else 'count and reason' end;
    v_cap := case p_level when 'Kindergarten' then 12 when 'Grade 1' then 20 else 30 end;
    v_a := 1 + ((v_band_number * 7 + p_number) % v_cap);
    v_result := v_a;
    v_prompt := case (v_band_number % 5)
      when 0 then format('Count the %ss carefully. How many can you see?', v_object)
      when 1 then format('%s arranged %s %ss on a mat. How many %ss are on the mat?', v_name, v_a, v_object, v_object)
      when 2 then format('Touch each %s once as you count. What is the total?', v_object)
      when 3 then format('A tray holds %s %ss. Choose the numeral that matches the group.', v_a, v_object)
      else format('Which number tells how many %ss are shown?', v_object)
    end || v_card;
    v_spoken := format('Count the %ss one at a time and choose the total.', v_object);
    v_explanation := format('Counting each object once gives %s.', v_result);
    v_visual := jsonb_build_object('kind','objects','object',v_object,'count',v_a);

  elsif p_activity = 'number' then
    v_topic := 'numbers';
    v_skill := case v_difficulty when 'Easy' then 'number order' when 'Medium' then 'number-line jumps' else 'missing numbers and place value' end;
    v_cap := case p_level when 'Kindergarten' then 20 when 'Grade 1' then 100 else 1000 end;
    v_a := 1 + ((v_band_number * 11) % greatest(8, v_cap - 12));
    v_b := 1 + ((v_band_number * 3) % case v_difficulty when 'Easy' then 3 when 'Medium' then 6 else 10 end);
    if (v_band_number % 4) = 0 and v_a > v_b then
      v_result := v_a - v_b;
      v_prompt := format('Start at %s and jump backward %s spaces. Where do you land?', v_a, v_b);
      v_explanation := format('%s − %s = %s.', v_a, v_b, v_result);
    elsif (v_band_number % 4) = 1 then
      v_result := v_a + 1;
      v_prompt := format('Which number comes immediately after %s?', v_a);
      v_explanation := format('The next number after %s is %s.', v_a, v_result);
    elsif (v_band_number % 4) = 2 and v_a > 1 then
      v_result := v_a - 1;
      v_prompt := format('Which number comes immediately before %s?', v_a);
      v_explanation := format('The number before %s is %s.', v_a, v_result);
    else
      v_result := v_a + v_b;
      v_prompt := format('Start at %s and jump forward %s spaces. Where do you land?', v_a, v_b);
      v_explanation := format('%s + %s = %s.', v_a, v_b, v_result);
    end if;
    v_prompt := v_prompt || v_card;
    v_spoken := v_prompt;
    v_visual := jsonb_build_object('kind','numberline','start',v_a,'jump',v_b,'answer',v_result,'max',greatest(10,v_a+v_b+2));

  elsif p_activity = 'addition' then
    v_topic := 'addition';
    v_skill := case v_difficulty when 'Easy' then 'join two groups' when 'Medium' then 'addition stories' else 'addition reasoning' end;
    v_cap := case p_level when 'Kindergarten' then 8 when 'Grade 1' then 20 else 60 end;
    v_a := 1 + ((v_band_number * 5) % greatest(3, v_cap / 2));
    v_b := 1 + ((v_band_number * 7 + 2) % greatest(3, v_cap / 2));
    v_result := v_a + v_b;
    v_prompt := case (v_band_number % 5)
      when 0 then format('%s has %s %ss and receives %s more. How many altogether?', v_name, v_a, v_object, v_b)
      when 1 then format('Join a group of %s %ss to a group of %s. What is the total?', v_a, v_object, v_b)
      when 2 then format('There are %s children in one line and %s in another. How many children are there?', v_a, v_b)
      when 3 then format('A basket has %s oranges. %s more are added. How many oranges are now in the basket?', v_a, v_b)
      else format('Which number sentence gives the total of %s and %s?', v_a, v_b)
    end || v_card;
    v_spoken := format('Add %s and %s. Choose the total.', v_a, v_b);
    v_explanation := format('%s + %s = %s.', v_a, v_b, v_result);
    v_visual := case
      when v_a <= 10 and v_b <= 10 then jsonb_build_object('kind','addition','object',v_object,'a',v_a,'b',v_b)
      else '{}'::jsonb
    end;

  elsif p_activity = 'subtraction' then
    v_topic := 'subtraction';
    v_skill := case v_difficulty when 'Easy' then 'take away objects' when 'Medium' then 'subtraction stories' else 'difference and missing parts' end;
    v_cap := case p_level when 'Kindergarten' then 10 when 'Grade 1' then 20 else 80 end;
    v_a := 4 + ((v_band_number * 7) % greatest(4, v_cap - 3));
    v_b := 1 + ((v_band_number * 5) % greatest(2, v_a - 1));
    v_result := v_a - v_b;
    v_prompt := case (v_band_number % 5)
      when 0 then format('There are %s %ss. %s are taken away. How many remain?', v_a, v_object, v_b)
      when 1 then format('%s had %s pencils and gave away %s. How many pencils are left?', v_name, v_a, v_b)
      when 2 then format('A class made %s paper shapes. %s were used. How many were not used?', v_a, v_b)
      when 3 then format('Find the difference between %s and %s.', v_a, v_b)
      else format('What number completes %s − %s = __?', v_a, v_b)
    end || v_card;
    v_spoken := format('Take %s away from %s. Choose what remains.', v_b, v_a);
    v_explanation := format('%s − %s = %s.', v_a, v_b, v_result);
    v_visual := case
      when v_a <= 20 then jsonb_build_object('kind','subtraction','object',v_object,'a',v_a,'b',v_b)
      else '{}'::jsonb
    end;

  elsif p_activity = 'shapes' then
    v_topic := 'geometry';
    v_skill := case v_difficulty when 'Easy' then 'identify shapes' when 'Medium' then 'describe shape properties' else 'classify 2D and 3D shapes' end;
    v_shape := case
      when p_level = 'Grade 2' then (array['circle','square','triangle','rectangle','cube','sphere'])[1+((p_number-1)%6)]
      else (array['circle','square','triangle','rectangle'])[1+((p_number-1)%4)]
    end;
    v_answer := v_shape;
    if v_shape = 'circle' then v_d1 := 'square'; v_d2 := 'triangle'; v_d3 := 'rectangle';
    elsif v_shape = 'square' then v_d1 := 'circle'; v_d2 := 'triangle'; v_d3 := 'rectangle';
    elsif v_shape = 'triangle' then v_d1 := 'circle'; v_d2 := 'square'; v_d3 := 'rectangle';
    elsif v_shape = 'rectangle' then v_d1 := 'circle'; v_d2 := 'square'; v_d3 := 'triangle';
    elsif v_shape = 'cube' then v_d1 := 'sphere'; v_d2 := 'circle'; v_d3 := 'triangle';
    else v_d1 := 'cube'; v_d2 := 'square'; v_d3 := 'circle'; end if;
    v_prompt := case (v_band_number % 5)
      when 0 then format('Find and touch the %s.', v_shape)
      when 1 then format('Which choice has the shape of a %s?', v_shape)
      when 2 then format('Select the %s from the shape cards.', v_shape)
      when 3 then format('Which shape card should be placed in the %s group?', v_shape)
      else format('Look carefully and choose the shape named %s.', v_shape)
    end || v_card;
    v_spoken := format('Find and touch the %s.', v_shape);
    v_explanation := format('The correct shape is the %s.', v_shape);
    v_visual := jsonb_build_object('kind','shapeChoices');

  elsif p_activity = 'pattern' then
    v_topic := 'patterns';
    v_skill := case v_difficulty when 'Easy' then 'continue simple patterns' when 'Medium' then 'find a pattern rule' else 'multi-step number patterns' end;
    v_a := 1 + ((v_band_number * 3) % case p_level when 'Kindergarten' then 5 when 'Grade 1' then 20 else 100 end);
    v_b := case v_difficulty when 'Easy' then 1 + (v_band_number % 2) when 'Medium' then 2 + (v_band_number % 4) else 3 + (v_band_number % 8) end;
    v_result := v_a + (4 * v_b);
    v_prompt := format('Complete the pattern: %s, %s, %s, %s, __', v_a, v_a+v_b, v_a+2*v_b, v_a+3*v_b) || v_card;
    v_spoken := format('The numbers increase by %s. What comes next?', v_b);
    v_explanation := format('The rule is add %s, so the next number is %s.', v_b, v_result);
    v_visual := jsonb_build_object('kind','pattern','sequence',jsonb_build_array(v_a,v_a+v_b,v_a+2*v_b,v_a+3*v_b));

  elsif p_activity = 'market' then
    v_topic := 'money';
    v_skill := case v_difficulty when 'Easy' then 'recognise Ghana cedi amounts' when 'Medium' then 'add prices' else 'find cost and change' end;
    v_a := 1 + ((v_band_number * 3) % case p_level when 'Kindergarten' then 5 when 'Grade 1' then 10 else 25 end);
    v_b := 1 + ((v_band_number * 7) % case p_level when 'Kindergarten' then 4 when 'Grade 1' then 10 else 20 end);
    if v_difficulty = 'Easy' then
      v_result := v_a;
      v_prompt := format('Choose the amount needed to buy an item costing GH¢%s.', v_a);
      v_explanation := format('The item costs GH¢%s.', v_result);
      v_visual := jsonb_build_object('kind','market','price',v_a,'extra',0);
    else
      v_result := v_a + v_b;
      v_prompt := case (v_band_number % 3)
        when 0 then format('A mango costs GH¢%s and a book costs GH¢%s. What is the total cost?', v_a, v_b)
        when 1 then format('%s buys an item for GH¢%s and another for GH¢%s. How much is spent?', v_name, v_a, v_b)
        else format('At the Maths Market, combine GH¢%s and GH¢%s. What amount do you have?', v_a, v_b)
      end;
      v_explanation := format('GH¢%s + GH¢%s = GH¢%s.', v_a, v_b, v_result);
      v_visual := jsonb_build_object('kind','market','price',v_a,'extra',v_b);
    end if;
    v_prompt := v_prompt || v_card;
    v_spoken := v_prompt;
    v_answer := format('GH¢%s',v_result);
    v_d1 := format('GH¢%s',v_result+1); v_d2 := format('GH¢%s',greatest(0,v_result-1)); v_d3 := format('GH¢%s',v_result+2);

  elsif p_activity = 'sharing' then
    v_topic := 'division';
    v_skill := case v_difficulty when 'Easy' then 'make equal groups' when 'Medium' then 'share equally' else 'reason about equal groups' end;
    v_b := case p_level when 'Kindergarten' then 2 else 2 + (v_band_number % 3) end;
    v_result := 1 + ((v_band_number * 5) % case p_level when 'Kindergarten' then 4 when 'Grade 1' then 6 else 10 end);
    v_a := v_b * v_result;
    v_prompt := case (v_band_number % 4)
      when 0 then format('Share %s biscuits equally among %s children. How many does each child get?', v_a, v_b)
      when 1 then format('Put %s counters into %s equal groups. How many counters are in each group?', v_a, v_b)
      when 2 then format('%s friends share %s oranges equally. What is each friend’s share?', v_b, v_a)
      else format('Which number completes %s ÷ %s = __?', v_a, v_b)
    end || v_card;
    v_spoken := format('Share %s equally into %s groups.', v_a, v_b);
    v_explanation := format('%s shared into %s equal groups gives %s in each group.', v_a, v_b, v_result);
    v_visual := jsonb_build_object('kind','sharing','total',v_a,'groups',v_b);

  elsif p_activity = 'time' then
    v_topic := 'time';
    v_skill := case v_difficulty when 'Easy' then 'read full-hour clocks' when 'Medium' then 'read half-hour clocks' else 'connect clocks and routines' end;
    v_hour := 1 + ((v_band_number * 5) % 12);
    v_minute := case when p_level = 'Kindergarten' or v_difficulty = 'Easy' then 0 else case when (v_band_number % 2)=0 then 30 else 0 end end;
    v_answer := format('%s:%s',v_hour,case when v_minute=0 then '00' else '30' end);
    v_d1 := format('%s:00',1+(v_hour%12));
    v_d2 := format('%s:%s',v_hour,case when v_minute=0 then '30' else '00' end);
    v_d3 := format('%s:30',1+(v_hour%12));
    v_prompt := case (v_band_number % 4)
      when 0 then 'What time is shown on the clock?'
      when 1 then format('The clock shows the time for %s’s activity. What time is it?', v_name)
      when 2 then 'Read the hour and minute hands. Choose the correct time.'
      else 'Match the clock face to the correct digital time.'
    end || v_card;
    v_spoken := 'Look at the clock. What time is shown?';
    v_explanation := format('The clock shows %s.',v_answer);
    v_visual := jsonb_build_object('kind','clock','hour',v_hour,'minute',v_minute);

  else
    v_topic := 'memory';
    v_skill := case v_difficulty when 'Easy' then 'number bonds to 10' when 'Medium' then 'matching equivalent facts' else 'mental number bonds' end;
    v_cap := case p_level when 'Kindergarten' then 10 when 'Grade 1' then 20 else 100 end;
    v_a := 1 + ((v_band_number * 7) % greatest(2,v_cap-2));
    v_result := v_cap - v_a;
    v_prompt := case (v_band_number % 4)
      when 0 then format('Which number matches %s to make %s?', v_a, v_cap)
      when 1 then format('Find the missing partner: %s + __ = %s.', v_a, v_cap)
      when 2 then format('%s needs a number partner to reach %s. Which number is it?', v_a, v_cap)
      else format('Choose the number bond that completes %s to make %s.', v_a, v_cap)
    end || v_card;
    v_spoken := format('Which number goes with %s to make %s?',v_a,v_cap);
    v_explanation := format('%s + %s = %s.',v_a,v_result,v_cap);
    v_visual := case when v_cap=10 then jsonb_build_object('kind','tenframe','filled',v_a) else '{}'::jsonb end;
  end if;

  if v_answer is null then
    v_answer := v_result::text;
    v_d1 := (v_result + 1)::text;
    v_d2 := greatest(0, v_result - 1)::text;
    v_d3 := (v_result + 2)::text;
  end if;

  if v_correct_position = 1 then v_options := jsonb_build_array(v_answer,v_d1,v_d2,v_d3);
  elsif v_correct_position = 2 then v_options := jsonb_build_array(v_d1,v_answer,v_d2,v_d3);
  elsif v_correct_position = 3 then v_options := jsonb_build_array(v_d1,v_d2,v_answer,v_d3);
  else v_options := jsonb_build_array(v_d1,v_d2,v_d3,v_answer); end if;
  v_correct_letter := (array['A','B','C','D'])[v_correct_position];

  return jsonb_build_object(
    'topic',v_topic,'skill',v_skill,'activity_type',p_activity,
    'difficulty',v_difficulty,'status','Published','prompt',v_prompt,
    'spoken',v_spoken,'options',v_options,'correct_answer',v_correct_letter,
    'explanation',v_explanation,'visual',v_visual
  );
end
$$;

with levels(level) as (
  values ('Kindergarten'),('Grade 1'),('Grade 2')
), activities(activity_type) as (
  values ('count'),('number'),('addition'),('subtraction'),('shapes'),
         ('pattern'),('market'),('sharing'),('time'),('memory')
), generated as (
  select
    l.level,
    a.activity_type,
    n.question_number,
    pg_temp.build_junior_question(l.level,a.activity_type,n.question_number) as payload
  from levels l
  cross join activities a
  cross join generate_series(1,700) as n(question_number)
)
insert into public.junior_questions (
  id,level,topic,skill,activity_type,difficulty,status,prompt,spoken,
  options,correct_answer,explanation,image_url,image_alt,audio_url,
  visual,created_by
)
select
  'jr_' || substr(md5(level || '|' || activity_type || '|' || question_number),1,28),
  level,
  payload->>'topic',
  payload->>'skill',
  activity_type,
  payload->>'difficulty',
  'Published',
  payload->>'prompt',
  payload->>'spoken',
  payload->'options',
  payload->>'correct_answer',
  payload->>'explanation',
  null,null,null,
  payload->'visual',
  null
from generated;

create unique index junior_questions_unique_prompt_idx
on public.junior_questions (level,activity_type,lower(btrim(prompt)));

create index junior_questions_selection_idx
on public.junior_questions (level,activity_type,difficulty,status);

do $$
declare
  v_total integer;
  v_groups integer;
  v_balanced integer;
  v_invalid integer;
begin
  select count(*) into v_total from public.junior_questions;
  if v_total <> 21000 then
    raise exception 'Expected 21000 Junior questions, found %',v_total;
  end if;

  with groups as (
    select level,activity_type,count(*) total,
      count(*) filter(where difficulty='Easy') easy,
      count(*) filter(where difficulty='Medium') medium,
      count(*) filter(where difficulty='Hard') hard
    from public.junior_questions
    where status='Published'
    group by level,activity_type
  )
  select count(*),count(*) filter(where total=700 and easy=350 and medium=210 and hard=140)
  into v_groups,v_balanced from groups;

  if v_groups <> 30 or v_balanced <> 30 then
    raise exception 'Expected 30 balanced Junior groups; found % groups and % balanced',v_groups,v_balanced;
  end if;

  select count(*) into v_invalid
  from public.junior_questions
  where status <> 'Published'
     or difficulty not in ('Easy','Medium','Hard')
     or jsonb_typeof(options) <> 'array'
     or jsonb_array_length(options) <> 4
     or correct_answer not in ('A','B','C','D')
     or nullif(btrim(prompt),'') is null
     or nullif(btrim(explanation),'') is null;

  if v_invalid <> 0 then
    raise exception 'Found % invalid Junior questions',v_invalid;
  end if;
end
$$;
