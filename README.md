# Mezzo Maths Battle Arena

A premium, responsive Vite web app for **Mezzo Maths Battle Arena**.

The app is designed for competitive mathematics learning: students practise maths, battle opponents, earn XP, collect coins, climb leaderboards, and prepare for the Mezzopedia National Mathematics Contest.

## Current Screens

1. Homepage
2. Smart Board 1 vs 1 Contest Studio
3. Online 1 vs 1 Battle page
4. Personal User Dashboard
5. Combined Login / Sign Up page
6. Solo Practice
7. Unified Admin page with Admin Settings and AI Question Generator
8. Weekly / Monthly / Yearly Leaderboards

## Latest Additions

- Added a full **Smart Board 1 vs 1 Contest Studio** for two students standing in front of a classroom smart board.
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
- New feature styling files: `src/upgrade.css`, `src/home-admin.css`, `src/smartboard.css`
- Supabase client: `src/supabaseClient.js`
- Supabase schema: `supabase/schema.sql`
- Supabase migrations: `supabase/migrations/002_admin_ai_question_tools.sql`, `supabase/migrations/003_smart_board_contests.sql`
- Optional AI function: `supabase/functions/generate-questions/index.ts`
- Environment example: `.env.example`
