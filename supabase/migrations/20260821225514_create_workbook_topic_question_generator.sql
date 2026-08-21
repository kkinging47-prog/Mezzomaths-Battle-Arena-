
create schema if not exists private;
revoke all on schema private from public;

create or replace function private.generate_workbook_topic_questions(p_level text,p_topic text)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  i int; d int; j int; mode int; pos int;
  t text := lower(p_topic); kind text; area text;
  a numeric; b numeric; c numeric; ans numeric; divisor numeric; multiplier numeric;
  q text; expl text; answer_text text; w1 text; w2 text; w3 text;
  oa text; ob text; oc text; od text; letter text;
  object_name text; person_name text;
  src constant text := 'Mezzo workbook catalog 500-topic bank v2';
begin
  kind := case
    when t like '%before%after%' then 'number_order'
    when t like '%count%' or t like '%identify%' or t like '%finger%' or t like '%number identification%' then 'counting'
    when t like '%pattern%' then 'patterns'
    when t like '%addition%subtraction%' or t like '%addition & subtraction%' then 'mixed'
    when t like '%consecutive%' then 'consecutive'
    when t like '%doubl%' then 'doubling'
    when t like '%add%' or t like '%addition%' or t like '%trace%' then 'addition'
    when t like '%subtract%' or t like '%take away%' or t like '%fast track%' then 'subtraction'
    when t like '%fraction%' then 'fractions'
    when t like '%percent%' then 'percentages'
    when t like '%divisib%' then 'divisibility'
    when t like '%power%' then 'powers'
    when t like '%squar%' then 'squaring'
    when t like '%division%' or t like '%sharing%' then 'division'
    when t like '%word problem%' then 'word'
    when t like '%multip%' or t like '%mult.%' or t like '%mezzoscopic%' then 'multiplication'
    else 'general'
  end;
  area := case kind
    when 'counting' then 'Counting' when 'number_order' then 'Number Sense'
    when 'patterns' then 'Patterns' when 'mixed' then 'Addition and Subtraction'
    when 'consecutive' then 'Addition' when 'doubling' then 'Addition'
    when 'addition' then 'Addition' when 'subtraction' then 'Subtraction'
    when 'fractions' then 'Fractions' when 'percentages' then 'Percentages'
    when 'divisibility' then 'Divisibility' when 'powers' then 'Powers'
    when 'squaring' then 'Squaring' when 'division' then 'Division'
    when 'word' then 'Word Problems' when 'multiplication' then 'Multiplication'
    else 'General Practice' end;

  for i in 1..500 loop
    d := case when i<=250 then 1 when i<=400 then 2 else 3 end;
    j := case when d=1 then i when d=2 then i-250 else i-400 end;
    mode := ((i-1)%5)+1;
    object_name := (array['mangoes','books','pencils','counters','oranges','stars','balls','beads','crayons','bottles'])[((i-1)%10)+1];
    person_name := (array['Ama','Kojo','Esi','Kofi','Adwoa'])[((i-1)%5)+1];
    q:=null; expl:=null; ans:=null; answer_text:=null; divisor:=null; multiplier:=null;

    if kind='counting' then
      a := case d when 1 then 1+((j-1)%10) when 2 then 11+((j-1)%10) else 21+((j-1)%20) end;
      ans:=a;
      q:=case mode
        when 1 then format('Count %s %s. How many are there?',a,object_name)
        when 2 then format('%s touches each of %s %s once while counting. What number should be said last?',person_name,a,object_name)
        when 3 then format('Which numeral represents a group of %s %s?',a,object_name)
        when 4 then format('A card shows %s %s. Choose the matching number.',a,object_name)
        else format('Complete the count: there are __ %s in a group of %s.',object_name,a) end;
      expl:=format('The group contains %s %s, so the answer is %s.',a,object_name,ans);

    elsif kind='number_order' then
      a:=case d when 1 then 2+((j-1)%19) when 2 then 21+((j-1)%80) else 101+((j-1)%400) end;
      if mode in (1,3,5) then ans:=a+1; q:=format('What number comes immediately after %s?',a); expl:=format('Counting forward one step from %s gives %s.',a,ans);
      else ans:=a-1; q:=format('What number comes immediately before %s?',a); expl:=format('Counting backward one step from %s gives %s.',a,ans); end if;

    elsif kind='patterns' then
      a:=case d when 1 then 1+((j-1)%20) when 2 then 10+((j-1)%50) else 50+((j-1)%100) end;
      b:=case d when 1 then 1+((j-1)%5) when 2 then 2+((j-1)%9) else 5+((j-1)%15) end;
      ans:=a+4*b;
      q:=format('Complete the pattern: %s, %s, %s, %s, __.',a,a+b,a+2*b,a+3*b);
      expl:=format('The pattern increases by %s each time, so the next term is %s.',b,ans);

    elsif kind in ('addition','doubling','consecutive') then
      if kind='doubling' then
        a:=case d when 1 then 1+((j-1)%20) when 2 then 21+((j-1)%80) else 101+((j-1)%300) end; b:=a;
      elsif kind='consecutive' then
        a:=case d when 1 then 1+j when 2 then 100+j else 500+j*2 end; b:=a+1;
      elsif p_level like 'KG%' then
        a:=case d when 1 then 1+((j-1)%5) when 2 then 3+((j-1)%7) else 5+((j-1)%10) end;
        b:=case d when 1 then 1+(floor((j-1)/5)::int%5) when 2 then 1+(floor((j-1)/7)::int%8) else 2+(floor((j-1)/10)::int%9) end;
      else
        a:=case d when 1 then 5+j when 2 then 100+j*2 else 1000+j*7 end;
        b:=case d when 1 then 2+floor(j/3) when 2 then 40+j else 300+j*3 end;
      end if;
      ans:=a+b;
      q:=case mode
        when 1 then format('Calculate %s + %s.',a,b)
        when 2 then format('%s has %s %s and receives %s more. How many are there altogether?',person_name,a,object_name,b)
        when 3 then format('Find the sum of %s and %s.',a,b)
        when 4 then format('Combine a group of %s %s with another group of %s. Find the total.',a,object_name,b)
        else format('Complete: %s + %s = __.',a,b) end;
      expl:=format('%s + %s = %s.',a,b,ans);

    elsif kind='subtraction' then
      b:=case when p_level like 'KG%' then 1+((j-1)%8) when d=1 then 3+((j-1)%40) when d=2 then 30+j else 100+j*2 end;
      a:=b+case when p_level like 'KG%' then 1+(floor((j-1)/8)::int%10) when d=1 then 5+floor(j/5) when d=2 then 80+j*2 else 300+j*5 end;
      ans:=a-b;
      q:=case mode
        when 1 then format('Calculate %s − %s.',a,b)
        when 2 then format('%s had %s %s and gave away %s. How many remained?',person_name,a,object_name,b)
        when 3 then format('Find the difference between %s and %s.',a,b)
        when 4 then format('Take %s away from %s. What is left?',b,a)
        else format('Complete: %s − %s = __.',a,b) end;
      expl:=format('%s − %s = %s.',a,b,ans);

    elsif kind='mixed' then
      a:=50*d+i*3; b:=10*d+i; c:=2*d+((i-1)%30);
      if i%2=0 then ans:=a+b-c; q:=format('Evaluate %s + %s − %s.',a,b,c); expl:=format('%s + %s − %s = %s.',a,b,c,ans);
      else ans:=a-b+c; q:=format('Evaluate %s − %s + %s.',a,b,c); expl:=format('%s − %s + %s = %s.',a,b,c,ans); end if;

    elsif kind='multiplication' then
      multiplier:=case
        when t like '%0.5%' then 0.5 when t like '%500%' then 500 when t like '%50%' then 50
        when t like '%22%' then 22 when t like '%11%' then 11 when t like '%10%' or t like '%ten%' then 10
        when t like '%nine%' or t ~ '(^|[^0-9])9([^0-9]|$)' then 9
        when t like '%seven%' or t ~ '(^|[^0-9])7([^0-9]|$)' then 7
        when t like '%six%' or t ~ '(^|[^0-9])6([^0-9]|$)' then 6
        when t like '%five%' or t ~ '(^|[^0-9])5([^0-9]|$)' then 5
        when t like '%four%' or t ~ '(^|[^0-9])4([^0-9]|$)' then 4
        when t like '%two%' or t ~ '(^|[^0-9])2([^0-9]|$)' then 2
        else case d when 1 then 2+((j-1)%5) when 2 then 6+((j-1)%7) else 12+((j-1)%13) end end;
      if t like '%ending with 0%' then a:=10*(2+i);
      elsif t like '%ending with 1%' then a:=10*(2+i)+1;
      elsif t like '%ending with 5%' then a:=10*(2+i)+5;
      elsif t like '%between 100%110%' or t like '%close to 100%' then a:=100+((i-1)%11);
      elsif t like '%between 10%20%' then a:=10+((i-1)%11);
      elsif t like '%difference of 2%' then a:=10+i; multiplier:=a+2;
      else a:=case when p_level like 'KG%' then 1+((j-1)%10) when d=1 then 2+i when d=2 then 50+i*2 else 200+i*4 end; end if;
      ans:=a*multiplier;
      q:=case mode
        when 1 then format('Calculate %s × %s.',a,multiplier)
        when 2 then format('There are %s equal groups of %s %s. How many %s are there?',a,multiplier,object_name,object_name)
        when 3 then format('Find the product of %s and %s.',a,multiplier)
        when 4 then format('%s packs contain %s items each. Find the total number of items.',a,multiplier)
        else format('Complete: %s × %s = __.',a,multiplier) end;
      expl:=format('%s × %s = %s.',a,multiplier,ans);

    elsif kind='division' then
      divisor:=case when t like '%0.5%' then 0.5 when t like '%500%' then 500 when t like '%50%' then 50
        when t like '%25%' or t like '%twenty%five%' then 25 when t like '%10%' or t like '%ten%' then 10
        when t like '%nine%' or t ~ '(^|[^0-9])9([^0-9]|$)' then 9
        when t like '%five%' or t ~ '(^|[^0-9])5([^0-9]|$)' then 5
        when t like '%two%' or t ~ '(^|[^0-9])2([^0-9]|$)' then 2
        else case d when 1 then 2+((j-1)%5) when 2 then 6+((j-1)%7) else 12+((j-1)%13) end end;
      ans:=case when d=1 then 2+i when d=2 then 50+i*2 else 200+i*3 end; a:=ans*divisor;
      q:=case mode
        when 1 then format('Calculate %s ÷ %s.',a,divisor)
        when 2 then format('%s %s are shared equally among %s groups. How many are in each group?',a,object_name,divisor)
        when 3 then format('How many groups of %s are contained in %s?',divisor,a)
        when 4 then format('%s items are packed equally into %s boxes. How many items go in each box?',a,divisor)
        else format('Complete: %s ÷ %s = __.',a,divisor) end;
      expl:=format('%s ÷ %s = %s.',a,divisor,ans);

    elsif kind='squaring' then
      if t like '%ending with 0%' then a:=10*(1+i);
      elsif t like '%ending with 1%' then a:=10*(1+i)+1;
      elsif t like '%ending with 4%' then a:=10*(1+i)+4;
      elsif t like '%ending with 5%' then a:=10*(1+i)+5;
      elsif t like '%30%50%' then a:=30+((i-1)%21);
      elsif t like '%50%70%' then a:=50+((i-1)%21);
      else a:=case d when 1 then 2+i when 2 then 50+i else 100+i*2 end; end if;
      ans:=a*a;
      q:=case mode when 1 then format('Calculate %s².',a) when 2 then format('Find the square of %s.',a)
        when 3 then format('Evaluate %s × %s.',a,a) when 4 then format('A square has side %s cm. Find its area.',a)
        else format('Complete: %s² = __.',a) end;
      expl:=format('%s² = %s × %s = %s.',a,a,a,ans);

    elsif kind='powers' then
      a:=case d when 1 then 1+((j-1)%5) when 2 then 2+((j-1)%7) else 3+((j-1)%8) end;
      b:=case d when 1 then 1+((j-1)%3) when 2 then 2+((j-1)%4) else 3+((j-1)%4) end;
      ans:=power(10,b)*a;
      q:=format('Calculate %s × 10^%s.',a,b);
      expl:=format('10^%s is %s, so %s × %s = %s.',b,power(10,b),a,power(10,b),ans);

    elsif kind='fractions' then
      a:=1+((i-1)%9); b:=a+1+(floor((i-1)/9)::int%9);
      c:=1+(floor((i-1)/81)::int%7); divisor:=c+1+(floor((i-1)/567)::int%5);
      if a/b>c/divisor then answer_text:='>'; elsif a/b<c/divisor then answer_text:='<'; else answer_text:='='; end if;
      q:=format('Choose the correct sign: %s/%s __ %s/%s.',a,b,c,divisor);
      expl:=format('Comparing equivalent fractions shows that %s/%s %s %s/%s.',a,b,answer_text,c,divisor);

    elsif kind='percentages' then
      b:=case d when 1 then 100+4*i when 2 then 500+10*i else 1000+20*i end;
      a:=case when d=1 then 5*((j-1)%10+1) when d=2 then 12+((j-1)%39) else 17+((j-1)%67) end;
      ans:=a*b/100;
      q:=case mode when 1 then format('Find %s%% of %s.',a,b)
        when 2 then format('Calculate %s percent of %s.',a,b)
        when 3 then format('A school has %s pupils and %s%% are in a club. How many pupils are in the club?',b,a)
        when 4 then format('A price of GHS %s is reduced by %s%%. What is the discount?',b,a)
        else format('Complete: %s%% × %s = __.',a,b) end;
      expl:=format('%s%% of %s = %s/100 × %s = %s.',a,b,a,b,ans);

    elsif kind='divisibility' then
      divisor:=case when t like '%2%12%' then 2+((i-1)%11) when t like '%5%10%' then 5+((i-1)%6)
        when t like '%5%8%' then 5+((i-1)%4) else 2+((i-1)%3) end;
      a:=case when i%2=0 then divisor*(10+i) else divisor*(10+i)+1 end;
      answer_text:=case when mod(a,divisor)=0 then 'Yes' else 'No' end;
      q:=format('Is %s divisible by %s?',a,divisor);
      expl:=case when answer_text='Yes' then format('%s ÷ %s is a whole number, so the answer is Yes.',a,divisor)
        else format('%s leaves a remainder when divided by %s, so the answer is No.',a,divisor) end;

    elsif kind='word' then
      a:=50*d+i*4; b:=10*d+i; c:=2*d+((i-1)%25);
      if mode=1 then ans:=a-b; q:=format('A shop stocked %s books and sold %s. How many remained?',a,b); expl:=format('%s − %s = %s.',a,b,ans);
      elsif mode=2 then ans:=a+b; q:=format('Two classes collected %s and %s cans. How many did they collect altogether?',a,b); expl:=format('%s + %s = %s.',a,b,ans);
      elsif mode=3 then ans:=b*c; q:=format('%s teams bring %s bottles each. How many bottles are brought?',c,b); expl:=format('%s × %s = %s.',c,b,ans);
      elsif mode=4 then a:=2*round(a/2); ans:=a/2; q:=format('%s oranges are shared equally between two baskets. How many are in each?',a); expl:=format('%s ÷ 2 = %s.',a,ans);
      else ans:=a+b-c; q:=format('A bus had %s passengers, picked up %s and dropped off %s. How many remained?',a,b,c); expl:=format('%s + %s − %s = %s.',a,b,c,ans); end if;

    else
      if mode=1 then a:=20*d+i; b:=5*d+i; ans:=a+b; q:=format('Calculate %s + %s.',a,b); expl:=format('%s + %s = %s.',a,b,ans);
      elsif mode=2 then b:=5*d+i; a:=b+30*d+i*2; ans:=a-b; q:=format('Calculate %s − %s.',a,b); expl:=format('%s − %s = %s.',a,b,ans);
      elsif mode=3 then a:=2+i; b:=2+((i-1)%12); ans:=a*b; q:=format('Calculate %s × %s.',a,b); expl:=format('%s × %s = %s.',a,b,ans);
      elsif mode=4 then divisor:=2+((i-1)%10); ans:=5+i; a:=divisor*ans; q:=format('Calculate %s ÷ %s.',a,divisor); expl:=format('%s ÷ %s = %s.',a,divisor,ans);
      else a:=1+((i-1)%9); b:=a+1+(floor((i-1)/9)::int%9); c:=1+(floor((i-1)/81)::int%7); divisor:=c+1; if a/b>c/divisor then answer_text:='>'; elsif a/b<c/divisor then answer_text:='<'; else answer_text:='='; end if; q:=format('Choose the correct sign: %s/%s __ %s/%s.',a,b,c,divisor); expl:=format('%s/%s %s %s/%s.',a,b,answer_text,c,divisor); end if;
    end if;

    if answer_text is null then answer_text:=to_char(ans,'FM9999999990.9999'); end if;
    if kind='fractions' or (kind='general' and mode=5) then
      w1:=case answer_text when '>' then '<' else '>' end; w2:=case answer_text when '=' then '<' else '=' end; w3:='Cannot be determined';
    elsif kind='divisibility' then
      w1:=case answer_text when 'Yes' then 'No' else 'Yes' end; w2:='Only for even numbers'; w3:='Cannot be determined';
    else
      w1:=to_char(ans+greatest(1,ceil(abs(ans)*0.05)),'FM9999999990.9999');
      w2:=to_char(greatest(0,ans-greatest(1,ceil(abs(ans)*0.05))),'FM9999999990.9999');
      w3:=to_char(ans+greatest(2,ceil(abs(ans)*0.10)),'FM9999999990.9999');
    end if;
    pos:=((i-1)%4)+1;
    oa:=case pos when 1 then answer_text when 2 then w1 when 3 then w2 else w3 end;
    ob:=case pos when 1 then w1 when 2 then answer_text when 3 then w3 else w2 end;
    oc:=case pos when 1 then w2 when 2 then w3 when 3 then answer_text else w1 end;
    od:=case pos when 1 then w3 when 2 then w2 when 3 then w1 else answer_text end;
    letter:=substr('ABCD',pos,1);

    insert into public.question_bank
      (class_level,curriculum,topic,topic_area,topic_sublevel,difficulty,question_text,
       option_a,option_b,option_c,option_d,correct_answer,explanation,numeric_answer,
       is_active,ai_generated,ai_prompt,source_type,source_name,source_page)
    values
      (p_level,'GES',p_topic,area,case d when 1 then 'Easy' when 2 then 'Medium' else 'Hard' end,
       d,q,oa,ob,oc,od,letter,expl,case when answer_text in ('>','<','=','Yes','No') then null else ans end,
       true,true,'Original deterministic generation using Mezzo workbook scope; HelpTeaching format guidance only',
       'original_generated',src,i::text)
    on conflict (class_level,curriculum,topic,source_name,source_page)
    where source_type='original_generated'
    do update set topic_area=excluded.topic_area,topic_sublevel=excluded.topic_sublevel,difficulty=excluded.difficulty,
      question_text=excluded.question_text,option_a=excluded.option_a,option_b=excluded.option_b,
      option_c=excluded.option_c,option_d=excluded.option_d,correct_answer=excluded.correct_answer,
      explanation=excluded.explanation,numeric_answer=excluded.numeric_answer,is_active=true,
      ai_generated=true,ai_prompt=excluded.ai_prompt,updated_at=now();
  end loop;
  return 500;
end $$;

revoke all on function private.generate_workbook_topic_questions(text,text) from public;
