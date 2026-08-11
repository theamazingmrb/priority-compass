"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/auth-guard";
import OnboardingFlow, { DEFAULT_ONBOARDING_STEPS } from "@/components/onboarding/OnboardingFlow";
import WelcomeScreen from "@/components/onboarding/WelcomeScreen";
import { useOnboarding } from "@/hooks/useOnboarding";

type OnboardingView = "welcome" | "flow" | "complete";

export default function OnboardingPage() {
  const router = useRouter();
  const { skipOnboarding } = useOnboarding();
  const [currentView, setCurrentView] = useState<OnboardingView>("welcome");

  const handleOnboardingComplete = async () => {
    await skipOnboarding(); // Mark onboarding as complete
    setCurrentView("complete");
    setTimeout(() => {
      router.push("/dashboard");
    }, 2000);
  };

  const handleSkipOnboarding = async () => {
    await skipOnboarding();
    router.push("/dashboard");
  };

  if (currentView === "welcome") {
    return (
      <AuthGuard>
        <WelcomeScreen
          onGetStarted={() => setCurrentView("flow")}
          onSkip={() => router.push("/dashboard")}
        />
      </AuthGuard>
    );
  }

  if (currentView === "complete") {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-4">You&apos;re All Set!</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Welcome to Priority Compass. Your productivity journey starts now.
            </p>
            <div className="animate-pulse text-sm text-muted-foreground">
              Redirecting to your dashboard...
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <OnboardingFlow
        isOpen={true}
        onClose={handleSkipOnboarding}
        onComplete={handleOnboardingComplete}
        steps={DEFAULT_ONBOARDING_STEPS}
      />
    </AuthGuard>
  );
}
