import { supabase as defaultSupabase } from "./supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * AI-powered weekly summary ("the data story").
 *
 * Pulls a week of real data (focus sessions, check-ins, tasks, reflections,
 * North Star + core values for grounding), builds a compact prompt, and asks
 * a model (any OpenAI-compatible endpoint — OpenAI default, DeepSeek via
 * OPENAI_BASE_URL) for a plain-language weekly reflection.
 *
 * No API key configured → falls back to a deterministic, rule-based summary
 * assembled from the same data. This keeps the feature fully functional (and
 * testable) without paying anything, and makes the AI tier a pure upgrade.
 */

export interface WeeklySummaryStats {
  focusMinutes: number;
  focusSessions: number;
  completionRate: number;
  tasksCompleted: number;
  checkinCount: number;
  bestDay: string | null;
  bestHour: number | null;
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  headline: string;
  narrative: string;
  insights: string[];
  suggestions: string[];
  stats: WeeklySummaryStats;
  generatedBy: "ai" | "fallback";
  model?: string | null;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  out.setDate(diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function formatYMD(d: Date): string {
  return d.toISOString().split("T")[0];
}

function fmtHm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function weekRange(): { from: string; to: string } {
  const ws = startOfWeek(new Date());
  const weekEnd = new Date(ws);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return { from: ws.toISOString(), to: weekEnd.toISOString() };
}

// ── Data aggregation ──────────────────────────────────────────────────────────

/**
 * Aggregate the past week's data. Accepts an optional supabase client so the
 * caller can pass a service-role (RLS-bypassing) client for server-side use.
 */
export async function getWeeklyStats(
  userId: string,
  client: SupabaseClient = defaultSupabase
): Promise<WeeklySummaryStats> {
  const { from: isoFrom, to: isoTo } = weekRange();

  const [sessionsRes, tasksRes, checkinsRes] = await Promise.all([
    client
      .from("focus_sessions")
      .select("id, duration, started_at, status")
      .eq("user_id", userId)
      .gte("started_at", isoFrom)
      .lt("started_at", isoTo),
    client
      .from("tasks")
      .select("id, title, priority_level, completed_at")
      .eq("user_id", userId)
      .eq("status", "done")
      .gte("completed_at", isoFrom)
      .lt("completed_at", isoTo),
    client
      .from("checkins")
      .select("created_at, energy_level")
      .eq("user_id", userId)
      .gte("created_at", isoFrom)
      .lt("created_at", isoTo),
  ]);

  const sessions = sessionsRes.data ?? [];
  const completedSessions = sessions.filter((s) => s.status === "completed");
  const focusMinutes = completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const completionRate =
    sessions.length > 0
      ? Math.round((completedSessions.length / sessions.length) * 100)
      : 0;

  const tasksCompleted = tasksRes.data?.length ?? 0;
  const checkinCount = checkinsRes.data?.length ?? 0;

  // Best day by completed focus minutes
  const dayMinutes = new Map<string, number>();
  let bestDay: string | null = null;
  let bestDayMinutes = 0;
  for (const s of completedSessions) {
    const dayName = DAY_NAMES[new Date(s.started_at).getDay()];
    const v = (dayMinutes.get(dayName) ?? 0) + (s.duration || 0);
    dayMinutes.set(dayName, v);
    if (v > bestDayMinutes) {
      bestDayMinutes = v;
      bestDay = dayName;
    }
  }

  // Best hour by completed session count
  const hourCount = new Map<number, number>();
  let bestHour: number | null = null;
  let bestHourCount = 0;
  for (const s of completedSessions) {
    const h = new Date(s.started_at).getHours();
    const c = (hourCount.get(h) ?? 0) + 1;
    hourCount.set(h, c);
    if (c > bestHourCount) {
      bestHourCount = c;
      bestHour = h;
    }
  }

  return {
    focusMinutes,
    focusSessions: completedSessions.length,
    completionRate,
    tasksCompleted,
    checkinCount,
    bestDay,
    bestHour,
  };
}

// ── LLM call (OpenAI-compatible) ─────────────────────────────────────────────

interface WeeklyContext {
  stats: WeeklySummaryStats;
  topTasks: string[];
  northStar: string | null;
  values: string[];
  dailyIntents: string[];
  reflectionSnippets: string[];
  completedTasks: string[];
}

async function gatherContext(
  userId: string,
  stats: WeeklySummaryStats,
  client: SupabaseClient
): Promise<WeeklyContext> {
  const { from: isoFrom, to: isoTo } = weekRange();

  const [northRes, valuesRes, intentsRes, reflectRes, topTaskRes, completedRes] =
    await Promise.all([
      client
        .from("north_star")
        .select("content")
        .eq("user_id", userId)
        .maybeSingle(),
      client
        .from("core_values")
        .select("value_text")
        .eq("user_id", userId)
        .order("value_order", { ascending: true })
        .limit(5),
      client
        .from("checkins")
        .select("daily_intent")
        .eq("user_id", userId)
        .gte("created_at", isoFrom)
        .lt("created_at", isoTo)
        .not("daily_intent", "is", null),
      client
        .from("reflections")
        .select("type, sections")
        .eq("user_id", userId)
        .gte("created_at", isoFrom)
        .lt("created_at", isoTo),
      client
        .from("focus_sessions")
        .select("duration, tasks!focus_sessions_task_id_fkey (title)")
        .eq("user_id", userId)
        .eq("status", "completed")
        .gte("started_at", isoFrom)
        .lt("started_at", isoTo)
        .not("task_id", "is", null),
      client
        .from("tasks")
        .select("title")
        .eq("user_id", userId)
        .eq("status", "done")
        .gte("completed_at", isoFrom)
        .lt("completed_at", isoTo),
    ]);

  const taskFocus = new Map<string, number>();
  for (const s of topTaskRes.data ?? []) {
    const task = s.tasks;
    if (task && typeof task === "object" && !Array.isArray(task)) {
      const title = (task as { title: string }).title;
      taskFocus.set(title, (taskFocus.get(title) ?? 0) + (s.duration || 0));
    }
  }
  const topTasks = Array.from(taskFocus.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([title]) => title)
    .slice(0, 5);

  const northStar = northRes.data?.content ?? null;
  const values = (valuesRes.data ?? []).map((v) => v.value_text);

  const dailyIntents = (intentsRes.data ?? [])
    .map((c) => c.daily_intent)
    .filter((x): x is string => !!x && typeof x === "string")
    .slice(0, 7);

  const PRIORITY_VALUES = [
    "accomplishments",
    "wins",
    "intent_check",
    "blockers",
    "gratitude",
    "improvements",
    "tomorrow",
    "next_week",
  ];
  const reflectionSnippets: string[] = [];
  for (const r of reflectRes.data ?? []) {
    const sections = r.sections ?? {};
    for (const key of Object.keys(sections)) {
      if (PRIORITY_VALUES.includes(key)) {
        const val = sections[key];
        if (typeof val === "string" && val.trim()) reflectionSnippets.push(val.trim());
      }
    }
    if (reflectionSnippets.length >= 8) break;
  }

  const completedTasks = (completedRes.data ?? []).map((t) => t.title);

  return {
    stats,
    topTasks,
    northStar,
    values,
    dailyIntents,
    reflectionSnippets,
    completedTasks,
  };
}

function buildSystemPrompt(): string {
  return [
    "You are Priority Compass, a reflective personal-productivity coach.",
    "You give concise, honest, non-flattering weekly summaries.",
    "Write in the second person ('you'). Use plain, direct language. No em dashes (—).",
    "Never invent numbers that aren't in the data. Always tie insights to the provided facts.",
    `Return valid JSON with exactly this shape and nothing else:
{
  "headline": "one compelling line summarising the week",
  "narrative": "2-4 sentences of plain-language reflection",
  "insights": ["3-5 grounded observations about focus, energy, or task patterns"],
  "suggestions": ["3-4 specific, actionable suggestions for next week"]
}`,
  ].join("\n");
}

function buildUserPrompt(ctx: WeeklyContext): string {
  const { stats } = ctx;
  const lines: string[] = ["Here is the past week's data. Write the weekly summary from it."];

  lines.push(
    `Focus: ${fmtHm(stats.focusMinutes)} across ${stats.focusSessions} completed session(s), ${stats.completionRate}% completion rate.`
  );
  lines.push(
    `Best focus day: ${stats.bestDay ?? "n/a"}. Best focus hour: ${stats.bestHour != null ? `${stats.bestHour}:00` : "n/a"}.`
  );
  lines.push(`Tasks completed this week: ${stats.tasksCompleted}. Check-ins: ${stats.checkinCount}.`);

  if (ctx.topTasks.length > 0) lines.push(`Top tasks by focus time: ${ctx.topTasks.join(", ")}.`);
  if (ctx.completedTasks.length > 0)
    lines.push(`Tasks completed: ${ctx.completedTasks.slice(0, 10).join(", ")}.`);
  if (ctx.northStar) lines.push(`North Star (life vision): "${ctx.northStar}"`);
  if (ctx.values.length > 0) lines.push(`Core values: ${ctx.values.join(", ")}.`);
  if (ctx.dailyIntents.length > 0)
    lines.push(`Daily intentions: ${ctx.dailyIntents.map((i) => `"${i}"`).join(", ")}.`);
  if (ctx.reflectionSnippets.length > 0)
    lines.push(`Reflection excerpts: ${ctx.reflectionSnippets.map((s) => `"${s}"`).join(" | ")}`);

  lines.push("Do not reference this raw data dump directly. Synthesise it.");
  return lines.join("\n");
}

export interface LlmConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface ResolvedLlmConfig {
  apiKey: string | undefined;
  baseUrl: string;
  model: string;
}

function getLlmConfig(): ResolvedLlmConfig {
  return {
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  };
}

async function callLlm(userPrompt: string, config: ResolvedLlmConfig): Promise<WeeklySummary | null> {
  if (!config.apiKey) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.6,
        max_tokens: 600,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error("Weekly summary LLM error:", res.status, await res.text());
      return null;
    }
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    return {
      ...parsed,
      generatedBy: "ai" as const,
      model: config.model,
    };
  } catch (err) {
    console.error("Weekly summary LLM exception:", err);
    return null;
  }
}

