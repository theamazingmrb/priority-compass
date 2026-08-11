import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  FolderOpen,
  Calendar,
  Music,
  Target,
  Star,
  X,
  SkipForward,
  Loader2,
  RefreshCw,
  Play,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { upsertNorthStar, NORTH_STAR_PROMPTS, MAX_CONTENT_LENGTH } from "@/lib/north-star";
import { createTask } from "@/lib/tasks";
import { toast } from "sonner";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  skip?: boolean;
  progress?: number;
}

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  steps: OnboardingStep[];
}

// North Star step component
function NorthStarStep({ 
  onComplete, 
  onSkip 
}: { 
  onComplete: () => void;
  onSkip: () => void;
}) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CONTENT_LENGTH;

  async function handleSave() {
    if (!user || !content.trim()) return;
    
    setIsSaving(true);
    const result = await upsertNorthStar(user.id, content);
    setIsSaving(false);

    if (result.success) {
      toast.success('North Star saved! ✨');
      onComplete();
    } else {
      toast.error(result.error || 'Failed to save');
    }
  }

  function cyclePrompt() {
    setPromptIndex((prev) => (prev + 1) % NORTH_STAR_PROMPTS.length);
  }

  return (
    <div className="space-y-4">
      {/* Prompt hint */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
        <Sparkles className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-muted-foreground italic">
            {NORTH_STAR_PROMPTS[promptIndex]}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={cyclePrompt}
          className="h-6 w-6 flex-shrink-0"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {/* Textarea */}
      <div className="space-y-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your North Star here..."
          rows={4}
          className={`resize-none ${isOverLimit ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          autoFocus
        />
        <div className="flex justify-end text-xs">
          <span className={isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}>
            {charCount}/{MAX_CONTENT_LENGTH}
          </span>
        </div>
      </div>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground text-center">
        Your North Star is your life vision — the single statement that guides everything you do.
        You can always change this later from your dashboard.
      </p>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onSkip}
          disabled={isSaving}
        >
          Skip for now
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || isOverLimit || !content.trim()}
          className="flex-1"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Star className="h-4 w-4 mr-2" />
              Save & Continue
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// First task step component — actually creates a task so onboarding ends with a win
function FirstTaskStep({
  onComplete,
  onSkip,
  onTaskCreated,
}: {
  onComplete: () => void;
  onSkip: () => void;
  onTaskCreated?: (taskId: string) => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState(1); // 1=Hot, 2=Warm, 3=Cool, 4=Cold
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!user || !title.trim()) return;

    setIsSaving(true);
    const result = await createTask({
      user_id: user.id,
      title: title.trim(),
      description: null,
      status: "active",
      project_id: null,
      notes: null,
      due_date: null,
      image_url: null,
      priority_level: priority,
      scheduling_mode: "manual",
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
    });
    setIsSaving(false);

    if (result) {
      toast.success("First task created! 🎉");
      onTaskCreated?.(result.id);
      onComplete();
    } else {
      toast.error("Failed to create task. Try again or skip for now.");
    }
  }

  const priorities = [
    { value: 1, label: "🔥 Hot — do it now", className: "border-red-500/50 text-red-500" },
    { value: 2, label: "🌤️ Warm — do it soon", className: "border-amber-500/50 text-amber-500" },
    { value: 3, label: "🧊 Cool — can wait", className: "border-blue-500/50 text-blue-500" },
    { value: 4, label: "❄️ Cold — someday", className: "border-slate-500/50 text-slate-500" },
  ];

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What's one thing you want to accomplish today?"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        autoFocus
      />

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">How urgent is it?</p>
        <div className="grid grid-cols-2 gap-2">
          {priorities.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                priority === p.value ? `${p.className} bg-secondary/50` : "border-border text-muted-foreground hover:bg-secondary/30"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        We&apos;ll place this on your dashboard so you can start working right away.
      </p>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onSkip} disabled={isSaving}>
          Skip for now
        </Button>
        <Button onClick={handleSave} disabled={isSaving || !title.trim()} className="flex-1">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Create Task
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function OnboardingFlow({
  isOpen,
  onClose,
  onComplete,
  steps,
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set(prev).add(currentStep));
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleStepAction = () => {
    if (currentStepData.action) {
      currentStepData.action.onClick();
    }
    handleNext();
  };

  if (!isOpen) return null;

  // Check if this is a North Star step
  const isNorthStarStep = currentStepData.id === 'north-star';
  // Check if this is a First Task step
  const isFirstTaskStep = currentStepData.id === 'first-task';
  // Check if this is a Start Focus step
  const isStartFocusStep = currentStepData.id === 'start-focus';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 shadow-2xl">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">
                Welcome to Priority Compass
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              {currentStepData.icon}
            </div>
            <h2 className="text-xl font-semibold mb-3">{currentStepData.title}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {currentStepData.description}
            </p>
          </div>

          {/* North Star step has special content */}
          {isNorthStarStep ? (
            <NorthStarStep 
              onComplete={handleNext}
              onSkip={handleSkip}
            />
          ) : isFirstTaskStep ? (
            <FirstTaskStep 
              onComplete={handleNext}
              onSkip={handleSkip}
              onTaskCreated={(taskId) => setCreatedTaskId(taskId)}
            />
          ) : isStartFocusStep ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {createdTaskId
                  ? "Now let's try a focus session on your new task. Pick a duration, then start the timer and work on it for a few minutes."
                  : "Now let's try a focus session. The timer helps you work in uninterrupted blocks."}
              </p>
              <Link
                href={createdTaskId ? `/focus?taskId=${createdTaskId}` : "/focus"}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-3 text-sm font-medium hover:bg-primary/90 transition-colors w-full"
              >
                <Play size={16} />
                Open Focus Timer
              </Link>
              <Button variant="ghost" onClick={handleNext} className="w-full text-muted-foreground">
                I&apos;ll do this later
              </Button>
            </div>
          ) : (
            /* Regular steps */
            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
              )}

              {currentStepData.action ? (
                <Button
                  onClick={handleStepAction}
                  className="flex-1"
                >
                  {currentStepData.action.label}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className={cn(
                    "flex-1",
                    currentStep > 0 && "ml-auto"
                  )}
                >
                  {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}

              {currentStepData.skip && currentStep < steps.length - 1 && (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-muted-foreground"
                >
                  <SkipForward className="w-4 w-4 mr-2" />
                  Skip
                </Button>
              )}
            </div>
          )}

          {/* Step indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index === currentStep
                    ? "bg-primary"
                    : completedSteps.has(index)
                    ? "bg-primary/50"
                    : "bg-muted"
                )}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Default onboarding steps for Priority Compass
export const DEFAULT_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Priority Compass",
    description: "Your personal productivity companion that helps you organize tasks, track progress, and stay focused on what matters most.",
    icon: <Sparkles className="w-8 h-8 text-primary" />,
  },
  {
    id: "north-star",
    title: "Set Your North Star",
    description: "Define your life vision — the single statement that anchors everything you do.",
    icon: <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />,
    skip: true,
  },
  {
    id: "projects",
    title: "Organize with Projects",
    description: "Create projects to group related tasks. You can add custom colors, descriptions, and project images. Head to the Projects page after onboarding to create your first one!",
    icon: <FolderOpen className="w-8 h-8 text-primary" />,
  },
  {
    id: "first-task",
    title: "Create Your First Task",
    description: "Let's set up your first task. What's one thing you want to accomplish today?",
    icon: <Target className="w-8 h-8 text-primary" />,
    skip: true,
  },
  {
    id: "start-focus",
    title: "Try a Focus Session",
    description: "The Focus Timer is how you get into deep work. Let's try it for a few minutes.",
    icon: <Play className="w-8 h-8 text-primary" />,
    skip: true,
  },
  {
    id: "reflections",
    title: "Reflect & Grow",
    description: "Use daily, weekly, and monthly reflections to track your progress and build self-awareness. The Reflections page helps you stay mindful of your journey.",
    icon: <Calendar className="w-8 h-8 text-primary" />,
  },
  {
    id: "playlist",
    title: "Focus with Music (Optional)",
    description: "Connect your Spotify account to soundtrack your work sessions. You can set this up anytime from the Playlist page - it's completely optional!",
    icon: <Music className="w-8 h-8 text-primary" />,
    skip: true,
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "Priority Compass is ready to help you achieve your goals. Start by creating a project, adding some tasks, or writing your first reflection. Let's build something great together!",
    icon: <Check className="w-8 h-8 text-primary" />,
  },
];
