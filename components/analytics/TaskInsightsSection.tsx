"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskInsights } from "@/lib/analytics";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  TooltipValueType,
} from "recharts";
import { Target, TrendingUp, CheckCircle } from "lucide-react";

interface Props {
  data: TaskInsights;
}

const PRIORITY_COLORS: Record<string, string> = {
  Hot: "#ef4444",
  Warm: "#f97316",
  Cool: "#3b82f6",
  Cold: "#6b7280",
};

const formatMinutes = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export default function TaskInsightsSection({ data }: Props) {
  const hasPriorityData = data.priorityDistribution.some((p) => p.minutes > 0);
  const hasTaskData = data.topTasks.length > 0;

  return (
    <div className="space-y-6">
      {/* Priority Distribution */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <CardTitle>Focus Time by Priority</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {hasPriorityData ? (
            <>
              <div className="h-48 w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.priorityDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => formatMinutes(v)}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis
                      dataKey="priority"
                      type="category"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      width={50}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(
                        value: TooltipValueType | undefined,
                        name: string | number | undefined
                      ) => [
                        name === "minutes" ? formatMinutes(Number(value)) : value,
                        name === "minutes" ? "Focus Time" : "Sessions",
                      ]}
                    />
                    <Bar dataKey="minutes" radius={[0, 4, 4, 0]}>
                      {data.priorityDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PRIORITY_COLORS[entry.priority] || "hsl(var(--primary))"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Priority breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {data.priorityDistribution.map((p) => (
                  <div
                    key={p.priority}
                    className="p-3 rounded-lg border border-border"
                    style={{
                      borderColor: PRIORITY_COLORS[p.priority],
                      backgroundColor: `${PRIORITY_COLORS[p.priority]}10`,
                    }}
                  >
                    <div className="text-sm font-medium">{p.priority}</div>
                    <div className="text-lg font-bold" style={{ color: PRIORITY_COLORS[p.priority] }}>
                      {formatMinutes(p.minutes)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.sessions} session{p.sessions !== 1 ? "s" : ""}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No priority data yet.</p>
              <p className="text-sm">Link tasks to focus sessions to see insights.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <CardTitle>Most Focused Tasks</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {hasTaskData ? (
            <div className="space-y-3">
              {data.topTasks.map((task, index) => (
                <div
                  key={task.taskId}
                  className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{task.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {task.sessions} session{task.sessions !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatMinutes(task.minutes)}</div>
                    <div className="text-xs text-muted-foreground">focus time</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No task focus data yet.</p>
              <p className="text-sm">Start focus sessions with tasks linked to see insights.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Focus per Completed Task */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-base">Focus Sessions per Completed Task</CardTitle>
              <p className="text-sm text-muted-foreground">
                Average number of focus sessions spent on completed tasks
              </p>
            </div>
          </div>
          <div className="mt-4 text-center">
            <div className="text-4xl font-bold text-primary">
              {data.focusPerTask}
            </div>
            <div className="text-sm text-muted-foreground">
              sessions / completed task
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}