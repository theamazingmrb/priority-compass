"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AuthGuard from "@/components/auth-guard";
import {
  getAnalyticsData,
  AnalyticsData,
} from "@/lib/analytics";
import {
  Timer,
  TrendingUp,
  Target,
  Flame,
  Map,
  BarChart3,
  Zap,
  Trophy,
} from "lucide-react";
import FocusTimeSection from "@/components/analytics/FocusTimeSection";
import ProductivitySection from "@/components/analytics/ProductivitySection";
import TaskInsightsSection from "@/components/analytics/TaskInsightsSection";
import StreaksSection from "@/components/analytics/StreaksSection";
import WarMapSection from "@/components/analytics/WarMapSection";
import WeeklyInsightsSection from "@/components/analytics/WeeklyInsightsSection";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadAnalytics() {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const analyticsData = await getAnalyticsData(user.id);
      setData(analyticsData);
    } catch (err) {
      console.error("Error loading analytics:", err);
      setError("Failed to load analytics data. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1">Analytics</h1>
            <p className="text-muted-foreground text-sm">
              Loading your productivity insights...
            </p>
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-secondary rounded w-1/2 mb-2" />
                  <div className="h-8 bg-secondary rounded w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard>
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1">Analytics</h1>
            <p className="text-destructive">{error}</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!data) return null;

  return (
    <AuthGuard>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Analytics</h1>
          <p className="text-muted-foreground text-sm">
            Track your focus, productivity patterns, and progress over time
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Timer className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Today</p>
                  <p className="text-xl font-bold">
                    {Math.floor(data.focusTime.today / 60)}h {data.focusTime.today % 60}m
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">This Week</p>
                  <p className="text-xl font-bold">
                    {Math.floor(data.focusTime.thisWeek / 60)}h {data.focusTime.thisWeek % 60}m
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Flame className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Focus Streak</p>
                  <p className="text-xl font-bold">{data.streaks.focusStreak} days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Trophy className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Milestones</p>
                  <p className="text-xl font-bold">
                    {data.streaks.milestones.filter((m) => m.achieved).length} achieved
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Insights (AI data story) */}
        <div className="mb-8">
          <WeeklyInsightsSection />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2 py-2">
              <BarChart3 size={16} />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="productivity" className="flex items-center gap-2 py-2">
              <Zap size={16} />
              <span className="hidden sm:inline">Patterns</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2 py-2">
              <Target size={16} />
              <span className="hidden sm:inline">Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="streaks" className="flex items-center gap-2 py-2">
              <Flame size={16} />
              <span className="hidden sm:inline">Streaks</span>
            </TabsTrigger>
            <TabsTrigger value="warmap" className="flex items-center gap-2 py-2">
              <Map size={16} />
              <span className="hidden sm:inline">Life Lanes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <FocusTimeSection data={data.focusTime} />
          </TabsContent>

          <TabsContent value="productivity">
            <ProductivitySection data={data.productivity} />
          </TabsContent>

          <TabsContent value="tasks">
            <TaskInsightsSection data={data.tasks} />
          </TabsContent>

          <TabsContent value="streaks">
            <StreaksSection data={data.streaks} />
          </TabsContent>

          <TabsContent value="warmap">
            {data.warmap ? (
              <WarMapSection data={data.warmap} />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Life Lanes data not available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  );
}