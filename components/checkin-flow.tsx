"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getTimeOfDay, getGreeting } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, RefreshCw, CheckSquare, Map, X, Target, Ban, Compass, Sparkles, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Task, WarMapItem, WarMapCategory, NorthStar, CoreValue } from "@/types";
import { getTasks, PRIORITY_CONFIG } from "@/lib/tasks";
import { getAllWarMapItems, linkTaskToWarMapItem } from "@/lib/warmap";
import { getNorthStar, truncateNorthStar } from "@/lib/north-star";
import { getCoreValues } from "@/lib/core-values";
import { cn } from "@/lib/utils";

type Step = "start" | "priority" | "intent" | "warmap" | "context" | "energy" | "done";

const TOD_PROMPTS = {
  morning: {
    headline: "Morning check-in",
    priorityQ: "What's the single most important thing you'll do today?",
    othersQ: "What 2 other things matter today?",
    contextQ: "Anything that might get in the way?",
    intentQ: "What's the one thing that, if done, makes everything else easier?",
    sayNoQ: "What do you need to say NO to today?",
  },
  midday: {
    headline: "Midday recalibrate",
    priorityQ: "What's your top priority right now — this afternoon?",
    othersQ: "Anything else on deck for today?",
    contextQ: "What's shifted since this morning?",
    intentQ: "What would make the rest of today a win?",
    sayNoQ: "What boundaries do you need to protect for the rest of the day?",
  },
  evening: {
    headline: "Evening wind-down",
    priorityQ: "What's the one thing you want to make sure gets done or decided tonight?",
    othersQ: "What's carrying over to tomorrow?",
    contextQ: "How are you feeling about today overall?",
    intentQ: "What mattered most today?",
    sayNoQ: "What did you say no to today that you're proud of?",
  },
};

