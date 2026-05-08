# Feature Implementation Plan
**Prepared:** 2026-05-07  
**Status:** Awaiting approval

---

## Reading Notes (Current State)

Before planning, I read the full webapp source. Key facts that shape the plan:

- **Cook log table** has 6 columns: `Date | Recipe Name | Category | Notes | Rating | Feedback`. The `Notes` field carries cooking notes (`"Doubled the batch"`, `"Ate Out — Actually Italian, Spaghetti"`) while `Feedback` carries the rating narrative (`"Yes — needed more spice"`). These are semantically separate already; Feature 1 rationalises this so the two don't diverge silently.
- **CookLog.jsx** has a form with separate `notes` state and form-level `formNote`/`formMakeAgain`/`formRating` state. The history cards have their own `pendingRatings` map. The feedback field currently lives in a separate column from notes.
- **Preferences.jsx** has free-text fields (`cuisineNotes`, `notes`) that are good voice input targets.
- **BottomNav** has 5 fixed tabs. A 6th tab would overflow on very small phones; the Weekly Review screen is better accessed from the Dashboard banner (which already has a pattern for this — the "Tonight's Dinner" widget).
- **mealPlanParser.js** parses day headings, prep strategy, and shopping sections. It does not currently extract per-day recipe names in a structured way — the Weekly Review will need a light extension of this.
- **No `data/weekly-reviews.md` or `data/recipe-notes.json`** exist yet. Both need to be created as empty scaffolds.
- **`client.js` `updateFile`** always requires a `sha`. The barcode cache already solved this with a null-sha strategy. Same pattern applies to new files.
- **Nutrition data** lives in recipe `.txt` files under `recipes/`, in a block starting with `Nutrition Information (per serving):`. The health dashboard will need to parse those files, which can be slow — only load on demand.
- **Web Speech API** (`SpeechRecognition` / `webkitSpeechRecognition`) is available in Chrome/Edge/Safari. Firefox desktop does not support it. A graceful fallback (hide the mic button) is sufficient.

---

## Recommended Build Order

The order below minimises rework. Each feature builds on the previous one without requiring backtracking.

| # | Feature | Why this order |
|---|---------|----------------|
| 1 | Consolidate Notes fields | Cleans up the data model before anything else reads or writes it — all subsequent features write to cook-log.md |
| 2 | Voice input | Pure UI addition; no data model changes; can be dropped into any text field as a reusable hook |
| 3 | Prep time tracking | Small cook-log schema addition (new column); do before Weekly Review which reads it |
| 4 | Weekly Review screen | Reads cook-log, meal-plan, and recipe files; creates weekly-reviews.md |
| 5 | Ingredient recycling | Extension of the Weekly Review screen; reuses its recipe-file-reading logic |
| 6 | Recipe iteration history | Creates recipe-notes.json; feeds into Weekly Review notes and health dashboard |
| 7 | Health trend dashboard | The heaviest feature; reads the most files; best built last when all data is stable |

---

## Feature 1 — Consolidate Notes Fields

### Problem
The cook log currently has two separate text fields that serve overlapping purposes:
- **Notes** (col 4): cooking notes — `"Doubled the batch"`, `"Ate Out — Italian"`
- **Feedback** (col 6): rating narrative — `"Yes — needed more spice"`

In the CookLog form, `notes` and `formNote` are separate state variables. When editing an entry, the user sees two fields. This is confusing and the split is arbitrary from the user's perspective.

### Decision
Keep both columns in cook-log.md (backward-compatible). Merge the UI into **one "Notes" field** in the log form that stores its value in the `Notes` column. The `Feedback` column stores only the structured `"Yes — [text]"` / `"Maybe — [text]"` / `"No — [text]"` string — the `[text]` part is now always what the user typed in the single notes field when a Yes/Maybe/No was selected during logging. On edit, the single Notes field pre-fills from the Notes column.

