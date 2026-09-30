Lesson feature checks:

1. Install the DOM test helper outside the app: `npm install --prefix /tmp/lesson-check linkedom --no-save --package-lock=false`.
2. Run `LESSON_TEST_DOM=/tmp/lesson-check/node_modules/linkedom/esm/index.js node tests/lesson-flow.test.mjs`.
3. Run `LESSON_TEST_DOM=/tmp/lesson-check/node_modules/linkedom/esm/index.js node tests/course-studio-lesson.test.mjs`.
4. Run `node tests/homework-email.test.mjs`.
5. Run `npm run build`.

These are DOM and mocked handler tests. They verify draft retention, lesson navigation, angle calculations, classwork grading, authoring serialization, and homework email authorization. They do not replace signed-in browser checks, real pointer/touch testing, or real email delivery testing.

Additional checks: `node tests/course-assessment.test.mjs`, `node tests/lesson-ai-api.test.mjs`, and `LESSON_TEST_DOM=/tmp/lesson-check/node_modules/linkedom/esm/index.js node tests/lesson-tool-assistant.test.mjs`.
