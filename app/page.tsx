"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Activity, Target, Calendar, BookOpen, Zap, Lock, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import BrandLogo from "@/components/brand-logo";

const FEATURES = [
  {
    icon: Target,
    title: "Daily Focus",
    description: "One priority at a time. Quick check-ins morning, midday, and evening to stay aligned.",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "Auto-schedule tasks based on priority, energy levels, and deadlines. Lock what can't move.",
  },
  {
    icon: Zap,
    title: "Priority System",
    description: "Hot, Warm, Cool, Backlog. Clear hierarchy so you always know what to work on.",
  },
  {
    icon: BookOpen,
    title: "Journaling",
    description: "Capture thoughts, track mood, link entries to tasks. Your work tells a story.",
  },
  {
    icon: Lock,
    title: "Your Data, Yours",
    description: "Private by default. Your tasks and journals stay on your terms.",
  },
  {
    icon: Activity,
    title: "Google Calendar Sync",
    description: "See your tasks alongside Google Calendar events. One view, complete picture.",
  },
];

const STEPS = [
  { step: "01", title: "Check in", description: "Set your top priority in 60 seconds" },
  { step: "02", title: "Plan", description: "Let Priority Compass schedule your day or place tasks manually" },
  { step: "03", title: "Execute", description: "Focus on what matters, one task at a time" },
  { step: "04", title: "Reflect", description: "Daily, weekly, monthly reviews to stay aligned" },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || user) {
    return <div className="min-h-screen" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <BrandLogo size={20} className="text-primary" />
          <span className="font-bold tracking-tight">Priority Compass</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/signin">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center max-w-3xl mx-auto px-6 pt-16 pb-24">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
          <span className="text-xs font-medium text-primary">Your personal productivity OS</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
          Stop managing tasks.
          <br />
          <span className="text-primary">Start making progress.</span>
        </h1>
        
        <p className="text-lg text-muted-foreground max-w-xl leading-relaxed mb-8">
          Daily check-ins, smart scheduling, and reflective journaling — 
          all in one calm, intentional space. No noise, no overwhelm.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/signup">
            <Button size="lg" className="gap-2">
              Start for free <ArrowRight size={16} />
            </Button>
          </Link>
          <Link href="/signin">
            <Button variant="outline" size="lg">Sign in</Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground mt-4">No credit card required</p>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold mb-2">How it works</h2>
          <p className="text-muted-foreground">A simple workflow that compounds over time</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {STEPS.map(({ step, title, description }) => (
            <div key={step} className="relative">
              <div className="text-5xl font-bold text-muted-foreground/10 mb-2">{step}</div>
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold mb-2">Everything you need</h2>
          <p className="text-muted-foreground">Focused tools for focused work</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Icon size={20} className="text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Priority Compass */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <div className="rounded-2xl border border-border bg-gradient-to-b from-muted/50 to-muted/20 p-8 md:p-12">
          <h2 className="text-2xl font-bold mb-4">Why Priority Compass?</h2>
          <div className="grid gap-4">
            {[
              "Most productivity apps optimize for volume — more tasks, more tracking, more noise.",
              "Priority Compass is built around a different idea: clarity drives productivity.",
              "One priority at a time. A scheduling engine that respects your energy. Reflection prompts that actually help.",
              "No gamification. No social features. Just you and your work.",
            ].map((text, i) => (
              <div key={i} className="flex gap-3">
                <Check size={18} className="text-primary flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-2xl font-bold mb-2">Ready to focus?</h2>
        <p className="text-muted-foreground mb-6">
          Join people who&apos;ve reclaimed their attention.
        </p>
        <Link href="/signup">
          <Button size="lg" className="gap-2">
            Get started free <ArrowRight size={16} />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BrandLogo size={16} className="text-primary" />
            <span>Priority Compass</span>
            <span className="text-border">·</span>
            <span>Clarity over chaos</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Priority Compass. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}