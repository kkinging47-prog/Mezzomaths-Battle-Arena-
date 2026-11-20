# BECE video solutions

Public page: `/bece-solutions`. Also available from the homepage and Sunday Special.

## Publishing a solution

1. Upload the video to YouTube as Public or Unlisted and enable embedding.
2. Open Admin Workspace → BECE Video Solutions.
3. Choose past questions (exam year) or Sunday Special (set number).
4. Enter the question number, section, mathematical topic, title and YouTube link.
5. For a question within a longer recording, enter its start time in seconds.
6. Preview, then save a draft or tick Publish for students and save.

Learners can filter by year/set and topic, search, select questions, save videos and mark them watched on their device. Optional automatic next plays the next matching question. Device markers are not synced across accounts or devices. YouTube provides streaming; Mezzo stores only metadata. YouTube branding and player links remain present. No YouTube API key is needed.

Published records are readable by guests. Drafts and catalogue writes require the existing administrator role. No sample videos are seeded.

Validation: `node tests/bece-video-utils.test.mjs`, `npm run build`.
