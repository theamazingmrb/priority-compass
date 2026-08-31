import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getWeeklyStats, generateWeeklySummary, WeeklySummary } from "@/lib/weekly-summary";

// ── Supabase mock (chain builder) ─────────────────────────────────────────────

vi.mock("@/lib/supabase", () => {
  return { supabase: { from: vi.fn() } };
});

import { supabase } from "@/lib/supabase";
const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

function makeChain(resolvedValue: unknown) {
  const methods = ["select", "insert", "update", "delete", "eq", "gte", "lt", "order", "not", "limit"];
  let result = resolvedValue;
  const chain = {
    then: (onFulfilled: (v: unknown) => unknown) => Promise.resolve(result).then(onFulfilled),
    catch: (onRejected: (e: unknown) => unknown) => Promise.resolve(result).catch(onRejected),
  } as Record<string, unknown> & PromiseLike<unknown>;
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.maybeSingle = vi.fn().mockImplementation(() => Promise.resolve(result));
  chain.single = vi.fn().mockImplementation(() => Promise.resolve(result));
  return chain;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

// "Now" is Wednesday 2026-08-12. This week runs Mon 08-10 → Sun 08-16.
const now = new Date(2026, 7, 12, 12, 0, 0);

function localISO(year: number, month: number, day: number, hour: number) {
  return new Date(year, month, day, hour).toISOString();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
});

// ── getWeeklyStats ────────────────────────────────────────────────────────────

describe("getWeeklyStats", () => {
  it("aggregates focus, completions, and check-ins from the current week", async () => {
    // from("focus_sessions") → two completed this week (Mon + Wed)
    mockFrom
      .mockReturnValueOnce(
        makeChain({
          data: [
            { id: "s1", duration: 30, status: "completed", started_at: localISO(2026, 7, 10, 9) },
            { id: "s2", duration: 45, status: "completed", started_at: localISO(2026, 7, 12, 10) },
            { id: "s3", duration: 60, status: "abandoned", started_at: localISO(2026, 7, 12, 11) },
          ],
          error: null,
        })
      )
      .mockReturnValueOnce(
        makeChain({
          data: [{ id: "t1", title: "A", priority_level: 1, completed_at: localISO(2026, 7, 11, 15) }],
          error: null,
        })
      )
      .mockReturnValueOnce(
        makeChain({
          data: [
            { created_at: localISO(2026, 7, 10, 8), energy_level: 4 },
            { created_at: localISO(2026, 7, 12, 8), energy_level: 3 },
          ],
          error: null,
        })
      );

    const stats = await getWeeklyStats("u1");

    expect(stats.focusMinutes).toBe(75); // 30 + 45, abandoned excluded
    expect(stats.focusSessions).toBe(2);
    expect(stats.completionRate).toBe(67); // 2 completed / 3 started
    expect(stats.tasksCompleted).toBe(1);
    expect(stats.checkinCount).toBe(2);
    expect(stats.bestDay).toBe("Wednesday"); // 45m > 30m
    expect(stats.bestHour).toBe(9); // tie between 9 and 10, first wins (strict >)
  });

  it("returns zeros when there is no data for the week", async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: [], error: null }))
      .mockReturnValueOnce(makeChain({ data: [], error: null }))
      .mockReturnValueOnce(makeChain({ data: [], error: null }));

    const stats = await getWeeklyStats("u1");

    expect(stats).toEqual({
      focusMinutes: 0,
      focusSessions: 0,
      completionRate: 0,
      tasksCompleted: 0,
      checkinCount: 0,
      bestDay: null,
      bestHour: null,
    });
  });
});

// ── generateWeeklySummary (deterministic fallback) ───────────────────────────

describe("generateWeeklySummary (fallback path, no API key)", () => {
  it("produces a fallback summary when there is data but no api key", async () => {
    // getWeeklyStats: 3 from() calls. gatherContext is skipped (no apiKey).
    mockFrom
      .mockReturnValueOnce(makeChain({ data: [{ duration: 30, status: "completed", started_at: localISO(2026, 7, 12, 9), id: "s" }], error: null }))
      .mockReturnValueOnce(makeChain({ data: [], error: null }))
      .mockReturnValueOnce(makeChain({ data: [{ created_at: localISO(2026, 7, 12, 8), energy_level: 4 }], error: null }));

    const summary = await generateWeeklySummary("u1");

    expect(summary.generatedBy).toBe("fallback");
    expect(summary.model).toBeNull();
    expect(summary.stats.focusMinutes).toBe(30);
    expect(summary.headline).toContain("30m");
    expect(summary.insights.length).toBeGreaterThan(0);
    expect(summary.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns a clean-slate summary when there is no data at all", async () => {
    const empty = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(empty);

    const summary = await generateWeeklySummary("u1");

    expect(summary.generatedBy).toBe("fallback");
    expect(summary.headline.toLowerCase()).toContain("clean slate");
    expect(summary.suggestions.length).toBeGreaterThan(0);
    // No data → no AI attempt, no gatherContext queries beyond getWeeklyStats.
    expect(mockFrom).toHaveBeenCalledTimes(3);
  });

  it("fills in stats on fallback summaries consistently", async () => {
    mockFrom
      .mockReturnValueOnce(
        makeChain({
          data: [{ duration: 25, status: "completed", started_at: localISO(2026, 7, 10, 9), id: "s" }],
          error: null,
        })
      )
      .mockReturnValueOnce(makeChain({ data: [{ id: "t", title: "Ship", priority_level: 1, completed_at: localISO(2026, 7, 11, 14) }], error: null }))
      .mockReturnValueOnce(makeChain({ data: [], error: null }));

    const summary = await generateWeeklySummary("u1");
    const s = summary.stats;
    expect(s.focusSessions).toBe(1);
    expect(s.tasksCompleted).toBe(1);
    expect(summary.insights.some((i) => i.includes("1 task"))).toBe(true);
  });

  it("returns a well-formed summary shape", async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: [], error: null }))
      .mockReturnValueOnce(makeChain({ data: [], error: null }))
      .mockReturnValueOnce(makeChain({ data: [], error: null }));

    const summary: WeeklySummary = await generateWeeklySummary("u1");
    expect(typeof summary.headline).toBe("string");
    expect(Array.isArray(summary.insights)).toBe(true);
    expect(Array.isArray(summary.suggestions)).toBe(true);
    expect(typeof summary.narrative).toBe("string");
  });
});
