# Lasan Grow — User Manual

This guide explains how to use Lasan Grow day to day: capturing leads, running your pipeline, keeping track of customers and follow-ups, and managing your workspace.

---

## Contents

1. [Key ideas](#1-key-ideas)
2. [Getting started](#2-getting-started)
3. [Finding your way around](#3-finding-your-way-around)
4. [Dashboard](#4-dashboard)
5. [Leads](#5-leads)
6. [Deals](#6-deals)
7. [Contacts](#7-contacts)
8. [Companies](#8-companies)
9. [Activities and tasks](#9-activities-and-tasks)
10. [Settings](#10-settings)
11. [Roles and permissions](#11-roles-and-permissions)
12. [Everyday workflow](#12-everyday-workflow)
13. [FAQ and troubleshooting](#13-faq-and-troubleshooting)

---

## 1. Key ideas

| Term | Meaning |
| --- | --- |
| **Workspace** | Your company's private CRM. Everyone in a workspace shares the same data. Other workspaces can never see it. |
| **Lead** | Someone who *might* buy but hasn't been qualified yet: an enquiry, a referral, a sign-up. |
| **Contact** | A real person you're dealing with. |
| **Company** | The organisation a contact works for. |
| **Deal** | A specific sales opportunity with a value, moving through pipeline stages until it's **won** or **lost**. |
| **Stage** | A step in your pipeline (e.g. *Demo scheduled*). Each open stage has a **win probability**. |
| **Weighted value** | Deal value × stage probability. A ₹1,00,000 deal at 40% counts as ₹40,000 of forecast. |
| **Activity** | A note, call, meeting, email or task logged against a deal, contact or company. |

The usual journey is: **Lead → (convert) → Contact + Company + Deal → Won or Lost.**

---

## 2. Getting started

### Create your workspace

1. Open the app and click **Get started** (or go to `/signup`).
2. Fill in your name, a workspace name (usually your company name), work email, a password of 8+ characters, and your **currency**.
3. Choose whether to **fill the workspace with sample data**:
   - **Ticked:** you get realistic demo companies, contacts, leads, deals and tasks, so you can explore the charts and pipeline immediately.
   - **Unticked:** you start with a clean, empty workspace.
4. Click **Create workspace**. You become the workspace **Owner**.

> **Tip:** Sample data is stored as ordinary records. When you're ready to go live, clear it from **Settings → Danger zone** *before* entering real data. Clearing removes all records, not just the samples.

### Sign in

Go to `/login` and enter your email and password. After signing in you'll see the **welcome screen**, which shows your open pipeline, tasks due today and deals closing this week. Click **Enter your workspace** or press **Enter**.

### Sign out

Click the **sign-out icon** next to your name at the bottom of the sidebar.

---

## 3. Finding your way around

### Sidebar

| Item | What it's for |
| --- | --- |
| **Dashboard** | Your sales pulse: KPIs and charts |
| **Leads** | New enquiries, scored and ready to qualify |
| **Deals** | The pipeline board and list |
| **Contacts** | The people you sell to |
| **Companies** | The accounts they belong to |
| **Tasks** | Your follow-up inbox |
| **Settings** | Profile, workspace, pipeline and team |

On mobile, tap the **☰ menu** in the top-left to open the sidebar.

### Search and quick-create (`Ctrl + K`)

Press **Ctrl + K** (or **⌘ + K** on Mac), or click **Search or create…** in the top bar.

- **Before you type**, it shows quick actions: *New deal, New lead, New contact, New company, New task*.
- **Type 2+ characters** to search deals, contacts, companies and leads at once. Several words narrow it down, in any order: *aarav fernandes*, *fernandes aarav* or *aarav northwind* all find Aarav Fernandes at Northwind. Matching words are shown in bold.
- Use **↑ / ↓** to move, **Enter** to open, **Esc** to close.

### Searching lists

The search box on **Leads**, **Deals → List**, **Contacts** and **Companies** filters as you type; there's no need to press Enter. It works with several words in any order and keeps your current tab or sort. Click **×** or press **Esc** to clear it.

### Light and dark mode

Use the **sun/moon toggle** in the top-right corner, or choose **Light / Dark / System** under **Settings → Appearance**.

---

## 4. Dashboard

The dashboard updates automatically as you work.

**KPI tiles (top row)**

| Tile | What it shows |
| --- | --- |
| **Won this month** | Value of deals marked won this calendar month, with the change vs last month and a 12-month sparkline |
| **Open pipeline** | Total value of open deals, plus the **weighted** value and deal count |
| **Win rate · 90 days** | Won ÷ (won + lost) for deals closed in the last 90 days, with average won deal size |
| **New leads this month** | Leads created this month vs last month |

**Charts**

- **Revenue:** won value (blue area) vs lost value (orange dashed line) per month for the last 12 months. Hover a month for exact figures.
- **Pipeline by stage:** open value, number of deals and win probability in each stage. Click **Board** to jump to the pipeline.
- **Where wins come from:** won revenue by lead source (top 5, the rest grouped as *Other*). Hover a slice or legend row to highlight it.
- **Why deals are lost:** the most common lost reasons.
- **Team activity:** a 16-week heatmap of completed calls, meetings and tasks. Darker squares mean busier days; hover a square for the count.

**Lists**

- **Biggest open deals:** your five highest-value open deals.
- **Up next:** your soonest open follow-ups; overdue items are marked in red.

Use **+ Lead** and **+ New deal** in the header to add records quickly.

---

## 5. Leads

### Lead score

Every lead gets a score from **0–100** so you know who to call first. The score is built from simple, visible factors:

| Factor | Points |
| --- | --- |
| Has an email | +15 |
| Has a phone number | +10 |
| Company name known | +10 |
| Source: Referral / Partner / Event / Website / LinkedIn / Google Ads / Cold outreach | +25 / +20 / +15 / +12 / +10 / +8 / +5 |
| Estimated value: ≥ 5L / ≥ 2L / ≥ 50K / any | +25 / +18 / +10 / +5 |
| Status: Contacted / Qualified | +5 / +15 |
| Status: Unqualified | score capped at 20 |

Scores are labelled **Hot** (70+), **Warm** (40–69) and **Cold** (under 40). When you add or edit a lead, the form shows the score and each factor **live as you type**.

### Working with leads

- **Add a lead:** click **New lead**, fill in the details and click **Add lead**.
- **Edit:** click the lead's name.
- **Change status:** use the status dropdown in the table (*New → Contacted → Qualified*, or *Unqualified*). The score updates automatically.
- **Filter:** use the tabs (*Active, New, Contacted, Qualified, Unqualified, Converted*) and the search box. *Active* hides unqualified and converted leads.
- **Delete:** hover the row and click the **bin icon**.

The tiles at the top show active leads, hot leads, potential value and your conversion rate.

### Converting a lead

When a lead is ready to buy, click **Convert**. Lasan Grow will:

1. Create a **contact** for the person.
2. Link the **company** if one with the same name exists, otherwise create it.
3. Open a **deal** in the first pipeline stage using the lead's estimated value.
4. Move any activity logged on the lead onto the new deal and contact.
5. Mark the lead **Converted** and take you straight to the new deal.

---

## 6. Deals

### The pipeline board

**Deals → Board** shows one column per open stage. Each column header shows the number of deals, the total value, the stage probability and the weighted value.

Each card shows the deal name, company, value, expected close date (red if it has passed) and the contact's initials.

- **Move a deal:** drag the card to another column. The change saves instantly.
- **Win or lose a deal:** start dragging and two zones appear at the bottom: **Drop to mark lost** and **Drop to mark won**.
  - Dropping on **Won** closes the deal as won and shows a confirmation.
  - Dropping on **Lost** asks for a **reason** (pick one or type your own). Reasons feed the "Why deals are lost" chart.
- **Add a deal to a specific stage:** click **+** in that column's header.

Won and lost deals leave the board. Find them in the **List** view.

### The list view

Click **List** to see deals in a table. Filter by **Open / Won / Lost / All** and search by deal name, company or contact.

### Creating or editing a deal

Fields: **name, value, stage, contact, company, expected close date, source**. Picking a contact fills in their company automatically if the company field is empty.

### The deal page

Click any deal to open it.

- **Stage stepper:** click any stage to move the deal there.
- **Mark won** / **Lost** (asks for a reason) / **Reopen** (for closed deals).
- **✏️ Edit** and **🗑 Delete**. Deleting a deal also deletes its activity history.
- **Details:** contact with email and phone links, company, expected close, source, owner and created date.
- **Activity:** log notes, calls and meetings, or schedule tasks for this deal (see [section 9](#9-activities-and-tasks)).

---

## 7. Contacts

**Contacts** lists everyone you sell to, with their company, email, phone, open-deal value and **last touch** (the most recent completed activity with them).

- **Search** by full name, email, phone, job title or company.
- **Add:** click **New contact**.
- **Open a contact** to see open pipeline and lifetime won value, their details, their deals and their full activity timeline.
- Use the **Email** and **Call** buttons to open your mail app or dialler.
- **Edit** with the pencil icon. **Delete** with the bin icon: their deals remain but lose the link to this person, and their activity log is deleted.

---

## 8. Companies

**Companies** shows each account as a card with industry, city, number of people, open pipeline and revenue won. Sort by **Open pipeline**, **Revenue won** or **Name**, and search by name, website, industry or city.

Open a company to see:

- **Stats:** open pipeline, revenue won, win rate and number of people.
- **People:** everyone at the company. Titles such as CEO, Founder, VP or Head of are tagged **Decision maker**. Click **New contact** to add someone with the company already selected.
- **Deals** with this account.
- **Account activity:** everything logged on the company, its people and its deals, in one timeline, labelled with the person involved.

Deleting a company keeps its contacts and deals but removes their link to the company. Activities logged directly on the company are deleted.

---

## 9. Activities and tasks

### Logging activity

On any deal, contact or company page, use the activity box:

| Tab | Use it for | Behaviour |
| --- | --- | --- |
| **Note** | Meeting notes, objections, context | Saved as done immediately |
| **Call** / **Meeting** | Something that happened *or* something booked | Without a date it's logged as done; with a date it's scheduled as an open item |
| **Task** | A to-do | Needs a due date and stays open until ticked |

In the timeline, **tick the checkbox** to complete an item (tick again to reopen). Hover and click the **bin** to delete. Overdue items show in red.

### The Tasks inbox

**Tasks** collects every open call, meeting, email and to-do across the workspace:

- **Overdue** (red), **Today** and **Upcoming**, soonest first.
- **Done this week** on the right.
- Filter with **Calls / Meetings / Emails / To-dos**.
- Each item links to its deal and contact.
- **New task** lets you set type, due date and time (defaults to tomorrow 10:00), and optionally link a deal and contact.

> **Habit that works:** start each day on **Tasks**, clear **Overdue** first, then **Today**.

---

## 10. Settings

| Section | What you can do | Who |
| --- | --- | --- |
| **Profile** | Change your display name | Everyone |
| **Password** | Change your password (requires the current one) | Everyone |
| **Appearance** | Light, Dark or System theme | Everyone |
| **Workspace** | Rename the workspace; change currency | Owner, Admin |
| **Pipeline stages** | Rename stages, set win %, reorder (↑ ↓), add or delete stages | Owner, Admin |
| **Team** | See members; add a teammate; remove a member | Owner, Admin (to manage) |
| **Danger zone** | Clear all records | Owner only |

### Pipeline stage rules

- Change a stage's name or % and click **Save** on that row.
- New stages are added before *Won* and *Lost*.
- A stage **can't be deleted while it still has deals**. Move them first.
- There must always be at least one open stage.
- **Won** and **Lost** are fixed and can't be renamed or removed.
- Win % drives the **weighted pipeline** on the dashboard and board.

### Adding a teammate

1. **Settings → Team → Add teammate**.
2. Enter their name, email, a **temporary password** (8+ characters) and a role (**Member** or **Admin**).
3. Share the email and temporary password with them privately. They sign in at `/login` and should change the password in **Settings → Password**.

### Changing currency

The currency changes how amounts are **displayed** (symbol and number format). It does **not** convert existing values.

### Clearing all records

**Settings → Danger zone → Clear all records**, then type the workspace name to confirm. This permanently deletes **all leads, contacts, companies, deals and activities**. Your account, team, workspace settings and pipeline stages are kept. This can't be undone.

---

## 11. Roles and permissions

| Action | Owner | Admin | Member |
| --- | :---: | :---: | :---: |
| Use leads, deals, contacts, companies, tasks | ✅ | ✅ | ✅ |
| Edit own profile and password | ✅ | ✅ | ✅ |
| Change workspace name and currency | ✅ | ✅ | — |
| Edit pipeline stages | ✅ | ✅ | — |
| Add and remove teammates | ✅ | ✅ | — |
| Clear all records | ✅ | — | — |

Everyone in a workspace can see and edit all of its CRM records. The owner can't be removed.

---

## 12. Everyday workflow

**Each morning**
1. Sign in and glance at the welcome stats.
2. Open **Tasks** and clear *Overdue*, then *Today*.
3. Check the **Dashboard** for the week's closing deals.

**When a new enquiry arrives**
1. Add it as a **Lead** with as much detail as you have. The score tells you how hot it is.
2. Call or email, then set the status to **Contacted**.
3. Once there's a real opportunity, set it to **Qualified** and click **Convert**.

**While working a deal**
1. After every conversation, log a **Note** or **Call** on the deal.
2. Always schedule the **next step** as a Task with a due date.
3. Drag the deal forward on the board as it progresses.
4. Close it: drop on **Won**, or on **Lost** with an honest reason.

**Each week / month**
- Review **Pipeline by stage** for bottlenecks.
- Review **Why deals are lost** and **Where wins come from** to adjust your approach.
- Tune stage **win %** in Settings so the weighted forecast stays realistic.

---

## 13. FAQ and troubleshooting

**Is there a default login?**
No. Each workspace is created through **Sign up**, and the person who signs up becomes its Owner.

**I forgot my password.**
There's no self-service reset yet. If you're a member or admin, ask an owner or admin to remove you and add you again with a new temporary password. Your workspace's records aren't affected.

**Can people in other workspaces see our data?**
No. Every workspace is isolated. You only ever see your own workspace's records.

**Why doesn't my dashboard show anything?**
The dashboard fills in once you have deals. The revenue chart and win rate need deals marked **won** or **lost**.

**I dragged a deal but it jumped back.**
The move couldn't be saved (for example, the connection dropped). You'll see a "Couldn't move that deal" message. Try again.

**A deal disappeared from the board.**
It was marked won or lost. Find it under **Deals → List → Won / Lost**, and use **Reopen** on the deal page if needed.

**Why can't I delete a pipeline stage?**
It still has deals (move them first), it's the last open stage, or it's *Won*/*Lost*, which are fixed.

**I can't change workspace settings or the pipeline.**
Those need the **Owner** or **Admin** role. Ask an owner or admin.

**Keyboard shortcuts**

| Keys | Action |
| --- | --- |
| `Ctrl/⌘ + K` | Open search and quick-create |
| `↑` `↓` `Enter` | Move through and open search results |
| `Esc` | Close any dialog |
| `Enter` | Continue from the welcome screen |

---

*Powered by Lasan Labs.*
