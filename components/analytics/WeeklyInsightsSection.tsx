"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import type { WeeklySummary } from "@/lib/weekly-summary";
import { Sparkles, RefreshCw, Brain, Lightbulb, TrendingUp, Loader2 } from "lucide-react";

export default function WeeklyInsightsSection() {
  const { session } = useAuth();
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/weekly-summary", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        setError("Failed to generate your weekly summary. Please try again.");
        return;
      }
      const data = await res.json();
      setSummary(data.summary as WeeklySummary);
    } catch {
      setError("Failed to reach the summary service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Weekly Insights</CardTitle>
              <p className="text-sm text-muted-foreground">
                The data story behind your week
              </p>
            </div>
          </div>
          <Button onClick={generate} disabled={loading} size="sm">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Preparing...
              </>
            ) : summary ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <p className="text-sm text-destructive mb-2">{error}</p>
        )}

        {!summary && !loading && !error && (
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              Get a plain-language take on your week: where your focus went,
              your strongest hours, and what to try next.
            </p>
            <p className="text-xs text-muted-foreground/80">
              Generated from your focus sessions, tasks, check-ins, values, and
              reflections. No API key configured? You still get a solid
              rule-based summary — it&apos;s just not language-model-powered yet.
            </p>
          </div>
        )}

        {summary && (
          <div className="space-y-5">
            <div>
              <p className="text-lg font-semibold leading-snug">
                {summary.headline}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {summary.weekStart} → {summary.weekEnd}
              </p>
            </div>

            <p className="text-sm text-foreground/90">{summary.narrative}</p>

            {summary.insights.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  Patterns
                </div>
                <ul className="space-y-1.5">
                  {summary.insights.map((insight, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-primary shrink-0">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.suggestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Lightbulb className="w-4 h-4" />
                  Suggestions
                </div>
                <ul className="space-y-1.5">
                  {summary.suggestions.map((suggestion, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-amber-500 shrink-0">→</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground/80 pt-1 border-t border-border/50">
              <Brain className="w-3.5 h-3.5" />
              {summary.generatedBy === "ai"
                ? `Generated by ${summary.model || "AI"}`
                : "Rule-based summary (AI not configured)"}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
