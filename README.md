# Mezzo Maths Battle Arena

A premium, responsive Vite web app for **Mezzo Maths Battle Arena**.

The app is designed for competitive mathematics learning: students practise maths, battle opponents, earn XP, collect coins, climb leaderboards, and prepare for the Mezzopedia National Mathematics Contest.

## Current Screens

1. Homepage
2. Personal User Dashboard
3. Combined Login / Sign Up page
4. Solo Practice
5. Battle Modes
6. Admin Settings / AI Question Generator
7. Leaderboard
8. Settings

## Latest Additions

- Added a separate **Homepage** with Daily Practice, 1 vs 1, Compete with Bot, Compete Online and Solo Practice.
- Changed Dashboard into a **personal user page** with AI-style summary, progress report, points, topics, streak, ranking, attempted topics and level progress.
- Removed the question-bank card from the user Dashboard.
- Combined Sign Up and Login into one **Login / Sign Up** page where users choose the mode.
- Added Mezzo Maths social media footer links for WhatsApp, Facebook, TikTok, YouTube, X, Instagram and Telegram.
- Added general basic practice topics for all levels: Addition, Subtraction, Multiplication, Division, Squaring and Squares.
- Expanded Admin Settings with AI question generation controls: number of questions, topic, class level, curriculum and difficulty.
- Admin can save, edit and delete questions from the question bank.
- Admin question form supports maths symbols and image URLs for question images and option images.
- Questions are selected randomly from Supabase `question_bank` when Supabase keys are configured; otherwise, demo/local questions are used.

## Supabase Setup

1. Create a Supabase project.
2. Go to **SQL Editor**.
3. Paste and run the contents of:

```bash
supabase/schema.sql
```

4. Also run the migration for image options and AI-generation tracking:

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
