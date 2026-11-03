# Rally curriculum coverage — 3 November 2026

Cambridge primary now has active records in Grades 1–6. This is availability coverage, not a claim that every syllabus objective has been covered.

| Class | Active questions | Active topics | Inactive awaiting diagrams |
| --- | ---: | ---: | ---: |
| Grade 1 | 100 | 10 | 0 |
| Grade 2 | 100 | 10 | 0 |
| Grade 3 | 86 | 10 | 14 |
| Grade 4 | 75 | 10 | 25 |
| Grade 5 | 100 | 10 | 0 |
| Grade 6 | 100 | 10 | 0 |

Grades 3 and 4 are based on the existing authored upload workbooks listed in `data/cambridge-primary-coverage-2026-11-03.json`. All questions in their image manifests are withheld, even where some can be solved from the text alone. They remain in the bank as inactive records for later diagram attachment. The source workbooks are unchanged.

100 Stage 3 rows had been uploaded under Grade 2. 63 Stage 4 rows had been uploaded under GES and subsequently made inactive. The publish script corrects exact matching source records in place, retaining IDs, and inserts the remaining 37 Stage 4 records. It does not alter the separately reviewed GES questions that share some prompts. The active rows have been checked for four nonempty distinct options, valid keys, source IDs, class/curriculum and explanations. This does not replace an independent pedagogical review of every item.

Run `node scripts/publish-cambridge-primary.mjs` for validation. Add `--sql` to emit the transactional, repeatable publication SQL. Database uniqueness is now scoped to class, curriculum, topic and normalized prompt. The uploader preserves class/curriculum and explicit inactive flags from the file, using selections only to fill missing values.

Admin → Question bank → Curriculum question coverage shows active counts and missing classes for the selected curriculum. Topic counts below 55 highlight pools smaller than the longest Rally stage. These are published row counts; Rally still checks usable, unique questions before starting. All topics can combine smaller pools. No synthetic replacement questions are generated for empty curricula.

## Remaining content work

- Attach and verify the 39 missing Grade 3–4 diagrams before enabling those questions.
- Independently check the diagram availability and content quality of earlier Grade 1, 2, 5 and 6 uploads.
- Expand topic pools beyond the initial ten questions per topic.
- Pearson Edexcel has no active records. Cambridge Grades 7–9 and SHS also have no active records. SHS has no active GES records. These require authored, reviewed material rather than relabeling the GES bank.
- Counts in the large GES generated banks do not establish complete curriculum alignment; see the earlier question-bank audit.

## Validation

Metadata/coverage tests, question-service tests and account-progress tests pass. Production build passes. Live database totals confirm the corrected classifications and inactive holds. The index change does not change grants, RLS or functions.

The security advisor also reports existing notices unrelated to this index: Sunday BECE RLS/definer functions and disabled leaked-password protection. Reference: https://supabase.com/docs/guides/database/database-linter and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . These require separate review; no unrelated access controls were changed here.
