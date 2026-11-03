# Teacher Rally races

In Assignments, choose Create activity → Play format → Maths Rally race. Choose the course and computer-driver pace, then select class, curriculum, topic (or All topics), questions, dates and time limits. Uploaded one-mark MCQs can also be used. Publish and share the existing assignment link or code.

Students use Join Assignment, enter their name/class, and select Start class race. They race three computer drivers using the teacher's saved question snapshots. Course selection is independent of personal unlocks. Class races do not award personal cup stars or unlock courses. They are practice activities with immediate answer feedback, not secure exams or synchronous multiplayer races.

The chosen question count controls the race length on any course. Each question must be automatically marked, four-choice and worth one mark. Written questions and mixed marks remain worksheet activities. Question diagrams from the bank are included. The overall assignment deadline and individual question timers keep running while cars are paused or the tab is hidden. Expired questions count as unanswered. Ending a race submits the answers so far. Session storage retains the submission receipt, answers, completed/expired positions and accumulated question time for refresh recovery on that browser. A resumed race reconstructs its driving state; this is not a frame-exact replay.

At the end, the existing assignment service marks the submitted choices against its database snapshots and records every response, including unanswered questions. The client does not submit awarded marks or race position as an official result. Network failures show a retry button and retain the same receipt to avoid duplicate submissions. Closing dates and maximum attempts use the existing assignment rules.

Open the activity in Assignments and use Refresh results. Existing View answers shows each student's correct, wrong and unanswered responses, answer text, marks and explanations. Download scores CSV exports totals; Download answers CSV exports one row per student/question, with spreadsheet formula escaping. Existing ownership/RLS protects detailed results. Opt-in class leaderboards retain the existing score/time ranking, rather than comparing computer-race positions.

Race settings are versioned in the existing question `source_metadata.rally` object and published atomically with the assignment snapshots. Duplicate preserves settings, and the existing editor preserves metadata when changing wording or timers. No tables, RLS policies or grants were added. Normal assignment requests still withhold answer keys; only an explicitly marked, currently open Rally assignment can load gameplay feedback keys using `play=rally`.

## Checks

`node --test tests/rally-assignment.test.mjs tests/rally-assignment-api.test.mjs tests/assignment-api-mixed.test.mjs tests/assignment-timing.test.mjs tests/assignment-answer-review.test.mjs tests/rally-progress.test.mjs tests/maths-rally-engine.test.mjs tests/rally-stage-completion.test.mjs`

These cover valid/inconsistent race settings, written-question rejection, timer persistence, missed/expired responses, custom race duration, export escaping, API key separation, assignment availability, server-computed marks, receipt retries and personal progress behavior. Run `npm run build` for the complete client build.
