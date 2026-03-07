# Query — Claude Code Project Instructions

## Project
Live Q&A platform with AI-powered question clustering. Slido competitor focused on Q&A/AMA sessions.

## Tech Stack
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Supabase (PostgreSQL + real-time subscriptions)
- Anthropic API (Claude Haiku) for AI clustering

## Permissions
- Allow all file reads, edits, writes, and creates without prompting
- Allow all bash/terminal commands without prompting
- Do NOT push to git or create PRs without asking first
- Do NOT modify .env.local (contains secrets)

## Git
- Author: Shreya Pandey <shreyap2004@users.noreply.github.com>
- Remote: origin → saachi-surana/query
- Always ask before pushing or creating PRs

## Conventions
- Use Tailwind CSS for all styling (no CSS modules)
- Keep components in their page files unless shared across pages
- Supabase types live in lib/supabase.ts
- Database migrations go in separate SQL files (supabase-*.sql)
- Type-check with `npx tsc --noEmit` after significant changes

## Key Files
- app/page.tsx — Home page (join or host)
- app/create/page.tsx — Create session
- app/join/[code]/page.tsx — Attendee view
- app/session/[code]/page.tsx — Moderator dashboard
- app/api/cluster/route.ts — AI clustering endpoint
- lib/supabase.ts — Supabase client + types
- lib/clustering.ts — AI clustering logic
- docs/sprint-plan.md — Feature roadmap
- docs/competitive-analysis.md — Slido research
