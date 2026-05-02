# Home Agents Webapp — Build Plan for Copilot
**Version:** 1.0
**Project:** home-agents
**Stack:** React + Vite, GitHub API (Octokit), TailwindCSS, deployed to GitHub Pages

---

## Context — What You're Building

This is a personal household management webapp for a family of 4 in Norfolk, VA. It serves as a GUI frontend for a set of Markdown files that VS Code Copilot agents read from. Instead of editing markdown files by hand or prompting the agent to make every change, the family uses this webapp to:

- Update the pantry inventory (including later: scan barcodes with phone camera)
- Log meals that were cooked (to drive meal category rotation in the agent)
- View the current week's meal plan in a clean mobile-friendly layout
- Edit family food preferences
- Update home maintenance records

The webapp reads and writes files in a **private GitHub repository** using the GitHub REST API (via Octokit). No backend server. No database. The markdown files ARE the database.

### Key Constraint
This app will be used on mobile (phone browser) as much as desktop. Every screen must be fully usable on a phone. Think mobile-first.

---

## Repository Structure (Already Set Up)

```
home-agents/
├── .github/
│   └── copilot-instructions.md
├── agents/
│   ├── homechef.agent.md
│   ├── homeguard.agent.md
│   └── homebase.agent.md
├── data/
│   ├── family-prefs.md
│   ├── pantry-inventory.md
│   ├── maintenance-schedule.md
│   ├── meal-plan.md
│   └── cook-log.md
├── recipes/
│   └── (*.txt recipe files)
└── webapp/                    ← BUILD EVERYTHING HERE
    └── (you will create this)
```

---

## Tech Stack

- **Framework:** React 18 + Vite
- **Styling:** TailwindCSS (mobile-first utility classes)
- **GitHub API:** `@octokit/rest` for reading/writing files
- **Routing:** React Router v6
- **State:** React Context + useState/useReducer (no Redux needed)
- **Markdown parsing:** `gray-matter` for frontmatter, plain string manipulation for content sections
- **Icons:** `lucide-react`
- **Deployment:** GitHub Pages via `gh-pages` npm package

### Why no backend?
The GitHub API handles auth and file I/O. The app is fully static. This means it can be hosted free on GitHub Pages and accessed from any device including phones.

---

## Auth Model

On first load, if no token is found in localStorage, show an **Auth Screen**:
- A single input field for a GitHub Personal Access Token (PAT)
- Brief instructions: "Enter your GitHub Personal Access Token with `repo` scope"
- A repo field defaulting to `YOUR_USERNAME/home-agents` (make this configurable)
- A "Connect" button that tests the token by fetching the repo, then saves to localStorage on success

Token is stored in `localStorage` as `homeAgentsToken`. Repo is stored as `homeAgentsRepo`.

A small "Disconnect" option in settings clears localStorage and returns to the auth screen.

---

## Phase 1 — Project Scaffold

### Tasks
1. Scaffold a new Vite + React project inside `webapp/`:
   ```bash
   cd webapp
   npm create vite@latest . -- --template react
   npm install
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   npm install @octokit/rest react-router-dom lucide-react gray-matter
   npm install -D gh-pages
   ```

2. Configure Tailwind in `tailwind.config.js`:
   ```js
   content: ["./index.html", "./src/**/*.{js,jsx}"]
   ```

3. Set up `vite.config.js` with `base: '/home-agents/'` for GitHub Pages deployment.

4. Add deploy scripts to `package.json`:
   ```json
   "predeploy": "npm run build",
   "deploy": "gh-pages -d dist"
   ```

5. Create a `src/github/client.js` module that exports an Octokit instance using the stored token, plus helper functions:
   - `getFile(path)` → returns `{ content: string, sha: string }` (sha needed for updates)
   - `updateFile(path, content, sha, commitMessage)` → commits updated content
   - `listFiles(path)` → lists files in a directory

6. Create a `src/context/AppContext.jsx` that provides:
   - `token` and `repo` from localStorage
   - `setToken(token, repo)` to save and initialize the Octokit client
   - `logout()` to clear and reset
   - A `loading` and `error` state

7. Set up React Router with these routes (empty placeholder components for now):
   ```
   /           → Dashboard (home screen)
   /pantry     → Pantry Manager
   /cook-log   → Cook Log
   /meal-plan  → Meal Plan Viewer
   /prefs      → Preferences Editor
   /maintenance → Maintenance Tracker
   /settings   → Settings (token, repo config)
   ```

8. Create a persistent bottom navigation bar (mobile tab bar style) with icons for each main screen.

9. Create a top header bar showing the app name "🏠 Home Agents" and a settings gear icon.

