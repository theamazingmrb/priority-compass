"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WarMapProgress } from "@/lib/analytics";
import { Map, Target, TrendingUp, Award } from "lucide-react";

interface Props {
  data?: WarMapProgress;
}

export default function WarMapSection({ data }: Props) {
  if (!data) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <Map className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">Life Lanes data not available</p>
        </CardContent>
      </Card>
    );
  }
  const completionPercentage =
    data.totalTasks > 0
      ? Math.round((data.completedTasks / data.totalTasks) * 100)
      : 0;

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Target className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Completed
                </p>
                <p className="text-2xl font-bold">{data.completedTasks}</p>
                <p className="text-xs text-muted-foreground">Life Lanes items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Map className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  In Progress
                </p>
                <p className="text-2xl font-bold">
                  {data.totalTasks - data.completedTasks}
                </p>
                <p className="text-xs text-muted-foreground">Life Lanes items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Focus Time
                </p>
                <p className="text-2xl font-bold">
                  {formatMinutes(data.focusMinutesTowardGoals)}
                </p>
                <p className="text-xs text-muted-foreground">toward goals</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Award className="w-5 h-5 text-primary" />
            </div>
            <CardTitle>Life Lanes Progress</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {data.completedTasks} of {data.totalTasks} items completed
              </span>
              <span className="text-sm font-medium">{completionPercentage}%</span>
            </div>
            <div className="h-4 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            {data.totalTasks === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Map className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No Life Lanes items yet.</p>
                <p className="text-sm">
                  Add items to your Life Lanes to track progress toward your annual goals.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Categories Breakdown */}
      {data.categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Progress by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.categories.map((category, index) => {
                const percentage =
                  category.total > 0
                    ? Math.round((category.completed / category.total) * 100)
                    : 0;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{category.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {category.completed}/{category.total} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Motivational Card */}
      <Card className="border-dashed bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Map className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Keep Building Your Legacy</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Your Life Lanes tracks your progress toward your annual goals. Each completed
                item brings you closer to your vision.
              </p>
              <a
                href="/warmap"
                className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                View Life Lanes
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}