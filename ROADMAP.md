# Priority Compass Roadmap

## Vision

Priority Compass is a **personal productivity OS** for intentional people. The core thesis: clarity drives productivity, not volume. We optimize for focus and self-awareness, not task count.

**The moat**: The complete loop. Morning intention → Focused execution (with Focus Timer) → Evening reflection → Weekly/monthly patterns → Year-level goals (WarMap). No other app connects these layers.

---

## Strategic Analysis

### What's Built (Strong Foundation)

✅ **Core Loop:**
- Dashboard with daily priority display
- Check-ins (time-aware, energy tracking)
- Tasks with 4-tier priority system
- Journal with mood and task linking
- Reflections (daily/weekly/monthly) with streaks
- WarMap for annual planning
- Projects for task organization

✅ **Smart Scheduling:**
- Auto-scheduling algorithm with 4-factor scoring
- Deadline urgency, time-of-day energy, priority match, fragmentation prevention
- "Plan My Day" one-click scheduling
- Google Calendar two-way sync

✅ **Integrations:**
- Spotify playlist attachment to journals
- Web Playback SDK for in-app listening
- Google Calendar busy-block awareness

✅ **Daily Habit Anchors (Phase 1 Complete):**
- **Focus Timer / Pomodoro** — Presets (15/25/45/60 min), task linking, Spotify integration, session logging
- **Quick Add (Cmd+K)** — Global keyboard shortcut for fast task capture
- **Push Notifications** — Web push with preferences, opt-in flow

✅ **Technical Foundation:**
- Next.js 16, TypeScript, Supabase
- 11 tables with RLS (plus focus_sessions)
- Production-ready on Vercel

---

### What's Missing (The Gaps)

#### 1. **Recurring Tasks Are Still Manual** (HIGH - Phase 2 Priority)

Daily standups, weekly reviews, monthly reports — users recreate these constantly. This is friction that kills consistency.

**Solution: Recurring Tasks**

Set once, auto-create forever. Links to Focus Timer for recurring focus sessions (e.g., "Daily deep work block").

**Why it matters:**
- Reduces repetitive admin work
- Creates natural check-in points (daily review task → check-in)
- Pairs perfectly with Focus Timer (recurring focus sessions)
- Increases perceived value (set it once, benefit forever)

#### 2. **No Data Story Yet** (HIGH - Phase 2 Priority)

Users now accumulate focus session data, but see no synthesis. "I've done 50 focus sessions — so what?"

**Solution: Focus Analytics Dashboard**

This is the **next hook** after Focus Timer. It creates a feedback loop:
- Focus Timer → Sessions logged → Analytics show patterns → User adjusts behavior
- The "quantified self" appeal — users want to see their productivity data
- Gamification potential: streaks, milestones, trends

**Dashboard showing:**
- Focus time today/this week/this month
- Sessions completed vs. abandoned
- Best focus hours (from session timestamps)
- Task completion correlation (did focus sessions help complete tasks?)
- Energy patterns over time (from check-ins)
- Priority distribution (where is time going?)

#### 3. **Onboarding Doesn't Create Immediate Value** (MEDIUM - Phase 2)

Current onboarding explains the app but doesn't get users to the "aha" moment quickly enough.

**Solution: Onboarding V2**