### Deliverable
A running app at `localhost:5173` that shows the auth screen on first load, connects with a PAT, and shows an empty dashboard with working navigation.

---

## Phase 2 — Pantry Manager (`/pantry`)

### What it does
Displays and edits `data/pantry-inventory.md`. The user can update what's in stock, and the changes are committed back to GitHub.

### Data Model
`pantry-inventory.md` has sections like:
```
**Proteins:**
- item 1
- item 2

**Vegetables:**
- ...
```

Parse these sections into a structured object. Each section is editable independently.

### UI
- One card per pantry section (Proteins, Vegetables, Fruits, Grains, Legumes, Dairy, Herbs & Seasonings, Other)
- Each card shows items as a checklist — checked = in stock, unchecked = out/need to buy
- An "Add item" input at the bottom of each card
- Tap item to toggle in/out of stock
- Long press (or swipe) to delete an item
- A floating "Save Changes" button that appears when there are unsaved edits
- On save: serialize back to markdown format, commit to GitHub with message `"Pantry update — [date]"`
- A "Last updated" timestamp shown on the page header
- **Pull to refresh** on mobile

### Notes
- Keep the markdown format identical to what the agent expects — just update the list items under each bold heading.
- Show a toast notification on successful save: "✅ Pantry saved to GitHub"
- Show error state if GitHub commit fails.

---

## Phase 3 — Cook Log (`/cook-log`)

### What it does
Lets the user log what meals were actually cooked. Appends rows to `data/cook-log.md`.

### Data Model
`cook-log.md` has a markdown table:
```
| Date | Recipe Name | Category | Notes |
|------|-------------|----------|-------|
| 2026-05-04 | Red Lentil Dal | IND-L | Doubled the batch |
```

### UI
- **Log entry form at top:**
  - Date picker (defaults to today)
  - Recipe name text input (with autocomplete from `recipes/` folder file names)
  - Category dropdown (the 10 defined categories: IND-L, IND-P, IND-V, MED, MEX, ASIA, SOUP, FISH, AMER, DESS)
  - Notes text input (optional)
  - "Log It" button
- **Recent entries list** below the form — shows last 14 days of cook log entries as cards
- Each entry shows: date, recipe name, category badge (color-coded), notes
- **Category rotation indicator:** Show a visual of which categories are "cooling down" (used within last 8 days, shown in red/orange) vs available (green). This helps Chris see at a glance what HomeChef should be planning next.

### Category Color Coding
| Category | Color |
|----------|-------|
| IND-L, IND-P, IND-V | Orange (Indian family) |
| MED | Blue |
| MEX | Green |
| ASIA | Purple |
| SOUP | Teal |
| FISH | Cyan |
| AMER | Brown |
| DESS | Pink |

### Notes
- On save: append the new row to the table in `cook-log.md`, commit with message `"Cook log — [recipe name] [date]"`
- Never delete or reorder existing rows — append only.

---

## Phase 4 — Meal Plan Viewer (`/meal-plan`)

### What it does
Displays `data/meal-plan.md` in a clean, mobile-friendly card layout. Read-only — meal plans are generated by HomeChef in VS Code, this is just for viewing on the go.

### UI
- Parse the meal plan markdown and display each day as a card:
  - Day name (Monday, Tuesday, etc.) as card header
  - 🍳 NEW COOK or ♻️ LEFTOVERS badge
  - Recipe name(s)
  - Category badge
  - Cook time if present
- A "Prep Strategy" section at the top in a highlighted banner
- A "Desserts This Week" section at the bottom
- A "Shopping Notes" section
- Pull to refresh
- Show "Last generated" date from the meal plan header
- If no meal plan exists yet, show a friendly empty state: "No meal plan yet — ask HomeChef in VS Code to generate one"

### Notes
- This screen is read-only. No editing here.
- The goal is a clean at-a-glance view on the phone — like a weekly menu board.

---

## Phase 5A — Preferences Editor (`/prefs`)

### What it does
Provides a form-based GUI for editing `data/family-prefs.md` instead of editing markdown directly.

### UI Sections (matching the markdown structure)
1. **Spice Preferences** — a simple slider or radio: Family baseline (mild/medium/hot) + Chris's preference (always ultra-spicy, show as fixed label)
2. **Cuisine Preferences** — checklist of cuisines with a frequency selector (Rarely / Sometimes / Weekly / Favorite ⭐)
3. **Dislikes / Avoid** — tag-style input: type a food, press enter to add a tag, click X to remove
4. **Dessert Favorites** — same tag-style input
5. **Common Proteins** — checklist of proteins currently in the file, ability to add/remove
6. **Notes** — free text area

On save: serialize back to markdown format preserving the section headings, commit to GitHub.

---

