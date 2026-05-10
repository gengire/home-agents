import{a as e,n as t,t as n}from"./jsx-runtime-m7G7yzlP.js";import{n as r,t as i}from"./index-DGKgcBbq.js";var a=e(t(),1),o=`# Home Agents — Mobile User Guide\r
\r
**For iPhone and Android users**\r
\r
This guide walks you through everything you need to use the Home Agents webapp on your phone — from first-time setup to everyday use. No prior tech experience required.\r
\r
---\r
\r
## What Is Home Agents?\r
\r
Home Agents is a mobile-friendly webapp your family uses to manage:\r
- 🧺 **Pantry inventory** — track what you have and what you need to buy\r
- 📓 **Cook log** — record what meals were cooked each night\r
- 🗓 **Meal plan** — view this week's planned dinners\r
- ⚙️ **Family preferences** — update spice levels, dislikes, favorite desserts\r
- 🔧 **Home maintenance** — track HVAC filters, smoke detectors, and other upkeep\r
\r
Everything you change is automatically saved back to your private GitHub repository, so it's always in sync across all family devices.\r
\r
---\r
\r
## Part 1 — First-Time Setup\r
\r
### Step 1: Open the App\r
\r
Visit the app in your phone's browser:\r
\r
**https://gengire.github.io/home-agents/**\r
\r
> **iPhone tip:** Use Safari (not Chrome) for the smoothest "install to home screen" experience described below.\r
>\r
> **Android tip:** Chrome works best.\r
\r
---\r
\r
### Step 2: The Sign-In Screen\r
\r
The first time you open the app, you'll see a sign-in screen asking for two things:\r
\r
1. **GitHub Personal Access Token** — a password-like key that lets the app read and write your files\r
2. **Repository** — the GitHub repo where your files live (already pre-filled as \`gengire/home-agents\`)\r
\r
If you haven't set up your token yet, see the **[GitHub Integration Guide](github-integration.md)** first — it takes about 5 minutes and you only do it once.\r
\r
Once you have your token, paste it into the box and tap **Connect**.\r
\r
> **Your token is stored only in your browser's local storage.** It never leaves your device or goes through any server. If you clear your browser data, you'll need to enter it again.\r
\r
---\r
\r
### Step 3: Install as a Home Screen App (Recommended)\r
\r
You can add Home Agents to your home screen so it opens like a real app — no browser bar, full screen, just like a native app.\r
\r
#### On iPhone (Safari):\r
1. With the app open in Safari, tap the **Share button** (the box with an arrow pointing up, at the bottom of the screen)\r
2. Scroll down in the share sheet and tap **"Add to Home Screen"**\r
3. Change the name if you want (e.g. "Home Agents") and tap **Add**\r
4. The app icon will appear on your home screen\r
\r
#### On Android (Chrome):\r
1. With the app open in Chrome, tap the **three-dot menu** (top right)\r
2. Tap **"Add to Home Screen"** or **"Install app"**\r
3. Tap **Add** in the confirmation dialog\r
4. The icon appears on your home screen or in your app drawer\r
\r
> After installing, always open the app from your home screen icon. This gives you the full-screen experience.\r
\r
---\r
\r
## Part 2 — Navigating the App\r
\r
At the bottom of the screen you'll see a navigation bar with 5 icons. These are your main screens:\r
\r
| Icon | Screen | What it does |\r
|------|--------|-------------|\r
| 🏠 | **Home** | Dashboard — tonight's dinner, quick actions, alerts |\r
| 🧺 | **Pantry** | Track what's in stock |\r
| 📓 | **Cook Log** | Record what you cooked |\r
| 🗓 | **Meals** | View this week's meal plan |\r
| 🔧 | **Upkeep** | Home maintenance tracker |\r
\r
Tap any icon to navigate to that screen instantly.\r
\r
At the top right, there's a **gear icon** (⚙️) — tap it to access Settings, where you can view your connected repo or sign out.\r
\r
---\r
\r
## Part 3 — Using Each Screen\r
\r
### 🏠 Home (Dashboard)\r
\r
The dashboard gives you a quick overview of everything that matters right now:\r
\r
- **Tonight's dinner** — pulled from this week's meal plan. Shows whether it's a NEW COOK night (you're making something fresh) or LEFTOVERS night\r
- **Tomorrow's dinner** — a heads-up for planning\r
- **Quick actions** — buttons to jump straight to Log Dinner, Pantry, or Home maintenance\r
- **Meal rotation** — color-coded pills showing which cuisine categories are "available" (not cooked in the last 8 days) vs cooling down\r
- **Maintenance alerts** — red warning cards for any overdue home maintenance items (HVAC filter, smoke detectors, etc.)\r
\r
**Tip:** Check the dashboard each morning to see tonight's dinner and make sure nothing important is overdue.\r
\r
---\r
\r
### 🧺 Pantry Manager\r
\r
Use this screen to keep your pantry inventory current.\r
\r
**Reading the screen:**\r
- Items with a **green circle ✓** are in stock\r
- Items with a **hollow circle** (and strikethrough text) are out of stock / need buying\r
- Items are grouped by category: Proteins, Vegetables, Fruits, Grains, Legumes, Dairy, Herbs & Seasonings, Other\r
\r
**Tapping an item** toggles it between in stock and out of stock.\r
\r
**Adding an item:**\r
1. Scroll to the bottom of any category card\r
2. Tap the text field that says "Add item…"\r
3. Type the item name\r
4. Press **Enter** on your keyboard or tap the **+** button\r
\r
**Deleting an item:**\r
- On mobile: **long-press** the item for about half a second, then release — it will disappear\r
- On desktop: a trash icon appears on the right side of each item\r
\r
**Scanning a barcode:**\r
1. Tap the green **Scan** button at the top right of the Pantry screen\r
2. Your camera will open with a scanning overlay\r
3. Point your camera at any product barcode\r
4. The app looks up the product name automatically\r
5. Confirm or edit the name, choose which pantry section to add it to, then tap **Add to Pantry**\r
6. If the product isn't found in the database, you can type the name manually\r
\r
> **Camera permission:** The first time you tap Scan, your phone will ask for camera access. Tap "Allow" — the app only uses the camera for barcode scanning and never stores images.\r
\r
**Saving changes:**\r
When you make any changes, a floating **"Save Changes"** button appears at the bottom right. Tap it to commit your changes to GitHub. You'll see a green confirmation toast when it's saved.\r
\r
> **Don't close the app without saving!** Changes are held in memory until you tap Save. If you navigate away or close the browser, unsaved changes are lost.\r
\r
---\r
\r
### 📓 Cook Log\r
\r
Use this to record what your family cooked each night. This drives the meal rotation system — HomeChef uses this log to avoid repeating the same type of cuisine too often.\r
\r
**Logging a meal:**\r
1. The date defaults to **today** — tap to change it if logging for a different day\r
2. Tap the **Category** dropdown and select the cuisine type (e.g. Indian — Legume, Mediterranean, Mexican)\r
3. Start typing a recipe name — the app will suggest names from your recipes folder\r
4. Add optional notes (batch size, modifications, etc.)\r
5. Tap **Log It**\r
\r
**Category rotation indicator:**\r
- Below the form are colored pills for all 10 cuisine categories\r
- **Green** = available (not cooked in the last 8 days)\r
- **Red with ⏸** = cooling down (cooked within the last 8 days)\r
\r
This helps you pick what to log and tells HomeChef what's been overused recently.\r
\r
**Recent entries:**\r
Scroll down to see the last 14 days of cook log entries, newest first. Each entry shows the date, recipe name, a color-coded category badge, and any notes.\r
\r
---\r
\r
### 🗓 Meal Plan\r
\r
This is a **read-only** view of the current week's meal plan, generated by HomeChef in VS Code.\r
\r
The screen shows:\r
- **Prep Strategy** — a banner at the top describing this week's batch cooking approach\r
- **Day cards** — one card per day of the week, showing:\r
  - 🍳 **NEW COOK** (green header) — you're cooking fresh tonight\r
  - ♻️ **LEFTOVERS** (gray header) — reheating from a previous batch\r
  - Recipe name, cuisine category, and estimated cook time\r
- **Desserts This Week** — pink card at the bottom\r
- **Shopping List** — collapsible card with items to pick up\r
\r
**No meal plan yet?** You'll see an empty state message. Ask HomeChef in VS Code to generate a plan for the week.\r
\r
---\r
\r
### ⚙️ Preferences\r
\r
Use this to update your family's food preferences. HomeChef reads these when planning meals.\r
\r
**Spice Level — Family Baseline:**\r
- Three buttons: 🌶️ Mild / 🌶️🌶️ Medium / 🌶️🌶️🌶️ Hot\r
- Tap to select the family's default heat level\r
- Chris's ultra-spicy preference is always shown as a fixed note (it's a household truth)\r
\r
**Dislikes / Avoid:**\r
- These ingredients will be avoided in meal planning\r
- To add: type an ingredient and press Enter or tap **+**\r
- To remove: tap the **X** on any tag\r
\r
**Dessert Favorites:**\r
- Same tag-style editor — add your Pritikin-compliant dessert favorites\r
\r
**Common Proteins:**\r
- List of proteins typically in your rotation\r
- Tap **X** to remove any, type + Enter to add new ones\r
\r
Tap **Save Preferences** (floating button at bottom) when done.\r
\r
---\r
\r
### 🔧 Maintenance Tracker\r
\r
Track home maintenance dates so nothing slips through the cracks.\r
\r
**HVAC Section:**\r
- Last filter changed / Next filter check / Next filter replacement — tap to pick a date, or tap **Today** to set today's date instantly\r
- Humidity target is shown for reference (not editable)\r
- Notes field for any HVAC comments\r
\r
**Safety Section:**\r
- Smoke/CO detectors last tested\r
- Detector batteries replaced\r
- Water heater last flushed\r
- Gutters last cleaned\r
\r
**Overdue warnings:** If any date is past its threshold, you'll see a red **"Overdue"** badge next to it. These also appear on the Dashboard as red alert cards.\r
\r
| Item | Warning threshold |\r
|------|-----------------|\r
| HVAC filter change | 90 days |\r
| Smoke detectors tested | 6 months |\r
| Detector batteries | 12 months |\r
| Water heater flush | 12 months |\r
| Gutters cleaned | 6 months |\r
\r
**Quick Actions:**\r
Three checkboxes for tasks in progress — tap to toggle (green circle = done).\r
\r
Tap **Save Maintenance** when done.\r
\r
---\r
\r
## Part 4 — Common Questions\r
\r
**Q: Do I need an internet connection to use the app?**\r
Yes — the app reads and writes files from GitHub, which requires an internet connection. There is no offline mode.\r
\r
**Q: Will my changes show up on other family members' phones?**\r
Yes — as soon as you save, the changes are committed to the shared GitHub repo. The next time another family member opens the app (or refreshes), they'll see the updated data.\r
\r
**Q: I tapped Save but got an error. What happened?**\r
Usually this means your token expired or your internet connection dropped. Try:\r
1. Check your internet connection\r
2. Refresh the app and try saving again\r
3. If that fails, go to Settings and reconnect with your token\r
\r
**Q: I cleared my browser / got a new phone. Do I have to set up again?**\r
You'll need to enter your GitHub token again (it's stored in browser storage, not in the cloud). Your data is all safe in GitHub — nothing is lost. See the [GitHub Integration Guide](github-integration.md) for how to retrieve your token.\r
\r
**Q: The Scan button opened the camera but it won't scan my barcode.**\r
Try:\r
- Make sure you have good lighting\r
- Hold the camera 4–8 inches from the barcode\r
- Hold your phone steady for a moment\r
- If the product barcode is damaged or very small, try typing the name manually\r
\r
**Q: My Meal Plan screen shows "No meal plan yet."**\r
The meal plan is generated by HomeChef in VS Code (the desktop AI agent), not in the app itself. Open VS Code and ask HomeChef to generate this week's plan.\r
\r
**Q: How do I sign out?**\r
Tap the gear icon ⚙️ at the top right, then tap **Disconnect**. This clears your token from the browser. Your data in GitHub is unaffected.\r
\r
---\r
\r
## Part 5 — Tips for Daily Use\r
\r
- **Morning:** Glance at the Dashboard to see tonight's dinner\r
- **At the grocery store:** Open Pantry and check what's out of stock (hollow circles)\r
- **After cooking:** Log the meal in Cook Log right away — takes 30 seconds\r
- **Weekly:** After HomeChef generates the meal plan, open the Meal Plan screen to see the week ahead\r
- **Monthly:** Check the Maintenance screen for anything approaching overdue\r
\r
---\r
\r
*For help with GitHub setup and the Personal Access Token, see the [GitHub Integration Guide](github-integration.md).*\r
*For desktop-specific features, see the [Desktop User Guide](desktop-guide.md).*\r
`,s=`# Home Agents — Desktop User Guide\r
\r
**For Windows, Mac, and Linux users accessing the app in a web browser**\r
\r
This guide covers everything you need to use the Home Agents webapp from a computer. It also covers running the app locally for development and how to use it alongside VS Code.\r
\r
---\r
\r
## What Is Home Agents?\r
\r
Home Agents is a web-based household management dashboard. On the desktop it gives you a full-width view of your household data — pantry, cook log, meal plan, preferences, and home maintenance — all backed by your private GitHub repository.\r
\r
The desktop experience is especially useful for:\r
- Making bulk pantry edits (faster on a keyboard than on a phone)\r
- Reviewing the full week's meal plan on a bigger screen\r
- Updating preferences or maintenance records in detail\r
- Running the app locally while developing or customizing it\r
\r
---\r
\r
## Part 1 — Accessing the App\r
\r
### Option A: Use the Live Hosted Version (Recommended for Normal Use)\r
\r
Open any modern browser and go to:\r
\r
**https://gengire.github.io/home-agents/**\r
\r
Works in:\r
- ✅ Chrome (recommended)\r
- ✅ Firefox\r
- ✅ Edge\r
- ✅ Safari\r
\r
> **First-time users:** You'll see a sign-in screen asking for your GitHub Personal Access Token. See the [GitHub Integration Guide](github-integration.md) for how to get one.\r
\r
---\r
\r
### Option B: Run Locally (For Development / Offline Testing)\r
\r
If you have Node.js installed, you can run the app on your own machine.\r
\r
#### Prerequisites\r
- [Node.js](https://nodejs.org/) version 18 or higher (check with \`node --version\` in a terminal)\r
- Git installed ([git-scm.com](https://git-scm.com))\r
- The project cloned to your machine\r
\r
#### Quick Start with start.bat\r
\r
In the root of the project folder, double-click **\`start.bat\`**.\r
\r
This will:\r
1. Navigate to the \`webapp/\` directory\r
2. Install dependencies if needed\r
3. Start the development server\r
4. Print the local URL (usually \`http://localhost:5173/home-agents/\`)\r
\r
Open that URL in your browser and the app will load.\r
\r
> **Note:** Even in local development, the app still reads/writes from your real GitHub repository. There is no local data storage — your token and GitHub repo are still required.\r
\r
#### Manual Start (if start.bat doesn't work)\r
\r
Open a terminal in the project root and run:\r
\r
\`\`\`bash\r
cd webapp\r
npm install\r
npm run dev\r
\`\`\`\r
\r
Then open \`http://localhost:5173/home-agents/\` in your browser.\r
\r
---\r
\r
## Part 2 — First-Time Sign-In\r
\r
When you open the app for the first time (or after clearing browser data), you'll see the **Connect to GitHub** screen:\r
\r
1. **GitHub Token** — paste your Personal Access Token\r
2. **Repository** — pre-filled as \`gengire/home-agents\`, change if your repo has a different path (format: \`username/repo-name\`)\r
3. Click **Connect**\r
\r
The app will:\r
- Verify the token can connect to the repo\r
- Save both values to your browser's local storage\r
- Redirect you to the Dashboard\r
\r
> Your token is stored in **localStorage** — it lives in your browser on your current machine only. It is never sent to any server other than GitHub's API.\r
\r
---\r
\r
## Part 3 — Desktop Layout\r
\r
The app is mobile-first but fully functional on desktop. Key differences from mobile:\r
\r
| Element | Mobile | Desktop |\r
|---------|--------|---------|\r
| Navigation | Bottom tab bar | Bottom tab bar (same) |\r
| Pantry delete | Long-press to delete | Trash icon visible on each item |\r
| Screen width | Full width | Centered max-width container |\r
| Keyboard shortcuts | N/A | Enter to submit forms |\r
\r
Most screens center their content to ~512px wide for readability.\r
\r
---\r
\r
## Part 4 — Using Each Screen\r
\r
### 🏠 Dashboard\r
\r
The home screen at \`/\`. Shows:\r
- **Tonight's dinner** — click it to jump to the full meal plan\r
- **Tomorrow's dinner** — one-line preview\r
- **Quick action buttons** — Log Dinner, Pantry, Home Maintenance\r
- **Category rotation** — which cuisine types are available vs recently used\r
- **Maintenance alerts** — red cards for any overdue home items\r
\r
---\r
\r
### 🧺 Pantry Manager\r
\r
The most keyboard-friendly screen. Use it to do large pantry audits from a computer:\r
\r
**Toggling items:**\r
Click any item's circle to toggle it between in stock (green ✓) and out of stock (hollow, strikethrough).\r
\r
**Adding items:**\r
Click the "Add item…" field at the bottom of any section. Type and press **Enter**.\r
\r
**Deleting items:**\r
On desktop, a **trash icon** (🗑) is visible to the right of every item. Click it to delete. (No long-press needed on desktop.)\r
\r
**Saving:**\r
When you have unsaved changes, a floating **"Save Changes"** button appears at the bottom right. Click it — your changes are committed to GitHub with a timestamped commit message.\r
\r
**Barcode scanning:**\r
Works on desktop too if your computer has a webcam, but it's most useful on mobile. See the [Mobile Guide](mobile-guide.md) for barcode scanning details.\r
\r
---\r
\r
### 📓 Cook Log\r
\r
Log meals cooked by the family. This drives the meal rotation algorithm that HomeChef uses in VS Code.\r
\r
**Logging from desktop:**\r
1. The date field defaults to today — click to change\r
2. Select a category from the dropdown\r
3. Type a recipe name — the app autocompletes from your \`recipes/\` folder\r
4. Add optional notes\r
5. Click **Log It**\r
\r
**Category rotation panel:**\r
All 10 cuisine categories are shown as colored pills. Green = available, red with ⏸ = cooling down (used within 8 days). This helps you see at a glance what HomeChef should prioritize next.\r
\r
---\r
\r
### 🗓 Meal Plan Viewer\r
\r
Read-only display of \`data/meal-plan.md\`. Updated by HomeChef in VS Code.\r
\r
On desktop you get a cleaner wider layout:\r
- Day cards are displayed top to bottom\r
- Prep Strategy in an amber banner at top\r
- Shopping List is collapsible — click the header to expand/collapse\r
- Desserts section in a pink card\r
\r
**Refreshing the plan:** The app loads the plan fresh on each page visit. If HomeChef just generated a new plan, click the Meals tab again to reload it.\r
\r
---\r
\r
### ⚙️ Preferences\r
\r
A form-based editor for \`data/family-preferences.md\`.\r
\r
| Section | What you can change |\r
|---------|-------------------|\r
| Spice Level | Family baseline: Mild / Medium / Hot |\r
| Dislikes / Avoid | Tag-style list — type + Enter to add, click X to remove |\r
| Dessert Favorites | Same tag-style editor |\r
| Common Proteins | List with add/remove; type + Enter to add |\r
\r
Click **Save Preferences** when done.\r
\r
> **Note on cuisine preferences:** The full cuisine preference table (frequencies, notes) in \`data/family-preferences.md\` is managed directly in VS Code. The webapp handles the most frequently changed fields. If you want to update cuisine frequencies, open the file in VS Code.\r
\r
---\r
\r
### 🔧 Maintenance Tracker\r
\r
Track home maintenance dates. All fields are date pickers with a **"Today"** shortcut button.\r
\r
**On desktop:**\r
- Click inside a date field to open the browser's native date picker\r
- Or type the date directly in \`YYYY-MM-DD\` format\r
- Click **Today** to auto-fill today's date\r
\r
**Overdue indicators:**\r
Items past their threshold show a red **"Overdue"** badge. These also show up as red alert cards on the Dashboard.\r
\r
---\r
\r
## Part 5 — Working Alongside VS Code\r
\r
The power of Home Agents is the combination of the **webapp** (for quick daily updates on any device) and **VS Code agents** (for AI-generated meal plans, recipes, and complex decisions).\r
\r
### Typical workflow\r
\r
| Task | Where |\r
|------|-------|\r
| Log tonight's dinner | Webapp → Cook Log |\r
| Check pantry before shopping | Webapp → Pantry |\r
| Generate next week's meal plan | VS Code → HomeChef agent |\r
| View the generated meal plan | Webapp → Meal Plan |\r
| Update dislikes or protein list | Webapp → Preferences |\r
| Record HVAC filter change | Webapp → Maintenance |\r
| Write a new recipe | VS Code → recipes/ folder |\r
\r
### How data stays in sync\r
\r
All data files live in your GitHub repo (\`data/\` folder). Both the webapp and the VS Code agents read from and write to the same files:\r
\r
\`\`\`\r
GitHub repo (source of truth)\r
    ↑↓ Webapp reads/writes via GitHub API\r
    ↑↓ VS Code agents read/write via local git clone\r
\`\`\`\r
\r
Whenever the webapp saves a change, it makes a git commit directly to your GitHub repo. When you pull in VS Code, you'll see those commits in your git history.\r
\r
### Avoiding conflicts\r
\r
- **Don't edit the same file simultaneously** from VS Code and the webapp. For example, don't have the webapp's Pantry screen open with unsaved changes while your VS Code agent is also editing \`pantry-inventory.md\`.\r
- If a conflict does occur, GitHub will reject the webapp's commit with an error — you'll see an error toast in the app. Pull the latest in VS Code, resolve any conflicts, push, then try saving in the webapp again.\r
\r
---\r
\r
## Part 6 — Building and Deploying\r
\r
### Deploy the latest code to GitHub Pages\r
\r
From the \`webapp/\` directory:\r
\r
\`\`\`bash\r
npm run deploy\r
\`\`\`\r
\r
This builds the app and pushes it to the \`gh-pages\` branch of your repo. GitHub Pages automatically serves it at \`https://gengire.github.io/home-agents/\`. Changes are live within about 1–2 minutes.\r
\r
### Build without deploying\r
\r
\`\`\`bash\r
npm run build\r
\`\`\`\r
\r
Outputs optimized files to \`webapp/dist/\`. Useful if you want to inspect the build or test it with \`npm run preview\`.\r
\r
### Preview the production build locally\r
\r
\`\`\`bash\r
npm run build\r
npm run preview\r
\`\`\`\r
\r
Opens a local preview of the production build at \`http://localhost:4173/home-agents/\`.\r
\r
---\r
\r
## Part 7 — Common Questions\r
\r
**Q: I get a "404 Not Found" error when I open the app URL.**\r
Make sure GitHub Pages is enabled on your repo:\r
1. Go to \`https://github.com/YOUR_USERNAME/home-agents/settings/pages\`\r
2. Under "Source", select **Deploy from a branch**\r
3. Select branch **\`gh-pages\`**, folder **\`/ (root)\`**\r
4. Save — the site will be live in a minute or two\r
\r
**Q: I'm getting CORS errors or "Network Error" in the browser console.**\r
This is usually a GitHub API issue. Check:\r
- Your token has \`repo\` scope (not just \`public_repo\`)\r
- Your token hasn't expired\r
- The repo path in Settings matches \`username/repo-name\` exactly (no trailing slash, no \`https://github.com/\` prefix)\r
\r
**Q: The app loads but shows old data even after changes were made in VS Code.**\r
Data is loaded fresh when you navigate to each screen. Click the refresh icon (↻) at the top right of the screen, or navigate away and back.\r
\r
**Q: I want to reset completely and start over.**\r
Go to the Settings screen (gear icon), click **Disconnect**. This clears your local browser storage. The GitHub data is untouched.\r
\r
**Q: Can I use this app without GitHub?**\r
No — the app uses GitHub as its entire data layer. There is no alternative storage backend.\r
\r
**Q: How do I add a new pantry section (e.g. "Condiments")?**\r
The webapp can only add items to existing sections. To add a new section, open \`data/pantry-inventory.md\` directly in VS Code and add a new \`**Section:**\` heading following the existing format. After committing, the new section will appear in the webapp.\r
\r
---\r
\r
## Part 8 — Keyboard Shortcuts\r
\r
| Screen | Action | Shortcut |\r
|--------|--------|---------|\r
| Any form | Submit | **Enter** |\r
| Pantry | Add item | Type in field, press **Enter** |\r
| Cook Log | Submit entry | **Enter** in any field, then click Log It |\r
| Preferences | Add tag | Type in field, press **Enter** |\r
\r
---\r
\r
*For mobile-specific setup (installing to home screen, barcode scanning), see the [Mobile User Guide](mobile-guide.md).*\r
*For GitHub token setup and repo configuration, see the [GitHub Integration Guide](github-integration.md).*\r
`,c=`# Home Agents — GitHub Integration Guide\r
\r
**Everything you need to know about how the app connects to GitHub**\r
\r
This guide explains how Home Agents uses GitHub to store your family data, how to set up a Personal Access Token (PAT), how to manage token expiration, and what to do when things go wrong. No prior GitHub experience required.\r
\r
---\r
\r
## Why GitHub?\r
\r
Home Agents stores all your household data — pantry inventory, cook log, meal plan, family preferences, maintenance schedule — as plain text Markdown files in a private GitHub repository.\r
\r
This design choice means:\r
- **No monthly fees** — GitHub private repos are free\r
- **No server to maintain** — the app is fully static, runs in your browser\r
- **Full history** — every change is a git commit, so you can always see what changed and when\r
- **Works with VS Code agents** — the same files your Copilot agents read and write are the ones the webapp edits\r
- **Cross-device sync** — any family member with the token can access the same data from any device\r
\r
The webapp communicates directly with the GitHub API from your browser. Your data never touches any intermediate server.\r
\r
---\r
\r
## Part 1 — Understanding the Pieces\r
\r
Before diving into setup, here's a plain-English explanation of the key concepts:\r
\r
### GitHub Repository\r
A "repo" is a folder on GitHub that stores your files and tracks every change ever made. Think of it like a shared Google Drive folder, but with version history built in. Your repo is at:\r
\r
\`\`\`\r
https://github.com/gengire/home-agents\r
\`\`\`\r
\r
It's **private** — only you and people you explicitly invite can see it.\r
\r
### Personal Access Token (PAT)\r
GitHub doesn't let apps log in with your username and password. Instead, you generate a special key called a Personal Access Token. It's like a long random password that you paste into the app once. The app uses it to read and write files in your repo.\r
\r
You control what the token can access (only your repos, not your account settings), when it expires, and you can revoke it any time.\r
\r
### GitHub Pages\r
GitHub offers free static web hosting called GitHub Pages. Your app is deployed to the \`gh-pages\` branch of your repo and served at:\r
\r
\`\`\`\r
https://gengire.github.io/home-agents/\r
\`\`\`\r
\r
This is separate from your data files — your data lives on the \`main\` branch, the app code lives on the \`gh-pages\` branch.\r
\r
---\r
\r
## Part 2 — Generating a Personal Access Token\r
\r
You only need to do this once (or when your token expires).\r
\r
### Step-by-Step\r
\r
1. **Sign in to GitHub** at [https://github.com](https://github.com)\r
\r
2. Click your **profile picture** in the top right corner\r
\r
3. Click **Settings** (near the bottom of the dropdown)\r
\r
4. Scroll down the left sidebar and click **"Developer settings"** (it's at the very bottom)\r
\r
5. Click **"Personal access tokens"** → **"Tokens (classic)"**\r
\r
6. Click the **"Generate new token"** button → **"Generate new token (classic)"**\r
\r
7. Fill in the form:\r
   - **Note:** \`home-agents-webapp\` (just a label so you remember what it's for)\r
   - **Expiration:** Choose \`1 year\` or \`No expiration\`\r
     - "No expiration" means you never have to redo this\r
     - If you work in a security-conscious environment, 1 year is a good balance\r
   - **Scopes:** Check **only** the box next to \`repo\`\r
     - This gives the token read/write access to your private repositories\r
     - Do NOT check any other boxes — the app doesn't need them\r
\r
8. Scroll to the bottom and click **"Generate token"**\r
\r
9. **IMPORTANT:** Copy the token immediately — it starts with \`ghp_\` and is about 40 characters long. GitHub will only show it once. If you navigate away without copying it, you'll have to generate a new one.\r
\r
   > Copy it to your password manager (LastPass, 1Password, Apple Keychain, etc.) or paste it somewhere safe. You'll need it on each device and browser where you want to use the app.\r
\r
---\r
\r
## Part 3 — Connecting the App to GitHub\r
\r
### First-Time Connection\r
\r
1. Open the app at [https://gengire.github.io/home-agents/](https://gengire.github.io/home-agents/)\r
\r
2. You'll see the **Connect to GitHub** screen\r
\r
3. Paste your token into the **"GitHub Personal Access Token"** field\r
\r
4. The **Repository** field should already say \`gengire/home-agents\` — leave it as-is unless you know your repo path is different\r
   > The format is \`username/repository-name\`. No \`https://github.com/\` prefix.\r
\r
5. Click **Connect**\r
\r
6. If the token is valid, you'll be taken to the Dashboard automatically\r
\r
7. If you see an error like "Authentication failed", double-check:\r
   - You copied the full token (no spaces, no truncation)\r
   - The repo path is correct\r
   - The token has \`repo\` scope\r
\r
### How the Token is Stored\r
\r
Your token is saved in your browser's **localStorage** — a private storage area that only the Home Agents app on that browser can access. It is:\r
- **Not** sent to any server other than GitHub's API\r
- **Not** stored in your GitHub repo\r
- **Not** accessible to other websites\r
- **Cleared** if you clear your browser's site data or use private/incognito mode\r
\r
This means you'll need to enter your token separately on each device (phone, home computer, work computer) and each browser you use.\r
\r
---\r
\r
## Part 4 — How the App Reads and Writes Files\r
\r
Every time you save a change in the webapp, here's exactly what happens behind the scenes:\r
\r
### Reading a file\r
1. The app calls the GitHub API: \`GET /repos/{owner}/{repo}/contents/{path}\`\r
2. GitHub returns the file's content (base64-encoded) plus a \`sha\` hash\r
3. The app decodes the content and displays it\r
\r
### Writing a file\r
1. The app prepares the updated content (e.g. updated pantry markdown)\r
2. Calls the GitHub API: \`PUT /repos/{owner}/{repo}/contents/{path}\`\r
3. Sends: the new content, the original \`sha\` (GitHub requires this to prevent conflicts), and a commit message\r
4. GitHub creates a new git commit with your changes\r
5. The app stores the new \`sha\` for any subsequent saves\r
\r
### What this looks like in your git history\r
Every save from the webapp creates a real git commit. In VS Code, if you run \`git pull\` and then look at \`git log\`, you'll see entries like:\r
\r
\`\`\`\r
a3f1b2c  Pantry update — May 3, 2026\r
8e4d9a1  Cook log — Red Lentil Dal 2026-05-03\r
2b7c3f0  Maintenance update — May 3, 2026\r
\`\`\`\r
\r
This is intentional — it gives you a complete audit trail of all household changes.\r
\r
---\r
\r
## Part 5 — Token Expiration and Renewal\r
\r
### How to tell if your token expired\r
You'll see an error toast in the app when trying to save: **"Save failed: Bad credentials"** or **"Authentication failed"**.\r
\r
The Dashboard will load fine (it shows data from a fresh fetch), but save operations will fail.\r
\r
### How to renew your token\r
\r
**Option A: Regenerate the same token (easiest)**\r
1. Go to [https://github.com/settings/tokens](https://github.com/settings/tokens)\r
2. Find your \`home-agents-webapp\` token\r
3. Click **Regenerate** (or **Renew** if prompted)\r
4. Set a new expiration\r
5. Copy the new token value\r
6. In the app, go to **Settings** (gear icon) → **Disconnect**\r
7. Re-enter the new token on the sign-in screen\r
\r
**Option B: Create a brand new token**\r
Follow the steps in Part 2 again. Then disconnect and reconnect in the app with the new token.\r
\r
> **Tip:** Set a recurring calendar reminder for a few days before your token expires (e.g. if you set 1-year expiration, remind yourself at 11 months).\r
\r
---\r
\r
## Part 6 — Token Security Best Practices\r
\r
Your PAT is basically a password for your GitHub account's private repos. Treat it accordingly.\r
\r
**Do:**\r
- Store it in a password manager (recommended)\r
- Use a descriptive note so you know what it's for\r
- Set an expiration date (1 year is reasonable for personal use)\r
- Revoke the token immediately if you think it was compromised\r
\r
**Don't:**\r
- Share it with anyone\r
- Put it in a text file on your desktop\r
- Commit it to any git repository (GitHub will automatically invalidate it if detected)\r
- Use the same token for multiple apps or services\r
\r
### How to revoke a token\r
If you need to invalidate a token immediately:\r
1. Go to [https://github.com/settings/tokens](https://github.com/settings/tokens)\r
2. Click **Delete** next to the token\r
3. It is instantly and permanently revoked\r
4. Generate a new one and reconnect the app\r
\r
---\r
\r
## Part 7 — Multiple Users / Family Members\r
\r
If your spouse or another family member also wants to use the app:\r
\r
### They need their own token\r
Each person should generate their own PAT using their own GitHub account. For this to work, they need to be a **collaborator** on your private repo.\r
\r
### Adding a collaborator\r
1. Go to your repo on GitHub\r
2. Click **Settings** → **Collaborators and teams**\r
3. Click **"Add people"**\r
4. Enter their GitHub username or email\r
5. They'll receive an invitation — they must accept it\r
\r
Once accepted, they can generate their own PAT (with \`repo\` scope) and connect to the same \`gengire/home-agents\` repo.\r
\r
### Sharing a single token (simpler but less ideal)\r
Within a household, it's practical to share one PAT stored in a family password manager (like 1Password with family sharing, or Apple iCloud Keychain shared with family). All family members use the same token. This is less secure than individual tokens but fine for a private family app.\r
\r
---\r
\r
## Part 8 — Understanding Your Data Files\r
\r
Here's what each file in \`data/\` contains and which part of the app uses it:\r
\r
| File | App Screen | Updated by |\r
|------|-----------|-----------|\r
| \`data/pantry-inventory.md\` | Pantry Manager | Webapp (manual edits + barcode scan) |\r
| \`data/cook-log.md\` | Cook Log | Webapp (append-only) |\r
| \`data/meal-plan.md\` | Meal Plan Viewer | VS Code HomeChef agent (read-only in webapp) |\r
| \`data/family-preferences.md\` | Preferences | Webapp + VS Code agents |\r
| \`data/maintenance-schedule.md\` | Maintenance Tracker | Webapp |\r
\r
### File format overview\r
\r
**pantry-inventory.md** — Bold headings with bullet lists:\r
\`\`\`markdown\r
**Proteins:**\r
- chicken breast\r
- ⬜ salmon (out of stock, shown with hollow circle in app)\r
\r
**Vegetables:**\r
- spinach\r
- broccoli\r
\`\`\`\r
\r
> \`⬜ \` prefix = item is out of stock. The app toggles this prefix when you tap an item.\r
\r
**cook-log.md** — A markdown table (append-only):\r
\`\`\`markdown\r
| Date | Recipe Name | Category | Notes |\r
|------|-------------|----------|-------|\r
| 2026-05-03 | Red Lentil Dal | IND-L | Doubled batch |\r
\`\`\`\r
\r
**meal-plan.md** — Structured markdown with \`### Day — 🍳 NEW COOK\` headings.\r
\r
**family-preferences.md** — Freeform markdown with \`## Section\` headings.\r
\r
**maintenance-schedule.md** — Markdown with \`**Label:** date\` fields and GitHub-style checkboxes.\r
\r
---\r
\r
## Part 9 — Troubleshooting\r
\r
### "Bad credentials" error\r
Your token has expired or been revoked. See Part 5 to renew it.\r
\r
### "Not Found" error when saving\r
The repo path is wrong. Go to Settings, disconnect, and reconnect with the correct \`username/repo-name\`.\r
\r
### "Conflict" or "422 Unprocessable Entity" error\r
The file was modified externally (by a VS Code agent or another device) between when you loaded it and when you tried to save. The app loaded the old \`sha\` and GitHub rejected the update. Fix:\r
1. Refresh the page\r
2. Re-make your changes\r
3. Save again immediately\r
\r
### Commits show "Unknown author" or wrong author\r
The GitHub API commits as the token owner (your GitHub account). This is expected and correct.\r
\r
### The app loads but all screens show loading spinners forever\r
GitHub API rate limit may be hit (60 requests/hour for unauthenticated, 5000/hour with token). If you're seeing this:\r
1. Wait a few minutes\r
2. Make sure your token is connected (not using anonymous access)\r
\r
### Can I see my app's API calls?\r
In Chrome/Firefox, open **Developer Tools** (F12) → **Network tab** → filter by \`api.github.com\`. You'll see every API call the app makes.\r
\r
---\r
\r
## Part 10 — GitHub Pages Deployment (for the App Owner)\r
\r
This only applies to the person who maintains and deploys the webapp code (Chris).\r
\r
### Deploy a new version\r
\`\`\`bash\r
cd webapp\r
npm run deploy\r
\`\`\`\r
\r
This builds the React app and pushes the \`dist/\` folder to the \`gh-pages\` branch. The live site at \`https://gengire.github.io/home-agents/\` updates within 1–2 minutes.\r
\r
### Verify GitHub Pages is enabled\r
1. Go to \`https://github.com/gengire/home-agents/settings/pages\`\r
2. Source should be: **Deploy from branch** → branch **\`gh-pages\`** → folder **\`/ (root)\`**\r
3. The site URL is shown at the top of this settings page\r
\r
### GitHub Pages builds automatically?\r
No — with the current setup (\`gh-pages\` npm package), deployments only happen when you run \`npm run deploy\` manually. There is no automatic CI/CD for the webapp. The VS Code source files commit to \`main\`; the built webapp deploys to \`gh-pages\` — these are separate and independent.\r
\r
---\r
\r
*For mobile-specific setup, see the [Mobile User Guide](mobile-guide.md).*\r
*For desktop usage and local development, see the [Desktop User Guide](desktop-guide.md).*\r
`,l=n(),u=[{id:`mobile`,label:`📱 Mobile`,content:o},{id:`desktop`,label:`💻 Desktop`,content:s},{id:`github`,label:`🔗 GitHub`,content:c}],d={h1:({children:e})=>(0,l.jsx)(`h1`,{className:`text-2xl font-bold text-gray-900 mt-6 mb-3 leading-tight`,children:e}),h2:({children:e})=>(0,l.jsx)(`h2`,{className:`text-lg font-bold text-gray-800 mt-6 mb-2 pb-1 border-b border-gray-200`,children:e}),h3:({children:e})=>(0,l.jsx)(`h3`,{className:`text-base font-semibold text-gray-700 mt-4 mb-2`,children:e}),h4:({children:e})=>(0,l.jsx)(`h4`,{className:`text-sm font-semibold text-gray-700 mt-3 mb-1`,children:e}),p:({children:e})=>(0,l.jsx)(`p`,{className:`text-sm text-gray-700 mb-3 leading-relaxed`,children:e}),ul:({children:e})=>(0,l.jsx)(`ul`,{className:`list-disc list-outside ml-5 mb-3 space-y-1 text-sm text-gray-700`,children:e}),ol:({children:e})=>(0,l.jsx)(`ol`,{className:`list-decimal list-outside ml-5 mb-3 space-y-1 text-sm text-gray-700`,children:e}),li:({children:e})=>(0,l.jsx)(`li`,{className:`leading-relaxed`,children:e}),code:({inline:e,children:t})=>e?(0,l.jsx)(`code`,{className:`bg-gray-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-mono`,children:t}):(0,l.jsx)(`code`,{className:`block bg-gray-900 text-green-300 p-4 rounded-xl text-xs font-mono overflow-x-auto mb-3 whitespace-pre`,children:t}),pre:({children:e})=>(0,l.jsx)(`div`,{className:`mb-3`,children:e}),blockquote:({children:e})=>(0,l.jsx)(`blockquote`,{className:`border-l-4 border-green-400 pl-4 my-3 text-sm text-gray-600 italic bg-green-50 py-2 rounded-r-lg`,children:e}),a:({href:e,children:t})=>(0,l.jsx)(`a`,{href:e,target:`_blank`,rel:`noopener noreferrer`,className:`text-green-600 underline hover:text-green-800`,children:t}),table:({children:e})=>(0,l.jsx)(`div`,{className:`overflow-x-auto mb-4`,children:(0,l.jsx)(`table`,{className:`w-full text-xs border-collapse border border-gray-200 rounded-lg overflow-hidden`,children:e})}),thead:({children:e})=>(0,l.jsx)(`thead`,{className:`bg-gray-100`,children:e}),th:({children:e})=>(0,l.jsx)(`th`,{className:`px-3 py-2 text-left font-semibold text-gray-700 border border-gray-200`,children:e}),td:({children:e})=>(0,l.jsx)(`td`,{className:`px-3 py-2 text-gray-700 border border-gray-200`,children:e}),tr:({children:e})=>(0,l.jsx)(`tr`,{className:`even:bg-gray-50`,children:e}),hr:()=>(0,l.jsx)(`hr`,{className:`my-5 border-gray-200`}),strong:({children:e})=>(0,l.jsx)(`strong`,{className:`font-semibold text-gray-900`,children:e})};function f(){let[e,t]=(0,a.useState)(`mobile`),n=u.find(t=>t.id===e);return(0,l.jsxs)(`div`,{className:`flex flex-col h-full`,children:[(0,l.jsx)(`div`,{className:`flex border-b border-gray-200 bg-white sticky top-0 z-10`,children:u.map(n=>(0,l.jsx)(`button`,{onClick:()=>t(n.id),className:`flex-1 py-3 text-xs font-semibold transition-colors border-b-2 ${e===n.id?`border-green-500 text-green-700 bg-green-50`:`border-transparent text-gray-500 hover:text-gray-700`}`,children:n.label},n.id))}),(0,l.jsx)(`div`,{className:`flex-1 overflow-y-auto`,children:(0,l.jsx)(`div`,{className:`max-w-2xl mx-auto px-4 pb-32 pt-4`,children:(0,l.jsx)(r,{remarkPlugins:[i],components:d,children:n.content})})})]})}export{f as default};