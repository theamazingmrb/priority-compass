"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { WarMapItem, WarMapCategory } from "@/types";
import { getAllWarMapItems, getWarMapItemsForTask, linkTaskToWarMapItem, unlinkTaskFromWarMapItem } from "@/lib/warmap";
import { Map, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface WarMapSelectorProps {
  taskId: string;
}

export default function WarMapSelector({ taskId }: WarMapSelectorProps) {
  const { user } = useAuth();
  const [linked, setLinked] = useState<WarMapItem[]>([]);
  const [available, setAvailable] = useState<(WarMapItem & { category: WarMapCategory })[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && taskId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, taskId]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const [linkedItems, allItems] = await Promise.all([
      getWarMapItemsForTask(taskId),
      getAllWarMapItems(user.id),
    ]);
    setLinked(linkedItems);
    setAvailable(allItems);
    setLoading(false);
  }

  async function handleLink(warmapItemId: string) {
    await linkTaskToWarMapItem(taskId, warmapItemId);
    setShowPicker(false);
    load();
  }

  async function handleUnlink(warmapItemId: string) {
    await unlinkTaskFromWarMapItem(taskId, warmapItemId);
    load();
  }

  const linkedIds = new Set(linked.map((i) => i.id));
  const unlinked = available.filter((i) => !linkedIds.has(i.id));

  if (loading) return null;

  return (
    <div>
      <p className="text-muted-foreground text-xs mb-1.5">Life Lanes</p>
      <div className="flex flex-wrap gap-1.5">
        {linked.map((item) => {
          const cat = available.find((a) => a.id === item.id);
          return (
            <span
              key={item.id}
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border"
              style={cat ? {
                backgroundColor: `${cat.category.color}20`,
                borderColor: cat.category.color,
                color: cat.category.color,
              } : undefined}
            >
              <Map size={10} />
              {item.title}
              <button
                onClick={() => handleUnlink(item.id)}
                className="ml-0.5 hover:opacity-70 transition-opacity"
              >
                <X size={10} />
              </button>
            </span>
          );
        })}

        {!showPicker && (
          <button
            onClick={() => setShowPicker(true)}
            className={cn(
              "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors",
              unlinked.length === 0 && "opacity-40 cursor-default"
            )}
            disabled={unlinked.length === 0}
            title={unlinked.length === 0 ? "No Life Lanes items available" : "Link to Life Lanes item"}
          >
            <Plus size={10} /> Link Life Lanes
          </button>
        )}
      </div>

      {showPicker && unlinked.length > 0 && (
        <div className="mt-2 border border-border rounded-lg bg-card shadow-sm overflow-hidden">
          {unlinked.map((item) => (
            <button
              key={item.id}
              onClick={() => handleLink(item.id)}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-secondary transition-colors"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.category.color }}
              />
              <span className="text-muted-foreground">{item.category.name}</span>
              <span className="text-foreground truncate">{item.title}</span>
            </button>
          ))}
          <button
            onClick={() => setShowPicker(false)}
            className="flex items-center gap-1 w-full px-3 py-2 text-xs text-muted-foreground hover:bg-secondary transition-colors border-t border-border"
          >
            <X size={10} /> Cancel
          </button>
        </div>
      )}
    </div>
  );
}
