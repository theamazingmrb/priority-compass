"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Task, TaskStatus } from "@/types";
import { updateTask, completeTask, uncompleteTask, deleteTask, PRIORITY_CONFIG } from "@/lib/tasks";
import { formatRecurrence, getNextOccurrenceText } from "@/lib/recurrence";

import AuthGuard from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import PrioritySelector from "@/components/tasks/PrioritySelector";
import WarMapSelector from "@/components/tasks/WarMapSelector";
import { ArrowLeft, Check, Trash2, Clock, Zap, Lock, Calendar, BookOpen, Pencil, Repeat } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "waiting", label: "Waiting" },
  { value: "someday", label: "Someday" },
  { value: "done", label: "Done" },
];

function formatDuration(minutes: number) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

function TaskDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editingField, setEditingField] = useState<"title" | "description" | "notes" | null>(null);

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("tasks")
      .select("*, project:projects(id, name, color)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    setTask(data ?? null);
    if (data) {
      setEditTitle(data.title);
      setEditDescription(data.description ?? "");
      setEditNotes(data.notes ?? "");
    }
    setLoading(false);
  }

  async function saveField(field: "title" | "description" | "notes") {
    if (!task) return;
    const value = field === "title" ? editTitle : field === "description" ? editDescription : editNotes;
    if (field === "title" && !value.trim()) {
      toast.error("Title can't be empty");
      setEditTitle(task.title);
      setEditingField(null);
      return;
    }
    const result = await updateTask(task.id, { [field]: value.trim() || null });
    if (result) {
      setTask({ ...task, [field]: value.trim() || null });
      toast.success("Saved");
    } else {
      toast.error("Failed to save");
    }
    setEditingField(null);
  }

  async function handleToggleComplete() {
    if (!task) return;
    const result = task.status === "done" ? await uncompleteTask(task.id) : await completeTask(task.id);
    if (result) load();
  }

  async function handleStatusChange(status: TaskStatus) {
    if (!task) return;
    const result = await updateTask(task.id, { status });
    if (result) load();
  }

  async function handlePriorityChange(level: number) {
    if (!task) return;
    await updateTask(task.id, { priority_level: level });
    load();
  }

  async function handleDelete() {
    if (!task) return;
    const success = await deleteTask(task.id);
    if (success) {
      toast.success("Task deleted");
      router.push("/tasks");
    } else {
      toast.error("Failed to delete task");
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8">Loading...</p>;
  }

  if (!task) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground mb-4">Task not found.</p>
        <Link href="/tasks"><Button variant="outline">Back to tasks</Button></Link>
      </div>
    );
  }

  const priorityConfig = PRIORITY_CONFIG[task.priority_level as keyof typeof PRIORITY_CONFIG];

  return (
    <div className="max-w-2xl">
      <Link href="/tasks">
        <Button variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground">
          <ArrowLeft size={14} /> All tasks
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <button
          onClick={handleToggleComplete}
          className={cn(
            "mt-1 w-5 h-5 rounded flex items-center justify-center border flex-shrink-0 transition-colors",
            task.status === "done"
              ? "bg-green-500 border-green-500"
              : "border-border hover:border-primary"
          )}
        >
          {task.status === "done" && <Check size={12} className="text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          {editingField === "title" ? (
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => saveField("title")}
              onKeyDown={(e) => { if (e.key === "Enter") saveField("title"); if (e.key === "Escape") { setEditTitle(task.title); setEditingField(null); } }}
              className="w-full text-2xl font-bold bg-transparent border-b border-primary outline-none pb-1 mb-1"
            />
          ) : (
            <button
              onClick={() => setEditingField("title")}
              className={cn(
                "text-2xl font-bold mb-1 text-left w-full hover:opacity-70 transition-opacity group flex items-center gap-2",
                task.status === "done" && "line-through text-muted-foreground"
              )}
            >
              {task.title}
              <Pencil size={14} className="opacity-0 group-hover:opacity-40 flex-shrink-0" />
            </button>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            {task.project && (
              <span
                className="text-xs px-2 py-0.5 rounded-full border"
                style={{ backgroundColor: `${task.project.color}20`, borderColor: task.project.color, color: task.project.color }}
              >
                {task.project.name}
              </span>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: priorityConfig?.color }} />
              {priorityConfig?.label}
            </div>
            {task.scheduling_mode === "auto" && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><Zap size={11} /> Auto</span>
            )}
            {task.locked && (
              <span className="flex items-center gap-1 text-xs text-amber-500"><Lock size={11} /> Locked</span>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <Link href={`/journal/new?task_id=${task.id}`}>
            <Button variant="outline" size="sm"><BookOpen size={13} /> Journal</Button>
          </Link>
          <Button variant="outline" size="sm" className="text-red-400 hover:text-red-500" onClick={handleDelete}>
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-xl border border-border bg-card p-5 mb-4 flex flex-col gap-5">
        {/* Status */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Status</p>
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => handleStatusChange(s.value)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border transition-colors",
                  task.status === s.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Priority</p>
          <PrioritySelector
            selectedPriority={task.priority_level}
            onPriorityChange={handlePriorityChange}
            compact
          />
        </div>

        {/* Meta row */}
        <div className="flex gap-6 flex-wrap text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Duration</p>
            <span className="flex items-center gap-1.5"><Clock size={13} /> {formatDuration(task.estimated_duration)}</span>
          </div>
          {task.due_date && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Due</p>
              <span className="flex items-center gap-1.5">
                <Calendar size={13} />
                {new Date(task.due_date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>
          )}
          {task.start_time && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Scheduled</p>
              <span className="flex items-center gap-1.5">
                <Calendar size={13} />
                {new Date(task.start_time).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
          )}
        </div>

        {/* Recurrence */}
        {task.recurrence_type && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Recurrence</p>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-sm text-purple-400">
                <Repeat size={14} />
                {formatRecurrence(task)}
              </span>
              {task.is_recurrence_template && getNextOccurrenceText(task) && (
                <span className="text-xs text-muted-foreground">
                  • Next: {getNextOccurrenceText(task)}
                </span>
              )}
              {task.recurrence_end_date && (
                <span className="text-xs text-muted-foreground">
                  • Ends: {new Date(task.recurrence_end_date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
            </div>
            {task.parent_task_id && (
              <div className="mt-2">
                <Link 
                  href={`/tasks/${task.parent_task_id}`}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View recurring task template →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Description</p>
          {editingField === "description" ? (
            <textarea
              autoFocus
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              onBlur={() => saveField("description")}
              onKeyDown={(e) => { if (e.key === "Escape") { setEditDescription(task.description ?? ""); setEditingField(null); } }}
              rows={3}
              placeholder="Add a description..."
              className="w-full text-sm bg-secondary border border-primary rounded-lg px-3 py-2 outline-none resize-none leading-relaxed"
            />
          ) : (
            <button
              onClick={() => setEditingField("description")}
              className="w-full text-left text-sm leading-relaxed hover:opacity-70 transition-opacity group flex items-start gap-2"
            >
              <span className={cn("flex-1", !task.description && "text-muted-foreground italic")}>
                {task.description || "Add a description..."}
              </span>
              <Pencil size={12} className="opacity-0 group-hover:opacity-40 flex-shrink-0 mt-1" />
            </button>
          )}
        </div>

        {/* Notes */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
          {editingField === "notes" ? (
            <textarea
              autoFocus
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              onBlur={() => saveField("notes")}
              onKeyDown={(e) => { if (e.key === "Escape") { setEditNotes(task.notes ?? ""); setEditingField(null); } }}
              rows={3}
              placeholder="Add notes..."
              className="w-full text-sm bg-secondary border border-primary rounded-lg px-3 py-2 outline-none resize-none leading-relaxed"
            />
          ) : (
            <button
              onClick={() => setEditingField("notes")}
              className="w-full text-left text-sm leading-relaxed hover:opacity-70 transition-opacity group flex items-start gap-2"
            >
              <span className={cn("flex-1", !task.notes && "text-muted-foreground italic")}>
                {task.notes || "Add notes..."}
              </span>
              <Pencil size={12} className="opacity-0 group-hover:opacity-40 flex-shrink-0 mt-1" />
            </button>
          )}
        </div>
      </div>

      {/* Life Lanes */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Life Lanes Link</p>
        <WarMapSelector taskId={task.id} />
      </div>
    </div>
  );
}

export default function TaskDetailPage() {
  return (
    <AuthGuard>
      <TaskDetailContent />
    </AuthGuard>
  );
}
