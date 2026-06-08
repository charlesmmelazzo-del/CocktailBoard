# Cocktail Draft Board

A collaborative tool for drafting a cocktail menu. Everyone shares one pool of
cocktails, but each person arranges their **own board** — dragging cocktail
cards into categories — so you can compare picks and find where you all agree.

## What it does

- **Simple accounts** — sign up with just a username + password. No email, no
  verification.
- **Shared cocktails** — anyone can add or edit a cocktail (a temporary
  name/descriptor, a recipe, and a base spirit). Edits show up for everyone.
- **Per-user boards** — drag cocktails from the **Uncategorized pool** into
  categories and reorder them. A cocktail can only be in one category at a time.
- **Categories** — anyone can add, rename, or remove them; shared by all.
- **Live updates** — the board re-syncs every ~1.5 seconds, so you see other
  people's edits as they happen.
- **Notes** — each person can leave a note on any cocktail. Everyone sees all
  notes, labeled with who wrote them.
- **Counts everywhere** — every category shows how many cocktails it holds and a
  breakdown by base spirit; a global panel shows totals across all cocktails.
- **Board switcher** — view your board, anyone else's board, the **Consensus**
  view (shows where multiple people put the same cocktail in the same category
  with a "4/5 agree" badge, surfacing overlap and disagreement), or **Compare**
  mode, where you check off several people and see their boards stacked together.
- **Admin** — the first account to sign up becomes the admin. Admins get a
  **Manage users** panel to rename users, reset passwords, grant/revoke admin,
  and delete users. (There's always at least one admin, and you can't delete
  yourself.)
- **Bright color coding** — each base spirit has its own vivid color: Bourbon,
  Rye, Single Malt, Rum, Gin, Tequila, Mezcal, Agave Other, Shochu, Brandy,
  Other.

## Deploy to Railway (one project, no other accounts)

1. **Push this repo to GitHub** (already done if you're reading this there).
2. Go to [railway.app](https://railway.app) → **New Project** →
   **Deploy from GitHub repo** → pick this repository.
3. When the first build finishes, click **+ New** (or **Create**) inside the
   project and choose **Database → Add PostgreSQL**. Railway automatically
   provides a `DATABASE_URL` to your app — you don't have to copy anything.
4. Open your app service → **Variables** tab → add one variable:
   - `SESSION_SECRET` = any long random string (e.g. mash the keyboard).
5. Open the app service → **Settings** → **Networking** → **Generate Domain** to
   get a public URL.
6. Visit the URL, create an account, and start adding cocktails. The database
   tables are created automatically on first load.

That's it. Anyone you share the URL with can make their own account and join.

## Environment variables

| Variable         | Where it comes from                                   |
| ---------------- | ----------------------------------------------------- |
| `DATABASE_URL`   | Provided automatically by Railway's Postgres plugin.  |
| `SESSION_SECRET` | You set this once — any long random string.           |

## Running locally (optional, for development)

You need a local PostgreSQL database.

```bash
cp .env.example .env       # then edit DATABASE_URL + SESSION_SECRET
npm install
npm run dev                # http://localhost:3000
```

## Tech

Next.js (App Router) + TypeScript + Tailwind CSS, PostgreSQL via `pg`,
drag-and-drop with `@dnd-kit`, cookie sessions signed with `jose`, passwords
hashed with `bcryptjs`. Live updates use lightweight polling. Everything runs as
a single service.
