# Home Agents — Mobile User Guide

**For iPhone and Android users**

This guide walks you through everything you need to use the Home Agents webapp on your phone — from first-time setup to everyday use. No prior tech experience required.

---

## What Is Home Agents?

Home Agents is a mobile-friendly webapp your family uses to manage:
- 🧺 **Pantry inventory** — track what you have and what you need to buy
- 📓 **Cook log** — record what meals were cooked each night
- 🗓 **Meal plan** — view this week's planned dinners
- ⚙️ **Family preferences** — update spice levels, dislikes, favorite desserts
- 🔧 **Home maintenance** — track HVAC filters, smoke detectors, and other upkeep

Everything you change is automatically saved back to your private GitHub repository, so it's always in sync across all family devices.

---

## Part 1 — First-Time Setup

### Step 1: Open the App

Visit the app in your phone's browser:

**https://gengire.github.io/home-agents/**

> **iPhone tip:** Use Safari (not Chrome) for the smoothest "install to home screen" experience described below.
>
> **Android tip:** Chrome works best.

---

### Step 2: The Sign-In Screen

The first time you open the app, you'll see a sign-in screen asking for two things:

1. **GitHub Personal Access Token** — a password-like key that lets the app read and write your files
2. **Repository** — the GitHub repo where your files live (already pre-filled as `gengire/home-agents`)

If you haven't set up your token yet, see the **[GitHub Integration Guide](github-integration.md)** first — it takes about 5 minutes and you only do it once.

Once you have your token, paste it into the box and tap **Connect**.

> **Your token is stored only in your browser's local storage.** It never leaves your device or goes through any server. If you clear your browser data, you'll need to enter it again.

---

### Step 3: Install as a Home Screen App (Recommended)

You can add Home Agents to your home screen so it opens like a real app — no browser bar, full screen, just like a native app.

#### On iPhone (Safari):
1. With the app open in Safari, tap the **Share button** (the box with an arrow pointing up, at the bottom of the screen)
2. Scroll down in the share sheet and tap **"Add to Home Screen"**
3. Change the name if you want (e.g. "Home Agents") and tap **Add**
4. The app icon will appear on your home screen

#### On Android (Chrome):
1. With the app open in Chrome, tap the **three-dot menu** (top right)
2. Tap **"Add to Home Screen"** or **"Install app"**
3. Tap **Add** in the confirmation dialog
4. The icon appears on your home screen or in your app drawer

> After installing, always open the app from your home screen icon. This gives you the full-screen experience.

---

## Part 2 — Navigating the App

At the bottom of the screen you'll see a navigation bar with 5 icons. These are your main screens:

| Icon | Screen | What it does |
|------|--------|-------------|
| 🏠 | **Home** | Dashboard — tonight's dinner, quick actions, alerts |
| 🧺 | **Pantry** | Track what's in stock |
| 📓 | **Cook Log** | Record what you cooked |
| 🗓 | **Meals** | View this week's meal plan |
| 🔧 | **Upkeep** | Home maintenance tracker |

Tap any icon to navigate to that screen instantly.

At the top right, there's a **gear icon** (⚙️) — tap it to access Settings, where you can view your connected repo or sign out.

---

## Part 3 — Using Each Screen

### 🏠 Home (Dashboard)

The dashboard gives you a quick overview of everything that matters right now:

- **Tonight's dinner** — pulled from this week's meal plan. Shows whether it's a NEW COOK night (you're making something fresh) or LEFTOVERS night
- **Tomorrow's dinner** — a heads-up for planning
- **Quick actions** — buttons to jump straight to Log Dinner, Pantry, or Home maintenance
- **Meal rotation** — color-coded pills showing which cuisine categories are "available" (not cooked in the last 8 days) vs cooling down
- **Maintenance alerts** — red warning cards for any overdue home maintenance items (HVAC filter, smoke detectors, etc.)

**Tip:** Check the dashboard each morning to see tonight's dinner and make sure nothing important is overdue.

---

### 🧺 Pantry Manager

Use this screen to keep your pantry inventory current.

**Reading the screen:**
- Items with a **green circle ✓** are in stock
- Items with a **hollow circle** (and strikethrough text) are out of stock / need buying
- Items are grouped by category: Proteins, Vegetables, Fruits, Grains, Legumes, Dairy, Herbs & Seasonings, Other

**Tapping an item** toggles it between in stock and out of stock.

**Adding an item:**
1. Scroll to the bottom of any category card
2. Tap the text field that says "Add item…"
3. Type the item name
4. Press **Enter** on your keyboard or tap the **+** button

**Deleting an item:**
- On mobile: **long-press** the item for about half a second, then release — it will disappear
- On desktop: a trash icon appears on the right side of each item

**Scanning a barcode:**
1. Tap the green **Scan** button at the top right of the Pantry screen
2. Your camera will open with a scanning overlay
3. Point your camera at any product barcode
4. The app looks up the product name automatically
5. Confirm or edit the name, choose which pantry section to add it to, then tap **Add to Pantry**
6. If the product isn't found in the database, you can type the name manually

> **Camera permission:** The first time you tap Scan, your phone will ask for camera access. Tap "Allow" — the app only uses the camera for barcode scanning and never stores images.

**Saving changes:**
When you make any changes, a floating **"Save Changes"** button appears at the bottom right. Tap it to commit your changes to GitHub. You'll see a green confirmation toast when it's saved.

> **Don't close the app without saving!** Changes are held in memory until you tap Save. If you navigate away or close the browser, unsaved changes are lost.

---

### 📓 Cook Log

