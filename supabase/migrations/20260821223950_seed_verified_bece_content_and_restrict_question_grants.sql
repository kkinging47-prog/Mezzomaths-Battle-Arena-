-- Seed the verified original BECE sample questions shipped with the app.
-- Restrict table privileges to the operations allowed by RLS.
revoke all on table public.bece_question_bank from anon, authenticated;
grant select on table public.bece_question_bank to anon, authenticated;
grant insert, update, delete on table public.bece_question_bank to authenticated;

revoke all on table public.junior_questions from anon, authenticated;
grant select on table public.junior_questions to anon, authenticated;
grant insert, update, delete on table public.junior_questions to authenticated;

create unique index if not exists bece_question_bank_content_key
  on public.bece_question_bank (year, type, topic, question_text);

insert into public.bece_question_bank
(year,type,topic,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation)
values
('Sample','samples','Number','Simplify: 3/4 + 1/8','1/2','7/8','5/8','1','B','3/4 is 6/8, and 6/8 + 1/8 = 7/8.'),
('Sample','samples','Algebra','If 2x + 5 = 17, find x.','4','5','6','7','C','2x = 12, so x = 6.'),
('Sample','samples','Geometry','Find the area of a rectangle with length 12 cm and breadth 7 cm.','19 cm²','38 cm²','84 cm²','96 cm²','C','Area = length × breadth = 12 × 7 = 84 cm².'),
('Sample','samples','Statistics','The marks are 4, 6, 8, 10, 12. What is the mean?','7','8','9','10','B','Sum = 40. Mean = 40 ÷ 5 = 8.'),
('Sample','samples','Percentages','Find 20% of 250.','25','40','50','60','C','20% of 250 = 20/100 × 250 = 50.'),
('Sample','samples','Ratio','Share GHS 60 in the ratio 2:3. What is the larger share?','GHS 20','GHS 24','GHS 30','GHS 36','D','Total parts = 5. Larger share = 3/5 × 60 = 36.'),
('Sample','samples','Angles','Two angles on a straight line are x and 65°. Find x.','25°','95°','115°','125°','C','Angles on a straight line sum to 180°. x = 180 − 65 = 115°.'),
('Sample','samples','Speed','A car travels 180 km in 3 hours. Find its average speed.','30 km/h','45 km/h','60 km/h','90 km/h','C','Speed = distance ÷ time = 180 ÷ 3 = 60 km/h.'),
('Sample','samples','Indices','Evaluate 2³ × 2².','16','24','32','64','C','2³ × 2² = 2⁵ = 32.'),
('Sample','samples','Probability','A bag contains 3 red balls and 2 blue balls. What is the probability of picking a blue ball?','2/5','3/5','1/2','1/5','A','There are 5 balls. Blue balls = 2, so probability = 2/5.'),
('Sample','samples','Mensuration','Find the perimeter of a square of side 9 cm.','18 cm','27 cm','36 cm','81 cm','C','Perimeter of square = 4 × side = 4 × 9 = 36 cm.'),
('Sample','samples','Linear Equations','Solve: y/3 = 7.','10','14','21','24','C','Multiply both sides by 3. y = 21.'),
('Sample','pastStyle','Fractions','A trader sold 2/5 of her oranges in the morning and 1/4 in the afternoon. What fraction was sold altogether?','3/9','13/20','3/20','7/20','B','2/5 = 8/20 and 1/4 = 5/20. Total = 13/20.'),
('Sample','pastStyle','Algebra','Expand: 3(a + 4).','3a + 4','3a + 7','3a + 12','a + 12','C','Multiply each term in the bracket by 3: 3a + 12.'),
('Sample','pastStyle','Geometry','The base of a triangle is 10 cm and its height is 8 cm. Find its area.','18 cm²','40 cm²','80 cm²','160 cm²','B','Area of triangle = 1/2 × base × height = 1/2 × 10 × 8 = 40 cm².'),
('Sample','pastStyle','Percentages','A book costs GHS 80. It is sold at a discount of 10%. What is the discount?','GHS 4','GHS 8','GHS 10','GHS 72','B','10% of 80 = 8.'),
('Sample','pastStyle','Statistics','Find the mode of 2, 5, 7, 5, 8, 5, 9.','2','5','7','9','B','The mode is the number that occurs most often. 5 occurs three times.'),
('Sample','pastStyle','Integers','Evaluate: −4 + 9 − 3.','2','4','8','16','A','−4 + 9 = 5, and 5 − 3 = 2.'),
('Sample','pastStyle','Ratio','The ratio of boys to girls in a class is 3:5. If there are 24 boys, how many girls are there?','30','36','40','45','C','3 parts = 24, so 1 part = 8. Girls = 5 × 8 = 40.'),
('Sample','pastStyle','Word Problem','A farmer harvested 144 eggs and packed them equally into crates of 12. How many crates were used?','10','11','12','14','C','144 ÷ 12 = 12 crates.'),
('Sample','pastStyle','Angles','An angle is 35° less than a right angle. Find the angle.','35°','45°','55°','65°','C','A right angle is 90°. 90 − 35 = 55°.'),
('Sample','pastStyle','Scale Drawing','On a map, 1 cm represents 5 km. What distance is represented by 7 cm?','12 km','25 km','35 km','50 km','C','7 × 5 km = 35 km.'),
('Sample','pastStyle','Sequences','Find the next number: 4, 8, 12, 16, __.','18','20','22','24','B','The sequence increases by 4 each time. 16 + 4 = 20.'),
('Sample','pastStyle','Volume','Find the volume of a cuboid of length 5 cm, width 4 cm and height 3 cm.','12 cm³','20 cm³','60 cm³','120 cm³','C','Volume = length × width × height = 5 × 4 × 3 = 60 cm³.')
on conflict (year,type,topic,question_text) do update set
  option_a=excluded.option_a,
  option_b=excluded.option_b,
  option_c=excluded.option_c,
  option_d=excluded.option_d,
  correct_answer=excluded.correct_answer,
  explanation=excluded.explanation,
  updated_at=now();
