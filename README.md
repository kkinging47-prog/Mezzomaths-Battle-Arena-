# Mezzo Maths Battle Arena

A premium, responsive Vite web app for **Mezzo Maths Battle Arena**.

The app is designed for competitive mathematics learning: students practise maths, battle opponents, earn XP, collect coins, climb leaderboards, and prepare for the Mezzopedia National Mathematics Contest.

## Current Screens

1. Premium game-style Homepage
2. Smart Board 1 vs 1 Contest Studio
3. Online 1 vs 1 Battle page
4. Personal User Dashboard with Avatar Studio, Reward System, Topic Progress Map and Teacher Overview
5. Mezzopedia Contest Prep Mode
6. Combined Login / Sign Up page
7. Solo Practice
8. Unified Admin page with Admin Settings, AI Question Generator and Teacher Dashboard
9. Expanded Weekly / Monthly / Yearly / Class / School / Regional / National Leaderboards

## Latest Additions

- Added a full **Smart Board 1 vs 1 Contest Studio** for two students standing in front of a classroom smart board.
- Added a premium **Welcome to Mezzo Maths Battle Arena** landing page with a hero section, animated arena stage, trophies, coins, streak cards, XP rewards and large game-mode cards.
- Added **Student Avatar Studio** on the dashboard so students can choose and save their maths identity.
- Added starter avatars and unlock-style avatars tied to XP, coins, wins, streaks and levels.
- Added **XP, coins, badges and levels** as a reward system.
- Added stronger **winner celebration effects** for Smart Board winners: confetti, fireworks, trophy glow, champion overlay and crowd-clapping sound.
- Added **Champion of the Day** celebration overlay using the selected student avatar.
- Added a downloadable **Winner Card** image for Smart Board winners.
- Added an **AI Coach Feedback** panel after practice, battle and Smart Board results.
- AI Coach feedback shows score percentage, strength, area to improve and recommended next practice.
- Added expanded leaderboard sections for **Class, School, Regional, National and Smart Board** leaders.
- Added a **Teacher Dashboard** showing active students, total attempts, strong topics, weak topics, students needing help, best performer and recent attempts.
- Added CSV export for the Teacher Dashboard report.
- Added a colourful **Topic Progress Map** that marks topics as Locked, Started, Improving or Mastered based on practice results.
- Added app-wide **sound effects** for taps, game starts, next questions, correct answers, wrong answers, countdown beeps and level-style celebrations.
- Added a visible **Sound On/Off** toggle saved in local storage.
- Added a full **Mezzopedia Contest Prep Mode**.
- Mezzopedia Prep includes Stage 1 Online Practice, Stage 2 Online Practice, Stage 3 Online Practice, TV Round Practice and Grand Finale Challenge.
- Each Mezzopedia Prep stage has timed mock tests, mixed topics, direct questions, word problems, score tracking and AI-style prep feedback.
- Mezzopedia Prep history is saved locally for review and future reporting.
- Practice results are saved locally as learning history so the Teacher Dashboard and Topic Progress Map can update immediately.
- Correct answers, attempts, completed practice sets, daily challenge starts, battle wins and Smart Board wins now award XP and coins.
- Added a sticky mini reward dock showing current level, XP, coins and wins.
- Added a dashboard reward panel with XP, coins, wins, streak, correct answers, level progress and badge cabinet.
- Added badge unlocks such as First Steps, Sharp Mind, Speed Master, Coin Collector, Daily Fire, Battle Winner, Smart Board Champion, Level 10 Scholar and Practice Machine.
- Homepage streak, coin, trophy and level cards now sync with the reward system.
- The selected avatar is saved locally and automatically appears on the dashboard profile card and homepage arena token.
- The homepage now highlights Daily Challenge, Smart Board 1v1, Online Battle, Compete With Bot, Solo Practice, Leaderboards and Mezzopedia Prep as clear game modes.
- Homepage game cards now include glowing borders, mode icons, reward pills and direct Start buttons.
- Before the contest starts, Student A and Student B enter name, school and class.
- Contest setup includes duration options from **30 seconds to 360 seconds** in 30-second steps.
- Contest setup includes class level, curriculum and a topic selector using the uploaded Mezzo Maths topic list.
- A **5-second countdown** starts before the contest begins.
- The question appears at the top/centre of the screen for both participants to see at the same time.
- Each student has a number keypad on the same page.
- The first student to submit the correct numeric answer receives the points for that round.
- Questions now continue showing until the selected contest time elapses; if the bank runs out during a contest, the app generates/loads more questions instead of ending early.
- Winner screen shows trophy, points, congratulations animation and a clapping-sound button.
- The runner-up appears below with an AI-style motivational message.
- Winners are added to local **weekly, monthly and yearly leaderboards**.
- The Admin page now shows a generated-question summary: total questions, total AI-generated questions, latest batch and recent generation batches.
- The Admin question bank now shows **20 questions per page** with Previous/Next pagination.
- Generated questions are now inserted into Supabase `question_bank` when Supabase is configured.
- The Admin page has a **Load Questions From Database** button and loads Supabase questions whenever the Admin page is opened.
- The Smart Board contest loads matching numeric-answer questions from Supabase on every contest request before falling back to local/demo generated questions.
- Manual Admin saves/edits now save to Supabase when the question has database access.
- The class levels now run as **Grade 1 to Grade 9, SHS 1 to SHS 3**.
- Mezzo PDF topics have been expanded across Grade 1 to Grade 8. Grade 7 and Grade 8 topics from the PDF are shown as Grade 7 and Grade 8 in the app.
- Topic area is now automatically matched from the selected topic. Admins no longer choose a conflicting topic area manually.
- AI generation, manual question saving, Smart Board contest loading and database saving all use the auto-matched topic area.
- Generated sets now mix direct calculation questions with word problems as the set progresses.
- Daily Practice, Solo Practice, Online 1 vs 1 and Compete With Bot now all load question sets from Supabase `question_bank` when connected.
- Practice modes reshuffle questions on every request and keep a short local recent-question memory to reduce repeats.
- If the database has no matching questions for a selected topic, the app falls back to generated mixed direct/word questions so the mode still works.
- Added Supabase migration for smart board contests, numeric answers and smart board leaderboard records.
- The Admin page remains merged into one sizeable page for admin-only editing, AI generation, question editing and deletion.