Use this to record what your family cooked each night. This drives the meal rotation system — HomeChef uses this log to avoid repeating the same type of cuisine too often.

**Logging a meal:**
1. The date defaults to **today** — tap to change it if logging for a different day
2. Tap the **Category** dropdown and select the cuisine type (e.g. Indian — Legume, Mediterranean, Mexican)
3. Start typing a recipe name — the app will suggest names from your recipes folder
4. Add optional notes (batch size, modifications, etc.)
5. Tap **Log It**

**Category rotation indicator:**
- Below the form are colored pills for all 10 cuisine categories
- **Green** = available (not cooked in the last 8 days)
- **Red with ⏸** = cooling down (cooked within the last 8 days)

This helps you pick what to log and tells HomeChef what's been overused recently.

**Recent entries:**
Scroll down to see the last 14 days of cook log entries, newest first. Each entry shows the date, recipe name, a color-coded category badge, and any notes.

---

### 🗓 Meal Plan

This is a **read-only** view of the current week's meal plan, generated by HomeChef in VS Code.

The screen shows:
- **Prep Strategy** — a banner at the top describing this week's batch cooking approach
- **Day cards** — one card per day of the week, showing:
  - 🍳 **NEW COOK** (green header) — you're cooking fresh tonight
  - ♻️ **LEFTOVERS** (gray header) — reheating from a previous batch
  - Recipe name, cuisine category, and estimated cook time
- **Desserts This Week** — pink card at the bottom
- **Shopping List** — collapsible card with items to pick up

**No meal plan yet?** You'll see an empty state message. Ask HomeChef in VS Code to generate a plan for the week.

---

### ⚙️ Preferences

Use this to update your family's food preferences. HomeChef reads these when planning meals.

**Spice Level — Family Baseline:**
- Three buttons: 🌶️ Mild / 🌶️🌶️ Medium / 🌶️🌶️🌶️ Hot
- Tap to select the family's default heat level
- Chris's ultra-spicy preference is always shown as a fixed note (it's a household truth)

**Dislikes / Avoid:**
- These ingredients will be avoided in meal planning
- To add: type an ingredient and press Enter or tap **+**
- To remove: tap the **X** on any tag

**Dessert Favorites:**
- Same tag-style editor — add your Pritikin-compliant dessert favorites

**Common Proteins:**
- List of proteins typically in your rotation
- Tap **X** to remove any, type + Enter to add new ones

Tap **Save Preferences** (floating button at bottom) when done.

---

### 🔧 Maintenance Tracker

Track home maintenance dates so nothing slips through the cracks.

**HVAC Section:**
- Last filter changed / Next filter check / Next filter replacement — tap to pick a date, or tap **Today** to set today's date instantly
- Humidity target is shown for reference (not editable)
- Notes field for any HVAC comments

**Safety Section:**
- Smoke/CO detectors last tested
- Detector batteries replaced
- Water heater last flushed
- Gutters last cleaned

**Overdue warnings:** If any date is past its threshold, you'll see a red **"Overdue"** badge next to it. These also appear on the Dashboard as red alert cards.

| Item | Warning threshold |
|------|-----------------|
| HVAC filter change | 90 days |
| Smoke detectors tested | 6 months |
| Detector batteries | 12 months |
| Water heater flush | 12 months |
| Gutters cleaned | 6 months |

**Quick Actions:**
Three checkboxes for tasks in progress — tap to toggle (green circle = done).

Tap **Save Maintenance** when done.

---

## Part 4 — Common Questions

**Q: Do I need an internet connection to use the app?**
Yes — the app reads and writes files from GitHub, which requires an internet connection. There is no offline mode.

**Q: Will my changes show up on other family members' phones?**
Yes — as soon as you save, the changes are committed to the shared GitHub repo. The next time another family member opens the app (or refreshes), they'll see the updated data.

**Q: I tapped Save but got an error. What happened?**
Usually this means your token expired or your internet connection dropped. Try:
1. Check your internet connection
2. Refresh the app and try saving again
3. If that fails, go to Settings and reconnect with your token

**Q: I cleared my browser / got a new phone. Do I have to set up again?**
You'll need to enter your GitHub token again (it's stored in browser storage, not in the cloud). Your data is all safe in GitHub — nothing is lost. See the [GitHub Integration Guide](github-integration.md) for how to retrieve your token.

**Q: The Scan button opened the camera but it won't scan my barcode.**
Try:
- Make sure you have good lighting
- Hold the camera 4–8 inches from the barcode
- Hold your phone steady for a moment
- If the product barcode is damaged or very small, try typing the name manually

**Q: My Meal Plan screen shows "No meal plan yet."**
The meal plan is generated by HomeChef in VS Code (the desktop AI agent), not in the app itself. Open VS Code and ask HomeChef to generate this week's plan.

**Q: How do I sign out?**
Tap the gear icon ⚙️ at the top right, then tap **Disconnect**. This clears your token from the browser. Your data in GitHub is unaffected.

---

## Part 5 — Tips for Daily Use

- **Morning:** Glance at the Dashboard to see tonight's dinner
- **At the grocery store:** Open Pantry and check what's out of stock (hollow circles)
- **After cooking:** Log the meal in Cook Log right away — takes 30 seconds
- **Weekly:** After HomeChef generates the meal plan, open the Meal Plan screen to see the week ahead
- **Monthly:** Check the Maintenance screen for anything approaching overdue

---

*For help with GitHub setup and the Personal Access Token, see the [GitHub Integration Guide](github-integration.md).*
*For desktop-specific features, see the [Desktop User Guide](desktop-guide.md).*
