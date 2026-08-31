"use client";
import { useState, useEffect } from "react";
import AuthGuard from "@/components/auth-guard";
import { useAuth } from "@/lib/auth-context";
import { WarMapCategory, WarMapItem } from "@/types";
import {
  getWarMapCategories,
  createWarMapCategory,
  updateWarMapCategory,
  deleteWarMapCategory,
  createWarMapItem,
  updateWarMapItem,
  deleteWarMapItem,
} from "@/lib/warmap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  Target,
  Pencil,
  X,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORY_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#06b6d4",
];

const CATEGORY_ICONS = ["🎯", "💪", "💼", "📚", "❤️", "🌱", "💰", "🏃", "🧠", "✨"];

function CategoryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<WarMapCategory>;
  onSave: (data: { name: string; description: string; color: string; icon: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [color, setColor] = useState(initial?.color ?? CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState(initial?.icon ?? CATEGORY_ICONS[0]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative">
          <select
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="appearance-none w-12 h-10 text-lg text-center bg-secondary border border-border rounded-lg cursor-pointer"
          >
            {CATEGORY_ICONS.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
        <Input
          autoFocus
          placeholder="Life Lane name (e.g. Health, Business, Growth)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
        />
      </div>
      <Textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
      />
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Color:</span>
        {CATEGORY_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={cn(
              "w-5 h-5 rounded-full border-2 transition-transform",
              color === c ? "border-foreground scale-110" : "border-transparent"
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => name.trim() && onSave({ name: name.trim(), description, color, icon })} disabled={!name.trim()}>
          Save
        </Button>
      </div>
    </div>
  );
}

function ItemForm({
  onSave,
  onCancel,
  initial,
}: {
  onSave: (data: { title: string; description: string; target_date: string }) => void;
  onCancel: () => void;
  initial?: Partial<WarMapItem>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [targetDate, setTargetDate] = useState(initial?.target_date ?? "");

  return (
    <div className="flex flex-col gap-2 mt-2">
      <Input
        autoFocus
        placeholder="Goal or objective..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && title.trim() && onSave({ title: title.trim(), description, target_date: targetDate })}
      />
      <Input
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <Calendar size={14} className="text-muted-foreground" />
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="text-sm bg-transparent border border-border rounded px-2 py-1 text-foreground"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}><X size={14} /></Button>
        <Button size="sm" onClick={() => title.trim() && onSave({ title: title.trim(), description, target_date: targetDate })} disabled={!title.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}

export default function WarMapPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<WarMapCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<WarMapCategory | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<WarMapItem | null>(null);

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const data = await getWarMapCategories(user.id);
    setCategories(data);
    // Auto-expand all on first load
    setExpandedCategories(new Set(data.map((c) => c.id)));
    setLoading(false);
  }

  async function handleCreateCategory(data: { name: string; description: string; color: string; icon: string }) {
    if (!user) return;
    const result = await createWarMapCategory(user.id, data);
    if (result) {
      toast.success("Life Lane created");
      setShowCategoryForm(false);
      load();
    } else {
      toast.error("Failed to create life lane");
    }
  }

  async function handleUpdateCategory(id: string, data: { name: string; description: string; color: string; icon: string }) {
    const result = await updateWarMapCategory(id, data);
    if (result) {
      toast.success("Life Lane updated");
      setEditingCategory(null);
      load();
    } else {
      toast.error("Failed to update life lane");
    }
  }

  async function handleDeleteCategory(id: string) {
    const ok = await deleteWarMapCategory(id);
    if (ok) {
      toast.success("Life Lane deleted");
      load();
    } else {
      toast.error("Failed to delete life lane");
    }
  }

  async function handleCreateItem(categoryId: string, data: { title: string; description: string; target_date: string }) {
    if (!user) return;
    const result = await createWarMapItem(user.id, categoryId, {
      title: data.title,
      description: data.description || undefined,
      target_date: data.target_date || undefined,
    });
    if (result) {
      setAddingItemTo(null);
      load();
    } else {
      toast.error("Failed to add item");
    }
  }

  async function handleUpdateItem(id: string, data: { title: string; description: string; target_date: string }) {
    const result = await updateWarMapItem(id, {
      title: data.title,
      description: data.description || undefined,
      target_date: data.target_date || undefined,
    });
    if (result) {
      setEditingItem(null);
      load();
    } else {
      toast.error("Failed to update item");
    }
  }

  async function handleToggleItemStatus(item: WarMapItem) {
    const newStatus = item.status === "completed" ? "active" : "completed";
    const result = await updateWarMapItem(item.id, { status: newStatus });
    if (result) load();
  }

  async function handleDeleteItem(id: string) {
    const ok = await deleteWarMapItem(id);
    if (ok) load();
    else toast.error("Failed to delete item");
  }

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const year = new Date().getFullYear();

  return (
    <AuthGuard>
      <div>
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">Life Lanes {year}</h1>
              <p className="text-muted-foreground text-sm">
                Your year at a glance. What fronts are you fighting on, and what does winning look like?
              </p>
            </div>
            <Button onClick={() => { setShowCategoryForm(true); setEditingCategory(null); }}>
              <Plus size={14} /> Add Life Lane
            </Button>
          </div>
        </div>

        {/* New category form */}
        {showCategoryForm && (
          <div className="rounded-xl border border-border bg-card p-4 mb-6">
            <h3 className="font-semibold mb-3">New Life Lane</h3>
            <CategoryForm
              onSave={handleCreateCategory}
              onCancel={() => setShowCategoryForm(false)}
            />
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-12">Loading...</p>
        ) : categories.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <Target size={40} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No life lanes yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
              Create life lanes for the areas of your life you want to win in this year — Health, Business, Relationships, etc.
            </p>
            <Button onClick={() => setShowCategoryForm(true)}>
              <Plus size={14} /> Add your first life lane
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {categories.map((cat) => {
              const isExpanded = expandedCategories.has(cat.id);
              const items = cat.items ?? [];
              const activeCount = items.filter((i) => i.status === "active").length;
              const completedCount = items.filter((i) => i.status === "completed").length;

              return (
                <div key={cat.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  {/* Category header */}
                  {editingCategory?.id === cat.id ? (
                    <div className="p-4">
                      <CategoryForm
                        initial={cat}
                        onSave={(data) => handleUpdateCategory(cat.id, data)}
                        onCancel={() => setEditingCategory(null)}
                      />
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-3 px-4 py-4 cursor-pointer group"
                      onClick={() => toggleCategory(cat.id)}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <div
                        className="w-1 h-8 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{cat.name}</h3>
                        {cat.description && (
                          <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {completedCount > 0 && (
                          <span className="text-green-500">{completedCount} done</span>
                        )}
                        <span>{activeCount} active</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setEditingCategory(cat)}
                            className="p-1.5 rounded hover:bg-secondary transition-colors"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </div>
                  )}

                  {/* Items */}
                  {isExpanded && (
                    <div className="border-t border-border/50">
                      {items.length > 0 && (
                        <div className="flex flex-col divide-y divide-border/50">
                          {items.map((item) => (
                            <div key={item.id} className="group flex items-start gap-3 px-4 py-3">
                              {/* Completion toggle */}
                              <button
                                onClick={() => handleToggleItemStatus(item)}
                                className={cn(
                                  "mt-0.5 w-5 h-5 rounded flex items-center justify-center border flex-shrink-0 transition-colors",
                                  item.status === "completed"
                                    ? "bg-green-500 border-green-500"
                                    : "border-border hover:border-primary"
                                )}
                                style={item.status !== "completed" ? { borderColor: cat.color + "80" } : undefined}
                              >
                                {item.status === "completed" && <Check size={12} className="text-white" />}
                              </button>

                              {/* Content */}
                              {editingItem?.id === item.id ? (
                                <div className="flex-1">
                                  <ItemForm
                                    initial={item}
                                    onSave={(data) => handleUpdateItem(item.id, data)}
                                    onCancel={() => setEditingItem(null)}
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className="flex-1 min-w-0">
                                    <p className={cn(
                                      "text-sm",
                                      item.status === "completed" && "line-through text-muted-foreground"
                                    )}>
                                      {item.title}
                                    </p>
                                    {item.description && (
                                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                                    )}
                                    {item.target_date && (
                                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                        <Calendar size={10} />
                                        {new Date(item.target_date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => setEditingItem(item)}
                                      className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-red-400"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add item */}
                      <div className="px-4 py-3">
                        {addingItemTo === cat.id ? (
                          <ItemForm
                            onSave={(data) => handleCreateItem(cat.id, data)}
                            onCancel={() => setAddingItemTo(null)}
                          />
                        ) : (
                          <button
                            onClick={() => setAddingItemTo(cat.id)}
                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Plus size={13} /> Add goal
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
