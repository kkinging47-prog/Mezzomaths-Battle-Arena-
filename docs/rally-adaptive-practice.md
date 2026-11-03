# Adaptive Rally practice

In personal Rally, select a five- or ten-question quick race and choose Question selection → Adaptive practice. It is the default for a fresh quick-race setup; Balanced mix remains available. Circuit Cup and teacher races retain their existing question rules.

Each race starts near the middle of the difficulty levels actually present in its selected class/curriculum/topic pool. Two consecutive correct answers move the target up one available level; an incorrect answer moves it down one level and resets the streak. Answer speed does not affect question difficulty. Within the nearest available level, the next question prioritises the missed topic where another question exists. A pair of correct answers clears that topic focus.

Difficulty numbers are ordered within the selected pool rather than treated as a universal scale: current GES pools commonly use 1/2/3, while Cambridge uses 4/10/16. The question panel displays the current challenge rank. Single-level or unlabelled pools continue as varied practice, and exhausted levels fall back to the nearest available level with a visible label. These are authored difficulty labels, not a measured mastery rating.

Adaptive selection uses existing bank questions only, keeps the race length fixed, and does not repeat a question prompt within a race. It replaces or swaps only the next unanswered snapshot; completed answers and their corrections remain intact. History records the adaptive mode. Quick races continue to award no Cup stars or stage unlocks. This is adaptation within each race, not a persistent learner ability profile.

No database schema, permissions or external AI service is required. Existing account-history JSON carries the mode label.

Validation: helper tests cover both authored scales, promotion/support thresholds, duplicate-answer guards, missed-topic priority, exhaustion, unlabelled pools, unique prompts and fixed counts. Real game-controller tests cover next-question changes, preserved answer evidence, saved history labels and isolation from Cup rewards. Existing quick-race, teacher-race API, progress and stage-gating tests pass. Production build passes.
