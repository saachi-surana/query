# Query — Development Conversation Log

This document captures the prompts and decisions made during the development of Query, a Slido competitor with AI-powered question clustering.

---

## Session Setup

**User**: Run the setup steps from the README.md for me

- Ran `npm install`
- Copied `.env.local.example` to `.env.local`
- User filled in Supabase URL, anon key, and Anthropic API key
- Started dev server with `npm run dev`

**User**: For my project, a website, should I make a publishable key or secret key?

- Advised: Use **anon/public** key for `NEXT_PUBLIC_SUPABASE_ANON_KEY` (exposed to browser, protected by RLS)
- Use **secret** key for `ANTHROPIC_API_KEY` (server-side only, no `NEXT_PUBLIC_` prefix)

---

## Bug Fixes & Feature Requests

### Copy Session Code Bug
**User**: When I hit copy link after creating a session as a host, instead of copying the session code it copied the full URL. I only needed to copy the code.

- Added a separate "Copy Session Code" button alongside "Copy Join Link"
- Both buttons have matching styles

### Functional Upvotes
**User**: Make the upvotes actually functional

- Made upvote buttons clickable in the "All Questions" tab
- Added per-question upvote tracking via `upvotedIds` Set
- Sorted All Questions by upvote count

### Toggle Upvotes
**User**: A user should be able to unclick their upvote. Also on upvote, reorder the all questions.

- Implemented toggle upvote (click to upvote, click again to remove)
- All Questions tab now sorts by upvotes descending

### My Questions Tab
**User**: Add a my questions tab where I can see the ones I submitted

- Added "My Questions" tab tracking submitted question IDs in memory
- Shows newest first with upvote counts and status badges

### Answered Section with Subtabs
**User**: A host should be able to see the questions they have marked answered. Create a new dropdown tab that is answered under which you should have two subtabs.

- Created collapsible "Answered" dropdown section
- Subtabs: "Misc" (unclustered + orphan answered) and individual cluster titles
- Full unmark support (question + cluster level)

### Collapsible Sections with Counts
**User**: Make Unanswered Clusters and Unclustered Questions have dropdowns with counts too

- All three sections now collapsible with count badges
- Unanswered Clusters (blue), Unclustered (gray), Answered (green)

### Reply System
**User**: Allow the host to be able to type an answer to a question, or even other users to chip in by responding/asking a follow up question

- Created `replies` table with real-time subscriptions
- Reply threads on both moderator and attendee pages
- Host replies tagged with "Host" badge in blue
- Host reply auto-marks question as answered

---

## Competitive Research

**User**: We are essentially building a Slido competitor. Suggest features and UI flows. Do a deep search on what people hate about Slido.

- Ran 3 parallel research agents
- Searched Slido community forums, G2, Capterra, Reddit
- Found: AI clustering is the #1 requested Slido feature that nobody offers
- Key finding: "AI-powered question clustering is the single largest unoccupied opportunity in this space"
- Created competitive analysis doc and sprint plan

**Key Slido Pain Points Found**:
1. Question overload with no organization (125 questions/hour, can't keep up)
2. Q&A moderation paywalled at $720/year
3. No post-session follow-up workflow
4. Manual labels only — no AI grouping
5. Export behind paywall

---

## Sprint 1: Event-Ready MVP Polish

**Features Built**:
1. Session description visible on attendee join page
2. CSV export (free — Slido charges $720/yr)
3. Better empty states with 3-step onboarding guide
4. Presentation display view (`/present/[code]`) — dark theme, projectable
5. Question moderation toggle with approve/dismiss queue

**Moderation Bug Fixes**:
- Fixed: Moderation banner not visible enough → Added persistent amber banner with X dismiss button
- Fixed: Questions not going to pending review → Added real-time session subscription so attendee picks up moderation toggle changes
- Fixed: Needed `alter publication supabase_realtime add table sessions`

---

## Sprint 2: Differentiation Features

**Features Built**:
1. "Discussing Now" cluster highlight (purple UI, visible on all views)
2. Attendee "Topics" tab with read-only cluster view
3. Post-session follow-up (End/Reopen Session)
4. Pre-session question collection (optional start time on create)
5. Session analytics (questions, upvotes, % answered, progress bar, top 3)

---

## Sprint 3: Phase 2 — AI Assistance

**Features Built**:
1. Multi-moderator cluster claiming (claimed_by field, indigo badge)
2. AI suggested answers via `/api/suggest-answer` endpoint
3. Session-level AI auto-suggest toggle (on create page + header toggle)
4. FAQ library — save answered clusters as reusable FAQ entries
5. Post-session report page (`/report/[code]`)

**AI Suggest Debugging**:
- User got 500 error on AI Suggest
- Added detailed error logging
- Root cause: Anthropic API credit balance too low
- Fixed error handling to show actual error message

**Auto-Suggest Enhancement**:
**User**: Instead of having AI suggest per question, make it a setting they can choose when setting up the session but also toggle on or off for the whole session.

- Added `auto_suggest` boolean to sessions
- Checkbox on create page
- Toggle in moderator header (purple when on)
- Auto-triggers server-side after clustering when enabled

---

## Architecture Decisions

- **No auth**: Session management is URL-based (join codes). Upvotes and "My Questions" tracked in browser memory only.
- **Real-time first**: All data synced via Supabase real-time subscriptions across all views.
- **AI clustering**: Every question triggers `/api/cluster` which calls Claude Haiku to decide: add to existing cluster or create new one.
- **Moderation flow**: When moderation is on, questions insert with `approved: false`. Host approves → triggers clustering. Clustering API checks `approved` flag.
- **Presentation view**: Separate read-only dark-themed page designed for projectors. Subscribes to same real-time channels.

---

## Phased Roadmap (from sprint-plan.md)

| Phase | Goal |
|---|---|
| MVP (Sprint 1) | Replace the Google Doc moderator workflow |
| Sprint 2 | Ship features no competitor has |
| Sprint 3 | Begin reducing moderator workload with AI |
| Future | Integrations (Zoom/Teams), recurring FAQ library, talk track builder |
