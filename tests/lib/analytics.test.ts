import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  getFocusTimeOverview,
  getProductivityPatterns,
  getTaskInsights,
  getStreaksData,
  getWarMapProgress,
  getAnalyticsData,
} from "@/lib/analytics";

// ── Supabase mock ─────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase", () => {
  const from = vi.fn();
  return { supabase: { from } };
});

import { supabase } from "@/lib/supabase";

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

function makeChain(resolvedValue: unknown) {
  // Build a thenable so `await chain.select().eq()...` resolves to the value,
  // while every chained method returns the same thenable (mimics real Supabase
  // query builders that resolve when awaited or when .single() is called).
  const methods = ["select", "insert", "update", "delete", "eq", "gte", "lte", "order", "not"];
  let result = resolvedValue;
  const chain = {
    then: (onFulfilled: (v: unknown) => unknown) => Promise.resolve(result).then(onFulfilled),
    catch: (onRejected: (e: unknown) => unknown) => Promise.resolve(result).catch(onRejected),
  } as Record<string, unknown> & PromiseLike<unknown>;
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  // .single()/.maybeSingle() resolve to the value
  chain.single = vi.fn().mockImplementation(() => Promise.resolve(result));
  chain.maybeSingle = vi.fn().mockImplementation(() => Promise.resolve(result));
  return chain;
}

// ── Date helpers (mirror implementation so tests are meaningful) ─────────────

// "Now" is Wednesday 2026-08-12, 12:00 local time (mid-week, so earlier-in-week
// sessions exist and weekly buckets are meaningful).
const now = new Date(2026, 7, 12, 12, 0, 0);

// Build a timestamp in local time so hour/day buckets match getHours()/getDay().
function localISO(year: number, month: number, day: number, hour: number, minute = 0) {
  return new Date(year, month, day, hour, minute).toISOString();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
});

// ── getFocusTimeOverview ──────────────────────────────────────────────────────

describe("getFocusTimeOverview", () => {
  it("returns zeroed overview when no sessions exist", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: null }));

    const result = await getFocusTimeOverview("u1");

    expect(result).toEqual({
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      trend: [],
      completionRate: 0,
    });
  });

  it("sums completed session durations for today/thisWeek/thisMonth", async () => {
    // Two completed sessions today (30 + 45 = 75m), one abandoned today (not counted),
    // one completed earlier this week but not today (Mon 08-10, 20m).
    const todayISO = localISO(2026, 7, 12, 12);
    const thisWeekISO = localISO(2026, 7, 10, 9);
    const sessions = [
      { id: "s1", duration: 30, status: "completed", started_at: todayISO },
      { id: "s2", duration: 45, status: "completed", started_at: todayISO },
      { id: "s3", duration: 60, status: "abandoned", started_at: todayISO },
      { id: "s4", duration: 20, status: "completed", started_at: thisWeekISO },
    ];
    mockFrom.mockReturnValueOnce(makeChain({ data: sessions, error: null }));

    const result = await getFocusTimeOverview("u1");

    expect(result.today).toBe(75);
    expect(result.thisWeek).toBe(95); // 75 today + 20 earlier this week
    expect(result.completionRate).toBe(75); // 3 completed / 4 started
    // Trend has 14 entries, one per day, with today's 75m at the end
    expect(result.trend).toHaveLength(14);
    expect(result.trend[13].minutes).toBe(75);
  });

  it("uses only completed sessions for totals", async () => {
    const todayISO = new Date(now).toISOString();
    const sessions = [
      { id: "s1", duration: 50, status: "abandoned", started_at: todayISO },
    ];
    mockFrom.mockReturnValueOnce(makeChain({ data: sessions, error: null }));

    const result = await getFocusTimeOverview("u1");

    expect(result.today).toBe(0);
    expect(result.thisWeek).toBe(0);
    expect(result.thisMonth).toBe(0);
    expect(result.completionRate).toBe(0);
  });
});

// ── getProductivityPatterns ───────────────────────────────────────────────────

