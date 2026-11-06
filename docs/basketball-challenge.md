# Basketball Challenge

Home → Games & live battles → Basketball Challenge (also in More activities).
Five possessions, one unique class/curriculum question before each. All topics includes unassigned questions. Training demo uses sample arithmetic, saves no receipt and unlocks no levels.

Move with arrows/WASD or held direction buttons. Hold Space/Shoot and release in green; Start / release meter provides a two-tap alternative. The aim slider moves the target across the rim. Correct maths widens the green timing window; wrong answers still earn a possession. Dribbling is automatic; charging plants the player. The ball follows a gravity trajectory. Shots inside/outside the 6.75m arc score two/three points. Defenders chase, contest, block and steal; the shot clock ends an unused possession. A shot released before the buzzer can finish in flight.

Courts: Warm-up (0 defenders, 22s, 4 points), Street (1, 20s, 5), Club (2, 18s, 6), Championship (2, 16s, 7), Mezzo Hoops Cup (3, 15s, 8). Meet the points target and answer at least 3/5 maths correctly to unlock the next court. Misses do not end the full run. Feedback and maths pause all action. Escape, tab hiding and focus loss pause; cancellation clears a charged shot without consuming it.

Perspective Canvas court, articulated athletes, dribbling, ball shadows, rim/net, backboard and spectators. Reduced motion removes athlete gait. No external art assets or new dependencies. This is a solo half-court challenge, not multiplayer or a full team simulation.

Account results reuse the existing owner-scoped game_score_records path under mode basketball_challenge with a separate device cache. Metadata includes points, target, made/attempted shots, turnovers, maths answers, shot feedback and unlock. No schema/RLS changes. Guest demo and cross-account writes are excluded. Account persistence is covered by store mocks; live authenticated class saving requires a signed-in session.

Validation: basketball engine tests win all five courts using movement and timed releases; verify early misses, two/three points, steals, shot-clock expiry, Focus, cancellation and question freeze. Shared controller tests verify keyboard release and touch cancellation. Canvas tests verify finite operations at desktop/phone CSS sizes. Store tests verify separate mode/unlocks and account isolation. Existing Rally/Football/question-bank regressions and production build pass.
