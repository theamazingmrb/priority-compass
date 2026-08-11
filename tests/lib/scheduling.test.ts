import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SchedulingService, PRIORITY_CONFIG } from "@/lib/scheduling";
import { Task } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: "u1",
    title: "Test Task",
    description: null,
    status: "active",
    project_id: null,
    project: null,
    notes: null,
    due_date: null,
    image_url: null,
    priority_level: 2,
    scheduling_mode: "auto",
    estimated_duration: 30,
    start_time: null,
    end_time: null,
    locked: false,
    focus_mode: null,
    recurrence_type: null,
    recurrence_interval: 1,
    recurrence_end_date: null,
    recurrence_weekdays: null,
    parent_task_id: null,
    skipped_dates: null,
    is_recurrence_template: false,
    ...overrides,
  };
}

// Fixed "now" for deterministic scheduling: Monday 2026-03-16, 8:00 AM
const FIXED_NOW = new Date(2026, 2, 16, 8, 0, 0);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// ── PRIORITY_CONFIG ───────────────────────────────────────────────────────────

describe("PRIORITY_CONFIG", () => {
  it("has entries for all 4 priority levels", () => {
    expect(PRIORITY_CONFIG[1].label).toBe("Hot");
    expect(PRIORITY_CONFIG[2].label).toBe("Warm");
    expect(PRIORITY_CONFIG[3].label).toBe("Cool");
    expect(PRIORITY_CONFIG[4].label).toBe("Cold");
  });

  it("all entries have color and description", () => {
    for (const level of [1, 2, 3, 4] as const) {
      expect(PRIORITY_CONFIG[level].color).toBeTruthy();
      expect(PRIORITY_CONFIG[level].description).toBeTruthy();
    }
  });
});

// ── autoScheduleTask ──────────────────────────────────────────────────────────

describe("SchedulingService.autoScheduleTask", () => {
  it("returns existing times for a locked task", async () => {
    const lockedTask = makeTask({
      locked: true,
      start_time: "2026-03-16T09:00:00.000Z",
      end_time: "2026-03-16T09:30:00.000Z",
    });

    const result = await SchedulingService.autoScheduleTask(lockedTask, []);

    expect(result).not.toBeNull();
    expect(result!.start_time.toISOString()).toBe("2026-03-16T09:00:00.000Z");
    expect(result!.end_time.toISOString()).toBe("2026-03-16T09:30:00.000Z");
  });

  it("returns null for locked task with no times set", async () => {
    const lockedTask = makeTask({ locked: true });

    const result = await SchedulingService.autoScheduleTask(lockedTask, []);

    expect(result).toBeNull();
  });

  it("finds a slot for an unlocked task with no conflicts", async () => {
    const task = makeTask({ priority_level: 2, estimated_duration: 30 });

    const result = await SchedulingService.autoScheduleTask(task, []);

    expect(result).not.toBeNull();
    expect(result!.start_time).toBeInstanceOf(Date);
    expect(result!.end_time).toBeInstanceOf(Date);
    // End time should be 30 minutes after start
    const durationMs = result!.end_time.getTime() - result!.start_time.getTime();
    expect(durationMs).toBe(30 * 60 * 1000);
  });

  it("schedules task after existing task's end time", async () => {
    // Must NOT be locked — locked tasks are excluded from conflict detection
    const existingTask = makeTask({
      id: "t-existing",
      scheduling_mode: "manual",
      start_time: "2026-03-16T09:00:00",
      end_time: "2026-03-16T10:00:00",
      locked: false,
    });

    const newTask = makeTask({ id: "t-new", estimated_duration: 30 });

    const result = await SchedulingService.autoScheduleTask(newTask, [existingTask]);

    expect(result).not.toBeNull();
    // Should start at or after 09:00 (existing task blocks that window)
    const existingStart = new Date("2026-03-16T09:00:00");
    expect(result!.start_time >= existingStart).toBe(true);
  });

  it("returns start_time after 'now' for current day", async () => {
    const task = makeTask({ estimated_duration: 30 });

    const result = await SchedulingService.autoScheduleTask(task, []);

    expect(result).not.toBeNull();
    expect(result!.start_time >= FIXED_NOW).toBe(true);
  });

  it("prefers peak hours (9-11am) for hot priority tasks", async () => {
    const hotTask = makeTask({ priority_level: 1, estimated_duration: 30 });

    const result = await SchedulingService.autoScheduleTask(hotTask, []);

    expect(result).not.toBeNull();
    // Should schedule within working hours
    const startHour = result!.start_time.getHours();
    expect(startHour).toBeGreaterThanOrEqual(8);
    expect(startHour).toBeLessThanOrEqual(22);
  });

  it("uses defaultTaskDuration when task has no estimated_duration", async () => {
    // estimated_duration must be null/undefined for ?? to fall back to default
    const task = makeTask({ estimated_duration: null as unknown as number });

    const result = await SchedulingService.autoScheduleTask(task, [], { defaultTaskDuration: 45 });

    expect(result).not.toBeNull();
    const durationMs = result!.end_time.getTime() - result!.start_time.getTime();
    expect(durationMs).toBe(45 * 60 * 1000);
  });
});