describe("getProductivityPatterns", () => {
  it("buckets sessions by hour and day", async () => {
    // Sessions at local 09:00 and 21:00 on Wednesday 2026-08-12.
    const nineAM = localISO(2026, 7, 12, 9);
    const ninePM = localISO(2026, 7, 12, 21);
    const sessions = [
      { id: "s1", duration: 30, status: "completed", started_at: nineAM },
      { id: "s2", duration: 45, status: "completed", started_at: ninePM },
    ];
    // No checkins
    mockFrom.mockReturnValueOnce(makeChain({ data: sessions, error: null }));
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null }));

    const result = await getProductivityPatterns("u1");

    // 24 hourly buckets, indexed 0-23
    expect(result.hourlyData).toHaveLength(24);
    expect(result.hourlyData[9].sessions).toBe(1);
    expect(result.hourlyData[9].minutes).toBe(30);
    expect(result.hourlyData[21].sessions).toBe(1);
    expect(result.hourlyData[21].minutes).toBe(45);

    // Weekly data: 7 days Sun..Sat; 2026-08-12 is Wednesday (index 3)
    expect(result.weeklyData).toHaveLength(7);
    expect(result.weeklyData[3].day).toBe("Wed");
    expect(result.weeklyData[3].sessions).toBe(2);
    expect(result.weeklyData[3].minutes).toBe(75);

    // Energy correlation with no checkins
    expect(result.energyCorrelation).toEqual({ highEnergy: 0, mediumEnergy: 0, lowEnergy: 0 });
  });

  it("correlates check-in energy levels", async () => {
    const checkins = [
      { id: "c1", energy_level: 5, created_at: now.toISOString() }, // high
      { id: "c2", energy_level: 3, created_at: now.toISOString() }, // medium
      { id: "c3", energy_level: 1, created_at: now.toISOString() }, // low
      { id: "c4", energy_level: null, created_at: now.toISOString() }, // ignored
    ];
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null }));
    mockFrom.mockReturnValueOnce(makeChain({ data: checkins, error: null }));

    const result = await getProductivityPatterns("u1");

    expect(result.energyCorrelation).toEqual({ highEnergy: 1, mediumEnergy: 1, lowEnergy: 1 });
  });
});

// ── getTaskInsights ───────────────────────────────────────────────────────────

describe("getTaskInsights", () => {
  it("aggregates priority distribution and top tasks", async () => {
    const sessions = [
      {
        id: "s1",
        duration: 30,
        status: "completed",
        task_id: "t1",
        tasks: { id: "t1", title: "Deep Work", priority_level: 1 },
      },
      {
        id: "s2",
        duration: 45,
        status: "completed",
        task_id: "t1",
        tasks: { id: "t1", title: "Deep Work", priority_level: 1 },
      },
      {
        id: "s3",
        duration: 60,
        status: "completed",
        task_id: "t2",
        tasks: { id: "t2", title: "Admin", priority_level: 4 },
      },
    ];
    const completedTasks = [{ id: "t1", status: "done", completed_at: now.toISOString() }];
    mockFrom.mockReturnValueOnce(makeChain({ data: sessions, error: null }));
    mockFrom.mockReturnValueOnce(makeChain({ data: completedTasks, error: null }));

    const result = await getTaskInsights("u1");

    // Priority distribution: Hot (1) = 75m/2 sessions, Cold (4) = 60m/1 session
    expect(result.priorityDistribution).toEqual([
      { priority: "Hot", minutes: 75, sessions: 2 },
      { priority: "Warm", minutes: 0, sessions: 0 },
      { priority: "Cool", minutes: 0, sessions: 0 },
      { priority: "Cold", minutes: 60, sessions: 1 },
    ]);

    // Top tasks sorted by minutes desc
    expect(result.topTasks).toHaveLength(2);
    expect(result.topTasks[0].taskId).toBe("t1");
    expect(result.topTasks[0].minutes).toBe(75);
    expect(result.topTasks[1].taskId).toBe("t2");
    expect(result.topTasks[1].minutes).toBe(60);

    // 3 completed focus sessions / 1 completed task = 3
    expect(result.focusPerTask).toBe(3);
  });

  it("handles missing task relations gracefully", async () => {
    const sessions = [
      {
        id: "s1",
        duration: 30,
        status: "completed",
        task_id: null,
        tasks: null,
      },
    ];
    mockFrom.mockReturnValueOnce(makeChain({ data: sessions, error: null }));
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null }));

    const result = await getTaskInsights("u1");

    expect(result.priorityDistribution.every((p) => p.minutes === 0)).toBe(true);
    expect(result.topTasks).toHaveLength(0);
    expect(result.focusPerTask).toBe(0);
  });
});

