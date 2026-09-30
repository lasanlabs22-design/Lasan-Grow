# Lasan Grow

A focused sales CRM: leads with automatic scoring, a drag-and-drop deal pipeline, contacts, companies, a tasks inbox and a dashboard of charts. Built with Next.js (App Router), Drizzle ORM and Postgres, with light and dark themes.

Powered by Lasan Labs.

📘 **New to the app? Read the [User Manual](USER_MANUAL.md)** for a guide to every screen, lead scoring, the pipeline, tasks, roles and settings.

## Features

| Area | What it does |
| --- | --- |
| Welcome | Time-of-day greeting with today's pipeline, tasks due and deals closing |
| Platform console | `/platform` for Lasan staff: create client workspaces, suspend/reactivate, reset owner passwords, manage the Lasan team (no public sign-up) |
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
  (auth)/          sign-in, first-sign-in password change and their server actions
  (app)/           signed-in app: dashboard, leads, deals, contacts, companies, tasks, settings
  welcome/         post-login welcome screen
  platform/        platform console (Lasan staff): workspaces, Lasan team, its own sign-in
components/        UI primitives, charts, modals, activity timeline, forms
lib/
  db/              Drizzle schema and connection (Postgres or embedded PGlite)
  queries/         dashboard and form-option queries
  auth.js          session helpers (JWT cookie)
  lead-score.js    lead scoring rules
  seed.js          default stages and sample data
proxy.js           sign-in redirects, and which domain serves the app vs the console
scripts/           platform-admin.mjs: create the first console admin
drizzle/           SQL migrations
```

## Platform console and domains

Customers can't sign themselves up: Lasan staff create each workspace at `/platform`.

1. Create the first console admin from a terminal (uses `DATABASE_URL` from `.env.local`, so this is the live database):
   ```bash
   npm run platform:admin -- --email you@lasanlabs.com --name "Your Name" --password "Choose-a-strong-1"
   ```
   The same script resets a password (`--email … --password …`), changes a role (`--role staff|admin`), disables or enables (`--disable` / `--enable`) and lists accounts (`--list`). After that, admins add colleagues from **Lasan team** in the console.
2. Sign in at `/platform/login`.
3. For separate domains (like `app.lasanpeople.com` / `ops.lasanpeople.com` in Lasan People), add both domains to the Vercel project and set `APP_HOST` and `CONSOLE_HOST` (e.g. `grow.lasanlabs.com` and `ops.grow.lasanlabs.com`). The console then answers only on `CONSOLE_HOST`, and the customer domain returns 404 for `/platform`. With them unset, every address serves everything.

## Security notes

- Every query and server action is scoped to the signed-in user's workspace, and linked records (contact, company, stage) are checked for ownership before they're written.
- Passwords are hashed with bcrypt, and sessions are signed with `SESSION_SECRET` in httpOnly cookies.
- Workspace settings, stage edits and team management need the owner or admin role. Clearing all data needs the owner.
- Console accounts are separate from workspace users, with their own cookie scoped to `/platform` and a 12-hour session. Every console page and action re-checks the account; changing a console account's password, role or status signs it out everywhere, and 5 wrong passwords lock it for 15 minutes.
- Suspending a workspace locks its users out on their next request. Passwords set by someone else (console or workspace admin) must be replaced at first sign-in.