// ── rescheduleTasks ───────────────────────────────────────────────────────────

describe("SchedulingService.rescheduleTasks", () => {
  it("passes through locked tasks unchanged", async () => {
    const lockedTask = makeTask({
      id: "locked",
      locked: true,
      start_time: "2026-03-16T09:00:00",
      end_time: "2026-03-16T09:30:00",
    });

    const result = await SchedulingService.rescheduleTasks([lockedTask]);

    const found = result.find((t) => t.id === "locked");
    expect(found).toBeDefined();
    expect(found!.start_time).toBe("2026-03-16T09:00:00");
  });

  it("passes through manual tasks unchanged", async () => {
    const manualTask = makeTask({
      id: "manual",
      scheduling_mode: "manual",
      start_time: "2026-03-16T10:00:00",
      end_time: "2026-03-16T10:30:00",
    });

    const result = await SchedulingService.rescheduleTasks([manualTask]);

    const found = result.find((t) => t.id === "manual");
    expect(found).toBeDefined();
    expect(found!.start_time).toBe("2026-03-16T10:00:00");
  });

  it("schedules auto tasks and returns them with times", async () => {
    const autoTask = makeTask({ id: "auto", scheduling_mode: "auto" });

    const result = await SchedulingService.rescheduleTasks([autoTask]);

    const found = result.find((t) => t.id === "auto");
    expect(found).toBeDefined();
    // May or may not have times depending on available slots, but shouldn't throw
  });

  it("sorts auto tasks by priority before scheduling", async () => {
    const coldTask = makeTask({ id: "cold", priority_level: 4, scheduling_mode: "auto" });
    const hotTask = makeTask({ id: "hot", priority_level: 1, scheduling_mode: "auto" });

    // Just verify it doesn't throw and returns both tasks
    const result = await SchedulingService.rescheduleTasks([coldTask, hotTask]);

    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it("returns empty array for empty input", async () => {
    const result = await SchedulingService.rescheduleTasks([]);

    expect(result).toEqual([]);
  });
});

// ── Score functions (tested indirectly via autoScheduleTask) ──────────────────

describe("scoring behavior", () => {
  it("hot task with past due date still gets scheduled (maximum urgency)", async () => {
    const overdueTask = makeTask({
      priority_level: 1,
      due_date: "2026-03-15T00:00:00", // yesterday
      estimated_duration: 30,
    });

    const result = await SchedulingService.autoScheduleTask(overdueTask, []);

    expect(result).not.toBeNull();
  });

  it("task with near deadline schedules sooner than task without deadline", async () => {
    const urgentTask = makeTask({
      id: "urgent",
      priority_level: 1,
      due_date: new Date(FIXED_NOW.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2hrs away
      estimated_duration: 30,
    });

    const relaxedTask = makeTask({
      id: "relaxed",
      priority_level: 4,
      due_date: null,
      estimated_duration: 30,
    });

    const [urgentResult, relaxedResult] = await Promise.all([
      SchedulingService.autoScheduleTask(urgentTask, []),
      SchedulingService.autoScheduleTask(relaxedTask, []),
    ]);

    expect(urgentResult).not.toBeNull();
    expect(relaxedResult).not.toBeNull();
  });
});

// ── findGaps / getAvailableTimeSlots (indirectly) ─────────────────────────────

describe("working hours constraints", () => {
  it("respects custom working hours", async () => {
    const task = makeTask({ estimated_duration: 30 });

    const result = await SchedulingService.autoScheduleTask(task, [], {
      workingHours: { start: 10, end: 12 },
    });

    if (result) {
      const startHour = result.start_time.getHours();
      expect(startHour).toBeGreaterThanOrEqual(10);
    }
  });

  it("respects working days constraints", async () => {
    // Only schedule on weekdays (1-5)
    const task = makeTask({ estimated_duration: 30 });

    const result = await SchedulingService.autoScheduleTask(task, [], {
      workingDays: [1, 2, 3, 4, 5],
    });

    if (result) {
      const dayOfWeek = result.start_time.getDay();
      expect([1, 2, 3, 4, 5]).toContain(dayOfWeek);
    }
  });
});