// ── getStreaksData ────────────────────────────────────────────────────────────

describe("getStreaksData", () => {
  it("computes streaks and milestones", async () => {
    const todayISO = "2026-08-12";
    const yesterdayISO = "2026-08-11";
    const checkins = [
      { created_at: `${todayISO}T08:00:00` },
      { created_at: `${yesterdayISO}T08:00:00` },
    ];
    mockFrom.mockReturnValueOnce(makeChain({ data: checkins, error: null })); // checkin streak
    mockFrom.mockReturnValueOnce(
      makeChain({ data: { current_streak: 5 }, error: null })
    ); // reflection streak
    mockFrom.mockReturnValueOnce(
      makeChain({ data: [{ started_at: `${todayISO}T09:00:00` }, { started_at: `${yesterdayISO}T09:00:00` }], error: null })
    ); // focus streak
    mockFrom.mockReturnValueOnce(
      makeChain({
        data: Array.from({ length: 60 }, () => ({ duration: 60 })),
        error: null,
      })
    ); // 60 completed sessions x 60m = 60 hours

    const result = await getStreaksData("u1");

    expect(result.checkinStreak).toBe(2);
    expect(result.reflectionStreak).toBe(5);
    expect(result.focusStreak).toBe(2);
    // 60 hours / 60 sessions
    expect(result.milestones.find((m) => m.label === "50 Hours Focused")?.achieved).toBe(true);
    expect(result.milestones.find((m) => m.label === "100 Sessions")?.achieved).toBe(false);
  });
});

// ── getWarMapProgress ─────────────────────────────────────────────────────────

describe("getWarMapProgress", () => {
  it("counts completed vs total tasks by category", async () => {
    const warmapItems = [
      { id: "w1", status: "completed", category_id: "c1", warmap_categories: { name: "Career" } },
      { id: "w2", status: "in_progress", category_id: "c1", warmap_categories: { name: "Career" } },
      { id: "w3", status: "abandoned", category_id: "c1", warmap_categories: { name: "Career" } },
      { id: "w4", status: "completed", category_id: null, warmap_categories: null },
    ];
    const focusData = [{ duration: 30 }, { duration: 45 }];
    mockFrom.mockReturnValueOnce(makeChain({ data: warmapItems, error: null }));
    mockFrom.mockReturnValueOnce(makeChain({ data: focusData, error: null }));

    const result = await getWarMapProgress("u1");

    expect(result.totalTasks).toBe(3); // excludes abandoned
    expect(result.completedTasks).toBe(2);
    expect(result.focusMinutesTowardGoals).toBe(75);
    // Categories: Career (1/2), Uncategorized (1/1)
    expect(result.categories).toEqual([
      { name: "Career", completed: 1, total: 2 },
      { name: "Uncategorized", completed: 1, total: 1 },
    ]);
  });
});

// ── getAnalyticsData ──────────────────────────────────────────────────────────

describe("getAnalyticsData", () => {
  it("combines all analytics sections", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null })); // focus overview
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null })); // productivity sessions
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null })); // productivity checkins
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null })); // task sessions
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null })); // completed tasks
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null })); // checkin streak
    mockFrom.mockReturnValueOnce(makeChain({ data: { current_streak: 0 }, error: null })); // reflection streak
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null })); // focus streak
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null })); // milestones sessions
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null })); // warmap items
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null })); // warmap focus

    const result = await getAnalyticsData("u1");

    expect(result.focusTime.today).toBe(0);
    expect(result.productivity.hourlyData).toHaveLength(24);
    expect(result.tasks.priorityDistribution).toHaveLength(4);
    expect(result.streaks.milestones.length).toBeGreaterThan(0);
    expect(result.warmap).toBeDefined();
  });
});
