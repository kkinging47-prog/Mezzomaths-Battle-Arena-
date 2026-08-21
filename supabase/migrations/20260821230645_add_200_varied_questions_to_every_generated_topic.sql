
create or replace function private.generate_varied_topic_extension(p_level text,p_topic text)
returns integer language plpgsql security invoker
set search_path=pg_catalog,public,private
as $$
declare
 i int; d int; j int; mode int; kind text; t text:=lower(p_topic); area text;
 a numeric; b numeric; c numeric; e numeric; ans numeric; divisor numeric; multiplier numeric;
 q text; expl text; answer_text text; w1 text; w2 text; w3 text;
 pos int; oa text; ob text; oc text; od text; letter text;
 item text; person text;
 src constant text:='Mezzo varied web-guided 200-topic extension v3';
begin
 kind:=case
  when t like '%geometry%' then 'geometry'
  when t like '%statistics%' then 'statistics'
  when t like '%time%' then 'time'
  when t like '%before%after%' then 'number'
  when t like '%count%' or t like '%identify%' or t like '%finger%' then 'counting'
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
  else 'general' end;
 area:=case kind when 'geometry' then 'Geometry' when 'statistics' then 'Statistics' when 'time' then 'Time'
  when 'number' then 'Number Sense' when 'counting' then 'Counting' when 'patterns' then 'Patterns'
  when 'mixed' then 'Addition and Subtraction' when 'consecutive' then 'Addition' when 'doubling' then 'Addition'
  when 'addition' then 'Addition' when 'subtraction' then 'Subtraction' when 'fractions' then 'Fractions'
  when 'percentages' then 'Percentages' when 'divisibility' then 'Divisibility' when 'powers' then 'Powers'
  when 'squaring' then 'Squaring' when 'division' then 'Division' when 'word' then 'Word Problems'
  when 'multiplication' then 'Multiplication' else 'General Practice' end;

 for i in 1..200 loop
  d:=case when i<=100 then 1 when i<=160 then 2 else 3 end;
  j:=case when d=1 then i when d=2 then i-100 else i-160 end;
  mode:=((i-1)%10)+1;
  item:=(array['books','pencils','mangoes','counters','beads','exercise books','oranges','bottles','stickers','notebooks'])[((i-1)%10)+1];
  person:=(array['Ama','Kojo','Esi','Kofi','Adwoa','Yaw','Akosua','Kwame','Abena','Nana'])[((i-1)%10)+1];
  q:=null; expl:=null; ans:=null; answer_text:=null; divisor:=null; multiplier:=null;

  if kind='counting' then
    a:=case d when 1 then 1+((j-1)%10) when 2 then 11+((j-1)%10) else 21+((j-1)%20) end;
    mode:=floor((i-1)/20)::int+1;
    item:=(array['books','pencils','mangoes','counters','beads','oranges','bottles','stickers','notebooks','balls'])[((i-1)%10)+1];
    ans:=a;
    q:=case when mode%5=1 then format('%s places %s %s in a row. Which numeral matches the collection?',person,a,item)
      when mode%5=2 then format('A ten-frame activity has a total of %s counters. Select the number represented.',a)
      when mode%5=3 then format('Starting at zero and making %s jumps of one, where do you land?',a)
      when mode%5=4 then format('Which number word represents a set containing %s %s?',a,item)
      else format('A collection has %s %s. How many more are needed to make %s?',a,item,a+2) end;
    if mode%5=0 then ans:=2; end if;
    expl:=case when mode%5=0 then format('%s + 2 = %s, so 2 more are needed.',a,a+2) else format('Counting each item once gives %s.',ans) end;

  elsif kind='number' then
    a:=case d when 1 then 2+j when 2 then 100+j*2 else 500+j*5 end;
    if mode in(1,4,7) then ans:=a+1;q:=format('What number is one more than %s?',a);expl:=format('One more than %s is %s.',a,ans);
    elsif mode in(2,5,8) then ans:=a-1;q:=format('What number is one less than %s?',a);expl:=format('One less than %s is %s.',a,ans);
    elsif mode in(3,6) then ans:=a+10;q:=format('Move ten steps forward from %s on a number chart. Where do you land?',a);expl:=format('%s + 10 = %s.',a,ans);
    else ans:=a-10;q:=format('Move ten steps backward from %s on a number chart. Where do you land?',a);expl:=format('%s − 10 = %s.',a,ans); end if;

  elsif kind in('addition','doubling','consecutive') then
    if kind='doubling' then a:=case d when 1 then 2+i when 2 then 50+i else 200+i*2 end;b:=a;
    elsif kind='consecutive' then a:=20*d+i;b:=a+1;
    else a:=case when p_level like 'KG%' then 1+((i-1)%10) when d=1 then 10+i*2 when d=2 then 100+i*4 else 1000+i*9 end;
      b:=case when p_level like 'KG%' then 1+(floor((i-1)/10)::int%10) when d=1 then 5+i when d=2 then 40+i*2 else 300+i*5 end; end if;
    c:=2*d+((i-1)%20); ans:=a+b;
    if mode=1 then q:=format('Use compensation to find %s + %s.',a,b);expl:=format('Rearranging to friendly numbers gives %s.',ans);
    elsif mode=2 then q:=format('What number must be added to %s to make %s?',a,ans);ans:=b;expl:=format('%s + %s = %s.',a,b,a+b);
    elsif mode=3 then ans:=a+b+c;q:=format('Find the total of %s, %s and %s.',a,b,c);expl:=format('%s + %s + %s = %s.',a,b,c,ans);
    elsif mode=4 then q:=format('%s saved GHS %s and later saved GHS %s more. What is the total saved?',person,a,b);expl:=format('%s + %s = %s.',a,b,ans);
    elsif mode=5 then q:=format('A table shows %s boys and %s girls. How many pupils are represented?',a,b);expl:=format('%s + %s = %s.',a,b,ans);
    elsif mode=6 then q:=format('Complete the fact family: %s + __ = %s.',a,ans);ans:=b;expl:=format('The missing addend is %s.',b);
    elsif mode=7 then ans:=(a+b)-(c+1);q:=format('How much greater is %s + %s than %s + 1?',a,b,c);expl:=format('(%s + %s) − (%s + 1) = %s.',a,b,c,ans);
    elsif mode=8 then q:=format('On a number line, start at %s and jump forward %s. Where do you land?',a,b);expl:=format('%s + %s = %s.',a,b,ans);
    elsif mode=9 then ans:=2*a+b;q:=format('A store has two boxes of %s items and one box of %s items. Find the total.',a,b);expl:=format('2 × %s + %s = %s.',a,b,ans);
    else q:=format('Which total balances the equation %s + %s = __?',a,b);expl:=format('The balanced total is %s.',ans); end if;

  elsif kind='subtraction' then
    b:=case when p_level like 'KG%' then 1+((i-1)%10) when d=1 then 5+i when d=2 then 50+i*2 else 200+i*4 end;
    a:=b+case when p_level like 'KG%' then 1+(floor((i-1)/10)::int%10) when d=1 then 20+i when d=2 then 150+i*3 else 700+i*7 end;
    c:=2*d+((i-1)%20);ans:=a-b;
    if mode=1 then q:=format('Use compensation to calculate %s − %s.',a,b);expl:=format('%s − %s = %s.',a,b,ans);
    elsif mode=2 then q:=format('What must be subtracted from %s to leave %s?',a,ans);ans:=b;expl:=format('%s − %s = %s.',a,b,a-b);
    elsif mode=3 then q:=format('Find the missing starting number: __ − %s = %s.',b,ans);ans:=a;expl:=format('%s − %s = %s.',a,b,a-b);
    elsif mode=4 then q:=format('%s had %s %s and used %s. How many remained?',person,a,item,b);expl:=format('%s − %s = %s.',a,b,ans);
    elsif mode=5 then q:=format('How much greater is %s than %s?',a,b);expl:=format('%s − %s = %s.',a,b,ans);
    elsif mode=6 then ans:=a-b-c;q:=format('Calculate %s − %s − %s.',a,b,c);expl:=format('%s − %s − %s = %s.',a,b,c,ans);
    elsif mode=7 then q:=format('Start at %s on a number line and move back %s. Where do you land?',a,b);expl:=format('%s − %s = %s.',a,b,ans);
    elsif mode=8 then ans:=(a+c)-b;q:=format('A stock rose from %s to %s, then %s were sold. How many remained?',a,a+c,b);expl:=format('%s + %s − %s = %s.',a,c,b,ans);
    elsif mode=9 then q:=format('Complete the inverse fact: %s + __ = %s.',b,a);ans:=a-b;expl:=format('%s + %s = %s.',b,ans,a);
    else q:=format('A target is %s. The current score is %s. How many more points are needed?',a,b);expl:=format('%s − %s = %s.',a,b,ans); end if;

  elsif kind='mixed' then
    a:=100*d+i*5;b:=20*d+i*2;c:=3*d+((i-1)%30);
    if mode<=3 then ans:=a+b-c;q:=format('Evaluate %s + %s − %s.',a,b,c);expl:=format('%s + %s − %s = %s.',a,b,c,ans);
    elsif mode<=6 then ans:=a-b+c;q:=format('%s had %s points, lost %s and gained %s. Find the final score.',person,a,b,c);expl:=format('%s − %s + %s = %s.',a,b,c,ans);
    elsif mode=7 then ans:=a-(b+c);q:=format('Evaluate %s − (%s + %s).',a,b,c);expl:=format('%s − %s = %s.',a,b+c,ans);
    elsif mode=8 then ans:=(a+b)-c;q:=format('Which value balances (%s + %s) − %s?',a,b,c);expl:=format('The value is %s.',ans);
    elsif mode=9 then ans:=a-b;q:=format('Find the missing value: %s + __ = %s.',b,a);expl:=format('%s − %s = %s.',a,b,ans);
    else ans:=a+b-c;q:=format('A warehouse received %s boxes, added %s and dispatched %s. How many remain?',a,b,c);expl:=format('%s + %s − %s = %s.',a,b,c,ans); end if;

  elsif kind='multiplication' then
    multiplier:=case when t like '%0.5%' then 0.5 when t like '%500%' then 500 when t like '%50%' then 50 when t like '%22%' then 22
     when t like '%11%' then 11 when t like '%10%' or t like '%ten%' then 10 when t like '%nine%' or t~'(^|[^0-9])9([^0-9]|$)' then 9
     when t like '%seven%' or t~'(^|[^0-9])7([^0-9]|$)' then 7 when t like '%five%' or t~'(^|[^0-9])5([^0-9]|$)' then 5
     when t like '%four%' or t~'(^|[^0-9])4([^0-9]|$)' then 4 when t like '%two%' or t~'(^|[^0-9])2([^0-9]|$)' then 2
     else 2+((i-1)%12) end;
    if t like '%ending with 0%' then a:=10*(20+i);elsif t like '%ending with 1%' then a:=10*(20+i)+1;
    elsif t like '%ending with 5%' then a:=10*(20+i)+5;elsif t like '%between 100%110%' or t like '%close to 100%' then a:=100+((i-1)%11);
    elsif t like '%between 10%20%' then a:=10+((i-1)%11);elsif t like '%difference of 2%' then a:=20+i;multiplier:=a+2;
    else a:=case when p_level like 'KG%' then 1+((i-1)%10) when d=1 then 3+i when d=2 then 50+i*2 else 200+i*5 end;end if;
    ans:=a*multiplier;
    if mode=1 then q:=format('Write repeated addition for %s groups of %s, then find the total.',a,multiplier);expl:=format('%s groups of %s equal %s.',a,multiplier,ans);
    elsif mode=2 then q:=format('An array has %s rows and %s columns. How many cells are in the array?',a,multiplier);expl:=format('%s × %s = %s.',a,multiplier,ans);
    elsif mode=3 then q:=format('Find the missing factor: %s × __ = %s.',a,ans);ans:=multiplier;expl:=format('The missing factor is %s.',multiplier);
    elsif mode=4 then q:=format('%s trays hold %s %s each. Find the total.',a,multiplier,item);expl:=format('%s × %s = %s.',a,multiplier,ans);
    elsif mode=5 then q:=format('Use the distributive property to calculate %s × %s.',a,multiplier);expl:=format('The product is %s.',ans);
    elsif mode=6 then q:=format('How much greater is %s × %s than %s × %s?',a,multiplier,a-1,multiplier);ans:=multiplier;expl:=format('The products differ by one group of %s.',multiplier);
    elsif mode=7 then q:=format('A number line makes %s jumps of size %s. At what number does it finish?',a,multiplier);expl:=format('%s × %s = %s.',a,multiplier,ans);
    elsif mode=8 then q:=format('Complete the fact family: %s ÷ %s = __.',ans,multiplier);ans:=a;expl:=format('%s ÷ %s = %s.',a*multiplier,multiplier,a);
    elsif mode=9 then q:=format('Scale %s by a factor of %s.',a,multiplier);expl:=format('%s × %s = %s.',a,multiplier,ans);
    else q:=format('Compare with calculation: find %s groups of %s.',a,multiplier);expl:=format('The total is %s.',ans);end if;

  elsif kind='division' then
    divisor:=case when t like '%0.5%' then 0.5 when t like '%500%' then 500 when t like '%50%' then 50 when t like '%25%' or t like '%twenty%five%' then 25
     when t like '%10%' or t like '%ten%' then 10 when t like '%nine%' or t~'(^|[^0-9])9([^0-9]|$)' then 9
     when t like '%five%' or t~'(^|[^0-9])5([^0-9]|$)' then 5 when t like '%two%' or t~'(^|[^0-9])2([^0-9]|$)' then 2 else 2+((i-1)%12) end;
    ans:=case d when 1 then 3+i when 2 then 50+i*2 else 200+i*4 end;a:=ans*divisor;
    if mode=1 then q:=format('Share %s %s equally among %s pupils. How many does each receive?',a,item,divisor);expl:=format('%s ÷ %s = %s.',a,divisor,ans);
    elsif mode=2 then q:=format('How many groups of %s can be made from %s?',divisor,a);expl:=format('%s ÷ %s = %s.',a,divisor,ans);
    elsif mode=3 then q:=format('Find the missing divisor: %s ÷ __ = %s.',a,ans);ans:=divisor;expl:=format('The divisor is %s.',divisor);
    elsif mode=4 then q:=format('Find the missing dividend: __ ÷ %s = %s.',divisor,ans);ans:=a;expl:=format('%s × %s = %s.',divisor,a/divisor,a);
    elsif mode=5 then q:=format('Use multiplication to check %s ÷ %s.',a,divisor);expl:=format('%s × %s = %s, so the quotient is %s.',ans,divisor,a,ans);
    elsif mode=6 then q:=format('%s items are arranged in rows of %s. How many rows are formed?',a,divisor);expl:=format('%s ÷ %s = %s.',a,divisor,ans);
    elsif mode=7 then q:=format('A journey of %s km is split into %s equal stages. Find each stage length.',a,divisor);expl:=format('%s ÷ %s = %s.',a,divisor,ans);
    elsif mode=8 then q:=format('Complete the fact family: %s × %s = __.',ans,divisor);ans:=a;expl:=format('The product is %s.',a);
    elsif mode=9 then q:=format('Which quotient is equivalent to %s ÷ %s?',a,divisor);expl:=format('The quotient is %s.',ans);
    else q:=format('A budget of GHS %s is shared equally across %s days. How much is available daily?',a,divisor);expl:=format('%s ÷ %s = %s.',a,divisor,ans);end if;

  elsif kind='patterns' then
    a:=10*d+i;b:=case d when 1 then 2+((i-1)%5) when 2 then 5+((i-1)%9) else 10+((i-1)%15) end;
    if mode<=4 then ans:=a+5*b;q:=format('Find the next term: %s, %s, %s, %s, %s, __.',a,a+b,a+2*b,a+3*b,a+4*b);expl:=format('Add %s each time; the next term is %s.',b,ans);
    elsif mode<=7 then ans:=a+2*b;q:=format('Find the missing term: %s, %s, __, %s, %s.',a,a+b,a+3*b,a+4*b);expl:=format('The constant step is %s, so the missing term is %s.',b,ans);
    else ans:=a+9*b;q:=format('A sequence begins at %s and increases by %s. What is its tenth term?',a,b);expl:=format('The tenth term is %s + 9 × %s = %s.',a,b,ans);end if;

  elsif kind='fractions' then
    a:=1+((i-1)%9);b:=a+2+(floor((i-1)/9)::int%9);c:=2+((i-1)%8);
    if mode<=3 then divisor:=1+(floor((i-1)/81)::int%7);e:=divisor+2;answer_text:=case when a/b>divisor/e then '>' when a/b<divisor/e then '<' else '=' end;q:=format('Compare %s/%s and %s/%s using >, < or =.',a,b,divisor,e);expl:=format('%s/%s %s %s/%s.',a,b,answer_text,divisor,e);
    elsif mode<=5 then ans:=a*c;q:=format('Find the missing numerator: %s/%s = __/%s.',a,b,b*c);expl:=format('Multiply numerator and denominator by %s; the numerator is %s.',c,ans);
    elsif mode<=7 then e:=b*c;ans:=a*c;q:=format('What is %s/%s of %s?',a,b,e);expl:=format('%s/%s × %s = %s.',a,b,e,ans);
    elsif mode=8 then ans:=b-a;q:=format('How many %sths must be added to %s/%s to make one whole?',b,a,b);expl:=format('%s/%s is needed.',b-a,b);
    elsif mode=9 then ans:=a+b;q:=format('Add the numerators in %s/%s and %s/%s. What numerator results?',a,b,b,b);expl:=format('%s + %s = %s.',a,b,ans);
    else ans:=a;q:=format('A fraction has denominator %s and value %s/%s. Identify its numerator.',b,a,b);expl:=format('The numerator is %s.',a);end if;

  elsif kind='percentages' then
    a:=5+((i-1)%76);b:=case d when 1 then 100+20*i when 2 then 500+25*i else 1000+50*i end;
    if mode<=4 then ans:=a*b/100;q:=format('Find %s%% of %s.',a,b);expl:=format('%s/100 × %s = %s.',a,b,ans);
    elsif mode<=6 then ans:=b*(100-a)/100;q:=format('An item costing GHS %s is discounted by %s%%. Find the sale price.',b,a);expl:=format('Sale price = %s%% of %s = %s.',100-a,b,ans);
    elsif mode<=8 then ans:=a;q:=format('%s is what percentage of %s?',a*b/100,b);expl:=format('(%s ÷ %s) × 100 = %s%%.',a*b/100,b,a);
    else ans:=b*(100+a)/100;q:=format('Increase %s by %s%%.',b,a);expl:=format('%s + %s%% = %s.',b,a,ans);end if;

  elsif kind='squaring' or kind='powers' then
    if t like '%ending with 0%' then a:=10*(20+i);elsif t like '%ending with 1%' then a:=10*(20+i)+1;elsif t like '%ending with 4%' then a:=10*(20+i)+4;elsif t like '%ending with 5%' then a:=10*(20+i)+5;
    elsif t like '%30%50%' then a:=30+((i-1)%21);elsif t like '%50%70%' then a:=50+((i-1)%21);else a:=10*d+i;end if;
    if kind='powers' then b:=1+((i-1)%5);ans:=a*power(10,b);q:=format('Write and calculate %s × 10^%s.',a,b);expl:=format('The value is %s.',ans);
    elsif mode<=3 then ans:=a*a;q:=format('Find %s² using a suitable mental strategy.',a);expl:=format('%s × %s = %s.',a,a,ans);
    elsif mode<=5 then ans:=a;q:=format('Find the positive square root of %s.',a*a);expl:=format('Since %s² = %s, the answer is %s.',a,a*a,a);
    elsif mode<=7 then ans:=(a+1)*(a+1)-a*a;q:=format('How much greater is %s² than %s²?',a+1,a);expl:=format('%s − %s = %s.',(a+1)*(a+1),a*a,ans);
    else ans:=a*a;q:=format('A square has side %s cm. Find its area.',a);expl:=format('Area = %s² = %s cm².',a,ans);end if;

  elsif kind='divisibility' then
    divisor:=2+((i-1)%11);a:=case when i%2=0 then divisor*(20+i) else divisor*(20+i)+1 end;
    answer_text:=case when mod(a,divisor)=0 then 'Yes' else 'No' end;
    q:=case when mode<=5 then format('Without long division, decide whether %s is divisible by %s.',a,divisor)
      else format('Does %s pass the divisibility test for %s?',a,divisor) end;
    expl:=case when answer_text='Yes' then format('%s divides exactly by %s.',a,divisor) else format('%s leaves a remainder when divided by %s.',a,divisor) end;

  elsif kind='time' then
    a:=360+i;b:=case d when 1 then 15+5*((i-1)%10) when 2 then 45+5*((i-1)%18) else 90+5*((i-1)%25) end;e:=a+b;
    if mode<=5 then ans:=e;answer_text:=format('%s:%s',case when floor(e/60)::int%12=0 then 12 else floor(e/60)::int%12 end,lpad((e::int%60)::text,2,'0'));q:=format('A programme begins at %s:%s and lasts %s minutes. When does it end?',case when floor(a/60)::int%12=0 then 12 else floor(a/60)::int%12 end,lpad((a::int%60)::text,2,'0'),b);expl:=format('Adding %s minutes gives %s.',b,answer_text);
    else ans:=b;q:=format('How many minutes pass from %s:%s to %s:%s?',case when floor(a/60)::int%12=0 then 12 else floor(a/60)::int%12 end,lpad((a::int%60)::text,2,'0'),case when floor(e/60)::int%12=0 then 12 else floor(e/60)::int%12 end,lpad((e::int%60)::text,2,'0'));expl:=format('The elapsed time is %s minutes.',b);end if;

  elsif kind='geometry' then
    a:=5*d+i;b:=3*d+((i-1)%40)+1;c:=2*d+((i-1)%15)+1;
    if mode<=2 then ans:=a*b;q:=format('Find the area of a rectangle measuring %s cm by %s cm.',a,b);expl:=format('Area = %s × %s = %s cm².',a,b,ans);
    elsif mode=3 then ans:=2*(a+b);q:=format('Find the perimeter of a rectangle with sides %s cm and %s cm.',a,b);expl:=format('Perimeter = 2(%s + %s) = %s cm.',a,b,ans);
    elsif mode=4 then ans:=a;q:=format('A rectangle has area %s cm² and width %s cm. Find its length.',a*b,b);expl:=format('%s ÷ %s = %s cm.',a*b,b,a);
    elsif mode=5 then ans:=a*b/2;q:=format('Find the area of a triangle with base %s cm and height %s cm.',a,b);expl:=format('Area = 1/2 × %s × %s = %s cm².',a,b,ans);
    elsif mode=6 then ans:=a*b*c;q:=format('Find the volume of a cuboid %s cm by %s cm by %s cm.',a,b,c);expl:=format('Volume = %s × %s × %s = %s cm³.',a,b,c,ans);
    elsif mode=7 then ans:=180-a;q:=format('Two angles on a straight line are %s° and x°. Find x.',a%170+5);a:=a%170+5;ans:=180-a;expl:=format('x = 180° − %s° = %s°.',a,ans);
    elsif mode=8 then a:=30+(i%50);b:=40+(i%40);c:=50+(i%30);ans:=360-a-b-c;q:=format('Three angles around a point are %s°, %s° and %s°. Find the fourth angle.',a,b,c);expl:=format('Angles around a point total 360°, so the answer is %s°.',ans);
    elsif mode=9 then ans:=4*a;q:=format('A square has side %s cm. Find its perimeter.',a);expl:=format('4 × %s = %s cm.',a,ans);
    else ans:=a*a;q:=format('A square has perimeter %s cm. Find its area.',4*a);expl:=format('Side = %s cm, so area = %s² = %s cm².',a,a,ans);end if;

  elsif kind='statistics' then
    a:=10*d+i;b:=a+2;c:=a+4;e:=a+6;
    if mode<=2 then ans:=(a+b+c+e)/4;q:=format('Find the mean of %s, %s, %s and %s.',a,b,c,e);expl:=format('Sum ÷ 4 = %s.',ans);
    elsif mode<=4 then ans:=(b+c)/2;q:=format('Find the median of %s, %s, %s and %s.',a,b,c,e);expl:=format('Median = (%s + %s) ÷ 2 = %s.',b,c,ans);
    elsif mode<=6 then ans:=b;q:=format('Find the mode of %s, %s, %s, %s, %s.',a,b,b,c,e);expl:=format('%s occurs most often.',b);
    elsif mode<=8 then ans:=e-a;q:=format('Find the range of %s, %s, %s and %s.',a,b,c,e);expl:=format('%s − %s = %s.',e,a,ans);
    else ans:=4*(a+3)-(a+b+c);q:=format('The mean of four numbers is %s. Three numbers are %s, %s and %s. Find the fourth.',a+3,a,b,c);expl:=format('Required total minus known sum gives %s.',ans);end if;

  elsif kind='word' then
    a:=100*d+i*5;b:=20*d+i*2;c:=3*d+((i-1)%25);
    if mode<=2 then ans:=a-b;q:=format('A warehouse had %s cartons and dispatched %s. How many remained?',a,b);expl:=format('%s − %s = %s.',a,b,ans);
    elsif mode<=4 then ans:=a+b-c;q:=format('A bus started with %s passengers, picked up %s and dropped off %s. How many remained?',a,b,c);expl:=format('%s + %s − %s = %s.',a,b,c,ans);
    elsif mode<=6 then ans:=b*c;q:=format('%s teams contribute GHS %s each. Find the total contribution.',c,b);expl:=format('%s × %s = %s.',c,b,ans);
    elsif mode<=8 then a:=c*(20+i);ans:=20+i;q:=format('%s books are packed equally into %s boxes. How many are in each box?',a,c);expl:=format('%s ÷ %s = %s.',a,c,ans);
    else ans:=(a-b)*c;q:=format('A shop has %s packs, sells %s packs, and each remaining pack contains %s items. How many items remain?',a,b,c);expl:=format('(%s − %s) × %s = %s.',a,b,c,ans);end if;

  else
    a:=100*d+i*4;b:=20*d+i;c:=2+((i-1)%12);
    if mode=1 then ans:=a+b;q:=format('Use a suitable strategy to calculate %s + %s.',a,b);expl:=format('The sum is %s.',ans);
    elsif mode=2 then ans:=a-b;q:=format('Use compensation to calculate %s − %s.',a,b);expl:=format('The difference is %s.',ans);
    elsif mode=3 then ans:=b*c;q:=format('Model %s × %s using equal groups, then find the product.',b,c);expl:=format('%s × %s = %s.',b,c,ans);
    elsif mode=4 then a:=b*c;ans:=b;q:=format('Use an inverse operation to calculate %s ÷ %s.',a,c);expl:=format('%s ÷ %s = %s.',a,c,ans);
    elsif mode=5 then ans:=a+b-c;q:=format('Evaluate %s + %s − %s.',a,b,c);expl:=format('The answer is %s.',ans);
    elsif mode=6 then ans:=a-b+c;q:=format('%s had %s points, lost %s and gained %s. Find the final score.',person,a,b,c);expl:=format('%s − %s + %s = %s.',a,b,c,ans);
    elsif mode=7 then ans:=b;q:=format('Find the missing addend: %s + __ = %s.',a,a+b);expl:=format('The missing addend is %s.',b);
    elsif mode=8 then ans:=c;q:=format('Find the missing factor: %s × __ = %s.',b,b*c);expl:=format('The factor is %s.',c);
    elsif mode=9 then ans:=a-b;q:=format('How much greater is %s than %s?',a,b);expl:=format('%s − %s = %s.',a,b,ans);
    else ans:=(a+b)*c;q:=format('A project uses %s items on each of %s days after receiving %s extra items. Find (%s + %s) × %s.',a,c,b,a,b,c);expl:=format('The value is %s.',ans);end if;
  end if;

  if answer_text is null then answer_text:=to_char(ans,'FM9999999990.9999');end if;
  if answer_text in('>','<','=') then w1:=case answer_text when '>' then '<' else '>' end;w2:=case answer_text when '=' then '<' else '=' end;w3:='Cannot be determined';
  elsif answer_text in('Yes','No') then w1:=case answer_text when 'Yes' then 'No' else 'Yes' end;w2:='Sometimes';w3:='Cannot be determined';
  elsif kind='time' and answer_text like '%:%' then
    w1:=format('%s:%s',case when floor((ans+15)/60)::int%12=0 then 12 else floor((ans+15)/60)::int%12 end,lpad(((ans::int+15)%60)::text,2,'0'));
    w2:=format('%s:%s',case when floor((ans-15)/60)::int%12=0 then 12 else floor((ans-15)/60)::int%12 end,lpad(((ans::int-15)%60)::text,2,'0'));
    w3:=format('%s:%s',case when floor((ans+30)/60)::int%12=0 then 12 else floor((ans+30)/60)::int%12 end,lpad(((ans::int+30)%60)::text,2,'0'));
  else
    w1:=to_char(ans+greatest(1,ceil(abs(ans)*0.04)),'FM9999999990.9999');
    w2:=to_char(greatest(0,ans-greatest(1,ceil(abs(ans)*0.04))),'FM9999999990.9999');
    w3:=to_char(ans+greatest(2,ceil(abs(ans)*0.08)),'FM9999999990.9999');
  end if;
  pos:=((i-1)%4)+1;
  oa:=case pos when 1 then answer_text when 2 then w1 when 3 then w2 else w3 end;
  ob:=case pos when 1 then w1 when 2 then answer_text when 3 then w3 else w2 end;
  oc:=case pos when 1 then w2 when 2 then w3 when 3 then answer_text else w1 end;
  od:=case pos when 1 then w3 when 2 then w2 when 3 then w1 else answer_text end;
  letter:=substr('ABCD',pos,1);

  insert into public.question_bank(class_level,curriculum,topic,topic_area,topic_sublevel,difficulty,question_text,
   option_a,option_b,option_c,option_d,correct_answer,explanation,numeric_answer,is_active,ai_generated,ai_prompt,source_type,source_name,source_page)
  values(p_level,'GES',p_topic,area,case d when 1 then 'Easy' when 2 then 'Medium' else 'Hard' end,d,q,oa,ob,oc,od,letter,expl,
   case when answer_text in('>','<','=','Yes','No') or kind='time' then null else ans end,true,true,
   'Original varied generation informed by public HelpTeaching and IXL skill taxonomies; no question text copied',
   'original_generated',src,i::text)
  on conflict(class_level,curriculum,topic,source_name,source_page) where source_type='original_generated'
  do update set topic_area=excluded.topic_area,topic_sublevel=excluded.topic_sublevel,difficulty=excluded.difficulty,question_text=excluded.question_text,
   option_a=excluded.option_a,option_b=excluded.option_b,option_c=excluded.option_c,option_d=excluded.option_d,
   correct_answer=excluded.correct_answer,explanation=excluded.explanation,numeric_answer=excluded.numeric_answer,is_active=true,
   ai_prompt=excluded.ai_prompt,updated_at=now();
 end loop;
 return 200;
end $$;
revoke all on function private.generate_varied_topic_extension(text,text) from public;

do $$
declare cfg record;
begin
 for cfg in
  select distinct class_level,topic from public.question_bank
  where source_type='original_generated'
    and source_name in('Mezzo original 500-topic bank v1','Mezzo workbook catalog 500-topic bank v2')
 loop
  perform private.generate_varied_topic_extension(cfg.class_level,cfg.topic);
 end loop;
end $$;

drop function private.generate_varied_topic_extension(text,text);
