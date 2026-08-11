import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OnboardingFlow, {
  DEFAULT_ONBOARDING_STEPS,
} from "@/components/onboarding/OnboardingFlow";
import { Target } from "lucide-react";
import { createTask } from "@/lib/tasks";

// Mock useAuth for components that need it (like NorthStarStep)
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

// Mock north-star lib
vi.mock("@/lib/north-star", () => ({
  getNorthStar: vi.fn().mockResolvedValue(null),
  upsertNorthStar: vi.fn().mockResolvedValue({ id: "ns1", user_id: "u1", content: "Test" }),
  MAX_CONTENT_LENGTH: 500,
  NORTH_STAR_PROMPTS: [],
  truncateNorthStar: vi.fn((content: string) => content),
}));

// Mock tasks lib so the first-task step can create a task
vi.mock("@/lib/tasks", () => ({
  createTask: vi.fn().mockResolvedValue({ id: "t1", user_id: "u1", title: "Test" }),
}));

// Minimal step set for most tests
const makeSteps = () => [
  {
    id: "step-1",
    title: "Step One",
    description: "First step description",
    icon: <Target className="w-8 h-8" />,
  },
  {
    id: "step-2",
    title: "Step Two",
    description: "Second step description",
    icon: <Target className="w-8 h-8" />,
    action: {
      label: "Do Action",
      onClick: vi.fn(),
    },
    skip: true,
  },
  {
    id: "step-3",
    title: "Step Three",
    description: "Third step description",
    icon: <Target className="w-8 h-8" />,
  },
];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onComplete: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OnboardingFlow", () => {
  describe("visibility", () => {
    it("renders nothing when isOpen is false", () => {
      const { container } = render(
        <OnboardingFlow {...defaultProps} isOpen={false} steps={makeSteps()} />
      );
      expect(container).toBeEmptyDOMElement();
    });

    it("renders the modal when isOpen is true", () => {
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      expect(screen.getByText("Step One")).toBeInTheDocument();
    });
  });

  describe("initial state", () => {
    it("shows the first step title and description", () => {
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      expect(screen.getByText("Step One")).toBeInTheDocument();
      expect(screen.getByText("First step description")).toBeInTheDocument();
    });

    it("shows 'Step 1 of N' progress label", () => {
      const steps = makeSteps();
      render(<OnboardingFlow {...defaultProps} steps={steps} />);
      expect(
        screen.getByText(`Step 1 of ${steps.length}`)
      ).toBeInTheDocument();
    });

    it("does not show Previous button on the first step", () => {
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      expect(screen.queryByText("Previous")).not.toBeInTheDocument();
    });

    it("shows 'Next' button on the first step", () => {
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    it("advances to the next step when Next is clicked", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      expect(screen.getByText("Step Two")).toBeInTheDocument();
    });

    it("shows Previous button after advancing", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      expect(
        screen.getByRole("button", { name: /previous/i })
      ).toBeInTheDocument();
    });

    it("goes back to the previous step when Previous is clicked", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      await user.click(screen.getByRole("button", { name: /previous/i }));
      expect(screen.getByText("Step One")).toBeInTheDocument();
    });

    it("updates step counter as user advances", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    });
  });

  describe("step with action", () => {
    it("renders the action button label instead of Next", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      expect(
        screen.getByRole("button", { name: /do action/i })
      ).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^next$/i })).not.toBeInTheDocument();
    });

    it("calls action.onClick when the action button is clicked", async () => {
      const user = userEvent.setup();
      const steps = makeSteps();
      render(<OnboardingFlow {...defaultProps} steps={steps} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      await user.click(screen.getByRole("button", { name: /do action/i }));
      expect(steps[1].action!.onClick).toHaveBeenCalledOnce();
    });

    it("advances to the next step after clicking the action button", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      await user.click(screen.getByRole("button", { name: /do action/i }));
      expect(screen.getByText("Step Three")).toBeInTheDocument();
    });

    it("shows Skip button on steps that have skip: true", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      expect(screen.getByRole("button", { name: /skip/i })).toBeInTheDocument();
    });

    it("advances without calling action when Skip is clicked", async () => {
      const user = userEvent.setup();
      const steps = makeSteps();
      render(<OnboardingFlow {...defaultProps} steps={steps} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      await user.click(screen.getByRole("button", { name: /skip/i }));
      expect(steps[1].action!.onClick).not.toHaveBeenCalled();
      expect(screen.getByText("Step Three")).toBeInTheDocument();
    });
  });

  describe("last step", () => {
    it("shows 'Get Started' on the last step instead of Next", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      await user.click(screen.getByRole("button", { name: /skip/i }));
      expect(
        screen.getByRole("button", { name: /get started/i })
      ).toBeInTheDocument();
    });

    it("calls onComplete when Get Started is clicked", async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      render(
        <OnboardingFlow
          {...defaultProps}
          onComplete={onComplete}
          steps={makeSteps()}
        />
      );
      await user.click(screen.getByRole("button", { name: /next/i }));
      await user.click(screen.getByRole("button", { name: /skip/i }));
      await user.click(screen.getByRole("button", { name: /get started/i }));
      expect(onComplete).toHaveBeenCalledOnce();
    });

    it("does not show Skip on the last step", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={makeSteps()} />);
      await user.click(screen.getByRole("button", { name: /next/i }));
      await user.click(screen.getByRole("button", { name: /skip/i }));
      expect(screen.queryByRole("button", { name: /skip/i })).not.toBeInTheDocument();
    });
  });

  describe("close button", () => {
    it("calls onClose when the X button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <OnboardingFlow {...defaultProps} onClose={onClose} steps={makeSteps()} />
      );
      // The X button has no accessible name, find by its parent
      const closeButton = screen.getByRole("button", { name: "" });
      await user.click(closeButton);
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  describe("first task step", () => {
    it("shows a task input on the first-task step", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={DEFAULT_ONBOARDING_STEPS} />);
      // welcome -> north-star -> projects -> first-task
      await user.click(screen.getByRole("button", { name: /next/i })); // welcome -> north-star
      // north-star is special; skip it via its Skip button
      await user.click(screen.getByRole("button", { name: /skip for now/i }));
      // projects is regular -> next
      await user.click(screen.getByRole("button", { name: /next/i }));
      expect(
        screen.getByPlaceholderText("What's one thing you want to accomplish today?")
      ).toBeInTheDocument();
    });

    it("creates a task when title is entered and Create Task is clicked", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={DEFAULT_ONBOARDING_STEPS} />);
      await user.click(screen.getByRole("button", { name: /next/i })); // -> north-star
      await user.click(screen.getByRole("button", { name: /skip for now/i })); // skip north-star
      await user.click(screen.getByRole("button", { name: /next/i })); // projects -> first-task

      const input = screen.getByPlaceholderText("What's one thing you want to accomplish today?");
      await user.type(input, "Ship the feature");
      await user.click(screen.getByRole("button", { name: /create task/i }));

      expect(createTask).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Ship the feature", priority_level: 1 })
      );
    });

    it("advances after creating a task", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={DEFAULT_ONBOARDING_STEPS} />);
      await user.click(screen.getByRole("button", { name: /next/i })); // -> north-star
      await user.click(screen.getByRole("button", { name: /skip for now/i }));
      await user.click(screen.getByRole("button", { name: /next/i })); // -> first-task

      const input = screen.getByPlaceholderText("What's one thing you want to accomplish today?");
      await user.type(input, "Ship it");
      await user.click(screen.getByRole("button", { name: /create task/i }));

      expect(screen.getByRole("heading", { name: /try a focus session/i })).toBeInTheDocument(); // advanced to start-focus step
    });

    it("skips the first-task step without creating a task", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={DEFAULT_ONBOARDING_STEPS} />);
      await user.click(screen.getByRole("button", { name: /next/i })); // -> north-star
      await user.click(screen.getByRole("button", { name: /skip for now/i }));
      await user.click(screen.getByRole("button", { name: /next/i })); // -> first-task

      await user.click(screen.getByRole("button", { name: /skip for now/i }));

      expect(createTask).not.toHaveBeenCalled();
    });
  });

  describe("start focus step", () => {
    it("links to the focus timer with the created task when a task was made", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={DEFAULT_ONBOARDING_STEPS} />);
      // welcome -> north-star -> projects -> first-task
      await user.click(screen.getByRole("button", { name: /next/i }));
      await user.click(screen.getByRole("button", { name: /skip for now/i })); // skip north-star
      await user.click(screen.getByRole("button", { name: /next/i })); // -> first-task
      // create a task
      const input = screen.getByPlaceholderText("What's one thing you want to accomplish today?");
      await user.type(input, "My first task");
      await user.click(screen.getByRole("button", { name: /create task/i }));

      const focusLink = screen.getByRole("link", { name: /open focus timer/i });
      expect(focusLink).toHaveAttribute("href", "/focus?taskId=t1");
    });

    it("links to the plain focus timer when no task was created", async () => {
      const user = userEvent.setup();
      render(<OnboardingFlow {...defaultProps} steps={DEFAULT_ONBOARDING_STEPS} />);
      await user.click(screen.getByRole("button", { name: /next/i })); // -> north-star
      await user.click(screen.getByRole("button", { name: /skip for now/i })); // skip north-star
      await user.click(screen.getByRole("button", { name: /next/i })); // -> first-task
      await user.click(screen.getByRole("button", { name: /skip for now/i })); // skip first-task

      const focusLink = screen.getByRole("link", { name: /open focus timer/i });
      expect(focusLink).toHaveAttribute("href", "/focus");
    });
  });

  describe("DEFAULT_ONBOARDING_STEPS", () => {
    it("has 8 steps", () => {
      expect(DEFAULT_ONBOARDING_STEPS).toHaveLength(8);
    });

    it("starts with the welcome step", () => {
      expect(DEFAULT_ONBOARDING_STEPS[0].id).toBe("welcome");
    });

    it("ends with the complete step", () => {
      const last = DEFAULT_ONBOARDING_STEPS[DEFAULT_ONBOARDING_STEPS.length - 1];
      expect(last.id).toBe("complete");
    });

    it("projects step is informational (no action — user creates project after onboarding)", () => {
      const projectsStep = DEFAULT_ONBOARDING_STEPS.find(
        (s) => s.id === "projects"
      );
      expect(projectsStep).toBeDefined();
      // Steps are now purely informational; users create projects via the QuickStartGuide
      expect(projectsStep?.action).toBeUndefined();
    });

    it("all steps can be navigated through without actions", async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      render(
        <OnboardingFlow
          {...defaultProps}
          onComplete={onComplete}
          steps={DEFAULT_ONBOARDING_STEPS}
        />
      );
      // Click through all steps
      for (let i = 0; i < DEFAULT_ONBOARDING_STEPS.length - 1; i++) {
        // North Star step uses "Save & Continue" or "Skip for now"
        const saveButton = screen.queryByRole("button", { name: /Save & Continue/i });
        const nextButton = screen.queryByRole("button", { name: /next/i });
        const skipButton = screen.queryByRole("button", { name: /skip/i });
        // Start-focus step uses "I'll do this later"
        const laterButton = screen.queryByRole("button", { name: /i'll do this later/i });
        
        if (saveButton && !saveButton.hasAttribute('disabled')) {
          await user.click(saveButton);
        } else if (nextButton) {
          await user.click(nextButton);
        } else if (skipButton) {
          await user.click(skipButton);
        } else if (laterButton) {
          await user.click(laterButton);
        }
      }
      // Last step shows "Get Started"
      await user.click(screen.getByRole("button", { name: /get started/i }));
      expect(onComplete).toHaveBeenCalledOnce();
    });
  });
});