**What changes:**
- `CookLog.jsx`: Remove `formNote` state. The `notes` field in the form doubles as the feedback text. When submitting, if `formMakeAgain` is set, write `feedback = "Yes — [notes]"` (or Maybe/No). The Notes column stores any note that does not relate to make-again.
- `cookLogParser.js`: No column changes. `parseCookLog` already reads both columns separately. No breaking changes.
- `cook-log.md`: No format change. Existing rows unaffected.
- **UX**: Form shows one Notes/feedback input. The Yes/Maybe/No buttons stay. Stars stay. The "How was it?" section remains but the text input below the buttons is now the same `notes` field (lifted up), making it feel like: "Notes about this meal → also used as your feedback comment when you rate it."

### Files changed
- `webapp/src/screens/CookLog.jsx`

### Testing checklist
- [ ] Log a new meal with a note and a Yes rating — both columns written correctly
- [ ] Log without a rating — Notes column has the note, Feedback column is empty
- [ ] Edit an existing entry — Notes field pre-fills from Notes column
- [ ] Existing entries with separate Notes and Feedback columns still display correctly

---

## Feature 2 — Voice Input

### Goal
Add a mic button next to every free-text input in the app. Tapping it starts speech recognition; text is appended to the field. Tapping again (or silence) stops it.

### Implementation

**New reusable hook: `webapp/src/hooks/useSpeechInput.js`**
```
useSpeechInput(onResult)
→ { listening, supported, start, stop }
```
- Uses `window.SpeechRecognition || window.webkitSpeechRecognition`
- If unsupported: `supported = false`, mic button is hidden (not greyed out — cleaner)
- `continuous: false`, `interimResults: false` — fires once per phrase, appends to current value
- On result: calls `onResult(transcript)` — caller appends to their field state
- Cleans up on unmount

**New reusable component: `webapp/src/components/MicButton.jsx`**
```jsx
<MicButton value={fieldValue} onChange={setFieldValue} disabled={saving} />
```
- Red pulsing circle `animate-ping` while listening
- Mic icon from lucide-react (`Mic`, `MicOff`)
- `hidden` when `!supported`
- Wraps `useSpeechInput` internally

**Fields that get a mic button (paired with a wrapper flex div):**
- CookLog: the unified Notes field
- Preferences: `cuisineNotes` textarea, `notes` textarea
- Any future free-text fields

**No API key, no server, no cost.** Works offline on supported browsers.

### Files changed
- `webapp/src/hooks/useSpeechInput.js` (new)
- `webapp/src/components/MicButton.jsx` (new)
- `webapp/src/screens/CookLog.jsx`
- `webapp/src/screens/Preferences.jsx`

### Browser support note
Chrome, Edge, Safari (iOS 14.5+): supported. Firefox: not supported → mic button hidden automatically.

---

## Feature 3 — Meal Prep Time Tracking

### Goal
Optional "Actual prep time" field on the cook log form. Stored in cook-log.md. HomeChef reads it to calibrate weeknight time recommendations.

### Data model change
Add a 7th column to the cook-log.md table: **`Prep (min)`**

```
| Date | Recipe Name | Category | Notes | Rating | Feedback | Prep (min) |
```

Existing rows get an empty cell. Parser is backward-compatible (col index 6, optional).

### Implementation

**`cookLogParser.js`:**
- `parseCookLog`: read `prepTime = cols[6] ? parseInt(cols[6], 10) || null : null`
- `appendCookLogEntry`: write `| ... | ${prepTime ?? ''} |`
- `updateCookLogEntry`: same
- `updateCookLogRating`: preserve prepTime column

