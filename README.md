# Priority Compass

**Start your day with clarity. End it with insight.**

A personal productivity OS for intentional people who want to set daily priorities, track what matters, and reflect with structure — without the overhead of enterprise tooling.

**[Live Demo →](https://prioritycompass.vercel.app)**

![CI](https://github.com/theamazingmrb/priority-compass/actions/workflows/ci.yml/badge.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)

---

## The Problem

Most productivity apps optimize for volume — more tasks, more tracking, more noise. They turn your life into an endless to-do list that grows faster than you can check things off.

**Priority Compass is different.** We optimize for clarity.

This is for people who:
- Start their day overwhelmed by options
- End their day unsure what they actually accomplished
- Want to build self-awareness through structured reflection
- Need their calendar and tasks to work *together*, not in silos

## The Core Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   MORNING                    DAY                    EVENING     │
│   ────────                   ────                   ───────     │
│   Check-in                   Focus                  Reflect      │
│   · Set top priority         · Work with timer      · What worked? │
│   · Note blockers            · Log to journal       · What didn't?  │
│   · Rate energy              · Stay on track        · Tomorrow's focus │
│   · Set daily intent         · Focus mode filter    · Accomplished intent? │
│                                                                 │
│   ─────────────────────────────────────────────────────────────│
│              North Star: Your Life Vision                       │
│              Core Values: What Matters Most                     │
│              WarMap: Year-Level Goals                           │
│              Projects: Track Progress                           │
│              Calendar: See Your Time                            │
│              Weekly Rhythm: Energy-Based Planning               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**This loop creates habit.** Morning intention → Focused execution → Evening reflection.

Most apps only handle the middle. Priority Compass completes the loop.

## What Makes This Different

### 1. **North Star: Your Life Vision**
Define your guiding vision — the person you want to become, the life you're building. This sits at the top of your dashboard, a constant reminder of your direction.
- Write your life vision
- Display prominently on dashboard
- Reference during planning and reflection

### 2. **Core Values: What Matters Most**
Identify and rank your core values. Every task can be evaluated against them.
- Define up to 5 core values
- Rank by importance
- Display on dashboard for daily alignment

### 3. **Daily Intent**
Start each day with a clear intention. What will make today a win?
- Set during morning check-in
- Review during evening reflection
- Track accomplished intents over time

### 4. **Focus Modes**
Categorize tasks by cognitive load:
- **Deep Work** — Complex, requires flow state (90+ min blocks)
- **Quick Wins** — Short, can be done in gaps (15-30 min)
- **Planning** — Strategic thinking, roadmapping (30-60 min)
- **Admin** — Routine tasks, low cognitive load (15-30 min)

Filter projects and tasks by focus mode to match your energy.

### 5. **Weekly Rhythm**
Plan your week around your natural energy patterns:
- Define energy levels for each time block (Morning, Midday, Afternoon, Evening)
- Set preferred focus modes per time block
- Get suggestions based on your rhythm
- See your weekly overview on the dashboard

### 6. **Intentional Check-ins**
Not just "what do I need to do?" — but "what matters most right now?"
- Time-aware prompts (morning, midday, evening)
- Energy tracking to find your patterns
- Quick recalibration when priorities shift

### 7. **Priority Tiers, Not Just Lists**
- **Hot** — Urgent, do it now
- **Warm** — Important, do it soon  
- **Cool** — Can wait a bit
- **Cold** — Backlog / someday

Tasks get routed to appropriate time slots based on priority. Hot tasks get prime morning hours. Cold tasks fill gaps.

### 8. **Smart Auto-Scheduling**
The scheduling algorithm doesn't just fill time. It considers:
- **Deadline urgency** (40%) — When is it due? How critical?
- **Time of day** (25%) — Energy-based slot selection (9-11 AM peak, 4 PM second peak)
- **Priority match** (20%) — Hot tasks get premium slots
- **Fragmentation prevention** (15%) — Avoids awkward gaps

One-click "Plan My Day" takes your auto-mode tasks and schedules them intelligently.

### 9. **Structured Reflection**
Daily, weekly, and monthly prompts guide self-awareness:
- Daily: Accomplishments, gratitude, improvements, tomorrow's intention, accomplished daily intent?
- Weekly: Wins, blockers, WarMap progress, next week focus
- Monthly: Vision check, areas to improve, goals

Streaks gamify consistency without being gimmicky.

### 10. **WarMap: Year-Level Planning**
Define annual themes and goals. Link tasks to them. Review progress during weekly reflections.

This is the missing layer between "today's tasks" and "life goals."

### 11. **Google Calendar Integration**
Two-way sync:
- See your calendar events as busy blocks
- Scheduled tasks automatically sync to Google Calendar
- Changes flow both ways

### 12. **Spotify Integration**
Attach songs to journal entries. Build a soundtrack for your productivity. Optional but surprisingly sticky.

## Key Features

| Feature | Description |
|---------|-------------|
| **North Star** | Life vision displayed prominently on dashboard |
| **Core Values** | Define and rank what matters most |
| **Daily Intent** | Set and track daily intentions |
| **Focus Modes** | Categorize tasks by cognitive load (Deep, Quick, Planning, Admin) |
| **Weekly Rhythm** | Energy-based planning with time blocks |
| **Time-Aware Check-ins** | Morning, midday, evening flows with energy tracking |
| **Priority-Based Tasks** | 4-tier system with smart scheduling |
| **Plan My Day** | One-click intelligent scheduling |
| **Google Calendar Sync** | Two-way integration with busy block awareness |
| **Journal** | Session-based entries with mood and task linking |
| **Reflections** | Daily/weekly/monthly with streak tracking |
| **WarMap** | Annual goal planning and progress tracking |
| **Projects** | Organize tasks by project with color coding |
| **Spotify Integration** | Music for your workflow |

## Technical Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth with Row Level Security |
| Styling | Tailwind CSS + shadcn/ui |
| Animation | Framer Motion |
| External APIs | Spotify, Google Calendar |

### Database Design

Tables with Row Level Security ensuring complete data isolation between users:

| Table | Purpose |
|-------|---------|
| `projects` | User-defined project categories |
| `tasks` | Tasks with priority, scheduling, project links, focus mode |
| `journals` | Journal entries with mood and Spotify metadata |
| `journal_tasks` | Many-to-many journal ↔ task linking |
| `checkins` | Priority snapshots with energy levels |
| `spotify_playlists` | Synced playlist references |
| `warmap_categories` | Annual theme categories |
| `warmap_items` | Specific goals within categories |
| `task_warmap_items` | Many-to-many task ↔ goal linking |
| `reflections` | Daily/weekly/monthly structured reflections |
| `reflection_streaks` | Per-user streak tracking |
| `focus_sessions` | Focus timer session logs |
| `north_star` | User's life vision |
| `core_values` | User's ranked core values |
| `daily_intents` | Daily intention tracking |
| `weekly_rhythms` | Energy-based time block preferences |
| `notification_settings` | Push notification preferences |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Supabase account (free tier works)
- Spotify Developer account (optional, for music features)
- Google Cloud project (optional, for Calendar sync)

### Installation

```bash
# Clone and install
git clone https://github.com/theamazingmrb/priority-compass.git
cd priority-compass
pnpm install

# Set up environment
cp .env.example .env
# Add your Supabase, Spotify, and Google credentials

# Run locally
pnpm dev
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `NEXT_PUBLIC_BASE_URL` | No | Base URL for OAuth callbacks |
| `SPOTIFY_CLIENT_ID` | No | Spotify app Client ID |
| `SPOTIFY_CLIENT_SECRET` | No | Spotify app Client Secret |
| `SPOTIFY_REDIRECT_URI` | No | OAuth callback URL |
| `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` | No | Spotify client ID (public) |
| `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI` | No | Spotify callback URL (public) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | No | Google OAuth Client ID |
| `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` | No | Google OAuth callback URL |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth Client Secret |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | No | VAPID key for push notifications |
| `VAPID_PRIVATE_KEY` | No | VAPID private key |
| `CRON_SECRET` | No | Secret for notification scheduling |

### Database Setup

For local development with Supabase CLI:

```bash
supabase start
supabase db reset  # Applies migrations automatically
```

For hosted Supabase, run migrations in order by timestamp prefix.

### Migrations

Migrations are prefixed with timestamps and must be applied in order:

```
20240101000000_initial_schema.sql
20240115000000_weekly_rhythms.sql
20240313000000_add_images.sql
20240313000001_create_storage_buckets.sql
20240313000002_add_onboarding.sql
20250410_daily_intent.sql
20260313000000_warmap.sql
20260313000001_reflections.sql
20260314000000_journal_images.sql
20260314145737_remote_schema.sql
20260330000000_google_calendar.sql
20260403000000_focus_sessions.sql
20260403000000_notification_settings.sql
20260410000000_north_star.sql
20260410000001_core_values.sql
20260410000002_focus_mode.sql
20260410120000_reflection_accomplished_intent.sql
20260410180000_warmap_alignment.sql
```

## Deployment

Optimized for Vercel deployment:

```bash
vercel deploy
```

Add environment variables in the Vercel dashboard under Settings → Environment Variables.

## License

MIT