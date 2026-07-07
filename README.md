# Mezzo Maths Battle Arena

A premium, responsive Vite web app for **Mezzo Maths Battle Arena**.

The app is designed for competitive mathematics learning: students practise maths, battle opponents, earn XP, collect coins, climb leaderboards, and prepare for the Mezzopedia National Mathematics Contest.

## Current Screens

1. Homepage
2. Personal User Dashboard
3. Combined Login / Sign Up page
4. Solo Practice
5. Dedicated 1 vs 1 Battle page
6. Unified Admin page with Admin Settings and AI Question Generator
7. Leaderboard

## Latest Additions

- The app now opens directly on the **1 vs 1 Battle** page for the current update cycle.
- Added a dedicated 1 vs 1 setup page where users select class, curriculum, topic area, skill level and opponent.
- 1 vs 1 topic areas now include **Addition, Subtraction, Multiplication and Division**.
- 1 vs 1 skill levels now include **1 digit × 1 digit**, **2 digit × 1 digit**, and **2 digit × 2 digit**.
- Added topics from the uploaded Mezzo Maths topic file into the class topic map, including Grade 1 to Grade 8/JHS topic progressions.
- Merged Admin Settings and Admin Question Bank into one **Admin** page.
- The Admin page is restricted to accounts with role `admin`.
- Admin can generate AI questions by question count, class, curriculum, Mezzo book topic, topic area, skill level and difficulty.
- Admin can save, edit and delete questions.
- Admin forms support maths symbols, question images and option images.
- Supabase migration updated to store `topic_area`, `topic_sublevel`, image URLs and AI-generation metadata.
- Optional AI Edge Function updated so generated questions conform to selected class topic and 1 vs 1 skill level.

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

5. In Vercel, add these Environment Variables:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

6. Redeploy the latest commit.

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
- New feature styling files: `src/upgrade.css`, `src/home-admin.css`
- Supabase client: `src/supabaseClient.js`
- Supabase schema: `supabase/schema.sql`
- Supabase migration: `supabase/migrations/002_admin_ai_question_tools.sql`
- Optional AI function: `supabase/functions/generate-questions/index.ts`
- Environment example: `.env.example`
