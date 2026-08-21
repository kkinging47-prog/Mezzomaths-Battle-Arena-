
create unique index if not exists question_bank_generated_source_key
on public.question_bank (class_level, curriculum, topic, source_name, source_page)
where source_type = 'original_generated';

do $$
declare
  cfg record;
  i integer;
  j integer;
  d integer;
  mode integer;
  kind text;
  q text;
  expl text;
  area text;
  a numeric;
  b numeric;
  c numeric;
  ans numeric;
  ans_text text;
  wrong1 text;
  wrong2 text;
  wrong3 text;
  pos integer;
  oa text;
  ob text;
  oc text;
  od text;
  letter text;
  source constant text := 'Mezzo original 500-topic bank v1';
begin
  for cfg in
    select * from (values
      ('Grade 1','GES','Addition Worksheet','addition'),
      ('Grade 1','GES','Multiplication Circles','multiplication'),
      ('Grade 2','GES','Addition & Subtraction of Numbers','mixed'),
      ('Grade 3','GES','Addition & Subtraction of No’s','mixed'),
      ('Grade 3','GES','Addition of numbers','addition'),
      ('Grade 3','GES','Calculation of Time','time'),
      ('Grade 3','GES','Comparing Fractions','fractions'),
      ('Grade 3','GES','Multiplication by 11','multiply11'),
      ('Grade 3','GES','Multiplication by Ten (10)','multiply10'),
      ('Grade 3','GES','Sharing in tens','divide10'),
      ('Grade 3','GES','Sharing in Two (2)','divide2'),
      ('Grade 3','GES','Subtraction of Numbers','subtraction'),
      ('Grade 4','GES','Addition & Subtraction of No’s','mixed'),
      ('Grade 4','GES','Fast Track Subtraction','subtraction'),
      ('Grade 5','GES','Addition & Subtraction of No’s','mixed'),
      ('Grade 8','GES','Understanding Word Problems','word'),
      ('Grade 9','GES','BECE Exam Practice','bece'),
      ('Grade 9','GES','Geometry','geometry'),
      ('Grade 9','GES','Statistics','statistics')
    ) v(class_level,curriculum,topic,base_kind)
  loop
    for i in 1..500 loop
      d := case when i <= 250 then 1 when i <= 400 then 2 else 3 end;
      j := case when d=1 then i when d=2 then i-250 else i-400 end;
      mode := ((i-1) % 5) + 1;
      kind := cfg.base_kind;

      if kind='bece' then
        kind := (array['mixed','fractions','geometry','statistics','word'])[((i-1)%5)+1];
      end if;

      q := null; expl := null; ans := null; ans_text := null;
      area := case kind
        when 'addition' then 'Addition'
        when 'subtraction' then 'Subtraction'
        when 'mixed' then 'Addition and Subtraction'
        when 'multiplication' then 'Multiplication'
        when 'multiply10' then 'Multiplication'
        when 'multiply11' then 'Multiplication'
        when 'divide10' then 'Division'
        when 'divide2' then 'Division'
        when 'time' then 'Time'
        when 'fractions' then 'Fractions'
        when 'geometry' then 'Geometry'
        when 'statistics' then 'Statistics'
        when 'word' then 'Word Problems'
        else 'General Practice' end;

      if kind='addition' then
        a := case when cfg.class_level='Grade 1' then (j-1)%50+1 when d=1 then 20+j else 100*d+j*3 end;
        b := case when cfg.class_level='Grade 1' then floor((j-1)/10)+1 when d=1 then 5+floor(j/3) else 40*d+j*2 end;
        ans := a+b;
        q := case mode
          when 1 then format('Calculate %s + %s.',a,b)
          when 2 then format('Ama has %s counters and receives %s more. How many counters does she have altogether?',a,b)
          when 3 then format('Find the sum of %s and %s.',a,b)
          when 4 then format('A shelf has %s books and another shelf has %s books. How many books are there in total?',a,b)
          else format('Complete the addition: %s + %s = __.',a,b) end;
        expl := format('%s + %s = %s.',a,b,ans);

      elsif kind='subtraction' then
        b := case when d=1 then 3+((j-1)%40) when d=2 then 30+j else 100+j*2 end;
        a := b + case when d=1 then 5+floor((j-1)/5) when d=2 then 80+j*2 else 300+j*5 end;
        ans := a-b;
        q := case mode
          when 1 then format('Calculate %s − %s.',a,b)
          when 2 then format('A store had %s pencils and sold %s. How many pencils remained?',a,b)
          when 3 then format('Find the difference between %s and %s.',a,b)
          when 4 then format('%s pupils registered and %s were absent. How many were present?',a,b)
          else format('Complete: %s − %s = __.',a,b) end;
        expl := format('%s − %s = %s.',a,b,ans);

      elsif kind='mixed' then
        if i%2=0 then
          a := 20*d+j*3; b := 5*d+j; c := 2*d+((j-1)%20);
          ans := a+b-c;
          q := case mode
            when 1 then format('Evaluate %s + %s − %s.',a,b,c)
            when 2 then format('A library had %s books, received %s more, then lent out %s. How many books remained?',a,b,c)
            when 3 then format('Add %s and %s, then subtract %s.',a,b,c)
            when 4 then format('Kojo scored %s points, gained %s bonus points and lost %s points. What was his final score?',a,b,c)
            else format('Complete: (%s + %s) − %s = __.',a,b,c) end;
          expl := format('%s + %s − %s = %s.',a,b,c,ans);
        else
          b := 10*d+j*2; c := 3*d+((j-1)%15); a := b+c+20*d+j;
          ans := a-b+c;
          q := case mode
            when 1 then format('Evaluate %s − %s + %s.',a,b,c)
            when 2 then format('A farmer picked %s oranges, sold %s and later picked %s more. How many oranges did the farmer then have?',a,b,c)
            when 3 then format('Subtract %s from %s, then add %s.',b,a,c)
            when 4 then format('A team had %s points, lost %s points and gained %s points. Find the final total.',a,b,c)
            else format('Complete: (%s − %s) + %s = __.',a,b,c) end;
          expl := format('%s − %s + %s = %s.',a,b,c,ans);
        end if;

      elsif kind in ('multiplication','multiply10','multiply11') then
        b := case kind when 'multiply10' then 10 when 'multiply11' then 11 else case when d=1 then 2+((j-1)%9) when d=2 then 11+((j-1)%10) else 21+((j-1)%20) end end;
        a := case when d=1 then 2+j when d=2 then 20+j*2 else 100+j*3 end;
        ans := a*b;
        q := case mode
          when 1 then format('Calculate %s × %s.',a,b)
          when 2 then format('There are %s groups with %s items in each group. How many items are there?',a,b)
          when 3 then format('Find the product of %s and %s.',a,b)
          when 4 then format('A school buys %s packs containing %s pencils each. How many pencils are bought?',a,b)
          else format('Complete: %s × %s = __.',a,b) end;
        expl := format('%s × %s = %s.',a,b,ans);

      elsif kind in ('divide10','divide2') then
        b := case kind when 'divide10' then 10 else 2 end;
        ans := case when d=1 then 2+j when d=2 then 50+j*2 else 200+j*3 end;
        a := ans*b;
        q := case mode
          when 1 then format('Calculate %s ÷ %s.',a,b)
          when 2 then format('%s objects are shared equally among %s groups. How many are in each group?',a,b)
          when 3 then format('How many groups of %s are in %s?',b,a)
          when 4 then format('A teacher shares %s counters equally among %s pupils. How many counters does each pupil receive?',a,b)
          else format('Complete: %s ÷ %s = __.',a,b) end;
        expl := format('%s ÷ %s = %s.',a,b,ans);

      elsif kind='time' then
        a := 360 + ((j*7 + d*13) % 540);
        b := case when d=1 then 15*((j-1)%4+1) when d=2 then 25+5*((j-1)%18) else 65+5*((j-1)%30) end;
        ans := a+b;
        q := format('A lesson starts at %s:%s and lasts %s minutes. At what time does it end?',
          lpad(((a/60)::int % 12 + case when ((a/60)::int % 12)=0 then 12 else 0 end)::text,1,'0'),
          lpad((a::int%60)::text,2,'0'), b);
        ans_text := format('%s:%s',
          ((ans/60)::int % 12 + case when ((ans/60)::int % 12)=0 then 12 else 0 end),
          lpad((ans::int%60)::text,2,'0'));
        expl := format('Adding %s minutes gives %s.',b,ans_text);

      elsif kind='fractions' then
        a := 1+((j*2+d)%11); b := a+1+((j+d)%8);
        c := 1+((j*3+d)%11);
        ans := case when a*b = c*b then 0 else null end;
        if a::numeric/b > c::numeric/(b+1) then ans_text := '>'; elsif a::numeric/b < c::numeric/(b+1) then ans_text := '<'; else ans_text := '='; end if;
        q := format('Choose the correct sign: %s/%s __ %s/%s.',a,b,c,b+1);
        expl := format('Using a common denominator shows that %s/%s %s %s/%s.',a,b,ans_text,c,b+1);

      elsif kind='geometry' then
        if mode in (1,2) then
          a := 3*d+j; b := 2*d+((j-1)%40)+1; ans := a*b;
          q := format('Find the area of a rectangle with length %s cm and width %s cm.',a,b);
          expl := format('Area = length × width = %s × %s = %s cm².',a,b,ans);
        elsif mode=3 then
          a := 4*d+j; ans := 4*a;
          q := format('Find the perimeter of a square with side length %s cm.',a);
          expl := format('Perimeter = 4 × %s = %s cm.',a,ans);
        elsif mode=4 then
          a := 4*d+j; b := 3*d+((j-1)%30)+1; ans := a*b/2;
          q := format('A triangle has base %s cm and perpendicular height %s cm. Find its area.',a,b);
          expl := format('Area = 1/2 × %s × %s = %s cm².',a,b,ans);
        else
          a := 2*d+j; b := 3*d+((j-1)%20)+1; c := 2+d+((j-1)%10); ans := a*b*c;
          q := format('Find the volume of a cuboid measuring %s cm by %s cm by %s cm.',a,b,c);
          expl := format('Volume = %s × %s × %s = %s cm³.',a,b,c,ans);
        end if;

      elsif kind='statistics' then
        a := 2*d+j; b := a+2; c := a+4;
        if mode in (1,2,3) then
          ans := (a+b+c)/3;
          q := format('Find the mean of %s, %s and %s.',a,b,c);
          expl := format('Mean = (%s + %s + %s) ÷ 3 = %s.',a,b,c,ans);
        elsif mode=4 then
          ans := b;
          q := format('Find the median of %s, %s, %s, %s and %s.',a-1,a,b,c,c+2);
          expl := format('The middle value in order is %s.',ans);
        else
          ans := a;
          q := format('Find the mode of %s, %s, %s, %s, %s and %s.',a,a,a,b,c,c+1);
          expl := format('%s occurs most often, so the mode is %s.',a,a);
        end if;

      elsif kind='word' then
        a := 30*d+j*4; b := 5*d+j; c := 2*d+((j-1)%25);
        if mode=1 then ans:=a-b; q:=format('A shop stocked %s exercise books and sold %s. How many remained?',a,b); expl:=format('%s − %s = %s.',a,b,ans);
        elsif mode=2 then ans:=a+b; q:=format('Two schools collected %s and %s cans for recycling. How many cans did they collect altogether?',a,b); expl:=format('%s + %s = %s.',a,b,ans);
        elsif mode=3 then ans:=(b+c)*d; q:=format('%s teams each contribute %s footballs. How many footballs are contributed?',d,b+c); expl:=format('%s × %s = %s.',d,b+c,ans);
        elsif mode=4 then ans:=a/2; a:=round(a/2)*2; ans:=a/2; q:=format('%s oranges are shared equally between 2 baskets. How many go into each basket?',a); expl:=format('%s ÷ 2 = %s.',a,ans);
        else ans:=a+b-c; q:=format('A bus carried %s passengers, picked up %s more and dropped off %s. How many passengers remained?',a,b,c); expl:=format('%s + %s − %s = %s.',a,b,c,ans); end if;
      end if;

      if ans_text is null then ans_text := trim(to_char(ans,'FM9999999990.####')); end if;
      if kind='fractions' then
        wrong1 := case ans_text when '>' then '<' else '>' end;
        wrong2 := case ans_text when '=' then '<' else '=' end;
        wrong3 := 'Cannot be determined';
      elsif kind='time' then
        wrong1 := format('%s:%s', ((ans::int+30)/60)%12 + case when (((ans::int+30)/60)%12)=0 then 12 else 0 end, lpad(((ans::int+30)%60)::text,2,'0'));
        wrong2 := format('%s:%s', ((ans::int-15)/60)%12 + case when (((ans::int-15)/60)%12)=0 then 12 else 0 end, lpad(((ans::int-15)%60)::text,2,'0'));
        wrong3 := format('%s:%s', ((ans::int+60)/60)%12 + case when (((ans::int+60)/60)%12)=0 then 12 else 0 end, lpad(((ans::int+60)%60)::text,2,'0'));
      else
        wrong1 := trim(to_char(ans + greatest(1,abs(ans)*0.05)::int,'FM9999999990.####'));
        wrong2 := trim(to_char(greatest(0,ans - greatest(1,abs(ans)*0.05)::int),'FM9999999990.####'));
        wrong3 := trim(to_char(ans + greatest(2,abs(ans)*0.1)::int,'FM9999999990.####'));
      end if;

      pos := ((i-1)%4)+1;
      oa := case pos when 1 then ans_text when 2 then wrong1 when 3 then wrong2 else wrong3 end;
      ob := case pos when 1 then wrong1 when 2 then ans_text when 3 then wrong3 else wrong2 end;
      oc := case pos when 1 then wrong2 when 2 then wrong3 when 3 then ans_text else wrong1 end;
      od := case pos when 1 then wrong3 when 2 then wrong2 when 3 then wrong1 else ans_text end;
      letter := substr('ABCD',pos,1);

      insert into public.question_bank
        (class_level,curriculum,topic,topic_area,topic_sublevel,difficulty,question_text,
         option_a,option_b,option_c,option_d,correct_answer,explanation,numeric_answer,
         is_active,ai_generated,ai_prompt,source_type,source_name,source_page)
      values
        (cfg.class_level,cfg.curriculum,cfg.topic,area,
         case d when 1 then 'Easy' when 2 then 'Medium' else 'Hard' end,
         d,q,oa,ob,oc,od,letter,expl,
         case when kind in ('fractions','time') then null else ans end,
         true,true,'Original deterministic generation; HelpTeaching format guidance only',
         'original_generated',source,i::text)
      on conflict (class_level,curriculum,topic,source_name,source_page)
      where source_type = 'original_generated'
      do update set
        topic_area=excluded.topic_area,topic_sublevel=excluded.topic_sublevel,difficulty=excluded.difficulty,
        question_text=excluded.question_text,option_a=excluded.option_a,option_b=excluded.option_b,
        option_c=excluded.option_c,option_d=excluded.option_d,correct_answer=excluded.correct_answer,
        explanation=excluded.explanation,numeric_answer=excluded.numeric_answer,is_active=true,
        ai_generated=true,ai_prompt=excluded.ai_prompt,source_type=excluded.source_type,updated_at=now();

      ans_text := null;
    end loop;
  end loop;
end $$;
