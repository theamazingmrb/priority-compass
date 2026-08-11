"use client";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useSpotify } from "@/lib/spotify-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Task, FocusSession, FocusTimerPreset, SpotifyTrack, FocusMode, FOCUS_MODE_CONFIG } from "@/types";
import { todayISO, formatTime } from "@/lib/utils";
import { toast } from "sonner";
import { getRecurringTaskTemplates } from "@/lib/tasks";

import {
  Play,
  Pause,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  Music,
  Target,
  X,
  Repeat,
} from "lucide-react";
import AuthGuard from "@/components/auth-guard";
import Image from "next/image";

const PRESETS: FocusTimerPreset[] = [
  { label: "Quick", minutes: 15, description: "Short burst" },
  { label: "Focus", minutes: 25, description: "Classic Pomodoro" },
  { label: "Deep Work", minutes: 45, description: "Deep concentration" },
  { label: "Extended", minutes: 60, description: "Long session" },
];

const FOCUS_PLAYLIST_SUGGESTIONS = [
  { name: "Lo-Fi Beats", description: "Chill beats to focus to" },
  { name: "Deep Focus", description: "Ambient & instrumental" },
  { name: "Peaceful Piano", description: "Calm piano pieces" },
  { name: "Focus Flow", description: "Rhythmic concentration" },
];

export default function FocusTimerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <FocusTimerPageInner />
    </Suspense>
  );
}

