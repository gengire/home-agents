# Home Agents — Desktop User Guide

**For Windows, Mac, and Linux users accessing the app in a web browser**

This guide covers everything you need to use the Home Agents webapp from a computer. It also covers running the app locally for development and how to use it alongside VS Code.

---

## What Is Home Agents?

Home Agents is a web-based household management dashboard. On the desktop it gives you a full-width view of your household data — pantry, cook log, meal plan, preferences, and home maintenance — all backed by your private GitHub repository.

The desktop experience is especially useful for:
- Making bulk pantry edits (faster on a keyboard than on a phone)
- Reviewing the full week's meal plan on a bigger screen
- Updating preferences or maintenance records in detail
- Running the app locally while developing or customizing it

---

## Part 1 — Accessing the App

### Option A: Use the Live Hosted Version (Recommended for Normal Use)

Open any modern browser and go to:

**https://gengire.github.io/home-agents/**

Works in:
- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Edge
- ✅ Safari

> **First-time users:** You'll see a sign-in screen asking for your GitHub Personal Access Token. See the [GitHub Integration Guide](github-integration.md) for how to get one.

---

### Option B: Run Locally (For Development / Offline Testing)

If you have Node.js installed, you can run the app on your own machine.

#### Prerequisites
- [Node.js](https://nodejs.org/) version 18 or higher (check with `node --version` in a terminal)
- Git installed ([git-scm.com](https://git-scm.com))
- The project cloned to your machine

#### Quick Start with start.bat

In the root of the project folder, double-click **`start.bat`**.

This will:
1. Navigate to the `webapp/` directory
2. Install dependencies if needed
3. Start the development server
4. Print the local URL (usually `http://localhost:5173/home-agents/`)

Open that URL in your browser and the app will load.

> **Note:** Even in local development, the app still reads/writes from your real GitHub repository. There is no local data storage — your token and GitHub repo are still required.

#### Manual Start (if start.bat doesn't work)

Open a terminal in the project root and run:

```bash
cd webapp
npm install
npm run dev
```

Then open `http://localhost:5173/home-agents/` in your browser.

---

## Part 2 — First-Time Sign-In

When you open the app for the first time (or after clearing browser data), you'll see the **Connect to GitHub** screen:

1. **GitHub Token** — paste your Personal Access Token
2. **Repository** — pre-filled as `gengire/home-agents`, change if your repo has a different path (format: `username/repo-name`)
3. Click **Connect**

The app will:
- Verify the token can connect to the repo
- Save both values to your browser's local storage
- Redirect you to the Dashboard

> Your token is stored in **localStorage** — it lives in your browser on your current machine only. It is never sent to any server other than GitHub's API.

---

## Part 3 — Desktop Layout

The app is mobile-first but fully functional on desktop. Key differences from mobile:

| Element | Mobile | Desktop |
|---------|--------|---------|
| Navigation | Bottom tab bar | Bottom tab bar (same) |
| Pantry delete | Long-press to delete | Trash icon visible on each item |
| Screen width | Full width | Centered max-width container |
| Keyboard shortcuts | N/A | Enter to submit forms |

Most screens center their content to ~512px wide for readability.

---

## Part 4 — Using Each Screen

### 🏠 Dashboard

The home screen at `/`. Shows:
- **Tonight's dinner** — click it to jump to the full meal plan
- **Tomorrow's dinner** — one-line preview
- **Quick action buttons** — Log Dinner, Pantry, Home Maintenance
- **Category rotation** — which cuisine types are available vs recently used
- **Maintenance alerts** — red cards for any overdue home items

---

### 🧺 Pantry Manager

The most keyboard-friendly screen. Use it to do large pantry audits from a computer:

**Toggling items:**
Click any item's circle to toggle it between in stock (green ✓) and out of stock (hollow, strikethrough).

**Adding items:**
Click the "Add item…" field at the bottom of any section. Type and press **Enter**.

**Deleting items:**
On desktop, a **trash icon** (🗑) is visible to the right of every item. Click it to delete. (No long-press needed on desktop.)

**Saving:**
When you have unsaved changes, a floating **"Save Changes"** button appears at the bottom right. Click it — your changes are committed to GitHub with a timestamped commit message.

**Barcode scanning:**
Works on desktop too if your computer has a webcam, but it's most useful on mobile. See the [Mobile Guide](mobile-guide.md) for barcode scanning details.

---

### 📓 Cook Log

Log meals cooked by the family. This drives the meal rotation algorithm that HomeChef uses in VS Code.

**Logging from desktop:**
1. The date field defaults to today — click to change
2. Select a category from the dropdown
3. Type a recipe name — the app autocompletes from your `recipes/` folder
4. Add optional notes
5. Click **Log It**

**Category rotation panel:**
All 10 cuisine categories are shown as colored pills. Green = available, red with ⏸ = cooling down (used within 8 days). This helps you see at a glance what HomeChef should prioritize next.

---

### 🗓 Meal Plan Viewer

Read-only display of `data/meal-plan.md`. Updated by HomeChef in VS Code.

On desktop you get a cleaner wider layout:
- Day cards are displayed top to bottom
- Prep Strategy in an amber banner at top
- Shopping List is collapsible — click the header to expand/collapse
- Desserts section in a pink card

**Refreshing the plan:** The app loads the plan fresh on each page visit. If HomeChef just generated a new plan, click the Meals tab again to reload it.

---

### ⚙️ Preferences

A form-based editor for `data/family-preferences.md`.

| Section | What you can change |
|---------|-------------------|
| Spice Level | Family baseline: Mild / Medium / Hot |
| Dislikes / Avoid | Tag-style list — type + Enter to add, click X to remove |
| Dessert Favorites | Same tag-style editor |
| Common Proteins | List with add/remove; type + Enter to add |

Click **Save Preferences** when done.

> **Note on cuisine preferences:** The full cuisine preference table (frequencies, notes) in `data/family-preferences.md` is managed directly in VS Code. The webapp handles the most frequently changed fields. If you want to update cuisine frequencies, open the file in VS Code.

---

### 🔧 Maintenance Tracker

Track home maintenance dates. All fields are date pickers with a **"Today"** shortcut button.

**On desktop:**
- Click inside a date field to open the browser's native date picker
- Or type the date directly in `YYYY-MM-DD` format
- Click **Today** to auto-fill today's date

**Overdue indicators:**
Items past their threshold show a red **"Overdue"** badge. These also show up as red alert cards on the Dashboard.

---

## Part 5 — Working Alongside VS Code

The power of Home Agents is the combination of the **webapp** (for quick daily updates on any device) and **VS Code agents** (for AI-generated meal plans, recipes, and complex decisions).

### Typical workflow

| Task | Where |
|------|-------|
| Log tonight's dinner | Webapp → Cook Log |
| Check pantry before shopping | Webapp → Pantry |
| Generate next week's meal plan | VS Code → HomeChef agent |
| View the generated meal plan | Webapp → Meal Plan |
| Update dislikes or protein list | Webapp → Preferences |
| Record HVAC filter change | Webapp → Maintenance |
| Write a new recipe | VS Code → recipes/ folder |

### How data stays in sync

All data files live in your GitHub repo (`data/` folder). Both the webapp and the VS Code agents read from and write to the same files:

```
GitHub repo (source of truth)
    ↑↓ Webapp reads/writes via GitHub API
    ↑↓ VS Code agents read/write via local git clone
```

Whenever the webapp saves a change, it makes a git commit directly to your GitHub repo. When you pull in VS Code, you'll see those commits in your git history.

### Avoiding conflicts

- **Don't edit the same file simultaneously** from VS Code and the webapp. For example, don't have the webapp's Pantry screen open with unsaved changes while your VS Code agent is also editing `pantry-inventory.md`.
- If a conflict does occur, GitHub will reject the webapp's commit with an error — you'll see an error toast in the app. Pull the latest in VS Code, resolve any conflicts, push, then try saving in the webapp again.

---

## Part 6 — Building and Deploying

### Deploy the latest code to GitHub Pages

From the `webapp/` directory:

```bash
npm run deploy
```

This builds the app and pushes it to the `gh-pages` branch of your repo. GitHub Pages automatically serves it at `https://gengire.github.io/home-agents/`. Changes are live within about 1–2 minutes.

### Build without deploying

```bash
npm run build
```

Outputs optimized files to `webapp/dist/`. Useful if you want to inspect the build or test it with `npm run preview`.

### Preview the production build locally

```bash
npm run build
npm run preview
```

Opens a local preview of the production build at `http://localhost:4173/home-agents/`.

---

## Part 7 — Common Questions

**Q: I get a "404 Not Found" error when I open the app URL.**
Make sure GitHub Pages is enabled on your repo:
1. Go to `https://github.com/YOUR_USERNAME/home-agents/settings/pages`
2. Under "Source", select **Deploy from a branch**
3. Select branch **`gh-pages`**, folder **`/ (root)`**
4. Save — the site will be live in a minute or two

**Q: I'm getting CORS errors or "Network Error" in the browser console.**
This is usually a GitHub API issue. Check:
- Your token has `repo` scope (not just `public_repo`)
- Your token hasn't expired
- The repo path in Settings matches `username/repo-name` exactly (no trailing slash, no `https://github.com/` prefix)

**Q: The app loads but shows old data even after changes were made in VS Code.**
Data is loaded fresh when you navigate to each screen. Click the refresh icon (↻) at the top right of the screen, or navigate away and back.

**Q: I want to reset completely and start over.**
Go to the Settings screen (gear icon), click **Disconnect**. This clears your local browser storage. The GitHub data is untouched.

**Q: Can I use this app without GitHub?**
No — the app uses GitHub as its entire data layer. There is no alternative storage backend.

**Q: How do I add a new pantry section (e.g. "Condiments")?**
The webapp can only add items to existing sections. To add a new section, open `data/pantry-inventory.md` directly in VS Code and add a new `**Section:**` heading following the existing format. After committing, the new section will appear in the webapp.

---

## Part 8 — Keyboard Shortcuts

| Screen | Action | Shortcut |
|--------|--------|---------|
| Any form | Submit | **Enter** |
| Pantry | Add item | Type in field, press **Enter** |
| Cook Log | Submit entry | **Enter** in any field, then click Log It |
| Preferences | Add tag | Type in field, press **Enter** |

---

*For mobile-specific setup (installing to home screen, barcode scanning), see the [Mobile User Guide](mobile-guide.md).*
*For GitHub token setup and repo configuration, see the [GitHub Integration Guide](github-integration.md).*
