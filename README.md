# Zeal Bench PM Board

Tracking Internal Zeal Project Progress.

An interactive Kanban-style project management board built with Next.js, Supabase, and Google Auth.

## Features

- **Board tab** — Kanban with To Do / In Progress / Done, drag-and-drop between columns, color-coded project pills, hover-reveal edit/delete actions, priority + due-date badges with live coloring (Overdue / This Week / Next Week / Future), per-column quick add, a full "New Task" modal, and four stacked filters (Projects · Assignees · Due Dates · Priorities) with live task count.
- **Team tab** — Member cards with colored avatar initials, status pill, and project chips. Add / edit / remove with a swatch-picker avatar color.
- **Projects tab** — Color-dotted project rows with status badge, description, lead, and hover-reveal remove. 10-color swatch picker.
- **Auth** — Google OAuth via Supabase.
- **Light / dark mode** via CSS variables, no gradients, flat UI, host font system.

## Quick start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a Supabase project at [supabase.com](https://supabase.com).
3. In the Supabase dashboard → **Authentication → Providers → Google**, enable Google and paste your OAuth client ID / secret from Google Cloud Console. Add the redirect URL it shows (`https://<ref>.supabase.co/auth/v1/callback`) to Google Cloud.
4. Run `supabase/schema.sql` in the Supabase SQL editor to create tables, RLS policies, and the `seed_default_board()` helper.
5. Copy `.env.example` to `.env.local` and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```
6. Run the dev server:
   ```bash
   npm run dev
   ```
7. Sign in, then click **Load demo data** once to seed projects, members, and the sample tasks.

## Stack

- Next.js 15 (App Router) + TypeScript
- Supabase (Postgres + RLS + Auth)
- `@dnd-kit/core` for drag and drop
- Plain CSS with CSS variables (no Tailwind components, just utility import — the UI is hand-built)

## Notes

- All data is per-user; Row Level Security policies in `supabase/schema.sql` restrict each row to its owning `auth.uid()`.
- The board uses optimistic updates for drag/drop, create, update, and delete.