function FocusTimerPageInner() {
  const { user } = useAuth();
  const { user: spotifyUser, isPlaying, playerReady, playTrack, pause } = useSpotify();
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskFromUrl = searchParams.get("taskId");

  // Timer state
  const [selectedPreset, setSelectedPreset] = useState<FocusTimerPreset>(PRESETS[1]);
  const [customMinutes, setCustomMinutes] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(selectedPreset.minutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null);

  // Task selection
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recurringTasks, setRecurringTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [showRecurringTasks, setShowRecurringTasks] = useState(false);

  // Spotify
  const [showSpotifyPicker, setShowSpotifyPicker] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);

  // Completion
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Recent sessions
  const [recentSessions, setRecentSessions] = useState<FocusSession[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Load tasks on mount
  useEffect(() => {
    if (user) {
      loadTasks();
      loadRecentSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, taskFromUrl]);

  // Timer countdown
  useEffect(() => {
    if (isRunning && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, isPaused]);

  async function loadTasks() {
    const { data } = await supabase
      .from("tasks")
      .select("*, projects(id, name, color)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(20);
    const tasksData = data || [];
    setTasks(tasksData);

    // Pre-select task passed via ?taskId= (e.g. from onboarding's "Start a session")
    if (taskFromUrl && tasksData.some((t: Task) => t.id === taskFromUrl)) {
      setSelectedTaskId(taskFromUrl);
      setShowTaskSelector(true);
    }
    
    // Load recurring task templates
    if (user) {
      const recurring = await getRecurringTaskTemplates(user.id);
      setRecurringTasks(recurring);
    }
  }

  async function loadRecentSessions() {
    if (!user) return;
    setLoadingRecent(true);

    const today = todayISO();
    const { data } = await supabase
      .from("focus_sessions")
      .select("*, tasks(id, title, project_id)")
      .eq("user_id", user.id)
      .gte("started_at", `${today}T00:00:00`)
      .order("started_at", { ascending: false })
      .limit(5);

    setRecentSessions(data || []);
    setLoadingRecent(false);
  }

  const duration = customMinutes || selectedPreset.minutes;

  const handleStart = async () => {
    if (!user) return;

    const startTime = new Date();
    startTimeRef.current = startTime;
    setIsRunning(true);
    setIsPaused(false);

    // Create session record
    const { data, error } = await supabase
      .from("focus_sessions")
      .insert({
        user_id: user.id,
        task_id: selectedTaskId,
        duration: duration,
        started_at: startTime.toISOString(),
        status: "active",
        spotify_track_id: selectedTrack?.id || null,
        spotify_track_name: selectedTrack?.name || null,
        spotify_artist: selectedTrack?.artist || null,
      })
      .select()
      .single();

    if (data && !error) {
      setCurrentSession(data);
    }

    // Play Spotify if selected
    if (selectedTrack && spotifyUser && playerReady) {
      await playTrack(selectedTrack);
    }
  };

  const handlePause = async () => {
    setIsPaused(true);

    // Update session status
    if (currentSession) {
      await supabase
        .from("focus_sessions")
        .update({ status: "paused" })
        .eq("id", currentSession.id);
    }

    // Pause Spotify
    if (isPlaying && spotifyUser) {
      await pause();
    }
  };

  const handleResume = () => {
    setIsPaused(false);

    // Update session status
    if (currentSession) {
      supabase
        .from("focus_sessions")
        .update({ status: "active" })
        .eq("id", currentSession.id);
    }

    // Resume Spotify
    if (selectedTrack && spotifyUser && playerReady) {
      playTrack(selectedTrack);
    }
  };

  const handleReset = async () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeRemaining(duration * 60);
    startTimeRef.current = null;

    // Abandon current session if exists
    if (currentSession) {
      await supabase
        .from("focus_sessions")
        .update({ status: "abandoned", completed_at: new Date().toISOString() })
        .eq("id", currentSession.id);
    }

    setCurrentSession(null);

    // Stop Spotify
    if (isPlaying && spotifyUser) {
      await pause();
    }
  };

  const handleSessionComplete = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setIsRunning(false);
    setIsPaused(false);

    // Stop Spotify
    if (isPlaying && spotifyUser) {
      pause();
    }

    setShowCompletionModal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, spotifyUser]);

  const handleSaveCompletion = async () => {
    if (!user || !currentSession) {
      // If no session was started (edge case), just close modal
      setShowCompletionModal(false);
      return;
    }

    setSaving(true);

    // Update session as completed
    await supabase
      .from("focus_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        notes: sessionNotes || null,
      })
      .eq("id", currentSession.id);

    // Create journal entry
    const task = tasks.find((t) => t.id === selectedTaskId);
    const journalContent = sessionNotes
      ? `Focus session completed: ${duration} minutes${task ? ` on "${task.title}"` : ""}.\n\n${sessionNotes}`
      : `Focus session completed: ${duration} minutes${task ? ` on "${task.title}"` : ""}.`;

    await supabase.from("journals").insert({
      user_id: user.id,
      date: todayISO(),
      session_label: getSessionLabelFromTime(new Date()),
      title: `Focus: ${duration} min${task ? ` — ${task.title}` : ""}`,
      content: journalContent,
      spotify_track_id: selectedTrack?.id || null,
      spotify_track_name: selectedTrack?.name || null,
      spotify_artist: selectedTrack?.artist || null,
      spotify_album_art: selectedTrack?.album_art || null,
      spotify_preview_url: selectedTrack?.preview_url || null,
      spotify_url: selectedTrack?.spotify_url || null,
    });

    toast.success("Session completed! Great focus! 🎯");
    setSaving(false);
    setShowCompletionModal(false);
    router.push("/journal");
  };

  async function searchSpotify(query: string) {
    if (!query.trim() || !spotifyUser) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${spotifyUser.accessToken}`,
        },
      });
      const data = await res.json();
      setSearchResults(data.tracks || []);
    } catch (err) {
      console.error("Spotify search error:", err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  const formatTimeDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? ((duration * 60 - timeRemaining) / (duration * 60)) * 100 : 0;

  // Circle dimensions for progress ring
  const circleRadius = 120;
  const strokeDasharray = 2 * Math.PI * circleRadius;
  const strokeDashoffset = strokeDasharray - (progress / 100) * strokeDasharray;

  const totalFocusMinutesToday = recentSessions
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + s.duration, 0);

  return (
    <AuthGuard>
      <div className="max-w-2xl mx-auto">
        {!isRunning ? (
          <>
            {/* Setup Screen */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-1">Focus Timer</h1>
              <p className="text-muted-foreground text-sm">
                Set your intention. Clear your mind. Get stuff done.
              </p>
            </div>

            {/* Duration Presets */}
            <div className="mb-6">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                Duration
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.minutes}
                    onClick={() => {
                      setSelectedPreset(preset);
                      setCustomMinutes(null);
                      setTimeRemaining(preset.minutes * 60);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all min-w-0 ${
                      selectedPreset.minutes === preset.minutes && !customMinutes
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    <span className="text-lg font-semibold">{preset.minutes}</span>
                    <span className="text-xs text-muted-foreground">{preset.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={customMinutes || ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val >= 1 && val <= 180) {
                        setCustomMinutes(val);
                        setTimeRemaining(val * 60);
                      }
                    }}
                    placeholder="Custom (min)"
                    className="w-28 rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  {customMinutes && (
                    <span className="text-sm text-muted-foreground">
                      {customMinutes} minute session
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Task Selection */}
            <div className="mb-6">
              <button
                onClick={() => setShowTaskSelector(!showTaskSelector)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showTaskSelector ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                <Target size={15} />
                Link to a task
              </button>
              {showTaskSelector && (
                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto overflow-x-hidden">
                  <button
                    onClick={() => setSelectedTaskId(null)}
                    className={`w-full text-left p-2 rounded-lg text-sm transition-colors min-w-0 ${
                      !selectedTaskId
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-secondary border border-transparent"
                    }`}
                  >
                    No task (general focus)
                  </button>
                  
                  {/* Recurring tasks section */}
                  {recurringTasks.length > 0 && (
                    <>
                      <button
                        onClick={() => setShowRecurringTasks(!showRecurringTasks)}
                        className="w-full flex items-center gap-2 p-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        <Repeat size={12} />
                        {showRecurringTasks ? "Hide" : "Show"} recurring tasks ({recurringTasks.length})
                        {showRecurringTasks ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      
                      {showRecurringTasks && recurringTasks.map((task) => {
                        const taskFocusMode = task.focus_mode as FocusMode | null;
                        return (
                          <button
                            key={task.id}
                            onClick={() => setSelectedTaskId(task.id)}
                            className={`w-full text-left p-2 rounded-lg text-sm transition-colors min-w-0 ${
                              selectedTaskId === task.id
                                ? "bg-purple-500/10 border border-purple-500/30"
                                : "hover:bg-secondary border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Repeat size={10} className="text-purple-400 flex-shrink-0" />
                              <span className="font-medium truncate flex-1">{task.title}</span>
                              {taskFocusMode && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded-full border flex-shrink-0"
                                  style={{
                                    backgroundColor: `${FOCUS_MODE_CONFIG[taskFocusMode]?.color}15`,
                                    borderColor: FOCUS_MODE_CONFIG[taskFocusMode]?.color,
                                    color: FOCUS_MODE_CONFIG[taskFocusMode]?.color,
                                  }}
                                >
                                  {FOCUS_MODE_CONFIG[taskFocusMode]?.label}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {task.recurrence_type === 'daily' && task.recurrence_interval === 1 && 'Daily'}
                              {task.recurrence_type === 'daily' && task.recurrence_interval > 1 && `Every ${task.recurrence_interval} days`}
                              {task.recurrence_type === 'weekly' && task.recurrence_interval === 1 && 'Weekly'}
                              {task.recurrence_type === 'weekly' && task.recurrence_interval > 1 && `Every ${task.recurrence_interval} weeks`}
                              {task.recurrence_type === 'monthly' && 'Monthly'}
                              {task.recurrence_type === 'yearly' && 'Yearly'}
                              {task.recurrence_type === 'custom' && 'Custom schedule'}
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}
                  
                  {/* Regular tasks */}
                  {tasks.filter(t => !t.is_recurrence_template).map((task) => {
                    const taskFocusMode = task.focus_mode as FocusMode | null;
                    return (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`w-full text-left p-2 rounded-lg text-sm transition-colors min-w-0 ${
                          selectedTaskId === task.id
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-secondary border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="font-medium truncate flex-1">{task.title}</div>
                          {taskFocusMode && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full border flex-shrink-0"
                              style={{
                                backgroundColor: `${FOCUS_MODE_CONFIG[taskFocusMode]?.color}15`,
                                borderColor: FOCUS_MODE_CONFIG[taskFocusMode]?.color,
                                color: FOCUS_MODE_CONFIG[taskFocusMode]?.color,
                              }}
                            >
                              {FOCUS_MODE_CONFIG[taskFocusMode]?.label}
                            </span>
                          )}
                        </div>
                        {task.project_id && task.project && (
                          <div className="text-xs text-muted-foreground truncate mt-0.5">
                            {task.project.name}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Spotify Integration */}
            {spotifyUser && (
              <div className="mb-6">
                <button
                  onClick={() => setShowSpotifyPicker(!showSpotifyPicker)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showSpotifyPicker ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  <Music size={15} />
                  Add focus music
                </button>
                {showSpotifyPicker && (
                  <div className="mt-3">
                    {/* Current selection */}
                    {selectedTrack && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary mb-3">
                        {selectedTrack.album_art && (
                          <Image
                            src={selectedTrack.album_art}
                            alt={selectedTrack.name}
                            width={48}
                            height={48}
                            className="rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{selectedTrack.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {selectedTrack.artist}
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedTrack(null)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}

                    {/* Search */}
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          searchSpotify(e.target.value);
                        }}
                        placeholder="Search for a focus track..."
                        className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm outline-none focus:border-primary placeholder:text-muted-foreground"
                      />
                      {searching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                        </div>
                      )}
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <div className="mt-3 space-y-2 max-h-48 overflow-y-auto overflow-x-hidden">
                        {searchResults.slice(0, 6).map((track) => (
                          <button
                            key={track.id}
                            onClick={() => {
                              setSelectedTrack(track);
                              setSearchQuery("");
                              setSearchResults([]);
                            }}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors min-w-0"
                          >
                            {track.album_art && (
                              <Image
                                src={track.album_art}
                                alt={track.name}
                                width={40}
                                height={40}
                                className="rounded flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0 text-left">
                              <div className="text-sm font-medium truncate">
                                {track.name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {track.artist}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Playlist suggestions */}
                    {!searchQuery && (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-2">
                          Popular focus playlists:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {FOCUS_PLAYLIST_SUGGESTIONS.map((pl) => (
                            <span
                              key={pl.name}
                              className="text-xs border border-border rounded-full px-3 py-1 text-muted-foreground"
                            >
                              {pl.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Start Button */}
            <Button
              onClick={handleStart}
              size="lg"
              className="w-full py-6 text-lg font-medium gap-2"
            >
              <Play size={20} fill="currentColor" />
              Start {duration} min session
            </Button>

            {/* Recent Sessions */}
            {!loadingRecent && recentSessions.length > 0 && (
              <div className="mt-8">
                <h2 className="font-semibold mb-3">Today&apos;s Sessions</h2>
                <div className="space-y-2">
                  {recentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            session.status === "completed"
                              ? "bg-green-500"
                              : session.status === "abandoned"
                              ? "bg-red-500"
                              : "bg-yellow-500"
                          }`}
                        />
                        <div>
                          <div className="text-sm font-medium">
                            {session.duration} min
                            {session.task?.title && ` — ${session.task.title}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatTime(session.started_at)}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {session.status}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                  Total focus today: <span className="font-medium">{totalFocusMinutesToday}</span> min
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Timer Screen */}
            <div className="flex flex-col items-center justify-center min-h-[70vh]">
              {/* Circular Progress */}
              <div className="relative mb-8">
                <svg
                  width="280"
                  height="280"
                  className="transform -rotate-90"
                >
                  {/* Background circle */}
                  <circle
                    cx="140"
                    cy="140"
                    r={circleRadius}
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-secondary"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="140"
                    cy="140"
                    r={circleRadius}
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    className="text-primary transition-all duration-1000"
                    style={{
                      strokeDasharray,
                      strokeDashoffset,
                    }}
                  />
                </svg>
                {/* Time display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold tabular-nums">
                    {formatTimeDisplay(timeRemaining)}
                  </span>
                  {selectedTaskId && (
                    <span className="text-sm text-muted-foreground mt-2 max-w-[200px] truncate">
                      {tasks.find((t) => t.id === selectedTaskId)?.title}
                    </span>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                {!isPaused ? (
                  <Button
                    onClick={handlePause}
                    size="lg"
                    variant="outline"
                    className="w-16 h-16 rounded-full"
                  >
                    <Pause size={24} />
                  </Button>
                ) : (
                  <Button
                    onClick={handleResume}
                    size="lg"
                    className="w-16 h-16 rounded-full"
                  >
                    <Play size={24} fill="currentColor" />
                  </Button>
                )}
                <Button
                  onClick={handleReset}
                  size="lg"
                  variant="ghost"
                  className="w-12 h-12 rounded-full"
                >
                  <RotateCcw size={20} />
                </Button>
                <Button
                  onClick={handleSessionComplete}
                  size="lg"
                  variant="outline"
                  className="w-16 h-16 rounded-full bg-green-500/10 border-green-500/30 hover:bg-green-500/20 text-green-500"
                >
                  <Check size={24} />
                </Button>
              </div>

              {/* Music indicator */}
              {selectedTrack && (
                <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
                  <Music size={14} className={isPaused ? "" : "animate-pulse"} />
                  <span className="truncate max-w-[200px]">{selectedTrack.name}</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Completion Modal */}
        {showCompletionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Check size={24} className="text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Session Complete!</h2>
                    <p className="text-sm text-muted-foreground">
                      Great focus! You did {duration} minutes.
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Notes (optional)
                  </label>
                  <textarea
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    placeholder="What did you accomplish? Any reflections?"
                    rows={3}
                    className="w-full mt-2 rounded-lg border border-border bg-secondary px-4 py-3 text-sm outline-none focus:border-primary placeholder:text-muted-foreground resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSaveCompletion}
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? "Saving..." : "Save & Log to Journal"}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowCompletionModal(false);
                      handleReset();
                    }}
                    variant="outline"
                  >
                    Skip
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

function getSessionLabelFromTime(date: Date): "morning" | "afternoon" | "evening" | "general" {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}