**`CookLog.jsx`:**
- Add `formPrepTime` state (number, empty string default)
- Add a compact `<input type="number" min="0" max="480" placeholder="min" />` in the form, next to the Date/Category row (doesn't take its own full row)
- Label: "Actual cook time (min)" with a small ⏱ icon
- Include in submit and edit round-trip

**`homechef.agent.md`:**
Add a section: **`## Actual Prep Time Analysis`**
- Before planning weeknight meals, scan PrepTime values in cook-log.md for the last 8 weeks
- Calculate average actual time per category
- If the family's actual IND-P average is 75 min (vs 60 min estimated), adjust weeknight recommendations: use 75 min as the realistic threshold, not 45 min
- Flag in meal plan header: *"Your average weeknight cook time for Indian Protein meals is ~75 min — scheduled for days with more lead time."*

### Files changed
- `data/cook-log.md` (header only — add column)
- `webapp/src/utils/cookLogParser.js`
- `webapp/src/screens/CookLog.jsx`
- `.github/agents/homechef.agent.md`

---

## Feature 4 — Weekly Review Screen

### Goal
A structured weekly review accessible from a Sunday banner on the Dashboard. Shows planned vs actual for the week, ratings summary, and lets the family send a compiled review to HomeChef by appending to `data/weekly-reviews.md`.

### Access pattern
- **Always visible on Dashboard**: the Weekly Review is a collapsible card on the Dashboard, always present but collapsed by default. Tapping the header expands it in place.
- **Sunday**: the card auto-expands and shows a subtle highlight to prompt the weekly review
- **No separate route** — all content lives inline on the Dashboard as an expandable section

### Screen sections

**1. This week at a glance**
- Pull `data/meal-plan.md` week range and match to `data/cook-log.md` entries for that date range
- For each planned day: show planned meal + what was actually cooked (or "Not logged")
- Color coding: ✅ cooked as planned, 🔄 cooked something different, ❌ skipped

**2. Ratings summary**
- Average star rating for the week
- List of any entries with notes/feedback
- Flag any ❌ No "Would make again" entries

**3. Nutrition summary** *(if available)*
- Best-effort: for each logged meal that has a recipe file, attempt to pull `Calories` and `Fiber` lines
- Show a simple table: Meal | Cal/serving | Fiber/serving
- If fewer than 3 recipe files found: show "Not enough recipe data yet"

**4. "Send to HomeChef" button**
- Compiles a structured markdown block and appends to `data/weekly-reviews.md` — HomeChef reads this file before every meal plan to understand what the family has been eating, what worked, what didn't, and what ingredients may be left over
- There is no live chat to trigger; this is a file-based handoff that HomeChef consults on its next invocation
- Format:
  ```markdown
  ## Week of [date range]
  **Generated:** [date]
  ### Planned vs Cooked
  | Day | Planned | Cooked | Match |
  ...
  ### Ratings
  Average: X/5
  ...
  ### Notes for HomeChef
  [any feedback text from entries this week]
  ```
- On first use: creates `data/weekly-reviews.md` with a header (sha = null on first commit)
- Button label: "✅ Save review for HomeChef" — sets a success toast: "Review saved. HomeChef will use this for next week's plan."

### `mealPlanParser.js` extension
- Add `extractDayRecipeName(day)` that reliably extracts just the recipe name from a day block (reuse `getDayLabel` logic currently in Dashboard.jsx, moved to parser)

### `homechef.agent.md` update
- Add: **`## Weekly Review`** — before planning, read `data/weekly-reviews.md`; use it for pattern analysis, ingredient recycling context, and rating history that predates the current cook-log window

### Files changed
- `webapp/src/screens/Dashboard.jsx` (add Weekly Review collapsible card section)
- `webapp/src/utils/mealPlanParser.js` (minor extension)
- `data/weekly-reviews.md` (new empty scaffold)
- `.github/agents/homechef.agent.md`

---

## Feature 5 — Ingredient Recycling Suggestions

### Goal
Inside the Weekly Review screen, any skipped planned meal shows a "Recycle ingredients" card. It reads the recipe file to get ingredients, cross-references pantry-inventory.md, and shows which ingredients the family still has.

### Implementation

This is an extension of Feature 4's Weekly Review screen — no new route or screen needed.

**Recipe ingredient extraction:**
- For each skipped meal, look up the recipe file in `recipes/` by matching the planned meal name (same fuzzy match as CookLog autocomplete: `f.name` → display name mapping)
- If found: fetch the file, extract the `Ingredients:` section up to the `Directions:` line
- Parse ingredient names (first word or two before `,` or `(`) into a simple list

**Pantry cross-reference:**
- Load `data/pantry-inventory.md`
- For each ingredient from the recipe, check if a pantry item name contains that ingredient word (case-insensitive substring match — good enough for "lentils", "spinach", "chicken")
- Show: *"From this recipe you still likely have: lentils, spinach, chicken. Push the meal or use these in next week's plan."*

**"Push to next week" action:**
- Copies the meal name to clipboard with a note (no automated editing of meal-plan.md — that's HomeChef's job)
- Shows a toast: *"Copied! Paste this in chat with @HomeChef: 'Carry over [Meal Name] to next week — we still have the ingredients.'"*

**`homechef.agent.md` update:**
- In the Weekly Review section: when `weekly-reviews.md` contains a "Recycled ingredients" note for a meal, prioritise that meal in the next plan and note the available ingredients explicitly

### Files changed
- `webapp/src/screens/WeeklyReview.jsx` (extension of Feature 4)
- `.github/agents/homechef.agent.md`

---

## Feature 6 — Recipe Iteration History

### Goal
When a cook log entry has feedback text (e.g. "needed more spice", "too salty"), store a structured iteration note in `data/recipe-notes.json` keyed by recipe name. HomeChef references these when re-suggesting the recipe.

### Data format
```json
{
  "Saag Chicken": {
    "iterations": [
      {
        "date": "2026-05-04",
        "rating": 4,
        "makeAgain": "Yes",
        "note": "needed more spice",
        "adjustments": []
      }
    ]
  }
}
```

### When notes get written
- **Automatically on save**: when a cook log entry's Feedback column contains text beyond the Yes/Maybe/No prefix, the webapp writes that note to `recipe-notes.json` (create if not exists, append if recipe key exists)
- This happens in the same `saveRating` flow in CookLog.jsx — after committing the cook-log row, check if there's a note text and upsert recipe-notes.json

### Display
- On the cook log history card, if the recipe has previous iteration notes in recipe-notes.json, show a small "📝 2 notes" badge that expands inline to show the history
- No new screen needed

### `homechef.agent.md` update
Add: **`## Recipe Iteration Notes`**
- Before suggesting a previously made recipe, read `data/recipe-notes.json`
- If that recipe has notes: reference them explicitly and call out adjustments: *"Last made 2026-05-04: 4★, 'needed more spice' — I've added +1 tsp cayenne and fresh serrano to the ingredient list."*
- If a recipe has 3+ notes all mentioning the same issue (e.g. "too salty" × 3), include a permanent fix in the recipe suggestion without being prompted

### Files changed
- `data/recipe-notes.json` (new empty scaffold: `{}`)
- `webapp/src/screens/CookLog.jsx`
- `webapp/src/github/client.js` (add `upsertFile` helper for null-sha creates)
- `.github/agents/homechef.agent.md`

---

## Feature 7 — Health Trend Dashboard

### Goal
A "Health" section on the Dashboard (or a dedicated tab accessible from Dashboard). Shows 4-week rolling nutrition trends from cook-log.md + recipe files.

### Access pattern
- New section at the bottom of Dashboard.jsx: "📊 Health Trends" card with a "View Details" button
- Route: `/health` — full screen with charts
- **Not** a bottom nav tab (nav is already at 5 tabs, which is the comfortable max for mobile)

### Data pipeline
1. Get last 28 days from cook-log.md — the entry list
2. For each unique recipe name (ignoring "Ate Out" entries), attempt to load the matching recipe file from `recipes/`
3. Parse `Nutrition Information` block: extract Calories, Fiber, Protein, Fat per serving
4. Multiply by 4 servings (family dinner) to get nightly totals
5. Group by week (Sun–Sat)
6. Calculate weekly averages

**Performance**: recipe files are fetched in parallel with `Promise.allSettled` — missing files just contribute `null` data. Cap at 20 recipe file fetches to avoid GitHub API rate limits.

### Display
- **No charting library** — keep the bundle small. Use CSS-based bar charts (div width as % of max value, Tailwind). Simple, readable, no dependency.
- Per week row: Week | Avg Cal/serving | Avg Fiber/serving | Avg Protein/serving | Pritikin Score
- Pritikin score = % of meals in that week that are not "Ate Out" and have a recipe file (proxy for compliance — not perfect but honest)
- Color indicators: green (on target), amber (close), red (off target) against **per-serving** Pritikin targets. Each batch yields 10–12 servings eaten over 2+ nights — tracking per serving is the right unit, since each person eats 1 serving (Chris may have 2):
  - Calories: 350–500 kcal/serving ✅
  - Fiber: ≥ 6g/serving ✅
  - Protein: ≥ 20g/serving ✅
  - Fat: ≤ 6g/serving ✅
- "Not enough data" message if < 7 days of data with recipe matches

### Files changed
- `webapp/src/screens/HealthTrends.jsx` (new)
- `webapp/src/App.jsx` (add route)
- `webapp/src/screens/Dashboard.jsx` (add Health card widget)

---

## Final Step — homechef.agent.md Update

After all 7 features, a single pass through homechef.agent.md to consolidate all new data source references:

| New data source | What HomeChef does with it |
|-----------------|---------------------------|
| `prep (min)` column in cook-log.md | Recalibrate weeknight time estimates per category |
| `data/weekly-reviews.md` | Read before every plan; use for pattern analysis & recycled ingredient tracking |
| `data/recipe-notes.json` | Reference iteration notes when re-suggesting a recipe; bake in fixes after 3+ identical complaints |
| Ratings in cook-log.md (existing) | Already covered in `## Recipe Rating Analysis` — just reinforce |

---

## Complexity & Risk Assessment

| Feature | Effort | Risk | Notes |
|---------|--------|------|-------|
| 1 — Notes consolidation | Low | Low | UI simplification; no data format change |
| 2 — Voice input | Low | Low | Browser API only; graceful fallback |
| 3 — Prep time | Low | Low | One new column; parser is already extensible |
| 4 — Weekly Review | Medium | Medium | New screen; mealPlanParser extension needed; new file |
| 5 — Ingredient recycling | Low-Medium | Low | Extension of Feature 4; fuzzy match is good enough |
| 6 — Recipe notes | Medium | Low | New JSON file; upsert pattern already proven (barcode cache) |
| 7 — Health trends | Medium-High | Medium | Multiple file fetches; CSS chart approach avoids bundle risk |

**Total estimated scope:** ~2–3 focused build sessions.

---

## Decisions Made (2026-05-07)

1. **Feature 1 — Notes label**: "Notes & feedback" confirmed. The single field clearly doubles as the rating comment.
2. **Feature 4 — Send to HomeChef**: Appends to `data/weekly-reviews.md` only. No live chat. HomeChef reads that file at the start of every meal planning session. The button gives a confirmation toast so the user knows it saved.
3. **Feature 7 — Calorie targets**: Per-serving, not per-family-dinner. Recipes yield 10–12 servings eaten across 2+ nights, so per-serving is the right unit. Targets: 350–500 kcal, ≥6g fiber, ≥20g protein, ≤6g fat per serving.
4. **Feature 4 — Weekly Review location**: Collapsible card section on the Dashboard (no separate route). Auto-expands on Sundays. No 6th nav tab.
