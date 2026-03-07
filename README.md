# Query — Smarter Q&A for Live Events

A smart live Q&A platform with AI-powered question clustering. Attendees submit questions; the moderator sees them automatically grouped into topic clusters with AI-generated summary questions — in real time.

---

## Tech Stack

- **Next.js 14** (App Router)
- **Supabase** — PostgreSQL database + real-time subscriptions
- **Anthropic API** (`claude-haiku-4-5-20251001`) — AI clustering
- **Tailwind CSS** — styling

---

## Setup

### 1. Clone & install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In the Supabase dashboard, open the **SQL Editor**.
3. Paste the contents of `supabase-schema.sql` and run it.

This creates the `sessions`, `questions`, `clusters`, and `replies` tables and enables real-time.

> **Upgrading?** If you already have the database set up from an earlier version, run `supabase-add-replies.sql` in the SQL Editor to add the `replies` table.

### 3. Add environment variables

Copy the example file:

```bash
cp .env.local.example .env.local
```

Then open `.env.local` and fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=sk-ant-your-key
```

- **Supabase URL & anon key**: found in your Supabase project under **Settings → API**.
- **Anthropic API key**: get one at [console.anthropic.com](https://console.anthropic.com).

> **Note:** If `ANTHROPIC_API_KEY` is missing or set to `sk-ant-placeholder`, the app still works — questions will just appear in the "Unclustered" section without AI grouping.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How It Works

### Attendee Flow
1. Visit the home page, enter the 6-character join code → `/join/[code]`
2. Type a question (500-char limit with live counter)
3. As-you-type similarity search suggests existing questions to upvote instead
4. Submit → question appears in real time on the moderator dashboard
5. Upvote/un-upvote other questions; view all questions sorted by popularity
6. Reply to any question with follow-ups; see host responses in real time
7. Track your own submissions in the "My Questions" tab

### Moderator Flow
1. Click "Host a Session" → fill in title + optional description → `/session/[code]`
2. Share the join code or join link with attendees
3. As questions arrive, they're automatically clustered by AI topic
4. Each cluster shows a generated summary question
5. Mark individual questions or entire clusters as answered (or unmark them)
6. Reply to questions directly — responses are tagged as "Host"
7. View answered questions in a collapsible section with cluster subtabs

### Clustering
Every new question triggers a call to `/api/cluster`, which:
1. Fetches existing unanswered clusters for this session
2. Calls `claude-haiku` to decide: add to existing cluster or create a new one
3. Updates the question's `cluster_id` in Supabase
4. If added to an existing cluster, regenerates the cluster's summary question

---

## Project Structure

```
app/
  page.tsx                  # Home — join or host
  create/page.tsx           # Create a new session
  join/[code]/page.tsx      # Attendee view
  session/[code]/page.tsx   # Moderator dashboard
  api/cluster/route.ts      # Clustering API endpoint

lib/
  supabase.ts               # Supabase client + types
  clustering.ts             # AI clustering logic

supabase-schema.sql         # Full database schema (fresh setup)
supabase-add-replies.sql    # Migration to add replies table (existing DBs)
.env.local.example          # Environment variable template
```