// ── Deterministic fallback ────────────────────────────────────────────────────

function buildFallback(stats: WeeklySummaryStats): WeeklySummary {
  const insights: string[] = [];
  const suggestions: string[] = [];

  if (stats.focusMinutes > 0) {
    insights.push(
      `You spent ${fmtHm(stats.focusMinutes)} focused this week across ${stats.focusSessions} completed session(s).`
    );
    if (stats.bestDay) insights.push(`${stats.bestDay} was your strongest focus day.`);
    if (stats.bestHour != null) insights.push(`You were most focused around the ${stats.bestHour}:00 hour.`);
  } else {
    insights.push("No completed focus sessions this week — the timer just needs a first run to start the data story.");
  }

  if (stats.completionRate > 0) {
    insights.push(`Your focus sessions had a ${stats.completionRate}% completion rate.`);
    if (stats.completionRate < 70) suggestions.push("Try shorter sessions (15 min) to lift your completion rate.");
  }

  if (stats.tasksCompleted > 0) {
    insights.push(`You completed ${stats.tasksCompleted} task(s) this week.`);
  } else {
    suggestions.push("Break one big goal into a single small task tomorrow and just complete it.");
  }

  if (stats.checkinCount === 0) {
    suggestions.push("A single morning check-in anchors the whole loop — start there tomorrow.");
  } else if (stats.checkinCount > 0) {
    insights.push(`You checked in ${stats.checkinCount} time(s) this week.`);
  }

  const headline =
    stats.focusMinutes > 0
      ? `${fmtHm(stats.focusMinutes)} of focus across ${stats.focusSessions} sessions`
      : "This week is a clean slate";

  const narrative =
    stats.focusMinutes > 0
      ? `You built a measurable focus habit this week. Repeating the highest-energy times — like ${stats.bestDay ? `around ${stats.bestDay}` : "your strongest day"} — compounds faster than chasing more hours.`
      : `No focus sessions landed yet, but that's data too. The loop starts with a three-minute intention and a fifteen-minute session.`;

  const { from, to } = weekRange();
  const end = new Date(to);
  end.setDate(end.getDate() - 1);

  return {
    weekStart: formatYMD(new Date(from)),
    weekEnd: formatYMD(end),
    headline,
    narrative,
    insights,
    suggestions,
    stats,
    generatedBy: "fallback",
    model: null,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface GenerateOptions extends LlmConfig {
  client?: SupabaseClient;
}

/**
 * Generate the weekly summary for a user. Server-side, pass a service-role
 * client so RLS doesn't block reads. Falls back to a deterministic summary
 * when there's no API key or no data.
 */
export async function generateWeeklySummary(
  userId: string,
  options: GenerateOptions = {}
): Promise<WeeklySummary> {
  const client = options.client ?? defaultSupabase;
  const stats = await getWeeklyStats(userId, client);
  const { from, to } = weekRange();
  const end = new Date(to);
  end.setDate(end.getDate() - 1);
  const weekStart = formatYMD(new Date(from));
  const weekEnd = formatYMD(end);

  if (stats.focusMinutes === 0 && stats.tasksCompleted === 0 && stats.checkinCount === 0) {
    return { ...buildFallback(stats), weekStart, weekEnd };
  }

  const config: ResolvedLlmConfig = {
    apiKey: options.apiKey ?? process.env.OPENAI_API_KEY,
    baseUrl: options.baseUrl ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    model: options.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  };

  if (config.apiKey) {
    const ctx = await gatherContext(userId, stats, client);
    const ai = await callLlm(buildUserPrompt(ctx), config);
    if (ai) {
      ai.stats = stats;
      ai.weekStart = weekStart;
      ai.weekEnd = weekEnd;
      return ai;
    }
  }

  return { ...buildFallback(stats), weekStart, weekEnd };
}

// Export for tests
export { getLlmConfig };
