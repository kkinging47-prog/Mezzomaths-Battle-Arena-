# Mezzo Maths Battle Arena

A premium, responsive Vite web app for **Mezzo Maths Battle Arena**.

The app is designed for competitive mathematics learning: students practise maths, battle opponents, earn XP, collect coins, climb leaderboards, and prepare for the Mezzopedia National Mathematics Contest.

## Current Screens

1. Dashboard Home
2. Student/Admin Sign Up
3. Student/Admin Login
4. Solo Practice
5. Game Zone
6. Admin Question Bank
7. Leaderboard
8. Settings

## Latest Additions

- Landing screen changed to **Dashboard**.
- Supabase-ready sign up and login flow for students and admins.
- Sign up form captures full name, email, password, date of birth, auto age, school name, location, class/year, curriculum type and account type.
- Supabase database schema added at `supabase/schema.sql`.
- Tables include profiles, question bank, practice sessions, session answers, leaderboard entries, daily challenges and student progress.
- Admin page for saving questions by class level, curriculum, topic, difficulty and answer options.
- Question generation size selector: **10, 20, 30, 40, 50**.
- Solo Practice page started with class, curriculum, topic, timer and level selection.
- Solo Practice now supports a **100-level system**.
- Every level uses a 15-question set.
- Pass mark is **13/15**.
- Difficulty increases every 5 levels.
- Power levels appear every 10 levels with higher point multipliers.
- Questions are selected randomly from Supabase `question_bank` when Supabase keys are configured; otherwise, demo questions are used.

## Supabase Setup

1. Create a Supabase project.
2. Go to **SQL Editor**.
3. Paste and run the contents of:

```bash
supabase/schema.sql
```

4. In Vercel, add these Environment Variables:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

5. Redeploy the latest commit.

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
- New feature styling file: `src/upgrade.css`
- Supabase client: `src/supabaseClient.js`
- Supabase schema: `supabase/schema.sql`
- Environment example: `.env.example`
