import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  areNotificationsSupported,
  getNotificationPermission,
  timeToDbFormat,
  timeFromDbFormat,
  getNotificationPreferences,
  saveNotificationPreferences,
  getNotificationContent,
} from "@/lib/notifications";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/types/notifications";

// ── Supabase mock ─────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase", () => {
  const from = vi.fn();
  return { supabase: { from } };
});

import { supabase } from "@/lib/supabase";

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

function makeChain(resolvedValue: unknown) {
  const methods = ["select", "insert", "update", "delete", "eq", "gte", "lte", "order", "not", "limit", "upsert"];
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

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Pure helpers ──────────────────────────────────────────────────────────────

describe("timeToDbFormat", () => {
  it("appends seconds to HH:MM", () => {
    expect(timeToDbFormat("08:00")).toBe("08:00:00");
    expect(timeToDbFormat("21:30")).toBe("21:30:00");
  });

  it("leaves already-formatted values untouched", () => {
    expect(timeToDbFormat("08:00:00")).toBe("08:00:00");
  });
});

describe("timeFromDbFormat", () => {
  it("strips seconds from HH:MM:SS", () => {
    expect(timeFromDbFormat("08:00:00")).toBe("08:00");
    expect(timeFromDbFormat("21:30:45")).toBe("21:30");
  });

  it("returns default 08:00 when empty", () => {
    expect(timeFromDbFormat("")).toBe("08:00");
  });
});

describe("getNotificationContent", () => {
  it("returns correct copy for each check-in type", () => {
    expect(getNotificationContent("morning_checkin")).toMatchObject({ tag: "morning-checkin", url: "/checkin?time=morning" });
    expect(getNotificationContent("midday_checkin")).toMatchObject({ tag: "midday-checkin" });
    expect(getNotificationContent("evening_checkin")).toMatchObject({ tag: "evening-checkin" });
    expect(getNotificationContent("reflection")).toMatchObject({ tag: "daily-reflection", url: "/reflections/new" });
  });

  it("uses task data for task_start notifications", () => {
    const result = getNotificationContent("task_start", {
      taskTitle: "Ship feature",
      taskDescription: "Deploy",
      taskId: "t1",
      minutes: 5,
    });
    expect(result.title).toBe("📋 Task starting: Ship feature");
    expect(result.body).toContain("Deploy starts in 5 minutes.");
    expect(result.tag).toBe("task-t1");
  });

  it("falls back to defaults for task_start without data", () => {
    const result = getNotificationContent("task_start");
    expect(result.title).toBe("📋 Task starting: Upcoming task");
    expect(result.body).toContain("15 minutes");
  });

  it("handles singular/plural for overdue tasks", () => {
    expect(getNotificationContent("overdue_task", { count: 1 }).body).toContain("1 overdue task that needs attention.");
    expect(getNotificationContent("overdue_task", { count: 3 }).body).toContain("3 overdue tasks that need attention.");
  });

  it("returns default content for unknown types", () => {
    // @ts-expect-error -- testing default branch with an invalid type
    expect(getNotificationContent("unknown")).toMatchObject({ title: "Priority Compass", tag: "default", url: "/" });
  });
});

// ── Browser-dependent helpers ─────────────────────────────────────────────────

describe("areNotificationsSupported", () => {
  // Helper: cast window to a mutable record without TypeScript friction.
  const win = window as unknown as Record<string, unknown>;
  const originalSw = navigator.serviceWorker;
  const originalPush = win.PushManager;

  afterEach(() => {
    Object.defineProperty(navigator, "serviceWorker", { value: originalSw, configurable: true });
    if (originalPush === undefined) {
      delete win.PushManager;
    } else {
      win.PushManager = originalPush;
    }
  });

  it("returns true when serviceWorker and PushManager both exist", () => {
    Object.defineProperty(navigator, "serviceWorker", { value: {}, configurable: true });
    win.PushManager = {};
    expect(areNotificationsSupported()).toBe(true);
  });

  it("returns false when PushManager is missing", () => {
    Object.defineProperty(navigator, "serviceWorker", { value: {}, configurable: true });
    delete win.PushManager;
    expect(areNotificationsSupported()).toBe(false);
  });
});

describe("getNotificationPermission", () => {
  it("returns null when Notification is unavailable", () => {
    const win = window as unknown as Record<string, unknown>;
    const original = win.Notification;
    delete win.Notification;
    try {
      expect(getNotificationPermission()).toBeNull();
    } finally {
      win.Notification = original;
    }
  });
});

// ── Supabase-backed data functions ────────────────────────────────────────────

describe("getNotificationPreferences", () => {
  it("returns defaults when no row exists (PGRST116)", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: { code: "PGRST116", message: "No rows" } }));

    const result = await getNotificationPreferences("u1");

    expect(result).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it("transforms DB times to form format", async () => {
    const row = {
      notifications_enabled: true,
      morning_checkin_enabled: true,
      morning_checkin_time: "08:00:00",
      midday_checkin_enabled: true,
      midday_checkin_time: "12:00:00",
      evening_checkin_enabled: true,
      evening_checkin_time: "20:00:00",
      task_start_enabled: true,
      task_start_minutes_before: 30,
      overdue_task_enabled: true,
      reflection_enabled: true,
      reflection_time: "21:00:00",
    };
    mockFrom.mockReturnValueOnce(makeChain({ data: row, error: null }));

    const result = await getNotificationPreferences("u1");

    expect(result?.morning_checkin_time).toBe("08:00");
    expect(result?.reflection_time).toBe("21:00");
    expect(result?.task_start_minutes_before).toBe(30);
  });

  it("returns null on unexpected error", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: { code: "OTHER", message: "fail" } }));

    const result = await getNotificationPreferences("u1");

    expect(result).toBeNull();
  });
});

describe("saveNotificationPreferences", () => {
  it("returns success on save", async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(chain);

    const result = await saveNotificationPreferences("u1", DEFAULT_NOTIFICATION_PREFERENCES);

    expect(result).toEqual({ success: true });
    expect(chain.upsert).toHaveBeenCalled();
  });

  it("returns error message on failure", async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: { message: "insert failed" } }));

    const result = await saveNotificationPreferences("u1", DEFAULT_NOTIFICATION_PREFERENCES);

    expect(result.success).toBe(false);
    expect(result.error).toBe("insert failed");
  });
});
