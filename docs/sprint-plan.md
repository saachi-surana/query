# Query — Detailed Sprint Plan

## Current State (What's Built)

### Already Working
- [x] Session creation with 6-char code
- [x] Attendee join via code
- [x] Question submission (500-char limit, anonymous toggle)
- [x] As-you-type similar question detection (upvote instead)
- [x] Real-time AI clustering via Claude Haiku
- [x] AI-generated summary question per cluster
- [x] Upvote/un-upvote with sorted question list
- [x] Mark questions/clusters as answered (with unmark)
- [x] Collapsible answered section with cluster subtabs
- [x] Threaded replies (host + attendee)
- [x] Host reply auto-marks question as answered
- [x] "My Questions" tab for attendees
- [x] Copy session code + copy join link buttons
- [x] Real-time Supabase subscriptions on all tables
- [x] Connection status indicator

### What's Missing for MVP
- [x] Presentation display view (projectable)
- [x] Question moderation toggle
- [x] Export session data
- [x] Session description visible to attendees
- [x] Attendee cluster view (read-only)
- [x] "Discussing now" cluster highlight
- [x] Better empty states & onboarding

---

## Sprint 1: Event-Ready MVP Polish

**Status**: COMPLETED

**Goal**: Make Query usable at a real live event. A host should be able to create a session, project it on screen, moderate questions, and manage the session end-to-end.

### 1.1 Presentation Display View (`/present/[code]`)
**Priority**: Critical — every competitor has this, events need a projectable screen

**What it is**: A clean, full-screen, dark-themed page designed to be projected on a screen or shared via screen-share during an event.

**UI spec**:
- Full-screen layout, dark background (dark gray/black), large readable text
- Top bar: Session title + "Query" branding + live question count
- Main content area cycles through or shows:
  - The currently highlighted cluster's summary question (large text, centered)
  - Question count badge ("12 people asked about this")
  - Below: scrolling list of top clusters sorted by question count
  - Each cluster shows: title, question count, summary question preview
- Auto-updates in real time as new questions come in
- No controls visible (this is attendee-facing / projector view)
- Optional: QR code overlay with join link so attendees can scan to join

**Route**: `app/present/[code]/page.tsx`

**Data**: Same Supabase subscriptions as moderator page (questions, clusters). Read-only.

**Files to create**:
- `app/present/[code]/page.tsx`

**Estimated complexity**: Medium

---

### 1.2 Question Moderation Toggle
**Priority**: Critical — hosts expect to approve questions before they go public. Slido charges $720/yr for this.

**What it is**: When enabled, new questions go into a "pending review" state. The host sees them in a review queue and can approve or dismiss. Only approved questions appear to attendees and in clusters.

