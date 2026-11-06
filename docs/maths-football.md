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

## 3D stadium upgrade

3D is now the default presentation. Three.js 0.180.0 is pinned and bundled in a lazy-loaded module; it is not fetched from a runtime CDN. Players are custom articulated 3D figures with jersey numbers, boots and run/kick/dive/celebration poses. No third-party character or audio assets are downloaded. The pitch includes a grass texture, markings, a framed net, stands, advertising boards, spectators and floodlight structures. WebGL2 adds lighting, soft shadows and instanced crowds.

Follow-player and stadium cameras are available. Reduced motion fixes the stadium camera and removes gait/bob effects. Low/Medium/High graphics cap pixel density at 1/1.25/1.75 and use no/1024/2048 shadow maps. Low hides the crowd. A software perspective renderer uses the same scene/models when WebGL2 is unavailable; it clips triangles at the near camera plane, omits the crowd and GPU shadows and runs at approximately 22 frames/second maximum. Its visible status is “3D Lite”. Explicit 2D remains the lightest option. Context loss or a render failure switches safely to a fresh 2D canvas and pauses an active attack; no match data is recreated. Scenes, buffers, materials, textures, shadow maps and context listeners are disposed on close or screen changes.

View/quality/camera preferences are device-wide presentation settings only. Changing them during a match pauses the clock, preserving questions, score, answers and progress. They contain no account information.

Driven shots and chips use shared vertical ball velocity, gravity, bounce and spin. A defender blocks below 1.45m; the keeper reaches up to 2m; the crossbar is 2.44m. A ball crossing above the bar is recorded as `over`. Correctness is independent of this outcome. Both presentation modes use the same simulation and save records.

Sound is off until opted in. Generated kick, whistle, crowd/goal and running effects have no network dependencies. Ambient crowd noise stops during questions, pause, tab blur and exit. Demo matches require no receipt UUID because they are never saved, which also permits training on HTTP development previews.

Additional validation: `football-3d-models.test.mjs` and `football-software-3d.test.mjs` cover rig transforms, all animation poses/reduced motion, finite ball geometry, camera geometry, airborne drive/chip outcomes, preference recovery, software near-plane clipping and renderer disposal. GPU shading is a separate path from software rasterisation and requires a WebGL2-capable browser for visual verification.

Browser QA: a complete 3D Lite training match scored three goals with 4/5 correct answers, exercised an intentional wrong answer and an over-bar chip, and kept the same match through camera/quality changes and 3D→2D→3D switching. The managed browser has WebGL disabled, so GPU-only shading, shadows and spectators were not visually verified there. Software perspective rendering was inspected before publishing; hardware rendering uses the same scene and actors.
