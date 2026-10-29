# GES Grade 4 reviewed release

The first reviewed set contains 100 questions in 19 mathematical topics, 19 diagrams, 45 numeric-compatible questions and 20 teaching prompts. Supabase stores the mathematical topic, precise subskill, intended difficulty and source/version metadata separately.

Publish the app/assets first, verify the image URLs, then execute scripts/publish-grade4-reviewed.sql in a transaction. The SQL checks that the 100 original records remain unchanged and active, keeps the 37 unchanged question IDs with corrected metadata, creates 63 new version IDs, and deactivates only those 63 superseded originals. Original content and assignment references remain intact. Re-running an existing release is rejected instead of duplicating it.

The remaining 11,300 legacy Grade 4 workbook questions remain available and are labelled awaiting review. They are not certified by this release. No other class or curriculum is modified.

The reviewed topic list is prioritised in Solo Practice and Smart Board. Smart Board offers numeric-compatible topics; reviewed diagrams are displayed there as well. Reports and edits retain precise topic labels. The learner explanation includes optional teaching follow-up prompts.

Rollback: in one transaction execute scripts/rollback-grade4-reviewed.sql. This deactivates the 63 new versions, restores original metadata and active flags for all 100 baseline records, and preserves both versions and all assignment/answer references.

Validation: grade4-reviewed-bank.test.mjs checks category ordering, curriculum isolation, HTML escaping, metadata lineage, image references and numeric availability. The authoring audit independently recalculated 59 arithmetic items and checked all 100 original references.
