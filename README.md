# Lasan Grow

A focused sales CRM: leads with automatic scoring, a drag-and-drop deal pipeline, contacts, companies, a tasks inbox and a dashboard of charts. Built with Next.js (App Router), Drizzle ORM and Postgres, with light and dark themes.

Powered by Lasan Labs.

📘 **New to the app? Read the [User Manual](USER_MANUAL.md)** for a guide to every screen, lead scoring, the pipeline, tasks, roles and settings.

## Features

| Area | What it does |
| --- | --- |
| Welcome | Animated time-of-day greeting with live pipeline stats; confetti on first sign-up |
| Dashboard | Won this month, open and weighted pipeline, win rate, new leads, 12-month revenue trend, stage funnel, win sources, lost reasons, activity heatmap |
| Leads | 0–100 score (explained factor by factor), status tabs, inline status changes, one-click convert to contact + company + deal |
| Deals | Kanban board with drag and drop and Won/Lost drop zones, list view, detail page with stage stepper and activity log |
| Contacts & companies | Searchable lists; detail pages with deals, stats and a rolled-up activity timeline |
| Tasks | Overdue / Today / Upcoming inbox, tick to complete |
| Settings | Profile, password, theme, workspace currency, pipeline stages and probabilities, team members, clear data |
| Everywhere | `Ctrl+K` search and quick-create, multi-workspace data isolation |

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000> and create a workspace. Leave "Fill my workspace with sample data" ticked to see the charts populated.

No database setup is needed locally. When `DATABASE_URL` is unset, the app uses an embedded Postgres (PGlite) stored in `./.data` and applies migrations automatically. To use a real Postgres locally, copy `.env.example` to `.env.local` and set `DATABASE_URL`.

## Deploy: Railway (database) + Vercel (app)

### 1. Postgres on Railway

1. In Railway, create a project and add a **PostgreSQL** service.
2. Open the service's **Variables** tab and copy **`DATABASE_PUBLIC_URL`**. Vercel runs outside Railway's private network, so use the public URL, not `DATABASE_URL`.

### 2. App on Vercel

1. Import the GitHub repo into Vercel (framework: Next.js).
2. Add these environment variables (Production and Preview):
   - `DATABASE_URL`: the Railway public URL from step 1
   - `SESSION_SECRET`: a long random string, e.g. the output of `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
3. Deploy. The `vercel-build` script runs the database migrations before `next build`, so tables are created on the first deploy and updated on later ones.

### Migrations by hand (optional)

```bash
# with DATABASE_URL pointing at Railway in .env.local or your shell
npm run db:migrate
```

After changing `lib/db/schema.js`, run `npm run db:generate` and commit the new file in `drizzle/`.

## Project layout

```text
app/
  (auth)/          login, signup and their server actions
  (app)/           signed-in app: dashboard, leads, deals, contacts, companies, tasks, settings
  welcome/         post-login welcome screen
components/        UI primitives, charts, modals, activity timeline, forms
lib/
  db/              Drizzle schema and connection (Postgres or embedded PGlite)
  queries/         dashboard and form-option queries
  auth.js          session helpers (JWT cookie)
  lead-score.js    lead scoring rules
  seed.js          default stages and sample data
proxy.js           redirects signed-out users away from app pages
drizzle/           SQL migrations
```

## Security notes

- Every query and server action is scoped to the signed-in user's workspace, and linked records (contact, company, stage) are checked for ownership before they're written.
- Passwords are hashed with bcrypt, and sessions are signed with `SESSION_SECRET` in httpOnly cookies.
- Workspace settings, stage edits and team management need the owner or admin role. Clearing all data needs the owner.
