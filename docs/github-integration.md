# Home Agents — GitHub Integration Guide

**Everything you need to know about how the app connects to GitHub**

This guide explains how Home Agents uses GitHub to store your family data, how to set up a Personal Access Token (PAT), how to manage token expiration, and what to do when things go wrong. No prior GitHub experience required.

---

## Why GitHub?

Home Agents stores all your household data — pantry inventory, cook log, meal plan, family preferences, maintenance schedule — as plain text Markdown files in a private GitHub repository.

This design choice means:
- **No monthly fees** — GitHub private repos are free
- **No server to maintain** — the app is fully static, runs in your browser
- **Full history** — every change is a git commit, so you can always see what changed and when
- **Works with VS Code agents** — the same files your Copilot agents read and write are the ones the webapp edits
- **Cross-device sync** — any family member with the token can access the same data from any device

The webapp communicates directly with the GitHub API from your browser. Your data never touches any intermediate server.

---

## Part 1 — Understanding the Pieces

Before diving into setup, here's a plain-English explanation of the key concepts:

### GitHub Repository
A "repo" is a folder on GitHub that stores your files and tracks every change ever made. Think of it like a shared Google Drive folder, but with version history built in. Your repo is at:

```
https://github.com/gengire/home-agents
```

It's **private** — only you and people you explicitly invite can see it.

### Personal Access Token (PAT)
GitHub doesn't let apps log in with your username and password. Instead, you generate a special key called a Personal Access Token. It's like a long random password that you paste into the app once. The app uses it to read and write files in your repo.

You control what the token can access (only your repos, not your account settings), when it expires, and you can revoke it any time.

### GitHub Pages
GitHub offers free static web hosting called GitHub Pages. Your app is deployed to the `gh-pages` branch of your repo and served at:

```
https://gengire.github.io/home-agents/
```

This is separate from your data files — your data lives on the `main` branch, the app code lives on the `gh-pages` branch.

---

## Part 2 — Generating a Personal Access Token

You only need to do this once (or when your token expires).

### Step-by-Step

