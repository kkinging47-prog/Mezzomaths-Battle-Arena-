# Mezzo Maths Battle Arena

A premium, responsive React + Vite educational game web app for **Mezzo Maths Battle Arena**.

The app is designed for competitive mathematics learning: students practise maths, battle opponents, earn XP, collect coins, climb leaderboards, and prepare for the Mezzopedia National Mathematics Contest.

## Included Screens

1. Landing Page
2. Student Game Lobby Dashboard
3. Game Zone Session Builder
4. Solo Practice / Quiz Screen
5. 1v1 Battle Arena Screen
6. Leaderboard Screen
7. Teacher / Smart Board Contest Studio
8. Design System section

## Latest Additions

- Class levels from **Grade 1 to Grade 6, JHS 1 to JHS 3, and SHS 1 to SHS 3**.
- Curriculum selector for **GES, Cambridge, and Pearson Edexcel**.
- Specific topic-area selector per class level.
- Game Zone Session Builder for choosing class, curriculum, topics, and trophy progression path.
- Each question set is shown as **15 questions**.
- Pass rule is shown as **above 12**, implemented visually as **13/15 or higher** to progress.
- Trophy map progression per class level with 5 stages leading to the Ultimate Trophy.
- Quiz and Battle screens now display selected level, curriculum, topics, and 15-question progression rules.

## Tech Stack

- React
- Vite
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

## Upload to GitHub

```bash
git init
git add .
git commit -m "Build Mezzo Maths Battle Arena UI"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git push -u origin main
```

## Deploy on Vercel

1. Go to Vercel.
2. Click **Add New Project**.
3. Import the GitHub repository.
4. Vercel should detect Vite automatically.
5. Use these settings if needed:
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Click **Deploy**.

## Notes for Codex / Developers

- Main app file: `src/App.jsx`
- Main styling file: `src/index.css`
- Academic configuration data is currently stored near the top of `src/App.jsx`:
  - `classLevels`
  - `curricula`
  - `topicsByLevel`
  - `stageNodes`
  - `gameZoneRules`
- Components are reusable: cards, buttons, badges, avatars, XP bars, leaderboard table, player bars, topic chips, Game Zone setup, stage map, and mobile nav.
- Screen switching is currently handled with React state in `App.jsx`; a router can be added later when backend routes are needed.