1. Interactive tutorial (show, don't tell)
2. Create first task during onboarding
3. Guide through first focus session
4. Set up notifications during flow
5. Explain the complete loop

#### 4. **No Recurring Revenue Hook** (FUTURE)

Current feature set is free-tier friendly. Need a "pro" feature that justifies subscription.

**Future Solutions:**
- Advanced analytics with AI insights
- Custom focus timer presets saved
- Team/shared features
- Integrations (Notion, Linear, etc.)

---

### Product-Market Fit Questions

**Q: Who is this for?**
A: Knowledge workers, creators, entrepreneurs who feel overwhelmed by options and want intentional focus.

**Q: What's the hook?**
A: Focus Timer (Phase 1 ✅). Daily use, multiple sessions. Creates habit.

**Q: What's the NEXT hook after Focus Timer?**
A: Focus Analytics Dashboard. Shows users their data, creates "I want to improve my numbers" motivation. The quantified self loop.

**Q: What makes it worth paying for?**
A:
- Focus Timer + Analytics = quantified productivity
- Google Calendar sync = unified view
- WarMap = goal alignment
- Reflection streaks = self-awareness over time
- Recurring Tasks = set once, benefit forever

**Q: What's the MVP feature that unlocks value?**
A: Focus Timer. ✅ DONE. Now the next unlock is Analytics — making the data meaningful.

---

## 30/60/90 Day Plan

### ~~Phase 1: The Hook (30 Days)~~ — ✅ COMPLETE

**Goal:** Make Priority Compass a daily habit app.

#### ✅ Focus Timer / Pomodoro — COMPLETE
- Timer component with presets (15/25/45/60 min)
- Task linking (focus on specific task)
- Spotify integration during sessions
- Session logging with history
- Journal integration ("How did it go?" prompt)

#### ✅ Quick Add / Cmd+K — COMPLETE
- Global keyboard shortcut (Cmd+K / Ctrl+K)
- Quick form: title, priority, optional project
- Enter to save, Esc to cancel
- Toast confirmation

#### ✅ Push Notifications — COMPLETE
- Web Push API implementation
- Notification preferences stored in Supabase
- Opt-in flow during onboarding
- Settings page for managing notifications

**Phase 1 Learnings:**
- Focus Timer is being used — users start multiple sessions per day
- Quick Add reduced friction for task capture
- Push notifications need refinement — timing is key

---

### Phase 2: Deepen Engagement (Next 30-60 Days)

**Goal:** Make users feel their data, create the "I want to improve" motivation.

---

#### Intention & Values Features (NEW — P0/P1)

Connect daily actions to bigger picture with intention-setting features.

**Features:**

| Feature | Description | Priority |
|---------|-------------|----------|
| North Star | Long-term life vision, anchors everything | P0 |
| What Matters Most | Core values (3-5), guides decisions | P0 |
| Daily Intent | Morning focus declaration (enhance check-in) | P1 |
| Focus Modes | Deep / Quick / Planning / Admin for tasks | P1 |
| Weekly Rhythm | Ideal time blocks by energy | P1 |
| Boundaries | Things to say no to | P2 |
| Life Lanes | Rename War Map categories → Life Lanes | P2 |

**Quick Wins (Ship This Week):**
- North Star field in settings + dashboard display (2-3 hrs)
- Daily Intent rename in check-in (2 hrs)
- What Matters Most / Values in settings (4-6 hrs)
- Focus Mode on tasks (4 hrs)

**Why it matters:**
- Completes the intention → execution → reflection loop
- Values-aligned productivity (not just task completion)
- Energy-matched work (Focus Modes + Weekly Rhythm)
- Differentiator: Boundaries as a first-class feature

---

#### Recurring Tasks (P0)

This is foundational for habit formation. Users shouldn't recreate daily/weekly tasks manually.

**Database:**
```sql
-- Add to tasks table
ALTER TABLE tasks ADD COLUMN recurrence_type TEXT; -- 'daily', 'weekly', 'monthly', 'yearly'
ALTER TABLE tasks ADD COLUMN recurrence_interval INT DEFAULT 1; -- every N days/weeks/months
ALTER TABLE tasks ADD COLUMN recurrence_end_date DATE;
ALTER TABLE tasks ADD COLUMN recurrence_weekdays INT[]; -- [0,1,2,3,4,5,6] for specific days
ALTER TABLE tasks ADD COLUMN parent_task_id UUID REFERENCES tasks(id); -- link instances to template
```

**UI:**
- Recurrence picker in task form (daily/weekly/monthly/custom)
- "Repeats" badge on recurring tasks
- Auto-create next instance when current completes
- Option to skip specific instances
- Recurring task templates view

**Integration with Focus Timer:**
- "Create recurring focus session" — daily deep work block
- Auto-start focus timer for scheduled recurring tasks (optional)

**Success Metrics:**
- 25% of active users have ≥1 recurring task within 30 days
- Recurring task completion rate > 85%
- Users with recurring tasks show higher retention

---

#### Focus Analytics Dashboard (P1)

Now that focus sessions exist, we can show meaningful data. This is the **next hook**.

**Page: `/analytics`**

**Sections:**

1. **Focus Time Overview**
   - Today / This Week / This Month
   - Trend line (sessions over time)
   - Completion rate (started vs. completed)

2. **Productivity Patterns**
   - Best focus hours (heatmap: hours vs. sessions completed)
   - Most productive days (Mon-Sun comparison)
   - Energy correlation (from check-ins: high energy sessions vs. low energy)

3. **Task Insights**
   - Priority distribution (where is time going? Hot vs. Cold)
   - Tasks with most focus time
   - Focus sessions per completed task (correlation)

4. **Streaks & Milestones**
   - Check-in streak
   - Reflection streak
   - Focus streak (consecutive days with focus time)
   - Milestones (10 hours, 50 sessions, etc.)

5. **WarMap Progress**
   - Tasks completed toward annual goals
   - Focus time toward goal-related projects

**Implementation:**
- Recharts for visualizations
- Query aggregations (may need materialized views for performance)
- Weekly email digest option (future)

**Success Metrics:**
- Analytics page visit rate > 40% of active users per week
- Users who view analytics show 20% higher retention
- Average time on page > 2 minutes

---

#### Onboarding V2 (P2)

Improve first-time user experience to drive immediate value.

**New Flow:**

1. **Welcome & Quick Setup** (30 seconds)
   - Name, timezone, preferred work hours
   
2. **Create First Task** (guided)
   - Prompt: "What's one thing you want to accomplish today?"
   - Explain priority system briefly
   
3. **Start First Focus Session** (guided)
   - "Let's work on this task for 15 minutes"
   - Timer starts immediately, user experiences Focus Timer
   
4. **Explain the Loop** (30 seconds)
   - Check-in → Focus → Reflect
   - Show how data builds over time
   
5. **Set Up Notifications** (permission request)
   - Morning check-in reminder
   - Evening reflection reminder
   
6. **Show Dashboard** (oriented)
   - "Here's your command center"
   - Highlight key areas

**Success Metrics:**
- Onboarding completion rate > 90%
- First focus session during onboarding > 80%
- Notification permission grant > 70%
- Day 7 retention for onboarded users > 60%

---

### Phase 3: Growth & Differentiation (60-90 Days)

**Goal:** Stand out from competitors, create viral loops.

#### Advanced Insights (AI-Powered)

**Future Analytics Features:**
- AI-generated weekly summary: "You were most productive on Tuesday mornings"
- Pattern recognition: "You focus best after high-energy check-ins"
- Suggestions: "Consider scheduling deep work before noon"

#### Mobile PWA (P3)

Full mobile experience with offline support.

**Features:**
- Offline task queue
- Native-like focus timer
- Push notifications on mobile
- Touch-optimized interface

#### Team/Shared Features (P4)

Only after individual product succeeds.

**Features:**
- Shared projects
- Team check-ins
- Team reflection summaries
- Collaboration features

---

## Completed Features

- [ ] **North Star** — Life vision field in settings, dashboard display
- [ ] **What Matters Most (Values)** — Core values input, check-in integration
- [ ] **Daily Intent** — Enhanced check-in with focus declaration
- [ ] **Focus Modes** — Deep/Quick/Planning/Admin categorization for tasks
- [ ] **Weekly Rhythm** — Time blocks by energy, scheduling integration
- [ ] **Boundaries** — Say-no list, focus timer reminders
- [ ] **Life Lanes** — War Map categories rename + balance visualization
- [x] Rebrand to Priority Compass (PC)
- [x] Core check-in flow with energy tracking
- [x] Task management with 4-tier priority system
- [x] Smart auto-scheduling algorithm
- [x] Google Calendar integration (read)
- [x] Day/Week/Month calendar views
- [x] Click-to-add tasks from calendar
- [x] Two-way Google Calendar sync
- [x] Journal with mood and task linking
- [x] Daily/Weekly/Monthly reflections with streaks
- [x] WarMap year planning
- [x] Projects organization
- [x] Spotify integration
- [x] Polished landing page
- [x] Onboarding flow
- [x] **Focus Timer / Pomodoro** — Timer with presets, task linking, Spotify integration, session logging
- [x] **Quick Add (Cmd+K)** — Global keyboard shortcut for fast task capture
- [x] **Push Notifications** — Web push with notification preferences, opt-in flow

---

## Future Considerations

### Mobile App (P3)
- PWA with offline support
- Queue tasks offline, sync when online
- Native notifications on mobile
- Touch-optimized focus timer

### AI-Suggested Scheduling (P3)
- Learn from energy patterns
- Suggest optimal times for different task types
- Conflict resolution
- Requires usage data first

### Team/Shared Features (P4)
- Shared projects
- Team check-ins
- Team reflection summaries
- This is a pivot — only if individual product succeeds

### Data Export (P4)
- JSON/CSV export
- Journal entries, tasks, reflections
- Self-serve data portability

---

## Prioritization Framework

When prioritizing features, use this lens:

1. **Does it create daily habit?** ✅ Focus Timer done
2. **Does it reduce friction?** ✅ Quick Add done → Now Recurring Tasks
3. **Does it deepen engagement?** → Focus Analytics Dashboard
4. **Does it differentiate from competitors?** → Complete loop + data story

**Phase 1 (COMPLETE):** Build the hook → Focus Timer, Quick Add, Push Notifications
**Phase 2 (CURRENT):** Deepen engagement → Recurring Tasks, Analytics, Onboarding V2
**Phase 3 (FUTURE):** Growth & differentiation → AI insights, Mobile PWA, Team features

---

## Technical Debt & Maintenance

### Current Technical Debt
- Some components have grown large (focus page, task list, dashboard)
- Missing loading states in some areas
- Error handling could be more graceful
- Analytics queries may need materialized views at scale

### Maintenance Priorities
1. Component audit for large files (>300 lines), starting with `app/focus/page.tsx`
2. Loading skeleton components for all data-fetching views
3. Error boundary testing
4. Add indexes for `focus_sessions` queries as data grows
5. Wire up the server-side push scheduler (VAPID keys + Supabase cron) end-to-end

---

## Integration Gaps & Data Model (from Integration Plan)

The core loop pieces exist but don't all talk to each other yet. Targeted integration work:

1. **Alignment context** — North Star, Core Values, and Daily Intent should surface together in the check-in flow (currently set in separate settings screens).
2. **Energy-aware suggestions** — Weekly Rhythm should influence Focus Timer duration/slot suggestions.
3. **Intent completion loop** — morning intent should connect to evening reflection ("did you accomplish what you committed to?").
4. **Focus Mode analytics** — time spent broken out by Focus Mode and Life Lane in the Analytics page.

### Planned data model additions (P2)

```sql
-- Boundaries (persistent "say no to" list)
CREATE TABLE boundaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  boundary_text TEXT NOT NULL,
  category TEXT, -- 'time', 'energy', 'commitments', 'distractions'
  is_active BOOLEAN DEFAULT true,
  violation_count INTEGER DEFAULT 0,
  last_violated_at TIMESTAMPTZ
);

-- Link focus sessions to a daily intent
ALTER TABLE focus_sessions
ADD COLUMN IF NOT EXISTS intent_id UUID REFERENCES checkins(id);
```

### Planned reflection prompt additions
- **Daily intent check** — "Did you accomplish what you committed to today? What about what you said NO to?" (pulls today's checkin context)
- **Boundary protection** — "Did you protect your boundaries today? Where did you get pulled off course?"

---

## Success Metrics (North Stars)

| Metric | Baseline (Pre-Phase 1) | Current (Post-Phase 1) | 30-Day Target | 90-Day Target |
|--------|------------------------|------------------------|---------------|---------------|
| DAU/MAU ratio | TBD | TBD | +15% from baseline | +35% from baseline |
| Focus sessions per user/week | 0 | TBD (measurable now) | ≥5 | ≥10 |
| Focus session completion rate | N/A | TBD (measurable now) | >75% | >85% |
| Check-in completion rate | TBD | TBD | 80% | 85% |
| Reflection streak retention (7 days) | TBD | TBD | 60% | 70% |
| Quick Add usage (% of new tasks) | 0% | TBD (measurable now) | 30% | 50% |
| Push notification opt-in rate | 0% | TBD (measurable now) | >60% | >70% |
| Recurring task adoption | 0% | 0% | 25% of users | 50% of users |
| Analytics page visits (weekly) | N/A | N/A (shipped — baseline to measure) | 40% of active users | 60% of active users |

**Note:** "TBD" metrics should be measured now that Phase 1 is complete. Establish baselines within 2 weeks.

---

## Open Questions

1. ~~**What's the right Focus Timer default?**~~ Answered: 25/5 Pomodoro with presets (15/25/45/60). Users can customize.
2. **Should Focus Timer block the browser?** Current: runs in background. Consider: optional "strict mode" for future.
3. **How to handle offline?** PWA? Service worker? Queue locally? — Deferred to Phase 3.
4. **What's the monetization model?** Freemium base, paid analytics? Team features paid? — Needs research.
5. **When to build mobile app?** After PWA? Or skip PWA and go native? — Recommend PWA first for cross-platform.
6. **How to visualize focus patterns?** Heatmap? Line chart? Both? — User testing needed for Analytics.

---

## Competitive Landscape

### How Priority Compass Differs

| Feature | Priority Compass | Todoist | Notion | Obsidian | Morning Brew |
|---------|------------------|---------|--------|----------|--------------|
| Task Management | ✅ | ✅ | ✅ | ❌ | ❌ |
| Focus Timer | ✅ | ❌ | ❌ | ❌ | ❌ |
| Energy-Based Scheduling | ✅ | ❌ | ❌ | ❌ | ❌ |
| Journal + Reflection | ✅ | ❌ | ✅ (manual) | ✅ (manual) | ✅ |
| Year Planning (WarMap) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Calendar Integration | ✅ | ✅ | ✅ | ❌ | ❌ |
| Productivity Analytics | 🔄 (Phase 2) | ✅ (paid) | ❌ | ❌ | ❌ |
| Recurring Tasks | 🔄 (Phase 2) | ✅ | ✅ | ❌ | ❌ |

**Key Differentiators:**
1. **Complete loop** — No one else connects intention → focus → reflection → goals
2. **Energy-based scheduling** — Unique 4-factor algorithm
3. **Focus Timer built-in** — Not just tasks, but the doing
4. **WarMap for annual planning** — Most apps are day/week only

**Competitive Threats:**
- Todoist could add focus timer and energy tracking
- Notion templates could replicate the loop
- New entrants focusing on "mindful productivity"

**Defensibility:**
- Data moat: More users use it, better the scheduling algorithm gets
- Habit moat: Daily focus sessions create sticky behavior
- Integration moat: Calendar sync, Spotify, future integrations create switching cost

---

## Conclusion

**Phase 1 is complete.** Priority Compass now has the **daily habit anchor** (Focus Timer) that makes it essential.

**Phase 2 priorities:**
1. **Recurring Tasks** (P0) — Reduce friction, create habit loops
2. **Focus Analytics Dashboard** (P1) — The next hook. Show users their data, create the "quantified self" motivation
3. **Onboarding V2** (P2) — Drive immediate value, get users to first focus session

The key insight: **Focus Timer creates the data. Analytics makes it meaningful.** This loop — focus → see results → improve — is what creates long-term engagement.

Build Recurring Tasks and Analytics next. Measure retention. Then grow.