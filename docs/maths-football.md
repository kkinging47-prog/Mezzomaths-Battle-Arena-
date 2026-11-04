# Maths Football — playable career

Open Games & live battles → Maths Football at play.mezzomaths.org. This version replaces the penalty-only screen with a top-down attacking football game. Answer correctly to take control of the striker, dribble around defenders, aim and shoot. Questions and explanations pause the pitch clock. An incorrect answer consumes that chance, but always shows the correction.

## Controls and simulation

Move with arrows/WASD or hold the four touch arrows (simultaneous pointers support diagonal movement). Aim with the goal-target slider or tap the goal. Space/Shoot fires at the selected target; 1/2/3 shoot left/centre/right. Keys 1–4 select maths answers during questions. Escape or Pause stops player movement, defenders, ball and the attack clock. Leaving the tab/window pauses automatically and clears held controls. Sound is optional and initially off. Reduced-motion preference removes player gait, ball trails and celebration confetti without changing physics or outcomes.

Players accelerate into movement; the ball follows the dribble, then travels with velocity and drag after a shot. Defenders chase and tackle or block the ball. A keeper reacts with finite lateral speed. Outcomes include goal, saved, blocked, tackled, wide and time up. Two consecutive correct maths answers earn a faster run and stronger shot for that attack. Maths correctness is recorded independently of football outcomes.

## Five levels

| Level | Defenders | Attack time | Five-chance goal target |
|---|---:|---:|---:|
| Training Ground | 0 | 30s | 1 |
| First Match | 1 | 28s | 2 |
| Club Challenge | 2 | 26s | 2 |
| Championship | 3 | 24s | 3 |
| Mezzo Cup | 3, faster | 22s | 2 in each of three rounds |

Levels 1–4 allow 5 or 10 unique questions/chances. Goal targets scale with count; 60% maths accuracy is also required. Completing both targets unlocks the next level. Level 5 is a 15-question tournament comprising three five-chance rounds, each requiring at least 2 goals and 3 correct answers. Goals or accuracy in another round cannot compensate for a failed round. Qualifying in all rounds earns the trophy. There is no random computer score; the scoreboard shows goals against the stated target.

Football level does not change class, curriculum or topic. Balanced and adaptive question selection reuse the existing active question bank and Rally adaptive selection. All topics includes unassigned questions. Insufficient banks produce a clear error rather than invented replacement questions. The five-question guest demo uses labelled sample arithmetic, always plays Training Ground, and never saves results or unlocks.

## Account progress

Completed class matches use existing `game_score_records` rows, mode `maths_football`, with maths correct/total/percent in the numeric fields. Metadata version 1 adds level, qualification targets/results, three Cup round summaries where applicable, highest unlocked level, and complete answer snapshots with the shot outcome. Old penalty-shootout records remain readable. These are practice achievements; no official assessment or leaderboard changes are made.

Existing per-account caching, pending inserts, stable UUID retries and ownership guards remain. Highest level is monotonic in the local cache and is carried into subsequent match receipts. Account sync additionally fetches the highest saved `metadata->unlockedLevel` separately from the latest ten matches, so old achievements survive a long recent history or stale-device replays. Switching accounts clears cached runtime state and in-flight responses cannot cross accounts. Existing table ownership policies apply; no schema, grants or policy changes.

Only completed class matches save. Early exit/reload restarts an unfinished match. Sound uses lightweight generated effects; graphics are canvas-drawn animated players and a stadium pitch, not a 3D simulator.

## Verification

Run Node tests for `football-career`, `football-field-renderer`, `football-results-store`, `maths-football-engine`, `game-question-bank`, plus Rally assignment/adaptive/progress/service regressions, then `npm run build` and `git diff --check`.

Career tests cover movement/bounds, unique match questions, finite physics, boost, tackles/blocks, keeper saves, goals/misses/timeout, full match transitions, Cup per-round qualification and a playable movement/shot route through every level. Renderer tests cover phone and desktop dimensions, all five levels, paused-question/action/result states and reduced motion. Store tests cover offline receipts, duplicate retries, cross-device recovery, progress outside recent history, monotonic carry-forward and account switches.
