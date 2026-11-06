# Rally Kart Racing and Space Defender

## Entry points

- Maths Rally → **Play Kart Racing** opens the driving mode. Back to Rally restores Rally’s setup screen. Kart races are separate from Circuit Cup progression and teacher-assigned races.
- Games & live battles → **Space Defender**, or its navigation tab, opens the shooter.

Both games use real-time controls and five unique maths checkpoints per run. The question bank is scoped to the chosen class, curriculum and topic. All topics includes unassigned questions. A missing/insufficient bank produces an error rather than invented replacement questions. Guest demos use labelled sample arithmetic, play Level 1, and never save a receipt or level unlock.

## Kart Racing

A driver-view canvas renderer shows a curved road, the player’s kart, three computer rivals, barriers and green boost pads. Choose Cape Coast Run, Forest Circuit or Accra Night Run. Five levels increase opponent pace and bend strength: Rookie Grid, Coastal Cup, Forest Sprint, Night Circuit and Mezzo Grand Prix.

Auto-throttle accelerates the kart. Hold Left/Right or A/D (or touch arrows) to steer. Down/S or the brake button slows it. Space/Nitro spends 25 charge on a 2.5-second boost. Pads add charge. Barriers, contact with rivals and prolonged off-road driving damage the kart. Collisions have a cooldown and obstacles can only hit once.

There are five 240m sectors, for a 1,200m race. Every sector ends at a maths pit stop; all drivers and clocks freeze. Correct answers refuel, repair and add nitro; wrong answers provide reserve fuel. Finish in the top three and answer at least 3/5 correctly to unlock the next level. Hull loss or a 100-second active-play limit ends the race. Race position uses finish times once the player finishes.

## Space Defender

Free ship movement, firing, projectiles, enemies, shields and collisions run in bounded simulation steps. Four waves lead to a moving boss with spread attacks. Orbit Patrol, Asteroid Belt, Nebula Front, Deep Space and Mezzo Galaxy progressively increase enemy numbers, durability and projectile pressure.

Move with arrows/WASD or held touch buttons. Hold Space or Fire to shoot; Auto-fire is optional. Correct answers give 30 powered shots (double damage) and 30 shield. Wrong answers give 10 shots and 8 shield. When ammo runs out, a slower reserve laser remains available. Move to lead enemies and dodge incoming bolts. Damage first drains shield, then hull; brief invulnerability prevents stacked hits in the same instant.

A wave must clear within 50 seconds. Hull loss or expiry ends the mission. Clear all four waves and the boss, with at least 3/5 maths correct, to unlock the next sector. The final level remains replayable after completion.

## Shared behaviour and results

Questions, explanation checkpoints, manual pause, tab hiding and window blur stop movement, opponents, weapons and gameplay clocks. Held input clears on pause, blur, release or pointer cancellation. Input remains disabled on paused controls. Escape pauses. Keys 1–4 select answers. Reduced motion removes parallax, particles, speed streaks and kart bob without changing gameplay. Optional generated sounds start only after opting in. No external game art or audio is required.

Only complete/end-of-run class-question results save. Early failures include answered and unanswered questions in the review. Leaving or reloading an unfinished run restarts it.

The existing account result store now accepts a mode and cache prefix, keeping its Football defaults unchanged. Kart uses `rally_kart` / `mezzo_rally_kart_v1`, and Space uses `space_defender` / `mezzo_space_defender_v1`. The existing `game_score_records` table retains maths correct/total/percent, class and curriculum. Versioned metadata stores game statistics, answer snapshots and a monotonic highest-unlocked level. Mode and account filters keep each history/progression separate. Stable receipt IDs, queued offline inserts, duplicate receipt reconciliation and in-flight account guards are retained. Highest progress is queried separately from the latest ten results. No schema, grant, policy, official leaderboard or teacher-assignment changes were made.

## Validation

- Engine tests complete all five levels of both games with actual simulated steering and shooting, and cover unique question gates, checkpoint freezes, nitro limits, reserve fire, failure, boss completion and terminal immutability.
- Renderer tests cover both games at phone and desktop sizes, preview/play/feedback/boss states, reduced motion and finite canvas operations.
- Real controller tests cover keyboard hold/release, firing, touch capture/cancel, pause/blur and the Rally return callback.
- Store tests cover independent modes/caches/unlocks, Football compatibility, guest exclusion, account switches and offline retry.
- Existing Rally assignment/adaptive/progress/question service and Football save regressions pass.
- Browser QA completed a Space Defender demo: all waves and boss cleared, 15 enemies destroyed, 4/5 correct, including an intentionally incorrect answer; the initial failure path also correctly reviewed four unanswered questions. A full kart demo finished first in 35 active seconds with 5/5 correct across five pit stops. Held touch controls, nitro and pause were exercised. Back to Rally restored its setup without an orphan overlay. Neither demo unlocked saved levels or wrote account results.
