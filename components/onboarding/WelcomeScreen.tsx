"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle, 
  Target, 
  Calendar,
  Music,
  FolderOpen,
  BarChart3,
  Zap
} from "lucide-react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  comingSoon?: boolean;
}

function FeatureCard({ icon, title, description, comingSoon }: FeatureCardProps) {
  return (
    <Card className={cn("relative overflow-hidden transition-all hover:shadow-md", comingSoon && "opacity-75")}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-medium mb-1 flex items-center gap-2">
              {title}
              {comingSoon && (
                <Badge variant="secondary" className="text-xs">
                  Coming Soon
                </Badge>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onSkip: () => void;
}

export default function WelcomeScreen({ onGetStarted, onSkip }: WelcomeScreenProps) {
  const features = [
    {
      id: "projects",
      icon: <FolderOpen className="w-5 h-5 text-primary" />,
      title: "Smart Projects",
      description: "Organize tasks with custom projects, colors, and images"
    },
    {
      id: "tasks",
      icon: <Target className="w-5 h-5 text-primary" />,
      title: "Task Management",
      description: "Prioritize and schedule tasks with intelligent automation"
    },
    {
      id: "journal",
      icon: <Calendar className="w-5 h-5 text-primary" />,
      title: "Daily Journal",
      description: "Reflect on your day and track your mood and progress"
    },
    {
      id: "spotify",
      icon: <Music className="w-5 h-5 text-primary" />,
      title: "Focus Playlists",
      description: "Connect Spotify for music that helps you stay in the zone"
    },
    {
      id: "analytics",
      icon: <BarChart3 className="w-5 h-5 text-primary" />,
      title: "Analytics Dashboard",
      description: "Track your productivity patterns and insights",
      comingSoon: true
    },
    {
      id: "ai",
      icon: <Zap className="w-5 h-5 text-primary" />,
      title: "AI Assistant",
      description: "Get smart suggestions for task prioritization",
      comingSoon: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Welcome to Priority Compass</span>
          </div>
          
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Your Personal Productivity Companion
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Organize tasks, track progress, and stay focused on what matters most. 
            Let&apos;s get you set up with a personalized experience.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {features.map((feature) => (
            <FeatureCard
              key={feature.id}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              comingSoon={feature.comingSoon}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            onClick={onGetStarted}
            className="text-lg px-8 py-3"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Start Quick Tour
          </Button>
          
          <Button 
            variant="outline" 
            size="lg"
            onClick={onSkip}
            className="text-lg px-8 py-3"
          >
            Skip to Dashboard
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

      </div>
    </div>
  );
}