## Phase 5B — Maintenance Tracker (`/maintenance`)

### What it does
Provides a simple form for updating `data/maintenance-schedule.md` — primarily date fields and checkboxes.

### UI
- **HVAC section:**
  - "Last filter changed" — date picker with "Set to today" button
  - "Next filter check" — date picker
  - "Next filter replacement" — date picker
  - "Nest humidity target" — displayed as info (45–55%)
  - Notes field
- **Safety section:**
  - Smoke/CO detectors last tested — date + "Set to today"
  - Battery replacement date — same
  - Water heater last flushed — same
  - Gutters last cleaned — same
- **Quick Actions checklist** — the three checkboxes from the markdown, toggleable
- A "seasonal notes" read-only display at the bottom

On save: write updated dates back into the markdown file, preserving all formatting.

### Extra Feature
Show a **"Overdue" indicator** next to any item:
- HVAC filter: warn if last changed > 90 days ago
- Smoke detectors: warn if last tested > 6 months ago
- Water heater: warn if last flushed > 12 months ago
- Gutters: warn if last cleaned > 6 months ago

---

## Phase 6 — Dashboard (`/`)

### What it does
A home screen that gives a quick overview of everything.

### UI Widgets
1. **Meal Plan Summary** — today's dinner from meal-plan.md (NEW COOK or LEFTOVERS), tomorrow's dinner
2. **Pantry Status** — "Last updated X days ago" with a link to update
3. **Category Rotation Status** — mini version of the cook-log rotation indicator: which categories are available this week
4. **Maintenance Alerts** — any overdue items from maintenance-schedule.md shown as red alert cards
5. **Quick Actions:**
   - "Log tonight's dinner" → opens cook log form pre-filled with today's date
   - "Update pantry" → goes to pantry screen
   - "View full meal plan" → goes to meal plan screen

---

## Phase 7 (Future) — Barcode Scanner

> Build this after all other phases are stable.

### Concept
On the Pantry Manager screen, add a "Scan Barcode" button. Uses the device camera to scan a product barcode, looks up the product name via the Open Food Facts API (free, no key needed), and adds it to the appropriate pantry section.

### Implementation Notes
- Library: `@zxing/browser` for camera barcode scanning
- API: `https://world.openfoodfacts.org/api/v0/product/{barcode}.json` (free, no auth)
- On scan: show product name + suggested pantry category, user confirms, item added to pantry
- Works on iPhone and Android Chrome via browser camera API

---

## Deployment to GitHub Pages

After Phase 1 is working locally:

1. In `webapp/package.json`, ensure:
   ```json
   "homepage": "https://YOUR_USERNAME.github.io/home-agents"
   ```

2. Run:
   ```bash
   npm run deploy
   ```

3. In your GitHub repo → Settings → Pages → Source: Deploy from branch `gh-pages`

4. Your app is live at `https://YOUR_USERNAME.github.io/home-agents`

5. **Bookmark this on your phone.** On iPhone: Safari → Share → "Add to Home Screen" → it becomes an app icon. On Android: Chrome → menu → "Add to Home Screen". It will look and feel like a native app.

---

## Code Quality Notes for Copilot

- Use functional components and hooks throughout. No class components.
- Every GitHub API call must have loading state and error handling — show spinners and error messages, never silent failures.
- Debounce any auto-save behavior. Don't commit on every keystroke.
- The markdown parser/serializer for each file must be the inverse of each other — parse → edit → serialize must produce valid markdown that matches the original format.
- Use `async/await` with `try/catch` throughout, not `.then()/.catch()` chains.
- Comment any non-obvious markdown parsing logic clearly.
- Mobile-first CSS: test every screen at 390px wide (iPhone 14 size).

---

## Build Order

Tell Copilot to build in this order. Don't skip ahead:

1. Phase 1 — Scaffold + Auth + Navigation
2. Phase 2 — Pantry Manager (most used, validate the GitHub read/write pattern here)
3. Phase 3 — Cook Log
4. Phase 4 — Meal Plan Viewer
5. Phase 5A — Preferences Editor
6. Phase 5B — Maintenance Tracker
7. Phase 6 — Dashboard (pulls from all other screens)
8. Phase 7 — Barcode Scanner (separate sprint)

---

## How to Use This File

Drop this file in your project root as `WEBAPP_BUILD_PLAN.md`. Then in VS Code Copilot chat:

> `@workspace I want to start building the home agents webapp. Follow WEBAPP_BUILD_PLAN.md exactly, starting with Phase 1. Ask me before moving to the next phase.`

When you're ready for the next phase:
> `@workspace Phase 1 is working. Start Phase 2 from WEBAPP_BUILD_PLAN.md.`