# Booking + Workflow Platform (v2 — multi-agent)

A self-serve platform for real estate agents: each agent signs up, gets their own
booking page, and manages their bookings. Client portal, documents and the shared
checklist are the next build phase.

## Routes
- `/`                 landing page ("Get started free")
- `/signup`           agent registration
- `/login`            agent sign in
- `/dashboard`        agent's bookings + their booking link
- `/settings`         agent edits hours, timezone, slot length, booking window
- `/book/<slug>`      the public booking page each agent shares with clients

## Environment variables (set these in Vercel)
- `NEXT_PUBLIC_SUPABASE_URL`        your v2 project URL (ends in .supabase.co)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`   the publishable key
- `SUPABASE_SERVICE_ROLE_KEY`       the secret key

## Database
Run `supabase/schema-v2.sql` once in the v2 Supabase project's SQL Editor.

## Local dev
1. `npm install`
2. copy `.env.local.example` to `.env.local` and fill in the three keys
3. `npm run dev`