**Database changes**:
- Add `moderation_enabled boolean not null default false` to `sessions` table
- Add `approved boolean not null default true` to `questions` table (default true so existing questions aren't broken)
- Migration SQL file: `supabase-add-moderation.sql`

**Host flow**:
- Toggle in session header: "Moderation: On/Off"
- When ON, new questions arrive with `approved = false`
- New section on moderator dashboard: "Pending Review" (above clusters)
  - Shows unapproved questions with Approve / Dismiss buttons
  - Approve sets `approved = true` and triggers clustering
  - Dismiss deletes the question (or archives it)
- Clustering API only runs on approved questions

**Attendee flow**:
- When moderation is ON, after submitting a question, attendee sees: "Your question is pending moderator review"
- Their question appears in "My Questions" tab with a "Pending Review" badge
- Once approved, status changes to "Pending" (normal)

**Files to modify**:
- `lib/supabase.ts` — update Session type
- `app/session/[code]/page.tsx` — add moderation toggle + pending review section
- `app/join/[code]/page.tsx` — show "pending review" state
- `app/api/cluster/route.ts` — only cluster approved questions
- `supabase-schema.sql` — update schema
- New: `supabase-add-moderation.sql` — migration

**Estimated complexity**: Medium-High

---

### 1.3 Export Session Data
**Priority**: High — Slido paywalls this. We give it free.

**What it is**: A button on the moderator dashboard that downloads all session data as a CSV file.

**Export format** (CSV with columns):
```
Cluster, Summary Question, Question Text, Author, Anonymous, Upvotes, Status, Replies, Timestamp
```

**UI**: "Export" button in the session header, next to the copy buttons. Downloads immediately.

**Implementation**: Client-side CSV generation from the already-loaded questions/clusters/replies state. No API needed.

**Files to modify**:
- `app/session/[code]/page.tsx` — add export button + CSV generation function

**Estimated complexity**: Low

---

### 1.4 Session Description on Join Page
**Priority**: Medium — builds trust, gives attendees context

**What it is**: The session description (already stored in DB) is displayed on the attendee join page below the session title.

**UI**: Below the header title, show the description in a muted text block. If no description, show nothing.

**Files to modify**:
- `app/join/[code]/page.tsx` — display `session.description` in the header area

**Estimated complexity**: Very Low

---

### 1.5 Better Empty States & Onboarding
**Priority**: Medium — top Slido complaint is confusing first-time experience

**What it is**: Improve the empty state on the moderator dashboard and the home page.

**Moderator empty state improvements**:
- Current: "Waiting for questions..." with code
- Better: Step-by-step guide card:
  1. "Share this code with your audience" (code + copy buttons)
  2. "Questions will appear here, automatically grouped by topic"
  3. "Mark clusters as answered as you address them"
- Show the join URL prominently
- Add a QR code for the join link (using a simple QR generation)

**Home page improvements**:
- Clearer value proposition text
- Visual showing the clustering feature

**Files to modify**:
- `app/session/[code]/page.tsx` — improve empty state
- `app/page.tsx` — improve home page copy

**Estimated complexity**: Low-Medium

---

## Sprint 2: Differentiation Features

**Status**: COMPLETED

**Goal**: Ship features that no competitor has. Make the "why Query over Slido" argument obvious.

### 2.1 "Discussing Now" Cluster Highlight
**Priority**: High — creates two-way awareness between host and audience

**What it is**: Host can mark a cluster as "currently being discussed." This is shown prominently on the attendee view and the presentation display.

**Database changes**:
- Add `highlighted_cluster_id uuid references clusters(id)` to `sessions` table

**Host flow**:
- Each cluster card gets a "Discuss" button (microphone or spotlight icon)
- Clicking it sets this cluster as the highlighted one (only one at a time)
- Clicking again un-highlights

**Attendee flow**:
- If a cluster is highlighted, show a banner at the top of the attendee page: "Currently discussing: [cluster summary question]"
- In the "All Questions" tab, questions belonging to the highlighted cluster get a subtle highlight

**Presentation display**:
- The highlighted cluster's summary question is shown prominently (largest text, centered)

**Files to modify**:
- `lib/supabase.ts` — update Session type
- `app/session/[code]/page.tsx` — add highlight button to ClusterCard
- `app/join/[code]/page.tsx` — show highlighted cluster banner
- `app/present/[code]/page.tsx` — show highlighted cluster prominently
- `supabase-schema.sql` + migration

**Estimated complexity**: Medium

---

### 2.2 Attendee Cluster View (Read-Only)
**Priority**: High — attendees see their question is part of a larger theme

**What it is**: A new tab on the attendee page showing the same cluster view the host sees, but read-only (no mark/unmark, no moderation).

**UI**: New tab "Topics" between "All Questions" and "My Questions"
- Shows clusters with question counts
- Expandable to see the AI summary question + individual questions
- Upvote buttons still work from this view
- Highlighted cluster (if any) shown at top with a badge

**Files to modify**:
- `app/join/[code]/page.tsx` — add "Topics" tab, load clusters, subscribe to cluster changes

**Estimated complexity**: Medium

---

### 2.3 Post-Session Follow-Up Answers
**Priority**: High — massive gap in every competitor, your dad's suggestion

**What it is**: After a session ends, unanswered questions remain accessible. The host can write follow-up answers asynchronously.

**How it works**:
- Sessions don't "close" — the URL remains live forever
- After the event, the host can still visit `/session/[code]` and reply to unanswered questions
- Attendees can revisit `/join/[code]` anytime and see if their question got a follow-up response
- The host reply system already supports this (replies table + real-time)
- Add a visual indicator: "Session ended — follow-up answers may still be posted"

**Optional enhancement**: Add `ended_at timestamp` to sessions table. Host clicks "End Session" which:
- Stops accepting new questions
- Shows "This session has ended" to attendees
- But the page remains viewable with all Q&A + follow-up answers

**Database changes**:
- Add `ended_at timestamp with time zone` to `sessions` table

**Files to modify**:
- `lib/supabase.ts` — update Session type
- `app/session/[code]/page.tsx` — add "End Session" button, post-session mode
- `app/join/[code]/page.tsx` — show ended state, disable new question submission, but keep everything viewable
- Migration SQL

**Estimated complexity**: Medium

---

### 2.4 Pre-Session Question Collection
**Priority**: Medium — huge for prepared speakers, Pigeonhole has this

**What it is**: The session link is live before the event starts. Attendees can submit questions early. Questions accumulate and cluster before the host opens the session.

**How it works**:
- Add `starts_at timestamp with time zone` to sessions table (optional field)
- If set, the attendee page shows: "Session starts at [time]. Submit your questions early!"
- Questions are accepted and clustered normally
- When the host opens the session, they already have a pre-organized cluster view
- If `starts_at` is not set, behavior is the same as today (session is immediately live)

**Files to modify**:
- `app/create/page.tsx` — add optional "Session start time" field
- `lib/supabase.ts` — update Session type
- `app/join/[code]/page.tsx` — show pre-session state
- Migration SQL

**Estimated complexity**: Low-Medium

---

### 2.5 Session Analytics
**Priority**: Medium — Slido locks behind Enterprise tier

**What it is**: Simple analytics shown to the host on the moderator dashboard.

**Metrics**:
- Total questions submitted
- Total unique participants (by name, rough estimate)
- Questions answered vs unanswered (percentage bar)
- Most active cluster (by question count)
- Questions over time (simple bar chart by 5-minute intervals)
- Top upvoted questions

**UI**: Collapsible "Analytics" section at the bottom of the moderator dashboard, or a separate tab.

**Implementation**: All computed client-side from existing data. No new DB queries needed.

**Files to modify**:
- `app/session/[code]/page.tsx` — add analytics section

**Estimated complexity**: Medium

---

## Sprint 3: Phase 2 Start

**Status**: COMPLETED

**Goal**: Begin reducing moderator workload with AI assistance.

### 3.1 Multi-Moderator Support
- Multiple hosts can view the moderator dashboard simultaneously (already works with real-time)
- Add "claim" functionality: a moderator can claim a cluster ("I'm handling this")
- Show who claimed what to prevent duplicate work
- Requires adding a `claimed_by` field to clusters

### 3.2 Contextual Auto-Answering
- Host uploads slides (PDF) or a description before the session
- AI drafts suggested answers to questions based on uploaded context
- "Suggested Answer" badge on questions with AI-drafted responses
- Host can approve/edit/reject before it goes live
- Toggle to disable entirely

### 3.3 Recurring Session FAQ Library
- After each session, host can one-click convert answered clusters into FAQ entries
- FAQ library persists across sessions
- For recurring events (e.g., weekly all-hands), new questions are checked against the FAQ
- If a match is found, AI surfaces the previous answer automatically

### 3.4 Unanswered Question Report
- Post-session email/page showing every unanswered question
- Host can write follow-up answers (already partially built in 2.3)
- Attendees get notified when their question gets a follow-up

---

---

## Sprint 4: UI Rework + Dashboard + Recurring Sessions

**Status**: COMPLETED

**Goal**: Rework the moderator UI for a professional, scalable layout. Add a persistent left sidebar with session management, move settings to a floating panel, and support recurring sessions.

---

### 4.1 Moderator Header Rework
**Priority**: High — current header is too cluttered with too many buttons

**What changes**:
- **Left side**: "Query" logo + session title
- **Center**: Session code badge + "Copy Session Code" + "Copy Join Link" (grouped together)
- **Right side**: "End Session" / "Reopen Session" button (rightmost, prominent)
- **Remove from header**: Moderation toggle, AI Suggest toggle, Export CSV, question count (move to settings panel + sidebar)

**Current header buttons**: Moderation, AI Suggest, End Session, Export CSV, Copy Code, Copy Link, question count
**New header**: Clean — just title, code, copy buttons, and end session

**Estimated complexity**: Low-Medium

---

### 4.2 Floating Session Settings Panel
**Priority**: High — declutter the header, give settings a proper home

**What it is**: A small floating panel anchored to the bottom-right corner of the screen. Clicking a gear/settings button opens a compact card with session controls.

**UI spec**:
- Floating action button (FAB) in bottom-right: gear icon, labeled "Settings"
- On click, opens a panel (320px wide, ~400px tall max) sliding up from the button
- Panel title: "Session Settings"
- Panel contents:
  - **Moderation**: Toggle switch with label + description
  - **AI Auto-Suggest**: Toggle switch with label + description
  - **Export CSV**: Button
  - **View Report**: Link to `/report/[code]` (opens in new tab)
  - **Present Mode**: Link to `/present/[code]` (opens in new tab)
- Panel has a close button (X) or clicking outside closes it
- Visible on both active and ended sessions (so CSV export works post-session)
- Subtle shadow + rounded corners, sits above page content (z-index)

**Files to modify**:
- `app/session/[code]/page.tsx` — remove header buttons, add floating panel

**Estimated complexity**: Medium

---

### 4.3 Left Sidebar — Session Dashboard
**Priority**: High — gives hosts a persistent navigation panel

**What it is**: A vertical sidebar on the left side of the moderator page with:

**Sidebar sections**:
1. **Logo + Home link** at the top
2. **Live Sessions** — list of currently active (not ended) sessions with their codes, clickable to navigate
3. **Upcoming Sessions** — sessions with `starts_at` in the future, sorted by date
4. **Past Sessions** — ended sessions (last 10), with links to report page
5. **Profile** — placeholder section with user icon (empty for now, Sprint 5+)
6. **Settings** — placeholder section (empty for now, Sprint 5+)

**Data**: Loads all sessions from Supabase. No auth yet, so shows ALL sessions (in production, would be filtered by user). For now, this is acceptable.

**Layout change**: The moderator page becomes a two-column layout:
- Left: 256px fixed sidebar (collapsible on mobile)
- Right: Existing moderator dashboard content (max-w-5xl)

**Files to create/modify**:
- `app/session/[code]/page.tsx` — wrap in sidebar layout
- Consider: Create a shared `components/Sidebar.tsx` for reuse across pages

**Estimated complexity**: Medium-High

---

### 4.4 Recurring Sessions
**Priority**: Medium — important for university classes, weekly all-hands, etc.

**What it is**: When creating a session, the host can set it to recur on a schedule. The system creates future session instances automatically.

**Recurrence options**:
- **None** (default — one-time session)
- **Weekly** — same day of week, same time
- **Biweekly** — every 2 weeks
- **Monthly** — same day of month
- **Custom dates** — pick specific dates from a date picker

**Database changes**:
- Add `recurrence_type text` to sessions (null, 'weekly', 'biweekly', 'monthly', 'custom')
- Add `recurrence_parent_id uuid references sessions(id)` — links recurring instances to the original
- Add `recurrence_dates jsonb` — for custom dates, stores array of ISO date strings

**How it works**:
1. Host creates a session with recurrence settings
2. On create, the system generates future session instances (up to 12 weeks ahead for weekly, 6 months for monthly)
3. Each instance is a separate session row with its own code, but linked via `recurrence_parent_id`
4. The sidebar shows recurring sessions grouped together
5. FAQ entries from previous instances carry forward (checked during AI suggest)

**Create page changes**:
- Add "Recurrence" section below start time
- Radio buttons: None, Weekly, Biweekly, Monthly, Custom
- For Custom: date multi-picker
- Preview showing "This will create X sessions"

**Estimated complexity**: High

---

### Sprint 4 Execution Order

| # | Task | Effort | Why This Order |
|---|------|--------|---------------|
| 1 | Moderator header rework | 1-2 hrs | Must do first — clears space for settings panel |
| 2 | Floating settings panel | 2-3 hrs | Depends on header rework |
| 3 | Left sidebar dashboard | 3-4 hrs | Independent but benefits from clean header |
| 4 | Recurring sessions | 4-5 hrs | Most complex, builds on sidebar |

**Total Sprint 4 estimate**: ~10-14 hrs of implementation

---

### Sprint 4 Database Changes

```sql
-- Recurring sessions
alter table sessions add column if not exists recurrence_type text;
alter table sessions add column if not exists recurrence_parent_id uuid references sessions(id) on delete set null;
alter table sessions add column if not exists recurrence_dates jsonb;
```

---

### Sprint 4 Files

**New files**:
```
components/Sidebar.tsx              # Shared sidebar component
components/SettingsPanel.tsx        # Floating settings panel
```

**Modified files**:
```
app/session/[code]/page.tsx         # Header rework, sidebar layout, settings panel
app/create/page.tsx                 # Recurrence options
lib/supabase.ts                     # Updated Session type
supabase-schema.sql                 # Updated schema
supabase-migrations.sql             # Add recurrence columns
```

---

---

## Sprint 5: Global Analytics Dashboard

**Status**: COMPLETED

**Goal**: Build a comprehensive analytics page accessible from the sidebar that shows cross-session insights, per-session deep metrics, and engagement data that no competitor offers.

### Research Summary

**What Slido offers** (baseline we must match):
- Engagement score (sum of questions + upvotes + poll votes)
- Q&A sentiment analysis (positive / negative / neutral)
- Word cloud of most popular topics
- Participation count (engaged vs total)
- Q&A metrics: total questions, anonymous %, highlighted count, answered count, upvotes
- Organization-level analytics across multiple sessions
- Export to Google Sheets, Excel, PDF

**What the industry tracks** (standard event KPIs):
- Engagement rate = (participants who interacted / total attendees) x 100 (industry avg: 30-60%)
- Response rate per poll/Q&A
- Session drop-off / attendance over time
- Questions per minute (engagement velocity)
- Unanswered question ratio
- Average upvotes per question

**What nobody offers** (our differentiators):
- AI-generated topic trends across sessions ("Compensation questions increased 40% over 3 sessions")
- Cluster health metrics (how many questions per cluster, cluster fragmentation)
- Question complexity scoring (simple factual vs deep discussion)
- Recurring session comparison (engagement trending up/down week over week)
- Response time analytics (how long until a question gets answered)
- "Engagement gap" detection (topics with high upvotes but no host reply)
- Attendee return rate across recurring sessions

---

### 5.1 Analytics Page (`/analytics`)
**Priority**: High — the main deliverable

**What it is**: A dedicated analytics page accessible from the sidebar. Shows cross-session data and allows drilling into individual sessions.

**Route**: `app/analytics/page.tsx`

**Page sections**:

#### A. Global Overview Cards (top row)
- Total sessions hosted (all time)
- Total questions received
- Total upvotes
- Overall answer rate (%)
- Average engagement score per session

#### B. Session Comparison Table
- Sortable table of all sessions
- Columns: Title, Date, Questions, Upvotes, Answered %, Engagement Score, Status
- Click a row to see per-session detail
- Color-coded: green (>75% answered), yellow (50-75%), red (<50%)

#### C. Engagement Over Time Chart
- Simple bar chart showing questions per session over time
- Uses CSS/Tailwind only (no chart library) — horizontal bars with proportional widths
- Shows trend: improving / declining engagement

#### D. Topic Word Cloud
- Aggregate cluster titles across all sessions
- Larger text = more frequent topic
- Pure CSS implementation (randomized sizing based on frequency)

#### E. Unanswered Question Report
- List of sessions with unanswered questions
- For each: session title, unanswered count, top unanswered questions by upvotes
- "View Full Report" links to `/report/[code]`

#### F. AI Insights (if API key available)
- AI-generated summary of trends across sessions
- "Your audiences frequently ask about X, Y, Z"
- "Engagement has been trending [up/down] over the last N sessions"
- Generated on-demand via button click (not automatic, to save API credits)

**Estimated complexity**: High

---

### 5.2 Per-Session Analytics Expansion
**Priority**: Medium — enhance existing per-session analytics section

**What it adds** to the existing collapsible analytics section on the moderator page:

- **Engagement Score**: questions + upvotes (like Slido)
- **Answer Rate**: % of questions answered with color indicator
- **Sentiment Indicator**: Simple positive/neutral/negative based on question text analysis (can be basic keyword matching, no AI needed)
- **Questions Over Time**: Mini timeline showing when questions came in (grouped by 5-min intervals)
- **Response Time**: Average time between question submission and host reply
- **Engagement Gap**: Clusters with high upvotes but no host replies yet
- **Top Contributors**: Most active question askers (by name, where not anonymous)

**Estimated complexity**: Medium

---

### 5.3 Sidebar Analytics Link
**Priority**: Low — just adding a link

**What it is**: Add "Analytics" as a clickable item in the left sidebar (currently it's missing). Links to `/analytics`.

**Estimated complexity**: Very Low

---

### Sprint 5 Execution Order

| # | Task | Effort | Why This Order |
|---|------|--------|---------------|
| 1 | Sidebar analytics link | 15 min | Quick, opens up navigation |
| 2 | Analytics page — global overview + session table | 3-4 hrs | Core deliverable |
| 3 | Analytics page — word cloud + unanswered report | 2-3 hrs | Key differentiators |
| 4 | Analytics page — AI insights | 1-2 hrs | Nice-to-have, reuses suggest-answer pattern |
| 5 | Per-session analytics expansion | 2-3 hrs | Enhances existing section |

**Total Sprint 5 estimate**: ~9-12 hrs of implementation

---

### Sprint 5 Files

**New files**:
```
app/analytics/page.tsx              # Global analytics dashboard
```

**Modified files**:
```
app/session/[code]/page.tsx         # Sidebar link + per-session analytics expansion
```

---

## Sprint 6: UI Consistency, Create Page Rework, DB Trigger, Export

**Status**: COMPLETED (committed in Sprint 6 UI rework)

**Goal**: Complete visual consistency across all pages, add data export, and strengthen backend reliability with a DB trigger. Every page should feel like part of the same polished product.

### 6.1 Create Page Header + Breadcrumb
**Priority**: High — only page without the mesh gradient header

**What to do**:
- Add mesh gradient header bar to `app/create/page.tsx` matching other pages
- Breadcrumb: "Query / Host a Session"
- Page layout: `h-screen flex flex-col` with scrollable content area
- Keep the form as-is, just wrap it in the new layout

**Files**: `app/create/page.tsx`

---

### 6.2 Present Page Theme Variables
**Priority**: Medium — dark-themed page still uses hardcoded colors

**What to do**:
- Update `app/present/[code]/page.tsx` to use CSS variables where applicable
- The page is intentionally dark-themed (for projection), so keep the dark background
- But replace any hardcoded violet/purple/blue references with theme variables
- Add a subtle theme accent (e.g. primary color for highlighted cluster, QR code border)

**Files**: `app/present/[code]/page.tsx`

---

### 6.3 DB Trigger: Auto-Mark Answered on Host Reply
**Priority**: High — test suite flagged this gap

**What to do**:
- Create a Supabase trigger on the `replies` table
- When a reply is inserted with `is_host = true`, auto-update the corresponding question's `status` to `'answered'`
- This makes the behavior reliable regardless of which client inserts the reply
- Add the migration SQL to `supabase-migrations.sql`

**SQL**:
```sql
CREATE OR REPLACE FUNCTION auto_mark_answered()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_host = true THEN
    UPDATE questions SET status = 'answered' WHERE id = NEW.question_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_host_reply_mark_answered
  AFTER INSERT ON replies
  FOR EACH ROW
  EXECUTE FUNCTION auto_mark_answered();
```

**Files**: `supabase-migrations.sql`

---

### 6.4 Export Session Data (CSV)
**Priority**: Medium — hosts want to take data out after sessions

**What to do**:
- Add an "Export CSV" button to the report page (`app/report/[code]/page.tsx`)
- Export all questions with: text, author, upvotes, status, cluster title, replies
- Client-side CSV generation (no API route needed)
- Button styled with theme variables, placed near the top stats section

**Files**: `app/report/[code]/page.tsx`

---

### 6.5 Header Cleanup: Share Button + Present Mode
**Priority**: High — header is cluttered, present mode is buried

**What to do**:
- Remove "Copy Code" and "Copy Link" buttons from session header
- Keep the session code badge visible with a small copy icon (clipboard) next to it
- Clicking the copy icon copies the full join URL (e.g. `https://query.app/join/ABC123`)
- Add a "Present" button in the top-right of the header (opens `/present/[code]` in new tab)
- Remove the present mode link from the settings panel
- Inspired by Slido: single share action, prominent present button

**Reference (Slido UX)**:
- Slido has a single "Share" button (top-right) → copies join link
- Present button is prominent (green, opens new tab)
- No separate copy code vs copy link

**Files**: `app/session/[code]/page.tsx`

---

### 6.6 Mobile Responsiveness Pass
**Priority**: Medium — attendees are primarily on phones

**What to do**:
- Audit all pages on small viewports (375px width)
- Fix any overflow, truncation, or touch target issues
- Sidebar should auto-collapse on mobile (< 768px)
- Header breadcrumb should truncate gracefully
- Join page and question submission must work perfectly on phone

**Files**: All page files, potentially `app/globals.css`

---

### 6.6 Loading Skeletons + Error States
**Priority**: Low — polish item

**What to do**:
- Replace plain "Loading..." text with animated skeleton cards
- Add error boundaries that show a friendly message + retry button if Supabase fails
- At minimum: session page, analytics page, report page

**Files**: All page files with loading states

---

## Sprint 7: Host Authentication & AI Model Integration

**Status**: COMPLETED

**Goal**: Add host authentication so each host owns their sessions, and upgrade the AI clustering engine to be cheaper, faster, and provider-agnostic. Research free-tier AI options to minimize costs.

---

### 7.1 Host Authentication (Login/Signup)
**Priority**: Critical — multi-tenancy requires knowing who owns what

**What it is**: Basic email + password authentication using Supabase Auth. Hosts must log in to create and manage sessions. Attendees do not need auth (joining by code remains public).

**Features**:
- Login and signup pages with clean UI matching the existing theme
- Protected routes: session dashboard, analytics, report pages require auth
- Store `user_id` on sessions table so each host owns their sessions
- Dashboard shows only the authenticated host's sessions
- Sidebar, analytics, and report pages filtered by logged-in user

**UI spec**:
- `/login` — email + password form, "Sign Up" link, "Forgot Password" link
- `/signup` — email + password + confirm password, "Already have an account?" link
- Both pages use the mesh gradient header, centered card layout
- After login, redirect to `/` (home) which shows the host's sessions
- Session header shows user email/avatar with a dropdown: "My Sessions", "Log Out"

**Auth flow**:
- Supabase Auth handles email/password, JWT tokens, session management
- Middleware checks auth state on protected routes
- Unauthenticated users on protected routes redirect to `/login`
- Public routes: `/`, `/join/[code]`, `/present/[code]`, `/login`, `/signup`

**Files to create/modify**:
- `app/login/page.tsx` — login page
- `app/signup/page.tsx` — signup page
- `middleware.ts` — auth middleware for protected routes
- `lib/auth.ts` — auth helper functions
- `components/Sidebar.tsx` — filter sessions by user
- `app/session/[code]/page.tsx` — verify ownership
- `app/analytics/page.tsx` — filter by user
- `app/report/[code]/page.tsx` — verify ownership

**Estimated complexity**: Medium-High

#### 7.1.1 Password Match Validation UI (Signup Page)
On the `/signup` page, show real-time feedback when the user types in the "Confirm Password" field:
- **Match**: green checkmark icon + "Passwords match" text in green
- **Mismatch**: red X icon + "Passwords don't match" text in red
- Feedback only appears after the user has started typing in the confirm field (no error shown on empty/untouched state)

---

### 7.2 Database Auth Integration
**Priority**: Critical — required for 7.1 to work

**What it is**: Database changes to support per-host session ownership and Row Level Security (RLS) policies.

**Database changes**:
- Add `user_id uuid references auth.users(id)` column to `sessions` table
- Migrate existing sessions to work with auth (assign to a default admin user or leave nullable initially)
- RLS policies: hosts can only CRUD their own sessions
- Attendees don't need auth — joining by code remains public
- Questions, clusters, replies inherit access through their parent session

**RLS policies**:
```sql
-- Sessions: hosts can only see/modify their own
CREATE POLICY "Users can view their own sessions"
  ON sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create sessions"
  ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON sessions FOR UPDATE USING (auth.uid() = user_id);

-- Public read access for attendees (via session code)
CREATE POLICY "Anyone can view sessions by code"
  ON sessions FOR SELECT USING (true);

-- Questions: anyone can insert (attendees), hosts can update
CREATE POLICY "Anyone can submit questions"
  ON questions FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view questions in a session"
  ON questions FOR SELECT USING (true);
```

**Migration SQL**: `supabase-add-auth.sql`

**Files to create/modify**:
- `supabase-add-auth.sql` — migration for user_id column + RLS policies
- `supabase-schema.sql` — updated schema
- `lib/supabase.ts` — updated Session type with user_id

**Estimated complexity**: Medium

---

### 7.3 AI Model Selection & Integration
**Priority**: High — reduce AI costs by 20x while maintaining quality

**What it is**: Replace the single Claude Haiku integration with a provider-agnostic AI layer that supports multiple providers and models. Default to a cheaper, faster model for clustering.

**Research reference**: See `docs/ai-model-research.md` for full analysis.

**Implementation**:
- Create a provider abstraction layer with a common interface
- Support OpenAI-compatible APIs (covers Groq, Together AI, Mistral, OpenAI)
- Support Anthropic API (current integration)
- Support Google Gemini API
- Configuration via environment variables (provider, model, API key)
- Fallback behavior: if primary provider fails, try secondary, then tertiary

**Recommended default**: Groq (Llama 3.1 8B) — $0.05/1M tokens, sub-500ms latency, free tier available

**Environment variables**:
```env
AI_PRIMARY_PROVIDER=groq
AI_PRIMARY_MODEL=llama-3.1-8b-instant
AI_FALLBACK_PROVIDER=anthropic
AI_FALLBACK_MODEL=claude-haiku-4-5
GROQ_API_KEY=
```

**Files to create/modify**:
- `lib/ai-provider.ts` — provider abstraction layer
- `lib/providers/groq.ts` — Groq provider
- `lib/providers/anthropic.ts` — Anthropic provider (refactor from current)
- `lib/providers/gemini.ts` — Gemini provider
- `lib/providers/openai.ts` — OpenAI provider
- `app/api/cluster/route.ts` — use new provider abstraction
- `.env.example` — document new environment variables

**Estimated complexity**: Medium-High

---

### 7.4 AI Summary Question per Cluster
**Priority**: Medium — improve visibility of an existing feature

**What it is**: Each cluster already has an AI-generated summary question (`clusters.summary_question`), but it needs to be more prominent and editable.

**Current state**:
- Summary question exists in the data model
- Shown in presenter view (already there)
- Shown in dashboard cluster cards (already there)

**What to add**:
- Show the summary question in the attendee join page Topics tab (cluster view)
- Auto-generate when a cluster is created or updated (re-run summarization when new questions join a cluster)
- Allow the host to edit the summary question manually (inline edit on cluster card)
- Show a "Generated by AI" badge that changes to "Edited by host" after manual edit

**UI spec**:
- Cluster card: summary question displayed prominently below cluster title
- Edit icon (pencil) next to summary question — click to inline edit
- After edit, badge changes from "AI Generated" to "Custom"
- Topics tab on attendee page: each cluster shows its summary question

**Database changes**:
- Add `summary_edited boolean not null default false` to `clusters` table (tracks if host manually edited)

**Files to modify**:
- `app/session/[code]/page.tsx` — add inline edit for summary question
- `app/join/[code]/page.tsx` — show summary question in Topics tab
- `app/api/cluster/route.ts` — re-generate summary when cluster is updated
- `lib/supabase.ts` — update Cluster type
- Migration SQL for `summary_edited` column

**Estimated complexity**: Medium

---

### 7.5 Free-Tier AI Model Research (Documentation Only)
**Priority**: Low — research task, no code changes

**What it is**: Deep comparison of free-tier AI APIs and open-source model recommendations for Query's use case.

**Deliverable**: `docs/ai-model-research.md` (already completed)

**Research covers**:
- Free-tier AI APIs: OpenAI, Anthropic Claude, Google Gemini, Groq, Together AI, Mistral, Cohere
- Open-source model recommendations (5+): Llama 3.x, Mistral/Mixtral, Phi-3.5, Qwen 2.5, Gemma 2
- Setup steps, usage limits, quality comparison for each
- Pricing tiers comparison table
- Final recommendation for Query's use case: Groq (Llama 3.1 8B) as primary, Gemini Flash-Lite as fallback
- Cost projections showing 20x savings vs current Claude Haiku setup

**Focus areas**: Text analysis, clustering, summarization capabilities, latency for real-time use

**Estimated complexity**: N/A (documentation only)

---

### Sprint 7 Execution Order

| # | Task | Effort | Why This Order |
|---|------|--------|---------------|
| 1 | Free-tier AI model research (7.5) | Done | Research informs implementation decisions |
| 2 | AI model selection & integration (7.3) | 4-5 hrs | Provider abstraction needed before auth changes |
| 3 | Database auth integration (7.2) | 2-3 hrs | DB changes needed before auth UI |
| 4 | Host authentication (7.1) | 4-5 hrs | Depends on DB auth integration |
| 5 | AI summary question per cluster (7.4) | 2-3 hrs | Uses new provider abstraction from 7.3 |

**Total Sprint 7 estimate**: ~12-16 hrs of implementation

---

### Sprint 7 Database Changes

```sql
-- Host authentication
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- RLS policies for session ownership
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON sessions FOR SELECT USING (auth.uid() = user_id OR true);

CREATE POLICY "Users can create sessions"
  ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON sessions FOR DELETE USING (auth.uid() = user_id);

-- Summary question edit tracking
ALTER TABLE clusters ADD COLUMN IF NOT EXISTS summary_edited boolean NOT NULL DEFAULT false;
```

---

### Sprint 7 Files

**New files**:
```
app/login/page.tsx                 # Login page
app/signup/page.tsx                # Signup page
middleware.ts                      # Auth middleware for protected routes
lib/auth.ts                        # Auth helper functions
lib/ai-provider.ts                 # Provider abstraction layer
lib/providers/groq.ts              # Groq provider implementation
lib/providers/anthropic.ts         # Anthropic provider (refactored)
lib/providers/gemini.ts            # Gemini provider implementation
lib/providers/openai.ts            # OpenAI provider implementation
supabase-add-auth.sql              # Auth migration SQL
docs/ai-model-research.md          # AI model research (completed)
```

**Modified files**:
```
app/session/[code]/page.tsx        # Verify ownership, inline edit summary question
app/join/[code]/page.tsx           # Show summary question in Topics tab
app/api/cluster/route.ts           # Use new provider abstraction
app/analytics/page.tsx             # Filter by authenticated user
app/report/[code]/page.tsx         # Verify ownership
components/Sidebar.tsx             # Filter sessions by user, show auth state
lib/supabase.ts                    # Updated types (Session.user_id, Cluster.summary_edited)
supabase-schema.sql                # Updated schema
.env.example                       # Document new AI provider env vars
```

---

---

## Sprint 8: Tech Debt + Component Extraction

**Status**: COMPLETED

**Goal**: Clean up the codebase, extract shared components, and improve maintainability.

---

### 8.1 Extract Shared Sidebar Component
**Priority**: High
**Estimated complexity**: Medium

**What it is**: The sidebar (~100 lines) is duplicated in session, analytics, and report pages. Extract to a single shared component.

**What to do**:
- Extract sidebar to `components/Sidebar.tsx`
- Props: active page, sessions data, sidebar open/collapsed state
- Replace duplicated sidebar code in all pages with the shared component
- Ensure sidebar behavior (collapse on mobile, highlight active page) works consistently

**Files to create**:
- `components/Sidebar.tsx`

**Files to modify**:
- `app/session/[code]/page.tsx`
- `app/analytics/page.tsx`
- `app/report/[code]/page.tsx`

**Dependencies**: None

---

### 8.2 Extract Mesh Header Component
**Priority**: High
**Estimated complexity**: Medium

**What it is**: The mesh gradient header (5 blobs + breadcrumb) is duplicated in 5+ files. Extract to a single shared component.

**What to do**:
- Extract mesh header to `components/MeshHeader.tsx`
- Props: breadcrumb items (array of `{ label, href? }`)
- Replace duplicated header code across all pages
- Ensure consistent styling and responsive behavior

**Files to create**:
- `components/MeshHeader.tsx`

**Files to modify**:
- `app/session/[code]/page.tsx`
- `app/analytics/page.tsx`
- `app/report/[code]/page.tsx`
- `app/create/page.tsx`
- `app/login/page.tsx`
- `app/signup/page.tsx`

**Dependencies**: None

---

### 8.3 Extract Shared Types
**Priority**: High
**Estimated complexity**: Small

**What it is**: `ClusterWithQuestions` is defined identically in 4 files. Consolidate into a single source of truth. Also add `user_id` to the Session type.

**What to do**:
- Move `ClusterWithQuestions` type to `lib/supabase.ts`
- Import from `lib/supabase.ts` in all files that use it
- Remove duplicate type definitions
- Add `user_id` field to the `Session` type

**Files to modify**:
- `lib/supabase.ts`
- `app/session/[code]/page.tsx`
- `app/join/[code]/page.tsx`
- `app/present/[code]/page.tsx`
- `app/report/[code]/page.tsx`

**Dependencies**: None

---

### 8.4 Split Session Page
**Priority**: Medium
**Estimated complexity**: Large

**What it is**: `app/session/[code]/page.tsx` is 1000+ lines. Extract major sub-components into their own files for maintainability.

**What to do**:
- Extract `QuestionRow` component to `components/QuestionRow.tsx`
- Extract `ClusterCard` component to `components/ClusterCard.tsx`
- Extract `ChevronIcon` component to `components/ChevronIcon.tsx`
- Extract `Spinner` component to `components/Spinner.tsx`
- Keep state management and data fetching in the parent page
- Pass data and callbacks as props to extracted components

**Files to create**:
- `components/QuestionRow.tsx`
- `components/ClusterCard.tsx`
- `components/ChevronIcon.tsx`
- `components/Spinner.tsx`

**Files to modify**:
- `app/session/[code]/page.tsx`

**Dependencies**: 8.3 (shared types should be extracted first so components import from the right place)

---

### 8.5 Add user_id to Session Type
**Priority**: Low
**Estimated complexity**: Small

**What it is**: Ensure the `Session` type in `lib/supabase.ts` includes the `user_id` field added during Sprint 7 auth work.

**What to do**:
- Update `lib/supabase.ts` Session type to include `user_id?: string`
- Verify all session queries handle the optional field correctly

**Files to modify**:
- `lib/supabase.ts`

**Dependencies**: 7.2 (DB auth integration must be done first)

---

### Sprint 8 Execution Order

| # | Task | Effort | Why This Order |
|---|------|--------|---------------|
| 1 | Extract shared types (8.3) | 30 min | Foundation — other extractions depend on clean types |
| 2 | Add user_id to Session type (8.5) | 15 min | Quick, pairs with 8.3 |
| 3 | Extract Mesh Header (8.2) | 1-2 hrs | Independent, reduces duplication across many files |
| 4 | Extract Shared Sidebar (8.1) | 1-2 hrs | Independent, reduces duplication across 3 pages |
| 5 | Split Session Page (8.4) | 2-3 hrs | Most complex, benefits from clean types from 8.3 |

**Total Sprint 8 estimate**: ~5-8 hrs of implementation

---

---

## Sprint 9: New Features (Competitive Gaps)

**Status**: COMPLETED

**Goal**: Add the most impactful missing features identified in the competitive analysis. Close key gaps with Slido, Mentimeter, and Pigeonhole.

---

### Interactive Features

---

### 9.1 QR Code for Joining
**Priority**: High
**Estimated complexity**: Small

**What it is**: Generate a QR code on the session dashboard and presenter view that attendees can scan to join.

**What to do**:
- Install `qrcode.react` library
- Generate QR code pointing to the join URL (`/join/[code]`)
- Display QR code in: header code badge area (tooltip/popover), presenter view (overlay), empty state card
- QR code should be downloadable (right-click save or explicit download button)

**Files to create/modify**:
- `app/session/[code]/page.tsx` — add QR code to header/empty state
- `app/present/[code]/page.tsx` — add QR code overlay
- `package.json` — add `qrcode.react` dependency

**Dependencies**: None

---

### 9.2 Multiple Choice Polls
**Priority**: High
**Estimated complexity**: Large

**What it is**: New "Poll" feature alongside Q&A. Host creates a poll with 2-5 options. Attendees vote. Results shown in real-time bar chart.

**What to do**:
- Create new DB table: `polls` (id, session_id, question text, options jsonb, votes jsonb, created_at, is_active boolean)
- Host UI: poll creation form in session settings or a dedicated "Polls" tab
- Attendee UI: poll card with radio buttons, submit vote, see results after voting
- Presenter UI: live bar chart of poll results
- Real-time updates via Supabase subscriptions on `polls` table
- One active poll at a time per session

**Files to create**:
- `components/PollCreate.tsx` — poll creation form for hosts
- `components/PollVote.tsx` — voting UI for attendees
- `components/PollResults.tsx` — bar chart results display

**Files to modify**:
- `app/session/[code]/page.tsx` — add Polls tab or section
- `app/join/[code]/page.tsx` — show active poll to attendees
- `app/present/[code]/page.tsx` — show poll results in presenter view
- `lib/supabase.ts` — add Poll type
- `supabase-schema.sql` — add polls table
- `supabase-migrations.sql` — migration for polls table

**Dependencies**: None

---

### 9.3 Word Clouds
**Priority**: Medium
**Estimated complexity**: Medium

**What it is**: Host triggers a word cloud prompt. Attendees submit single words/phrases. AI groups similar words. Display as a visual word cloud in presenter view.

**What to do**:
- Host creates a word cloud prompt (e.g., "Describe this session in one word")
- Attendees submit single words or short phrases
- AI groups similar submissions (e.g., "great" and "awesome")
- Render as a visual word cloud (CSS-based or canvas library)
- Show in presenter view and on the session dashboard

**Files to create**:
- `components/WordCloud.tsx` — word cloud visualization component
- `components/WordCloudPrompt.tsx` — submission UI for attendees

**Files to modify**:
- `app/session/[code]/page.tsx` — add word cloud trigger
- `app/join/[code]/page.tsx` — show word cloud prompt to attendees
- `app/present/[code]/page.tsx` — show word cloud visualization
- `app/api/cluster/route.ts` — add word grouping endpoint (or new API route)

**Dependencies**: None (but benefits from 8.4 split session page for cleaner integration)

---

### Export & Reporting

---

### 9.4 PDF Export for Reports
**Priority**: Medium
**Estimated complexity**: Medium

**What it is**: Add "Export PDF" button alongside CSV on the report page. Generate a formatted PDF with stats, questions, clusters, and replies.

**What to do**:
- Install `jspdf` or `html2pdf.js` library
- Add "Export PDF" button next to existing CSV export on report page
- PDF includes: session title, date, stats summary, all clusters with questions, replies
- Styled with colors and layout matching the report page design
- Client-side generation (no server needed)

**Files to create/modify**:
- `app/report/[code]/page.tsx` — add PDF export button and generation logic
- `package.json` — add PDF library dependency

**Dependencies**: None

---

### Branding & Customization

---

### 9.5 Custom Host Branding
**Priority**: Low
**Estimated complexity**: Large

**What it is**: Hosts can upload a logo and pick an accent color during session creation. Branding appears on session pages and presenter view.

**What to do**:
- Add fields to session creation: logo upload (stored in Supabase Storage), brand color picker
- Store in `sessions` table: `logo_url text`, `brand_color text`
- On session pages, override CSS custom properties (`--color-primary`, etc.) with brand color
- Presenter view shows host logo in header area
- Attendee join page shows host logo
- Fallback to default Query branding when not set

**Files to modify**:
- `app/create/page.tsx` — add logo upload + color picker fields
- `app/session/[code]/page.tsx` — apply brand color, show logo
- `app/join/[code]/page.tsx` — apply brand color, show logo
- `app/present/[code]/page.tsx` — apply brand color, show logo
- `lib/supabase.ts` — update Session type with logo_url, brand_color
- `supabase-schema.sql` — add columns
- `supabase-migrations.sql` — migration for new columns

**Dependencies**: 7.1 (host auth — branding is per-host)

---

### Deployment

---

### 9.6 Vercel Deployment
**Priority**: High
**Estimated complexity**: Small

**What it is**: Deploy the app to Vercel with custom domain and proper environment configuration.

**What to do**:
- Set up Vercel project linked to the git repository
- Configure environment variables (Supabase URL, Supabase anon key, AI provider keys)
- Configure build settings (Next.js auto-detected)
- Add `vercel.json` if custom configuration needed (rewrites, headers, etc.)
- Set up custom domain
- Test production build for any SSR/hydration issues

**Files to create/modify**:
- `vercel.json` (if needed)
- `.env.example` — ensure all required env vars are documented

**Dependencies**: None (can be done at any time)

---

### 9.7 PWA Setup
**Priority**: Low
**Estimated complexity**: Medium

**What it is**: Make the app installable on mobile devices as a Progressive Web App.

**What to do**:
- Create `public/manifest.json` with app name, icons, theme color, display mode
- Add PWA meta tags to `app/layout.tsx` (theme-color, apple-touch-icon, etc.)
- Create a basic service worker for offline fallback page
- Add app icons in multiple sizes (192x192, 512x512)
- Test install prompt on Android Chrome and iOS Safari
- Add offline fallback page (`app/offline/page.tsx`) shown when no network

**Files to create**:
- `public/manifest.json`
- `public/sw.js` — service worker
- `public/icons/` — app icons in multiple sizes
- `app/offline/page.tsx` — offline fallback page

**Files to modify**:
- `app/layout.tsx` — add PWA meta tags and manifest link

**Dependencies**: 9.6 (deploy first so PWA can be tested in production context)

---

### 9.8 AI Clustering Pipeline — Robust Dynamic Clustering with Edge Case Handling
**Priority**: Critical — clustering is broken/unreliable without this
**Estimated complexity**: Medium

**Status**: COMPLETED

**What it is**: Fix the AI clustering pipeline so questions are reliably clustered. The previous implementation only triggered clustering from the host dashboard's real-time subscription, meaning questions went unclustered if the host dashboard wasn't open. This task implements:

1. **Client-side clustering trigger from join page**: When a participant submits a question (and moderation is off), the join page fires `/api/cluster` directly, ensuring clustering happens regardless of whether the host dashboard is open.
2. **Duplicate prevention**: The API now checks if a question is already clustered before re-processing.
3. **Batch re-clustering**: New `mode: 'batch'` option on `/api/cluster` that clusters all unclustered questions in one AI call.
4. **Re-cluster button**: Host dashboard shows a "Re-cluster" button in the unclustered questions section.
5. **Edge case protocol**: Full documentation of how clustering handles answered clusters, moderation, manual overrides, single-question clusters, and cluster merging.

**Protocol decisions**:
- Only unanswered clusters are candidates for new questions (answered clusters are excluded)
- Unapproved questions skip clustering until approved
- Already-clustered questions are not re-processed
- Batch mode groups multiple unclustered questions in a single AI call for efficiency
- Empty clusters are cleaned up after batch operations

**Files modified**:
- `lib/clustering.ts` — Added `batchClusterSession()`, `cleanupEmptyClusters()`, full protocol documentation
- `app/api/cluster/route.ts` — Added batch mode, duplicate prevention, better error handling
- `app/session/[code]/page.tsx` — Added re-cluster button, improved clustering trigger
- `app/join/[code]/page.tsx` — Added client-side clustering trigger on question submit

**Dependencies**: None

---

### Sprint 9 Execution Order

| # | Task | Effort | Why This Order |
|---|------|--------|---------------|
| 1 | QR code for joining (9.1) | 1-2 hrs | Quick win, high visibility |
| 2 | Vercel deployment (9.6) | 1-2 hrs | Get app live early, enables testing |
| 3 | PDF export for reports (9.4) | 2-3 hrs | Builds on existing report page |
| 4 | Multiple choice polls (9.2) | 4-6 hrs | Major feature, new DB table |
| 5 | Word clouds (9.3) | 3-4 hrs | Interactive feature, pairs with polls |
| 6 | PWA setup (9.7) | 2-3 hrs | Requires deployment (9.6) first |
| 7 | Custom host branding (9.5) | 4-5 hrs | Most complex, least urgent |

**Total Sprint 9 estimate**: ~17-25 hrs of implementation

---

### Sprint 9 Database Changes

```sql
-- Multiple choice polls
CREATE TABLE IF NOT EXISTS polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  votes jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Custom host branding
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS brand_color text;
```

---

### Sprint 9 Files

**New files**:
```
components/PollCreate.tsx             # Poll creation form (host)
components/PollVote.tsx               # Poll voting UI (attendee)
components/PollResults.tsx            # Poll results bar chart
components/WordCloud.tsx              # Word cloud visualization
components/WordCloudPrompt.tsx        # Word cloud submission UI
public/manifest.json                  # PWA manifest
public/sw.js                          # Service worker
app/offline/page.tsx                  # Offline fallback page
vercel.json                           # Vercel config (if needed)
```

**Modified files**:
```
app/session/[code]/page.tsx           # QR code, polls tab, word cloud trigger, branding
app/join/[code]/page.tsx              # Poll voting, word cloud prompt, branding
app/present/[code]/page.tsx           # QR overlay, poll results, word cloud, branding
app/report/[code]/page.tsx            # PDF export button
app/create/page.tsx                   # Logo upload, color picker
app/layout.tsx                        # PWA meta tags
lib/supabase.ts                       # Poll type, Session branding fields
supabase-schema.sql                   # Polls table, branding columns
supabase-migrations.sql               # Migration SQL
package.json                          # New dependencies (qrcode.react, jspdf)
.env.example                          # Document any new env vars
```

---

---

## Sprint 10: Settings Page

**Status**: COMPLETED

**Goal**: Add a settings page accessible from the sidebar, with profile management, session defaults, and appearance customization.

---

### 10.1 Settings Page — Profile Section
**Priority**: High
**Estimated complexity**: Medium-High

**What it is**: A dedicated settings page with profile management, password change, sign out, and account deletion.

**What to do**:
- Create `app/settings/page.tsx` with mesh header + sidebar layout
- Profile section: display email (read-only), editable display name
- Change password form (current password, new password, confirm with green/red match indicator)
- Sign out button
- Delete account (danger zone with confirmation modal)

**Files to create**:
- `app/settings/page.tsx`

**Dependencies**: 7.1 (host authentication)

---

### 10.2 Settings Page — Session Defaults
**Priority**: Medium
**Estimated complexity**: Small

**What it is**: User-configurable default settings for new sessions.

**What to do**:
- Default moderation on/off toggle
- Default AI auto-suggest on/off toggle
- These save as user preferences (could use localStorage initially, DB later)

**Files to modify**:
- `app/settings/page.tsx`

**Dependencies**: 10.1 (settings page must exist)

---

### 10.3 Settings Page — Appearance (Theme Picker)
**Priority**: Medium
**Estimated complexity**: Medium

**What it is**: Visual theme picker allowing hosts to choose an accent color for the entire app.

**What to do**:
- Row of color circles: Orange (current), Purple, Blue
- Clicking one swaps the CSS variables in `globals.css` dynamically
- Uses the existing theme system (`docs/theme-guide.md`)
- Persist choice in localStorage

**Files to modify**:
- `app/settings/page.tsx`
- `app/globals.css`

**Dependencies**: 10.1 (settings page must exist)

---

### 10.4 Sidebar Settings Link
**Priority**: High
**Estimated complexity**: Small

**What it is**: Replace the "Settings (coming soon)" placeholder in the sidebar with an actual link to the settings page.

**What to do**:
- Replace "Settings (coming soon)" placeholder in sidebar with actual link to `/settings`
- Add settings to middleware protected routes

**Files to modify**:
- `components/Sidebar.tsx`
- `middleware.ts`

**Dependencies**: 10.1 (settings page must exist)

---

### Sprint 10 Execution Order

| # | Task | Effort | Why This Order |
|---|------|--------|---------------|
| 1 | Settings page — Profile section (10.1) | 3-4 hrs | Foundation — page must exist first |
| 2 | Sidebar settings link (10.4) | 30 min | Quick win, makes settings discoverable |
| 3 | Session defaults (10.2) | 1-2 hrs | Builds on settings page layout |
| 4 | Appearance / theme picker (10.3) | 2-3 hrs | Most complex settings feature |

**Total Sprint 10 estimate**: ~7-10 hrs of implementation

---

### Sprint 10 Files

**New files**:
```
app/settings/page.tsx                # Settings page (profile, defaults, appearance)
```

**Modified files**:
```
components/Sidebar.tsx               # Replace "Settings (coming soon)" with link to /settings
middleware.ts                        # Add /settings to protected routes
app/globals.css                      # Theme picker CSS variable support
```

---

---

## Sprint 11: Intelligence & Engagement Features

**Status**: COMPLETED

**Goal**: Make the AI smarter with session context, add engagement features, and enable embedding for broader distribution.

### 11.1 Session Context for AI (Smart Answers)
**Priority**: Critical — this is our core AI differentiator
**Estimated complexity**: Large

**What it is**: Allow hosts to provide context that the AI uses when clustering questions and suggesting answers. Context can come from:
- Uploaded documents (PDF, PowerPoint, Word docs)
- Website URLs (crawled and indexed)
- Previous session Q&A (for recurring meetings — automatically pull FAQ/answered questions from past sessions with same recurrence_parent_id)
- Free-text description (already exists as session description)

**What to do**:
- Add file upload to session creation and settings (Supabase Storage)
- Parse uploaded PDFs/PPTs server-side (use pdf-parse, pptx libraries)
- Store extracted text in a `session_context` table (session_id, content_type, content_text, source_url)
- For recurring sessions: auto-pull answered clusters + FAQ entries from previous instances
- Pass context to AI prompts in clustering.ts and suggest-answer API
- Add a "Context" section to session settings panel showing uploaded docs

**Database changes**:
- New table: `session_context` (id, session_id, content_type enum('document','url','previous_session','description'), content_text, source_url, file_name, created_at)

**Files to create/modify**:
- `app/api/parse-document/route.ts` — server-side document parsing
- `lib/clustering.ts` — inject context into AI prompts
- `app/api/suggest-answer/route.ts` — use context for better answers
- `app/session/[code]/page.tsx` — context upload UI in settings
- `app/create/page.tsx` — optional context upload during creation
- `lib/supabase.ts` — new types

**Dependencies**: None

---

### 11.2 Live Participant Counter
**Priority**: Medium
**Estimated complexity**: Small

**What it is**: Show a live count of how many attendees are currently viewing the session. Uses Supabase Realtime Presence.

**What to do**:
- Use Supabase Realtime Presence API to track connected clients on join pages
- Show "X people here" badge in session header (host view), join page header, and present page
- Animate count changes (subtle pulse on increment)
- Only count unique presence keys (deduplicate multiple tabs from same device)

**Files to modify**:
- `app/session/[code]/page.tsx` — presence badge in header
- `app/join/[code]/page.tsx` — track presence + show count
- `app/present/[code]/page.tsx` — show count

**Dependencies**: None

---

### 11.3 Embed Mode (`/embed/[code]`)
**Priority**: Medium
**Estimated complexity**: Small-Medium

**What it is**: A minimal, iframeable version of the join page. Hosts paste it into their website, Notion, LMS, etc.

**What to do**:
- Create `/embed/[code]` route — stripped-down join page (no header, no sidebar, just Q&A)
- Add `X-Frame-Options: ALLOWALL` header for this route only
- Provide embed code snippet on session dashboard ("Embed" button → copy iframe HTML)
- Support query params: `?theme=light|dark`, `?tab=ask|all|topics`
- Responsive sizing that fills the iframe container

**Files to create**:
- `app/embed/[code]/page.tsx` — minimal embeddable join view

**Files to modify**:
- `app/session/[code]/page.tsx` — add "Embed" button with copy-able iframe snippet
- `next.config.js` or middleware — configure headers for embed route

**Dependencies**: None

---

### 11.4 Question Archiving
**Priority**: Low
**Estimated complexity**: Small

**What it is**: Host can archive approved questions they want to hide from the main view without deleting them.

**What to do**:
- Add `archived boolean default false` to questions table
- Add "Archive" button on question cards (host view only)
- Archived questions hidden from main view but visible in a collapsible "Archived" section
- Archived questions excluded from clustering candidates
- Bulk archive option ("Archive all in cluster")

**Database changes**:
- `ALTER TABLE questions ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;`

**Files to modify**:
- `app/session/[code]/page.tsx` — archive button, archived section
- `lib/supabase.ts` — update Question type
- `app/api/cluster/route.ts` — exclude archived questions

**Dependencies**: None

---

### 11.5 Question Pinning
**Priority**: Low
**Estimated complexity**: Small

**What it is**: Host can pin 1-3 important questions to the top of the attendee view.

**What to do**:
- Add `is_pinned boolean default false` to questions table
- Add "Pin" toggle on question cards (host view)
- Pinned questions appear in a highlighted section at the top of attendee view
- Limit to 3 pinned questions per session
- Pinned questions also show prominently on present page

**Database changes**:
- `ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;`

**Files to modify**:
- `app/session/[code]/page.tsx` — pin toggle button
- `app/join/[code]/page.tsx` — pinned questions section at top
- `app/present/[code]/page.tsx` — show pinned questions
- `lib/supabase.ts` — update Question type

**Dependencies**: None

---

### Sprint 11 Execution Order

| # | Task | Effort | Why This Order |
|---|------|--------|---------------|
| 1 | Participant counter (11.2) | 1-2 hrs | Quick win, immediate engagement boost |
| 2 | Question pinning (11.5) | 1 hr | Simple DB field + UI toggle |
| 3 | Question archiving (11.4) | 1-2 hrs | Simple DB field + UI |
| 4 | Embed mode (11.3) | 2-3 hrs | New route, moderate effort |
| 5 | Session context for AI (11.1) | 6-8 hrs | Most complex, highest impact |

**Total Sprint 11 estimate**: ~12-16 hrs of implementation

---

### Sprint 11 Database Changes

```sql
-- Question archiving
ALTER TABLE questions ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- Question pinning
ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

-- Session context
CREATE TABLE IF NOT EXISTS session_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('document', 'url', 'previous_session', 'description')),
  content_text text NOT NULL,
  source_url text,
  file_name text,
  created_at timestamp with time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_session_context_session_id ON session_context(session_id);
```

---

---

## Sprint 12: Engagement & Cross-Session Intelligence

**Status**: IN PROGRESS

**Goal**: Add real-time audience engagement features and cross-session AI intelligence.

### 12.1 Audience Reactions
**Priority**: Medium
**Estimated complexity**: Medium

**What it is**: Attendees can send emoji reactions (heart, clap, mind-blown, thumbs up, fire, laugh) that animate across the present page and session dashboard. Creates energy and engagement without requiring a full question.

**What to do**:
- Create a reaction bar on the join page with 6 emoji buttons
- When clicked, send the reaction to a Supabase channel (realtime broadcast, not a table — reactions are ephemeral)
- On the present page and session dashboard, animate floating emojis rising from bottom to top, fading out after ~3 seconds
- Rate limit: max 1 reaction per second per user to prevent spam
- Reactions should be fun but not distracting — small emojis, subtle animation, short duration

**Files to create**:
- `components/ReactionBar.tsx` — emoji button row for attendees
- `components/ReactionOverlay.tsx` — floating emoji animation overlay

**Files to modify**:
- `app/join/[code]/page.tsx` — add ReactionBar
- `app/present/[code]/page.tsx` — add ReactionOverlay
- `app/session/[code]/page.tsx` — add ReactionOverlay

**Dependencies**: None

---

### 12.2 Cross-Session AI Intelligence
**Priority**: Medium
**Estimated complexity**: Large

**What it is**: For recurring sessions, AI automatically identifies trends across sessions. "This topic came up in your last 3 all-hands." Uses existing FAQ library + session context infrastructure.

**What to do**:
- When a session has `recurrence_parent_id`, auto-fetch answered clusters + FAQ entries from previous sibling sessions
- Save as `previous_session` type context entries in `session_context` table
- Show cross-session trend insights on the analytics page
- AI generates: "Compensation questions increased 40% over 3 sessions", "This is a new topic not seen before"

**Files to modify**:
- `lib/clustering.ts` — auto-pull previous session context for recurring sessions
- `app/analytics/page.tsx` — cross-session trend section
- `app/session/[code]/page.tsx` — "Recurring insights" section

**Dependencies**: 11.1 (session context infrastructure)

---

### Sprint 12 Execution Order

| # | Task | Effort | Why This Order |
|---|------|--------|---------------|
| 1 | Audience reactions (12.1) | 3-4 hrs | Fun, visible engagement feature |
| 2 | Cross-session intelligence (12.2) | 5-6 hrs | Builds on session context from Sprint 11 |

**Total Sprint 12 estimate**: ~8-10 hrs of implementation

---

## Definition of Done (per feature)

- [ ] Feature works end-to-end (host + attendee flows)
- [ ] Real-time updates work (Supabase subscriptions)
- [ ] TypeScript compiles with no errors
- [ ] Mobile-responsive (attendee pages especially)
- [ ] Empty/error states handled gracefully
- [ ] README updated if new setup steps required