1. **Sign in to GitHub** at [https://github.com](https://github.com)

2. Click your **profile picture** in the top right corner

3. Click **Settings** (near the bottom of the dropdown)

4. Scroll down the left sidebar and click **"Developer settings"** (it's at the very bottom)

5. Click **"Personal access tokens"** → **"Tokens (classic)"**

6. Click the **"Generate new token"** button → **"Generate new token (classic)"**

7. Fill in the form:
   - **Note:** `home-agents-webapp` (just a label so you remember what it's for)
   - **Expiration:** Choose `1 year` or `No expiration`
     - "No expiration" means you never have to redo this
     - If you work in a security-conscious environment, 1 year is a good balance
   - **Scopes:** Check **only** the box next to `repo`
     - This gives the token read/write access to your private repositories
     - Do NOT check any other boxes — the app doesn't need them

8. Scroll to the bottom and click **"Generate token"**

9. **IMPORTANT:** Copy the token immediately — it starts with `ghp_` and is about 40 characters long. GitHub will only show it once. If you navigate away without copying it, you'll have to generate a new one.

   > Copy it to your password manager (LastPass, 1Password, Apple Keychain, etc.) or paste it somewhere safe. You'll need it on each device and browser where you want to use the app.

---

## Part 3 — Connecting the App to GitHub

### First-Time Connection

1. Open the app at [https://gengire.github.io/home-agents/](https://gengire.github.io/home-agents/)

2. You'll see the **Connect to GitHub** screen

3. Paste your token into the **"GitHub Personal Access Token"** field

4. The **Repository** field should already say `gengire/home-agents` — leave it as-is unless you know your repo path is different
   > The format is `username/repository-name`. No `https://github.com/` prefix.

5. Click **Connect**

6. If the token is valid, you'll be taken to the Dashboard automatically

7. If you see an error like "Authentication failed", double-check:
   - You copied the full token (no spaces, no truncation)
   - The repo path is correct
   - The token has `repo` scope

### How the Token is Stored

Your token is saved in your browser's **localStorage** — a private storage area that only the Home Agents app on that browser can access. It is:
- **Not** sent to any server other than GitHub's API
- **Not** stored in your GitHub repo
- **Not** accessible to other websites
- **Cleared** if you clear your browser's site data or use private/incognito mode

This means you'll need to enter your token separately on each device (phone, home computer, work computer) and each browser you use.

---

## Part 4 — How the App Reads and Writes Files

Every time you save a change in the webapp, here's exactly what happens behind the scenes:

### Reading a file
1. The app calls the GitHub API: `GET /repos/{owner}/{repo}/contents/{path}`
2. GitHub returns the file's content (base64-encoded) plus a `sha` hash
3. The app decodes the content and displays it

### Writing a file
1. The app prepares the updated content (e.g. updated pantry markdown)
2. Calls the GitHub API: `PUT /repos/{owner}/{repo}/contents/{path}`
3. Sends: the new content, the original `sha` (GitHub requires this to prevent conflicts), and a commit message
4. GitHub creates a new git commit with your changes
5. The app stores the new `sha` for any subsequent saves

### What this looks like in your git history
Every save from the webapp creates a real git commit. In VS Code, if you run `git pull` and then look at `git log`, you'll see entries like:

```
a3f1b2c  Pantry update — May 3, 2026
8e4d9a1  Cook log — Red Lentil Dal 2026-05-03
2b7c3f0  Maintenance update — May 3, 2026
```

This is intentional — it gives you a complete audit trail of all household changes.

---

## Part 5 — Token Expiration and Renewal

### How to tell if your token expired
You'll see an error toast in the app when trying to save: **"Save failed: Bad credentials"** or **"Authentication failed"**.

The Dashboard will load fine (it shows data from a fresh fetch), but save operations will fail.

### How to renew your token

**Option A: Regenerate the same token (easiest)**
1. Go to [https://github.com/settings/tokens](https://github.com/settings/tokens)
2. Find your `home-agents-webapp` token
3. Click **Regenerate** (or **Renew** if prompted)
4. Set a new expiration
5. Copy the new token value
6. In the app, go to **Settings** (gear icon) → **Disconnect**
7. Re-enter the new token on the sign-in screen

**Option B: Create a brand new token**
Follow the steps in Part 2 again. Then disconnect and reconnect in the app with the new token.

> **Tip:** Set a recurring calendar reminder for a few days before your token expires (e.g. if you set 1-year expiration, remind yourself at 11 months).

---

## Part 6 — Token Security Best Practices

Your PAT is basically a password for your GitHub account's private repos. Treat it accordingly.

**Do:**
- Store it in a password manager (recommended)
- Use a descriptive note so you know what it's for
- Set an expiration date (1 year is reasonable for personal use)
- Revoke the token immediately if you think it was compromised

**Don't:**
- Share it with anyone
- Put it in a text file on your desktop
- Commit it to any git repository (GitHub will automatically invalidate it if detected)
- Use the same token for multiple apps or services

### How to revoke a token
If you need to invalidate a token immediately:
1. Go to [https://github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Delete** next to the token
3. It is instantly and permanently revoked
4. Generate a new one and reconnect the app

---

## Part 7 — Multiple Users / Family Members

If your spouse or another family member also wants to use the app:

### They need their own token
Each person should generate their own PAT using their own GitHub account. For this to work, they need to be a **collaborator** on your private repo.

### Adding a collaborator
1. Go to your repo on GitHub
2. Click **Settings** → **Collaborators and teams**
3. Click **"Add people"**
4. Enter their GitHub username or email
5. They'll receive an invitation — they must accept it

Once accepted, they can generate their own PAT (with `repo` scope) and connect to the same `gengire/home-agents` repo.

### Sharing a single token (simpler but less ideal)
Within a household, it's practical to share one PAT stored in a family password manager (like 1Password with family sharing, or Apple iCloud Keychain shared with family). All family members use the same token. This is less secure than individual tokens but fine for a private family app.

---

## Part 8 — Understanding Your Data Files

Here's what each file in `data/` contains and which part of the app uses it:

| File | App Screen | Updated by |
|------|-----------|-----------|
| `data/pantry-inventory.md` | Pantry Manager | Webapp (manual edits + barcode scan) |
| `data/cook-log.md` | Cook Log | Webapp (append-only) |
| `data/meal-plan.md` | Meal Plan Viewer | VS Code HomeChef agent (read-only in webapp) |
| `data/family-preferences.md` | Preferences | Webapp + VS Code agents |
| `data/maintenance-schedule.md` | Maintenance Tracker | Webapp |

### File format overview

**pantry-inventory.md** — Bold headings with bullet lists:
```markdown
**Proteins:**
- chicken breast
- ⬜ salmon (out of stock, shown with hollow circle in app)

**Vegetables:**
- spinach
- broccoli
```

> `⬜ ` prefix = item is out of stock. The app toggles this prefix when you tap an item.

**cook-log.md** — A markdown table (append-only):
```markdown
| Date | Recipe Name | Category | Notes |
|------|-------------|----------|-------|
| 2026-05-03 | Red Lentil Dal | IND-L | Doubled batch |
```

**meal-plan.md** — Structured markdown with `### Day — 🍳 NEW COOK` headings.

**family-preferences.md** — Freeform markdown with `## Section` headings.

**maintenance-schedule.md** — Markdown with `**Label:** date` fields and GitHub-style checkboxes.

---

## Part 9 — Troubleshooting

### "Bad credentials" error
Your token has expired or been revoked. See Part 5 to renew it.

### "Not Found" error when saving
The repo path is wrong. Go to Settings, disconnect, and reconnect with the correct `username/repo-name`.

### "Conflict" or "422 Unprocessable Entity" error
The file was modified externally (by a VS Code agent or another device) between when you loaded it and when you tried to save. The app loaded the old `sha` and GitHub rejected the update. Fix:
1. Refresh the page
2. Re-make your changes
3. Save again immediately

### Commits show "Unknown author" or wrong author
The GitHub API commits as the token owner (your GitHub account). This is expected and correct.

### The app loads but all screens show loading spinners forever
GitHub API rate limit may be hit (60 requests/hour for unauthenticated, 5000/hour with token). If you're seeing this:
1. Wait a few minutes
2. Make sure your token is connected (not using anonymous access)

### Can I see my app's API calls?
In Chrome/Firefox, open **Developer Tools** (F12) → **Network tab** → filter by `api.github.com`. You'll see every API call the app makes.

---

## Part 10 — GitHub Pages Deployment (for the App Owner)

This only applies to the person who maintains and deploys the webapp code (Chris).

### Deploy a new version
```bash
cd webapp
npm run deploy
```

This builds the React app and pushes the `dist/` folder to the `gh-pages` branch. The live site at `https://gengire.github.io/home-agents/` updates within 1–2 minutes.

### Verify GitHub Pages is enabled
1. Go to `https://github.com/gengire/home-agents/settings/pages`
2. Source should be: **Deploy from branch** → branch **`gh-pages`** → folder **`/ (root)`**
3. The site URL is shown at the top of this settings page

### GitHub Pages builds automatically?
No — with the current setup (`gh-pages` npm package), deployments only happen when you run `npm run deploy` manually. There is no automatic CI/CD for the webapp. The VS Code source files commit to `main`; the built webapp deploys to `gh-pages` — these are separate and independent.

---

*For mobile-specific setup, see the [Mobile User Guide](mobile-guide.md).*
*For desktop usage and local development, see the [Desktop User Guide](desktop-guide.md).*
