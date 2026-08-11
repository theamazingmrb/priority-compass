import { useState } from "react";
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
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { upsertNorthStar, NORTH_STAR_PROMPTS, MAX_CONTENT_LENGTH } from "@/lib/north-star";
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

export default function OnboardingFlow({
  isOpen,
  onClose,
  onComplete,
  steps,
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

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
    id: "tasks",
    title: "Manage Your Tasks",
    description: "Break down your work into manageable tasks. Set priorities, due dates, and track your progress with our smart scheduling system. The Tasks page is your command center!",
    icon: <Target className="w-8 h-8 text-primary" />,
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
