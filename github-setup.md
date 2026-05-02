# GitHub Setup Guide — Home Agents Project
**Purpose:** Get your home-agents workspace into a GitHub repo so the webapp can read/write your data files via the GitHub API.

---

## Step 1: Create the GitHub Repository

1. Go to https://github.com/new
2. Fill in:
   - **Repository name:** `home-agents` (or whatever you like)
   - **Description:** Home agents workspace — meal planning, home maintenance, family tools
   - **Visibility:** ✅ **Private** (your family data, keep it private)
   - **Initialize with README:** Leave unchecked (you already have files)
3. Click **Create repository**
4. GitHub will show you a page with setup commands. Keep this tab open.

---

## Step 2: Reorganize Your Local Project

Before pushing to GitHub, reorganize your files into this structure. Do this in Windows Explorer or VS Code's file explorer — just move files into the right folders.

```
home-agents/                          ← your project root
├── .github/
│   └── copilot-instructions.md       ← MOVE here from root (VS Code looks here automatically)
├── agents/
│   ├── homechef.agent.md             ← MOVE here
│   ├── homeguard.agent.md            ← MOVE here
│   └── homebase.agent.md             ← MOVE here
├── data/                             ← CREATE this folder
│   ├── family-prefs.md               ← MOVE here
│   ├── pantry-inventory.md           ← MOVE here
│   ├── maintenance-schedule.md       ← MOVE here
│   ├── meal-plan.md                  ← MOVE here
│   └── cook-log.md                   ← MOVE here (or create fresh)
├── recipes/                          ← already exists, leave as-is
│   └── (your .txt recipe files)
└── webapp/                           ← CREATE this folder (empty for now)
```

### Update agent file references
After moving files, do a search-and-replace across your agent .md files:
- Change any reference to `family-prefs.md` → `data/family-prefs.md`
- Change `pantry-inventory.md` → `data/pantry-inventory.md`
- Change `maintenance-schedule.md` → `data/maintenance-schedule.md`
- Change `meal-plan.md` → `data/meal-plan.md`
- Change `cook-log.md` → `data/cook-log.md`

---

## Step 3: Initialize Git and Push

Open a terminal in VS Code (`Ctrl+`` ` ``) in your project root and run these commands one at a time:

```bash
git init
git add .
git commit -m "Initial commit — home agents workspace"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/home-agents.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

After this, refresh your GitHub repo page — you should see all your files there.

---

## Step 4: Create a Personal Access Token (PAT)

This is how the webapp authenticates with GitHub to read/write your files. You generate it once, store it in your browser, and never think about it again.

1. Go to https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Fill in:
   - **Note:** `home-agents-webapp`
   - **Expiration:** 1 year (or "No expiration" if you don't want to redo this)
   - **Scopes:** Check only ✅ **`repo`** (this gives read/write access to your private repos)
4. Click **Generate token**
5. **Copy the token immediately** — GitHub only shows it once. It looks like `ghp_xxxxxxxxxxxxxxxxxxxx`
6. Paste it somewhere safe temporarily (a text file on your desktop) — you'll enter it into the webapp on first launch, and after that it's stored in your browser.

> ⚠️ Treat this token like a password. Anyone with it can read/write your repos. Since this is a private personal project and the token only lives in your browser's localStorage, you're fine.

---

## Step 5: Enable GitHub Pages (for hosting the webapp later)

You'll do this after the webapp is built, but note it for later:
1. Go to your repo on GitHub → **Settings** → **Pages**
2. Source: **GitHub Actions** (we'll set up a deploy workflow)
3. The webapp will be live at `https://YOUR_USERNAME.github.io/home-agents/`

This is also what you'll open on your phone — just bookmark that URL.

---

## Step 6: Connect VS Code to the Repo

If VS Code doesn't automatically detect the git repo:
1. Open VS Code in your project folder
2. Click the **Source Control** icon in the left sidebar (the branching icon)
3. It should show your repo. If prompted to sign in to GitHub, do so with the same account.

From now on, whenever the webapp writes a file (e.g., updating pantry-inventory.md), you'll see it show up as a pending change in VS Code's Source Control panel. Your agents will see the updated files automatically since they read from disk.

---

## You're Set Up. What's Next?

Hand `WEBAPP_BUILD_PLAN.md` to Copilot in your VS Code chat and say:
> "Follow the build plan in WEBAPP_BUILD_PLAN.md and start with Phase 1."

Copilot will scaffold the React webapp inside the `webapp/` folder.