export default function CheckinFlow({ onComplete }: { onComplete?: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const tod = getTimeOfDay();
  const prompts = TOD_PROMPTS[tod];

  const [step, setStep] = useState<Step>("start");
  const [topPriority, setTopPriority] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedWarMapItemId, setSelectedWarMapItemId] = useState<string | null>(null);
  const [others, setOthers] = useState(["", ""]);
  const [context, setContext] = useState("");
  const [energy, setEnergy] = useState(3);
  const [dailyIntent, setDailyIntent] = useState("");
  const [sayNoTo, setSayNoTo] = useState("");
  const [saving, setSaving] = useState(false);

  // Data for pickers
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [warmapItems, setWarmapItems] = useState<(WarMapItem & { category: WarMapCategory })[]>([]);
  const [showTaskPicker, setShowTaskPicker] = useState(false);

  // North Star & Core Values for inspiration
  const [northStar, setNorthStar] = useState<NorthStar | null>(null);
  const [coreValues, setCoreValues] = useState<CoreValue[]>([]);
  const [showFullNorthStar, setShowFullNorthStar] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadData() {
    if (!user) return;
    const [tasks, wm, ns, cv] = await Promise.all([
      getTasks(user.id),
      getAllWarMapItems(user.id),
      getNorthStar(user.id),
      getCoreValues(user.id),
    ]);
    setActiveTasks(tasks.filter((t) => t.status === "active"));
    setWarmapItems(wm);
    setNorthStar(ns);
    setCoreValues(cv);
  }

  async function save() {
    if (!topPriority.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from("checkins").insert({
      user_id: user.id,
      time_of_day: tod,
      top_priority: topPriority.trim(),
      other_priorities: others.filter(Boolean),
      context: context.trim() || null,
      energy_level: energy,
      daily_intent: dailyIntent.trim() || null,
      say_no_to: sayNoTo.trim() || null,
    });

    // Link task to warmap item if both selected
    if (!error && selectedTaskId && selectedWarMapItemId) {
      await linkTaskToWarMapItem(selectedTaskId, selectedWarMapItemId);
    }

    setSaving(false);
    if (error) {
      console.error("Check-in error:", error);
      toast.error("Failed to save check-in");
      return;
    }
    toast.success("Check-in saved 🎯");
    setStep("done");
    onComplete?.();
  }

  function selectTask(task: Task) {
    setSelectedTaskId(task.id);
    setTopPriority(task.title);
    setShowTaskPicker(false);
  }

  function clearTaskSelection() {
    setSelectedTaskId(null);
    setTopPriority("");
  }

  const goToNext = () => {
    setStep("intent");
  };

  const goToAfterIntent = () => {
    if (warmapItems.length > 0) {
      setStep("warmap");
    } else {
      setStep("context");
    }
  };

  const selectedTask = activeTasks.find((t) => t.id === selectedTaskId);
  const selectedWarmapItem = warmapItems.find((i) => i.id === selectedWarMapItemId);

  function reset() {
    setStep("start");
    setTopPriority("");
    setSelectedTaskId(null);
    setSelectedWarMapItemId(null);
    setOthers(["", ""]);
    setContext("");
    setEnergy(3);
    setDailyIntent("");
    setSayNoTo("");
  }

  const totalSteps = warmapItems.length > 0 ? 5 : 4;

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {step === "start" && (
          <Slide key="start">
            <div className="text-center py-8 md:py-6">
              <div className="text-5xl mb-5 md:text-4xl md:mb-4">{tod === "morning" ? "🌅" : tod === "midday" ? "☀️" : "🌙"}</div>
              <h2 className="text-3xl md:text-2xl font-bold mb-2">{getGreeting()}.</h2>
              <p className="text-base md:text-sm text-muted-foreground mb-8 px-4">{prompts.headline} — takes 60 seconds.</p>
              <div className="flex flex-col md:flex-row gap-3 justify-center max-w-xs mx-auto md:max-w-none">
                <Button onClick={() => setStep("priority")} size="lg" className="py-6 md:py-auto touch-feedback">
                  Let&apos;s go <ArrowRight size={18} />
                </Button>
                <Button variant="outline" size="lg" onClick={() => setStep("priority")} className="py-6 md:py-auto touch-feedback">
                  <RefreshCw size={18} /> Recalibrate
                </Button>
              </div>
            </div>
          </Slide>
        )}

        {step === "priority" && (
          <Slide key="priority">
            <StepHeader num={1} total={totalSteps} label={prompts.headline} />

            {/* North Star & Core Values Inspiration */}
            {(northStar || coreValues.length > 0) && (
              <div className="mb-5 -mt-2">
                {northStar && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/20 mb-3">
                    <Compass size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs uppercase tracking-wider text-amber-600/70 mb-1">North Star</p>
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {showFullNorthStar ? northStar.content : truncateNorthStar(northStar.content, 120)}
                      </p>
                      {northStar.content.length > 120 && (
                        <button
                          onClick={() => setShowFullNorthStar(!showFullNorthStar)}
                          className="text-xs text-amber-600 hover:text-amber-500 transition-colors mt-1"
                        >
                          {showFullNorthStar ? "Show less" : "View full"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {coreValues.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Sparkles size={12} className="text-violet-500 mr-1" />
                    {coreValues.slice(0, 5).map((value) => (
                      <span
                        key={value.id}
                        className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20"
                      >
                        {value.value_text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* No North Star / Values prompt */}
            {!northStar && coreValues.length === 0 && (
              <div className="mb-5 -mt-2">
                <button
                  onClick={() => router.push("/settings")}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <Compass size={12} />
                  <span>Set your North Star & Core Values</span>
                  <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            )}

            <p className="text-lg md:text-base font-medium mb-4">{prompts.priorityQ}</p>

            {/* Selected task chip */}
            {selectedTask ? (
              <div className="flex items-center gap-2 mb-4 p-4 rounded-lg border border-primary/40 bg-primary/5">
                <CheckSquare size={18} className="text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-base md:text-sm font-medium truncate">{selectedTask.title}</p>
                  {selectedTask.project && (
                    <p className="text-sm md:text-xs text-muted-foreground truncate">{selectedTask.project.name}</p>
                  )}
                </div>
                <button onClick={clearTaskSelection} className="text-muted-foreground hover:text-foreground transition-colors p-2 -mr-2 touch-feedback rounded-lg">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <textarea
                autoFocus
                value={topPriority}
                onChange={(e) => setTopPriority(e.target.value)}
                placeholder="Be specific — what exactly will you do?"
                rows={3}
                className="w-full rounded-lg border border-border bg-secondary px-4 py-4 text-base md:text-sm outline-none focus:border-primary placeholder:text-muted-foreground resize-none mb-3"
              />
            )}

            {/* Task picker toggle */}
            {activeTasks.length > 0 && !selectedTask && (
              <div className="mb-4">
                <button
                  onClick={() => setShowTaskPicker(!showTaskPicker)}
                  className="text-sm md:text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 p-2 -ml-2 touch-feedback rounded-lg"
                >
                  <CheckSquare size={16} />
                  {showTaskPicker ? "Hide tasks" : `Pick from ${activeTasks.length} active task${activeTasks.length === 1 ? "" : "s"}`}
                </button>

                {showTaskPicker && (
                  <div className="mt-3 border border-border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    {activeTasks.map((task) => {
                      const pc = PRIORITY_CONFIG[task.priority_level as keyof typeof PRIORITY_CONFIG];
                      return (
                        <button
                          key={task.id}
                          onClick={() => selectTask(task)}
                          className="flex items-center gap-3 w-full px-4 py-4 text-left hover:bg-secondary transition-colors border-b border-border/50 last:border-0 touch-feedback"
                        >
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: pc?.color }}
                          />
                          <span className="text-base md:text-sm truncate flex-1">{task.title}</span>
                          {task.project && (
                            <span
                              className="text-xs px-2 py-1 rounded-full border flex-shrink-0"
                              style={{
                                backgroundColor: `${task.project.color}20`,
                                borderColor: task.project.color,
                                color: task.project.color,
                              }}
                            >
                              {task.project.name}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <p className="text-base md:text-sm text-muted-foreground mb-3">{prompts.othersQ}</p>
            {[0, 1].map((i) => (
              <input
                key={i}
                value={others[i]}
                onChange={(e) => { const n = [...others]; n[i] = e.target.value; setOthers(n); }}
                placeholder={`Priority ${i + 2} (optional)`}
                className="w-full rounded-lg border border-border bg-secondary px-4 py-4 md:py-2.5 text-base md:text-sm outline-none focus:border-primary placeholder:text-muted-foreground mb-3"
              />
            ))}
            <div className="flex justify-end mt-6">
              <Button onClick={goToNext} disabled={!topPriority.trim()} size="lg" className="min-w-[120px] touch-feedback">
                Next <ArrowRight size={18} />
              </Button>
            </div>
          </Slide>
        )}

        {step === "intent" && (
          <Slide key="intent">
            <StepHeader num={2} total={totalSteps} label={prompts.headline} />
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} className="text-emerald-500" />
              <p className="text-lg font-medium">Daily Intent</p>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Optional — declare your focus for today
            </p>

            {/* Daily Intent */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">{prompts.intentQ}</label>
              <textarea
                value={dailyIntent}
                onChange={(e) => setDailyIntent(e.target.value.slice(0, 200))}
                placeholder="Today I will..."
                rows={2}
                className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm outline-none focus:border-primary placeholder:text-muted-foreground resize-none"
              />
              <div className="flex justify-end text-xs text-muted-foreground mt-1">
                {dailyIntent.length}/200
              </div>
            </div>

            {/* Say No To */}
            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block">{prompts.sayNoQ}</label>
              <textarea
                value={sayNoTo}
                onChange={(e) => setSayNoTo(e.target.value.slice(0, 200))}
                placeholder="I won't..."
                rows={2}
                className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm outline-none focus:border-primary placeholder:text-muted-foreground resize-none"
              />
              <div className="flex justify-end text-xs text-muted-foreground mt-1">
                {sayNoTo.length}/200
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("priority")}>← Back</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setDailyIntent(""); setSayNoTo(""); goToAfterIntent(); }}>
                  Skip
                </Button>
                <Button onClick={goToAfterIntent}>
                  Next <ArrowRight size={15} />
                </Button>
              </div>
            </div>
          </Slide>
        )}

        {step === "warmap" && (
          <Slide key="warmap">
            <StepHeader num={3} total={totalSteps} label={prompts.headline} />
            <div className="flex items-center gap-2 mb-2">
              <Map size={16} className="text-primary" />
              <p className="text-lg font-medium">Link to your Life Lanes?</p>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Which goal does <span className="text-foreground font-medium">&ldquo;{topPriority}&rdquo;</span> serve?
            </p>

            <div className="flex flex-col gap-2 mb-6">
              {/* Group items by category */}
              {Object.entries(
                warmapItems.reduce((acc, item) => {
                  const key = item.category.id;
                  if (!acc[key]) acc[key] = { category: item.category, items: [] };
                  acc[key].items.push(item);
                  return acc;
                }, {} as Record<string, { category: WarMapCategory; items: typeof warmapItems }>)
              ).map(([, { category, items }]) => (
                <div key={category.id}>
                  <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.icon} {category.name}
                  </p>
                  <div className="flex flex-col gap-1 pl-3">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedWarMapItemId(selectedWarMapItemId === item.id ? null : item.id)}
                        className={cn(
                          "flex items-center gap-2 text-sm px-3 py-2 rounded-lg border text-left transition-colors",
                          selectedWarMapItemId === item.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-secondary"
                        )}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: category.color }}
                        />
                        {item.title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("intent")}>← Back</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setSelectedWarMapItemId(null); setStep("context"); }}>
                  Skip
                </Button>
                <Button onClick={() => setStep("context")}>
                  {selectedWarmapItem ? "Linked ✓" : "Next"} <ArrowRight size={15} />
                </Button>
              </div>
            </div>
          </Slide>
        )}

        {step === "context" && (
          <Slide key="context">
            <StepHeader num={warmapItems.length > 0 ? 4 : 3} total={totalSteps} label={prompts.headline} />
            <p className="text-lg font-medium mb-6">{prompts.contextQ}</p>
            <textarea
              autoFocus
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Optional — what's on your mind?"
              rows={3}
              className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm outline-none focus:border-primary placeholder:text-muted-foreground resize-none mb-6"
            />
            <div className="flex justify-between mt-4">
              <Button variant="ghost" onClick={() => setStep(warmapItems.length > 0 ? "warmap" : "intent")}>← Back</Button>
              <Button onClick={() => setStep("energy")}>Next <ArrowRight size={15} /></Button>
            </div>
          </Slide>
        )}

        {step === "energy" && (
          <Slide key="energy">
            <StepHeader num={totalSteps} total={totalSteps} label={prompts.headline} />
            <div className="flex items-center gap-2 mb-4">
              <Zap size={20} className="text-yellow-400" />
              <p className="text-lg md:text-base font-medium">Energy level right now?</p>
            </div>
            <div className="flex gap-4 md:gap-3 mb-8">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setEnergy(n)}
                  className={`flex-1 py-6 md:py-4 rounded-lg border text-xl md:text-lg font-bold transition-all touch-feedback ${
                    energy === n
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:border-primary/50 active:scale-[0.98]"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-sm md:text-xs text-muted-foreground text-center mb-8">1 = exhausted · 5 = fully charged</p>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("context")} size="lg" className="touch-feedback">← Back</Button>
              <Button onClick={save} disabled={saving} size="lg" className="min-w-[140px] touch-feedback">
                {saving ? "Saving..." : "Save check-in ✓"}
              </Button>
            </div>
          </Slide>
        )}

        {step === "done" && (
          <Slide key="done">
            <div className="text-center py-12 md:py-8">
              <div className="text-6xl mb-5 md:text-5xl md:mb-4">🎯</div>
              <h2 className="text-3xl md:text-2xl font-bold mb-3">Locked in.</h2>
              <p className="text-base md:text-sm text-muted-foreground mb-2">Top priority:</p>
              <p className="text-xl md:text-lg font-medium text-primary mb-4 px-4">{topPriority}</p>
              {(dailyIntent || sayNoTo) && (
                <div className="mt-4 mb-4 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-left max-w-sm mx-auto">
                  {dailyIntent && (
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Target size={14} className="text-emerald-500" />
                        <span className="text-xs uppercase tracking-wider text-emerald-600/70">Daily Intent</span>
                      </div>
                      <p className="text-base md:text-sm">{dailyIntent}</p>
                    </div>
                  )}
                  {sayNoTo && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Ban size={14} className="text-rose-500" />
                        <span className="text-xs uppercase tracking-wider text-rose-600/70">Saying No To</span>
                      </div>
                      <p className="text-base md:text-sm">{sayNoTo}</p>
                    </div>
                  )}
                </div>
              )}
              {selectedWarmapItem && (
                <p className="text-sm md:text-xs text-muted-foreground mb-6 flex items-center gap-1.5 justify-center">
                  <Map size={14} />
                  Linked to <span className="font-medium">{selectedWarmapItem.title}</span>
                </p>
              )}
              <div className="flex flex-col md:flex-row gap-3 justify-center mt-8 px-4 max-w-xs mx-auto md:max-w-none">
                <Button onClick={() => router.push("/journal/new")} variant="outline" size="lg" className="touch-feedback">
                  Write a journal entry
                </Button>
                <Button onClick={reset} size="lg" className="touch-feedback">
                  <RefreshCw size={16} /> Check in again
                </Button>
              </div>
            </div>
          </Slide>
        )}
      </AnimatePresence>
    </div>
  );
}

function Slide({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

function StepHeader({ num, total, label }: { num: number; total: number; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-1 ml-auto">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`h-1 w-8 rounded-full ${i < num ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>
    </div>
  );
}
