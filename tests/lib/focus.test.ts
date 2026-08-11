import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  getFocusSessions,
  getTodayFocusMinutes,
  getFocusTimeByTask,
  createFocusSession,
  updateFocusSession,
} from "@/lib/focus";

// ── Supabase mock ─────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase", () => {
  const from = vi.fn();
  return { supabase: { from } };
});

import { supabase } from "@/lib/supabase";

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

function makeChain(resolvedValue: unknown) {
  const methods = ["select", "insert", "update", "delete", "eq", "gte", "lte", "order", "not", "limit"];
  let result = resolvedValue;
  const chain = {
    then: (onFulfilled: (v: unknown) => unknown) => Promise.resolve(result).then(onFulfilled),
    catch: (onRejected: (e: unknown) => unknown) => Promise.resolve(result).catch(onRejected),
  } as Record<string, unknown> & PromiseLike<unknown>;
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.single = vi.fn().mockImplementation(() => Promise.resolve(result));
  chain.maybeSingle = vi.fn().mockImplementation(() => Promise.resolve(result));
  return chain;
}

const SESSION = {
  id: "fs1",
  created_at: "2026-08-12T09:00:00",
  updated_at: "2026-08-12T09:30:00",
  user_id: "u1",
  task_id: null,
  duration: 30,
  started_at: "2026-08-12T09:00:00",
  completed_at: null,
  status: "active",
  spotify_playlist_id: null,
  spotify_playlist_name: null,
  spotify_track_id: null,
  spotify_track_name: null,
  spotify_artist: null,
  journal_id: null,
  notes: null,
  task: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── getFocusSessions ──────────────────────────────────────────────────────────

describe("getFocusSessions", () => {
  it("returns sessions on success", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: [SESSION], error: null }));

    const result = await getFocusSessions("u1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("fs1");
  });

  it("applies taskId, status, date and limit filters when provided", async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValueOnce(chain);

    const startDate = new Date("2026-08-01T00:00:00");
    const endDate = new Date("2026-08-31T00:00:00");

    await getFocusSessions("u1", {
      taskId: "t1",
      status: "completed",
      startDate,
      endDate,
      limit: 10,
    });

    expect(chain.eq).toHaveBeenCalledWith("task_id", "t1");
    expect(chain.eq).toHaveBeenCalledWith("status", "completed");
    expect(chain.gte).toHaveBeenCalledWith("started_at", startDate.toISOString());
    expect(chain.lte).toHaveBeenCalledWith("started_at", endDate.toISOString());
    expect(chain.limit).toHaveBeenCalledWith(10);
  });

  it("returns empty array on error", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: { message: "fail" } }));

    const result = await getFocusSessions("u1");

    expect(result).toEqual([]);
  });
});

// ── getTodayFocusMinutes ──────────────────────────────────────────────────────

describe("getTodayFocusMinutes", () => {
  it("sums completed session durations today", async () => {
    mockFrom.mockReturnValueOnce(
      makeChain({
        data: [{ duration: 30 }, { duration: 45 }, { duration: 25 }],
        error: null,
      })
    );

    const result = await getTodayFocusMinutes("u1");

    expect(result).toBe(100);
  });

  it("returns 0 on error or null data", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: { message: "fail" } }));

    expect(await getTodayFocusMinutes("u1")).toBe(0);
  });
});

// ── getFocusTimeByTask ────────────────────────────────────────────────────────

describe("getFocusTimeByTask", () => {
  it("aggregates minutes and sessions per task", async () => {
    mockFrom.mockReturnValueOnce(
      makeChain({
        data: [
          { task_id: "t1", duration: 30 },
          { task_id: "t1", duration: 45 },
          { task_id: "t2", duration: 60 },
          { task_id: null, duration: 90 }, // ignored
        ],
        error: null,
      })
    );

    const result = await getFocusTimeByTask("u1");

    expect(result.get("t1")).toEqual({ minutes: 75, sessions: 2 });
    expect(result.get("t2")).toEqual({ minutes: 60, sessions: 1 });
    expect(result.has("null")).toBe(false);
  });

  it("returns empty map on error", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: { message: "fail" } }));

    const result = await getFocusTimeByTask("u1");

    expect(result.size).toBe(0);
  });
});

// ── createFocusSession ────────────────────────────────────────────────────────

describe("createFocusSession", () => {
  it("creates a session with defaults and returns it", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: SESSION, error: null }));

    const result = await createFocusSession("u1", { duration: 30 });

    expect(result?.id).toBe("fs1");
  });

  it("returns null on error", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: { message: "fail" } }));

    const result = await createFocusSession("u1", { duration: 30 });

    expect(result).toBeNull();
  });
});

// ── updateFocusSession ────────────────────────────────────────────────────────

describe("updateFocusSession", () => {
  it("updates a session and returns it", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: SESSION, error: null }));

    const result = await updateFocusSession("fs1", { status: "completed" });

    expect(result?.status).toBe("active");
  });

  it("returns null on error", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: { message: "fail" } }));

    const result = await updateFocusSession("fs1", { status: "completed" });

    expect(result).toBeNull();
  });
});
