# Mezzo Market Town

Entry: homepage Games & live battles → Mezzo Market Town, or `/#market-town`.

Five areas: Morning Market (5 orders), Fruit Mixer (6), Toy Street (7), Museum Corner (8), Market Festival (10). Three difficulty settings use whole-cedi, 50-pesewa or 25-pesewa unit prices. Orders are generated afresh each shift.

Each customer has three enforced steps: pack exact quantities using shelf items and bag removal controls; enter the bill; assemble exact change using labelled practice cash. Ratio orders require equal groups; toy clues require dividing a bundle price; museum orders require fractions of box quantities. Any exact cash combination is accepted. All arithmetic uses integer pesewas.

Incorrect answers retain the current bag, typed total or change selection. Students can correct and retry. The coach gives worked guidance. There is no countdown. Escape, window blur and tab hiding pause the controls. A completed shift requires every customer to pass every step. Three stars require no mistakes/hints; two stars permit at most one correction per customer on average; every completed shift earns at least one star and opens the next area. Next-area play preserves difficulty.

Unlocks and best stars are device-local, separately by difficulty. No sign-in, database change, real payment or shared-platform coin reward is involved. Storage failure is shown on the results page. Original SVG artwork and newly generated problems are used; the source textbook photographs are not published.

Verification: `node tests/market-town-engine.test.mjs`, production build, browser complete first shift including corrected packing, all payment steps, review, stars and next-area unlock. River Rally engine tests also pass.
