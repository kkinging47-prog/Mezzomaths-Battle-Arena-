# Maths Football — penalty shootout

Open Maths Football from Games & live battles on the homepage, or the Maths Football navigation tab. Maths Rally retains its own entry.

## Gameplay

Class-question matches use five or ten unique multiple-choice questions from the selected class/curriculum/topic, including All topics. A correct answer earns a penalty shot. The player chooses left, centre or right while watching the moving keeper. Shooting into the keeper's current zone produces a save; another zone produces a goal. Wrong maths answers use the kick without a shot. A computer penalty follows each kick; its success rate and keeper movement depend on the chosen Training/Club/Challenge setting. The computer's outcomes are sampled once per match, independently of the student's answers.

Each kick ends with the answer and explanation; Next kick advances. The final screen separates the football result from maths accuracy and reviews every answer, including correct answers whose shots were saved. A match can finish as a win, loss or draw after its prescribed number of kicks. There is no sudden-death question extension.

Keyboard: 1–4 choose answers, 1–3 aim penalties, Escape pauses. Buttons support touch and keyboard focus. Switching tabs pauses; goalkeeper, ball and active match time stop together. Reduced-motion preference simplifies shot rendering. Leaving or refreshing an unfinished match restarts it; only completed class-question matches are saved.

## Questions and account results

Signed-in matches reuse the existing authenticated question-bank service and its class/curriculum/active filters. No replacement curriculum questions are invented when a pool is missing or too small. Balanced mix is available, alongside the same within-match adaptive selection used for quick Rally practice. Authored diagrams and option diagrams are supported.

Try training demo is a five-kick sample-arithmetic match that works without sign-in. It is clearly labelled and never creates an account result, including when a signed-in player tries it.

Completed class-question matches save as `maths_football` rows in the existing `game_score_records` table. Its numeric score is maths answers correct; goals, opponent goals, outcome and full answer snapshots are in versioned metadata. Existing owner-insert and account/staff read policies apply. No schema, grants or official leaderboard/XP changes were added. These are practice records, not invigilated assessment results.

The result store uses per-account cached history and pending inserts. Stable UUIDs let retries resolve uncertain writes without duplicate records. A duplicate is acknowledged only after an owner-filtered read confirms that receipt. Account switches isolate both cached and in-flight results; second-device reads load the same completed match history. The UI displays save/offline status and provides a retry action. Storage failures ask the learner to keep the page open rather than promising an offline copy.

## Validation

`node --test tests/maths-football-engine.test.mjs tests/maths-football-renderer.test.mjs tests/football-results-store.test.mjs tests/game-question-bank.test.mjs`

Coverage includes five/ten-kick rules, repeated-answer/shot locks, goals and saves, wrong-answer misses, independent maths accuracy, computer kicks, finished-state immutability, invalid questions, desktop/mobile rendering and reduced motion. Save tests cover offline reload/retry, uncertain-write receipts, second-device restore and in-flight account switches. Bank tests check authentication, filters, All topics, duplicate prompts and errors. Existing Rally controller/progress/service tests and production build also pass.
