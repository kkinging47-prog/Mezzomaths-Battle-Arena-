# Trial-test audit — 4 October 2026

## Findings

The live active general question bank contains 119,297 records across 169 class/curriculum/topic groups. All are GES. Cambridge, Pearson Edexcel and SHS 1–3 have no active records in this bank. Grade 9 has only BECE Exam Practice, Geometry and Statistics. A separate BECE bank exists and was not counted as general practice content.

The previous learner loader silently generated a generic replacement for missing content. That replacement did not vary its topic catalog or progression by curriculum. The same fallback was used for Algebra, Geometry and other unsupported topics, with multiplication as its default. This is removed: absent content is now reported, rather than being mislabeled as curriculum-matched practice.

The database keys use valid A–D letters. 113,483 numeric option keys were compared to numeric_answer, including options written with trailing decimal points: no mismatches. 74,541 simple arithmetic equations in explanations were recomputed: no equation errors. All 2,000 fraction-sign questions matched independently recomputed cross-products. These checks do not independently establish that every word problem, diagram, answer or explanation is correct. Missing-number explanations cannot be checked by treating their equation result as the answer: the answer is an operand.

242 question texts occur with different correct-answer letters. Different option orders can make this legitimate. The browser shuffler nevertheless looked up a key using only question text from a partial local bank, then defaulted to B. This could paint correct answers as wrong after redraw. It now uses the exact question card's key, moves option text and identity together, and never guesses a key.

Topic options were separately added by a workbook script and rebuilt by the main renderer. Added topics could disappear after selection. Learner options now come from a security-invoker coverage RPC grouped by exact class and curriculum. The workbook script no longer modifies learner topic lists. Curriculum changes are stored in session state before redraw.

Question selection previously read only the first 300 matching records, while most topics have 700–800 records. It now reads up to 1,000 and mixes unique prompts across difficulty, authored source and question form. Recent-question tracking remains. Smart Board stops when its real pool ends instead of creating generic questions, and blank input cannot count as numeric zero.

## Content work identified

Content coverage is not curriculum alignment. The generated GES bank uses a small set of repeated forms and does not establish a complete age progression. Grade 9 BECE practice includes implausible bus contexts involving over 1,000 passengers. A curated content revision is still required, with curriculum specifications, grade objectives, authentic contexts, diagrams, reasoning tasks and independently checked solutions. No bulk relabeling into Cambridge or Pearson was performed, and no existing authored question was overwritten by this fix.

## Verification

`node tests/question-bank-reliability.test.mjs` checks exact-record option identity and marking across redraw, stale-bank collisions, curriculum-specific coverage, missing content, network failure and varied unique sets. Its DOM dependency can be supplied with LESSON_TEST_DOM. `npm run build` validates the client build. Live signed-in trial results have not been reproduced with the original participants' question IDs; their exact disputed questions remain valuable for independent review.