## Supabase Setup

1. Create a Supabase project.
2. Go to **SQL Editor**.
3. Paste and run the contents of:

```bash
supabase/schema.sql
```

4. Also run the migration for 1 vs 1 topic areas, image options and AI-generation tracking:

```bash
supabase/migrations/002_admin_ai_question_tools.sql
```

5. Also run the smart board contest migration:

```bash
supabase/migrations/003_smart_board_contests.sql
```

6. In Vercel, add these Environment Variables:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

7. Redeploy the latest commit.

## Important Production Note

Supabase Row Level Security must allow the logged-in admin to insert into `question_bank`. The included schema expects admin users to have `profiles.role = 'admin'`. For public launch, do not rely on the current demo admin selector alone.

## Optional AI Edge Function

A Supabase Edge Function scaffold is included at:

```bash
supabase/functions/generate-questions/index.ts
```

Deploy it with Supabase CLI and set `AI_API_KEY` as a Supabase secret. If the function is not deployed, the app falls back to a local demo generator so the interface still works.

## Tech Stack

- Vite
- Supabase client
- Tailwind CSS setup
- Custom responsive CSS components

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL shown in your terminal.

## Build for Production

```bash
npm run build
```

The production files will be created in the `dist` folder.

## Deploy on Vercel

Use these settings:

```bash
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

## Important Files

- Main app file: `src/main.jsx`
- Main styling file: `src/index.css`
- New feature styling files: `src/upgrade.css`, `src/home-admin.css`, `src/smartboard.css`, `src/avatar.css`, `src/gamification.css`, `src/celebration-ai.css`, `src/school-progress.css`, `src/sound-prep.css`
- Avatar enhancer: `src/avatar-enhancer.js`
- Gamification enhancer: `src/gamification-enhancer.js`
- Celebration and AI Coach enhancer: `src/celebration-ai-coach.js`
- School leaderboard, teacher dashboard and topic progress enhancer: `src/school-progress-enhancer.js`
- Sound effects and Mezzopedia Prep enhancer: `src/sound-prep-enhancer.js`
- Supabase client: `src/supabaseClient.js`
- Supabase schema: `supabase/schema.sql`
- Supabase migrations: `supabase/migrations/002_admin_ai_question_tools.sql`, `supabase/migrations/003_smart_board_contests.sql`
- Optional AI function: `supabase/functions/generate-questions/index.ts`
- Environment example: `.env.example`
