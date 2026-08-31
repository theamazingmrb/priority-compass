"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductivityPatterns } from "@/lib/analytics";
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
import { Brain, Clock, Calendar } from "lucide-react";

interface Props {
  data: ProductivityPatterns;
}

// Heatmap colors based on intensity
const getHeatmapColor = (value: number, max: number) => {
  if (max === 0) return "bg-secondary";
  if (value === 0) return "bg-secondary/30";
  const ratio = value / max;
  if (ratio < 0.25) return "bg-green-500/20";
  if (ratio < 0.5) return "bg-green-500/40";
  if (ratio < 0.75) return "bg-green-500/60";
  return "bg-green-500/80";
};

export default function ProductivitySection({ data }: Props) {
  const maxWeeklySessions = Math.max(...data.weeklyData.map((d) => d.sessions), 1);

  // Group hours into blocks for the heatmap
  const hourBlocks = [
    { label: "6-9", hours: [6, 7, 8] },
    { label: "9-12", hours: [9, 10, 11] },
    { label: "12-15", hours: [12, 13, 14] },
    { label: "15-18", hours: [15, 16, 17] },
    { label: "18-21", hours: [18, 19, 20] },
    { label: "21-24", hours: [21, 22, 23] },
  ];

  const getBlockTotal = (hours: number[]) => {
    return hours.reduce((sum, h) => {
      const hourData = data.hourlyData.find((d) => d.hour === h);
      return sum + (hourData?.sessions || 0);
    }, 0);
  };

  const maxBlockSessions = Math.max(
    ...hourBlocks.map((b) => getBlockTotal(b.hours)),
    1
  );

  // Find best focus hours
  const bestHours = [...data.hourlyData]
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 3)
    .filter((h) => h.sessions > 0)
    .map((h) => {
      const hour = h.hour;
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:00 ${period}`;
    });

  // Find most productive days
  const bestDays = [...data.weeklyData]
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 2)
    .filter((d) => d.sessions > 0)
    .map((d) => d.day);

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const energyTotal =
    data.energyCorrelation.highEnergy +
    data.energyCorrelation.mediumEnergy +
    data.energyCorrelation.lowEnergy;

  return (
    <div className="space-y-6">
      {/* Best Hours & Days */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <CardTitle className="text-base">Best Focus Hours</CardTitle>
            </div>
            {bestHours.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {bestHours.map((hour) => (
                  <span
                    key={hour}
                    className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-sm font-medium"
                  >
                    {hour}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Complete more sessions to see your peak hours
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Calendar className="w-5 h-5 text-purple-500" />
              </div>
              <CardTitle className="text-base">Most Productive Days</CardTitle>
            </div>
            {bestDays.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {bestDays.map((day) => (
                  <span
                    key={day}
                    className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 text-sm font-medium"
                  >
                    {day}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Complete more sessions to see your productive days
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Energy Correlation */}
      {energyTotal > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Brain className="w-5 h-5 text-amber-500" />
              </div>
              <CardTitle className="text-base">Energy Levels from Check-ins</CardTitle>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {data.energyCorrelation.highEnergy}
                </div>
                <div className="text-xs text-muted-foreground">High Energy</div>
                <div className="h-1 bg-secondary rounded mt-2">
                  <div
                    className="h-full bg-green-500 rounded"
                    style={{
                      width: `${
                        energyTotal > 0
                          ? (data.energyCorrelation.highEnergy / energyTotal) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-500">
                  {data.energyCorrelation.mediumEnergy}
                </div>
                <div className="text-xs text-muted-foreground">Medium Energy</div>
                <div className="h-1 bg-secondary rounded mt-2">
                  <div
                    className="h-full bg-amber-500 rounded"
                    style={{
                      width: `${
                        energyTotal > 0
                          ? (data.energyCorrelation.mediumEnergy / energyTotal) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {data.energyCorrelation.lowEnergy}
                </div>
                <div className="text-xs text-muted-foreground">Low Energy</div>
                <div className="h-1 bg-secondary rounded mt-2">
                  <div
                    className="h-full bg-red-500 rounded"
                    style={{
                      width: `${
                        energyTotal > 0
                          ? (data.energyCorrelation.lowEnergy / energyTotal) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hourly Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Focus Sessions by Time of Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-1 mb-4">
            {hourBlocks.map((block) => {
              const total = getBlockTotal(block.hours);
              return (
                <div
                  key={block.label}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-medium ${getHeatmapColor(
                    total,
                    maxBlockSessions
                  )}`}
                  title={`${total} sessions`}
                >
                  <span className="text-muted-foreground">{block.label}</span>
                  <span className="font-bold">{total}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded bg-secondary/30" />
              <div className="w-4 h-4 rounded bg-green-500/20" />
              <div className="w-4 h-4 rounded bg-green-500/40" />
              <div className="w-4 h-4 rounded bg-green-500/60" />
              <div className="w-4 h-4 rounded bg-green-500/80" />
            </div>
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Focus by Day of Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
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
                <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                  {data.weeklyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`hsl(var(--primary))`}
                      opacity={entry.sessions / maxWeeklySessions}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Hourly Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Sessions by Hour</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hourlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickFormatter={(hour) => {
                    const period = hour >= 12 ? "P" : "A";
                    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                    return `${displayHour}${period}`;
                  }}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [value, "Sessions"]}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  labelFormatter={(hour: any) => {
                    const period = hour >= 12 ? "PM" : "AM";
                    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                    return `${displayHour}:00 ${period}`;
                  }}
                />
                <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}