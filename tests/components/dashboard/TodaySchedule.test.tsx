import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TodaySchedule from "@/components/dashboard/TodaySchedule";
import { Task } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    created_at: "2026-03-30T09:00:00Z",
    updated_at: "2026-03-30T09:00:00Z",
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
    start_time: "2026-03-30T09:00:00Z",
    end_time: "2026-03-30T09:30:00Z",
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

const defaultProps = {
  scheduledTasks: [] as Task[],
  unscheduledAutoTasks: [] as Task[],
  onPlanMyDay: vi.fn().mockResolvedValue(undefined),
  isPlanning: false,
  googleConnected: true, // suppress the GCal connect prompt by default
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("TodaySchedule", () => {
  describe("empty state", () => {
    it("shows empty state message when no tasks at all", () => {
      render(<TodaySchedule {...defaultProps} />);

      expect(screen.getByText(/No tasks scheduled yet/i)).toBeInTheDocument();
    });

    it("does not show empty state when there are scheduled tasks", () => {
      render(
        <TodaySchedule
          {...defaultProps}
          scheduledTasks={[makeTask()]}
        />
      );

      expect(screen.queryByText(/No tasks scheduled yet/i)).not.toBeInTheDocument();
    });

    it("does not show empty state when there are unscheduled auto tasks", () => {
      render(
        <TodaySchedule
          {...defaultProps}
          unscheduledAutoTasks={[makeTask({ start_time: null, end_time: null })]}
        />
      );

      expect(screen.queryByText(/No tasks scheduled yet/i)).not.toBeInTheDocument();
    });
  });

  describe("Plan My Day button", () => {
    it("renders the Plan My Day button", () => {
      render(<TodaySchedule {...defaultProps} />);

      expect(screen.getByRole("button", { name: /Plan My Day/i })).toBeInTheDocument();
    });

    it("calls onPlanMyDay when button is clicked", async () => {
      const user = userEvent.setup();
      const onPlanMyDay = vi.fn().mockResolvedValue(undefined);

      render(<TodaySchedule {...defaultProps} onPlanMyDay={onPlanMyDay} />);

      await user.click(screen.getByRole("button", { name: /Plan My Day/i }));

      expect(onPlanMyDay).toHaveBeenCalledTimes(1);
    });

    it("shows spinner and 'Planning…' text while isPlanning is true", () => {
      render(<TodaySchedule {...defaultProps} isPlanning={true} />);

      expect(screen.getByText(/Planning/i)).toBeInTheDocument();
      expect(screen.queryByText("Plan My Day")).not.toBeInTheDocument();
    });

    it("disables the button while isPlanning", () => {
      render(<TodaySchedule {...defaultProps} isPlanning={true} />);

      expect(screen.getByRole("button", { name: /Planning/i })).toBeDisabled();
    });

    it("button is enabled when not planning", () => {
      render(<TodaySchedule {...defaultProps} isPlanning={false} />);

      expect(screen.getByRole("button", { name: /Plan My Day/i })).not.toBeDisabled();
    });
  });

  describe("unscheduled auto tasks hint", () => {
    it("shows hint with count for a single unscheduled task", () => {
      render(
        <TodaySchedule
          {...defaultProps}
          unscheduledAutoTasks={[makeTask({ id: "u1", start_time: null, end_time: null })]}
        />
      );

      expect(screen.getByText(/1 task ready to be scheduled/i)).toBeInTheDocument();
    });

    it("uses plural form for multiple unscheduled tasks", () => {
      render(
        <TodaySchedule
          {...defaultProps}
          unscheduledAutoTasks={[
            makeTask({ id: "u1", start_time: null, end_time: null }),
            makeTask({ id: "u2", start_time: null, end_time: null }),
            makeTask({ id: "u3", start_time: null, end_time: null }),
          ]}
        />
      );

      expect(screen.getByText(/3 tasks ready to be scheduled/i)).toBeInTheDocument();
    });

    it("does not show hint when there are no unscheduled tasks", () => {
      render(
        <TodaySchedule
          {...defaultProps}
          scheduledTasks={[makeTask()]}
          unscheduledAutoTasks={[]}
        />
      );

      expect(screen.queryByText(/ready to be scheduled/i)).not.toBeInTheDocument();
    });
  });

  describe("scheduled task list", () => {
    it("renders a scheduled task's title", () => {
      render(
        <TodaySchedule
          {...defaultProps}
          scheduledTasks={[makeTask({ title: "Write report" })]}
        />
      );

      expect(screen.getByText("Write report")).toBeInTheDocument();
    });

    it("renders duration badge in minutes for short tasks", () => {
      render(
        <TodaySchedule
          {...defaultProps}
          scheduledTasks={[makeTask({ estimated_duration: 30 })]}
        />
      );

      expect(screen.getByText("30m")).toBeInTheDocument();
    });

    it("renders duration badge in hours for 60-minute tasks", () => {
      render(
        <TodaySchedule
          {...defaultProps}
          scheduledTasks={[makeTask({ estimated_duration: 60 })]}
        />
      );

      expect(screen.getByText("1h")).toBeInTheDocument();
    });

    it("renders duration badge in mixed format for 90-minute tasks", () => {
      render(
        <TodaySchedule
          {...defaultProps}
          scheduledTasks={[makeTask({ estimated_duration: 90 })]}
        />
      );

      expect(screen.getByText("1h 30m")).toBeInTheDocument();
    });

    it("falls back to 30m when estimated_duration is null", () => {
      render(
        <TodaySchedule
          {...defaultProps}
          scheduledTasks={[makeTask({ estimated_duration: null as unknown as number })]}
        />
      );

      expect(screen.getByText("30m")).toBeInTheDocument();
    });

    it("renders multiple scheduled tasks", () => {
      render(
        <TodaySchedule
          {...defaultProps}
          scheduledTasks={[
            makeTask({ id: "t1", title: "First task" }),
            makeTask({ id: "t2", title: "Second task" }),
          ]}
        />
      );

      expect(screen.getByText("First task")).toBeInTheDocument();
      expect(screen.getByText("Second task")).toBeInTheDocument();
    });

    it("renders '—' for a task with no start_time", () => {
      render(
        <TodaySchedule
          {...defaultProps}
          scheduledTasks={[makeTask({ start_time: null })]}
        />
      );

      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("shows secondary empty message when unscheduled tasks exist but none are scheduled yet", () => {
      render(
        <TodaySchedule
          {...defaultProps}
          scheduledTasks={[]}
          unscheduledAutoTasks={[makeTask({ start_time: null, end_time: null })]}
        />
      );

      expect(screen.getByText(/No tasks scheduled for today yet/i)).toBeInTheDocument();
    });
  });

  describe("Google Calendar connect prompt", () => {
    it("shows connect prompt when googleConnected is false", () => {
      render(<TodaySchedule {...defaultProps} googleConnected={false} />);

      expect(screen.getByText(/Connect Google Calendar/i)).toBeInTheDocument();
    });

    it("hides connect prompt when googleConnected is true", () => {
      render(<TodaySchedule {...defaultProps} googleConnected={true} />);

      expect(screen.queryByText(/Connect Google Calendar/i)).not.toBeInTheDocument();
    });
  });

  describe("section header", () => {
    it("renders the Today's Schedule heading", () => {
      render(<TodaySchedule {...defaultProps} />);

      expect(screen.getByText(/Today's Schedule/i)).toBeInTheDocument();
    });
  });
});
