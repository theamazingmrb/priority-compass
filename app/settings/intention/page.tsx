"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/auth-guard";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Compass, Sparkles, Plus, X, GripVertical, Loader2, Shield, AlertTriangle, Map } from "lucide-react";
import { toast } from "sonner";
import { getNorthStar, upsertNorthStar, NORTH_STAR_PROMPTS } from "@/lib/north-star";
import { getCoreValues, addCoreValue, updateCoreValue, deleteCoreValue, CORE_VALUE_PROMPTS, MAX_VALUES } from "@/lib/core-values";
import { getBoundaries, addBoundary, updateBoundary, deleteBoundary, MAX_BOUNDARIES, BOUNDARY_PROMPTS, Boundary } from "@/lib/boundaries";
import { CoreValue } from "@/types";
import { supabase } from "@/lib/supabase";

function IntentionSettingsContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  // North Star state
  const [northStar, setNorthStar] = useState("");
  const [originalNorthStar, setOriginalNorthStar] = useState("");
  const [northStarLoading, setNorthStarLoading] = useState(true);
  const [northStarSaving, setNorthStarSaving] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  
  // Core Values state
  const [coreValues, setCoreValues] = useState<CoreValue[]>([]);
  const [newValueText, setNewValueText] = useState("");
  const [valuesLoading, setValuesLoading] = useState(true);
  const [valuesSaving, setValuesSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Boundaries state
  const [boundaries, setBoundaries] = useState<Boundary[]>([]);
  const [newBoundaryText, setNewBoundaryText] = useState("");
  const [boundariesLoading, setBoundariesLoading] = useState(true);
  const [boundariesSaving, setBoundariesSaving] = useState(false);
  const [editingBoundaryId, setEditingBoundaryId] = useState<string | null>(null);
  const [editBoundaryText, setEditBoundaryText] = useState("");

  useEffect(() => {
    if (user) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadData() {
    if (!user) return;
    
    // Load North Star
    setNorthStarLoading(true);
    const ns = await getNorthStar(user.id);
    if (ns) {
      setNorthStar(ns.content);
      setOriginalNorthStar(ns.content);
    }
    setNorthStarLoading(false);
    
    // Load Core Values
    setValuesLoading(true);
    const cv = await getCoreValues(user.id);
    setCoreValues(cv);
    setValuesLoading(false);
    
    // Load Boundaries
    setBoundariesLoading(true);
    const b = await getBoundaries(user.id);
    setBoundaries(b);
    setBoundariesLoading(false);
  }

  // North Star handlers
  async function saveNorthStar() {
    if (!user || !northStar.trim()) return;
    
    setNorthStarSaving(true);
    const result = await upsertNorthStar(user.id, northStar.trim());
    setNorthStarSaving(false);
    
    if (result.success) {
      setOriginalNorthStar(northStar.trim());
      toast.success("North Star saved");
    } else {
      toast.error(result.error || "Failed to save");
    }
  }

  function resetNorthStar() {
    setNorthStar(originalNorthStar);
  }

  // Core Values handlers
  async function handleAddValue() {
    if (!user || !newValueText.trim()) return;
    if (coreValues.length >= MAX_VALUES) {
      toast.error(`Maximum ${MAX_VALUES} values allowed`);
      return;
    }
    
    setValuesSaving(true);
    const result = await addCoreValue(user.id, newValueText.trim(), coreValues.length);
    setValuesSaving(false);
    
    if (result.success && result.data) {
      setCoreValues(result.data);
      setNewValueText("");
      toast.success("Value added");
    } else {
      toast.error(result.error || "Failed to add value");
    }
  }

  async function handleUpdateValue(id: string) {
    if (!user || !editText.trim()) return;
    
    setValuesSaving(true);
    const result = await updateCoreValue(user.id, id, editText.trim());
    setValuesSaving(false);
    
    if (result.success && result.data) {
      setCoreValues(result.data);
      setEditingId(null);
      setEditText("");
      toast.success("Value updated");
    } else {
      toast.error(result.error || "Failed to update value");
    }
  }

  async function handleDeleteValue(id: string) {
    if (!user) return;
    const result = await deleteCoreValue(user.id, id);
    
    if (result.success) {
      setCoreValues(coreValues.filter(v => v.id !== id));
      toast.success("Value removed");
    } else {
      toast.error(result.error || "Failed to remove value");
    }
  }

  // Drag and drop reordering
  function handleDragStart(id: string) {
    setDraggedId(id);
  }

  function handleDragOver(e: React.DragEvent, targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    
    const draggedIndex = coreValues.findIndex(v => v.id === draggedId);
    const targetIndex = coreValues.findIndex(v => v.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const newValues = [...coreValues];
    const [draggedValue] = newValues.splice(draggedIndex, 1);
    newValues.splice(targetIndex, 0, draggedValue);
    
    setCoreValues(newValues);
  }

  async function handleDragEnd() {
    if (!draggedId || !user) {
      setDraggedId(null);
      return;
    }
    
    // Save new order
    const orderedIds = coreValues.map(v => v.id);
    
    setValuesSaving(true);
    const res = await fetch("/api/core-values", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({ orderedIds }),
    });
    setValuesSaving(false);
    
    if (!res.ok) {
      toast.error("Failed to save order");
      loadData();
    }
    
    setDraggedId(null);
  }

  // Boundaries handlers
  async function handleAddBoundary() {
    if (!user || !newBoundaryText.trim()) return;
    if (boundaries.length >= MAX_BOUNDARIES) {
      toast.error(`Maximum ${MAX_BOUNDARIES} boundaries allowed`);
      return;
    }
    
    setBoundariesSaving(true);
    const result = await addBoundary(user.id, newBoundaryText.trim(), boundaries.length);
    setBoundariesSaving(false);
    
    if (result.success && result.data) {
      setBoundaries(result.data);
      setNewBoundaryText("");
      toast.success("Boundary added");
    } else {
      toast.error(result.error || "Failed to add boundary");
    }
  }

  async function handleUpdateBoundary(id: string) {
    if (!editBoundaryText.trim()) return;
    
    setBoundariesSaving(true);
    const result = await updateBoundary(user!.id, id, editBoundaryText.trim());
    setBoundariesSaving(false);
    
    if (result.success && result.data) {
      setBoundaries(result.data);
      setEditingBoundaryId(null);
      setEditBoundaryText("");
      toast.success("Boundary updated");
    } else {
      toast.error(result.error || "Failed to update boundary");
    }
  }

  async function handleDeleteBoundary(id: string) {
    const result = await deleteBoundary(user!.id, id);
    
    if (result.success) {
      setBoundaries(boundaries.filter(b => b.id !== id));
      toast.success("Boundary removed");
    } else {
      toast.error(result.error || "Failed to remove boundary");
    }
  }

  const northStarChanged = northStar.trim() !== originalNorthStar.trim();
  const randomPrompt = NORTH_STAR_PROMPTS[Math.floor(Math.random() * NORTH_STAR_PROMPTS.length)];

  if (authLoading || northStarLoading || valuesLoading || boundariesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Button variant="ghost" size="sm" onClick={() => router.push("/settings")} className="mb-4">
          ← Back to Settings
        </Button>
        <h1 className="text-2xl font-bold mb-1">Intention & Values</h1>
        <p className="text-muted-foreground text-sm">
          What guides your decisions? Define your North Star, Core Values, and Boundaries.
        </p>
      </div>

      {/* North Star */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-amber-500" />
            North Star
          </CardTitle>
          <CardDescription>
            Your long-term life vision. One powerful statement that anchors everything.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <textarea
              value={northStar}
              onChange={(e) => setNorthStar(e.target.value.slice(0, 500))}
              placeholder="What's your guiding vision for your life?"
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-primary resize-none"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{northStar.length}/500</span>
              {!originalNorthStar && (
                <button
                  onClick={() => setShowPrompt(!showPrompt)}
                  className="text-primary hover:underline"
                >
                  Need inspiration?
                </button>
              )}
            </div>
            {showPrompt && !originalNorthStar && (
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <p className="text-sm text-muted-foreground">{randomPrompt}</p>
              </div>
            )}
          </div>
          
          {northStarChanged && (
            <div className="flex gap-2">
              <Button onClick={saveNorthStar} disabled={northStarSaving}>
                {northStarSaving ? "Saving..." : "Save North Star"}
              </Button>
              <Button variant="outline" onClick={resetNorthStar}>
                Cancel
              </Button>
            </div>
          )}
          
          {originalNorthStar && !northStarChanged && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Compass size={12} />
              Your North Star is set. Edit anytime.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Core Values */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            Core Values
          </CardTitle>
          <CardDescription>
            3-5 values that guide your decisions. What matters most?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing values */}
          {coreValues.length > 0 && (
            <div className="space-y-2">
              {coreValues.map((value) => (
                <div
                  key={value.id}
                  draggable
                  onDragStart={() => handleDragStart(value.id)}
                  onDragOver={(e) => handleDragOver(e, value.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 p-3 rounded-lg border ${
                    editingId === value.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-secondary/50 hover:bg-secondary"
                  } ${draggedId === value.id ? "opacity-50" : ""}`}
                >
                  {editingId === value.id ? (
                    <>
                      <Input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateValue(value.id);
                          if (e.key === "Escape") {
                            setEditingId(null);
                            setEditText("");
                          }
                        }}
                      />
                      <Button size="sm" onClick={() => handleUpdateValue(value.id)} disabled={valuesSaving}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setEditText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <GripVertical size={14} className="text-muted-foreground cursor-grab flex-shrink-0" />
                      <span className="flex-1 text-sm">{value.value_text}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100"
                        onClick={() => {
                          setEditingId(value.id);
                          setEditText(value.value_text);
                        }}
                      >
                        <span className="text-xs">Edit</span>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteValue(value.id)}
                      >
                        <X size={14} />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add new value */}
          {coreValues.length < MAX_VALUES && (
            <div className="flex gap-2">
              <Input
                value={newValueText}
                onChange={(e) => setNewValueText(e.target.value.slice(0, 100))}
                placeholder={coreValues.length === 0 ? "e.g., Integrity" : "Add another value..."}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddValue();
                }}
                className="flex-1"
              />
              <Button onClick={handleAddValue} disabled={!newValueText.trim() || valuesSaving}>
                <Plus size={16} />
              </Button>
            </div>
          )}

          {coreValues.length >= MAX_VALUES && (
            <p className="text-xs text-muted-foreground text-center">
              Maximum {MAX_VALUES} values. Remove one to add another.
            </p>
          )}

          {/* Prompts */}
          {coreValues.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Some prompts to help:</p>
              <div className="flex flex-wrap gap-2">
                {CORE_VALUE_PROMPTS.slice(0, 3).map((prompt, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground"
                  >
                    {prompt}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Boundaries */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-500" />
            Boundaries
          </CardTitle>
          <CardDescription>
            Things to say no to. Protect your time and energy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing boundaries */}
          {boundaries.length > 0 && (
            <div className="space-y-2">
              {boundaries.map((boundary) => (
                <div
                  key={boundary.id}
                  className="flex items-center gap-2 p-3 rounded-lg border border-border bg-secondary/50 hover:bg-secondary group"
                >
                  {editingBoundaryId === boundary.id ? (
                    <>
                      <Input
                        value={editBoundaryText}
                        onChange={(e) => setEditBoundaryText(e.target.value)}
                        className="flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateBoundary(boundary.id);
                          if (e.key === "Escape") {
                            setEditingBoundaryId(null);
                            setEditBoundaryText("");
                          }
                        }}
                      />
                      <Button size="sm" onClick={() => handleUpdateBoundary(boundary.id)} disabled={boundariesSaving}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingBoundaryId(null);
                          setEditBoundaryText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                      <span className="flex-1 text-sm">{boundary.boundary_text}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100"
                        onClick={() => {
                          setEditingBoundaryId(boundary.id);
                          setEditBoundaryText(boundary.boundary_text);
                        }}
                      >
                        <span className="text-xs">Edit</span>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteBoundary(boundary.id)}
                      >
                        <X size={14} />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add new boundary */}
          {boundaries.length < MAX_BOUNDARIES && (
            <div className="flex gap-2">
              <Input
                value={newBoundaryText}
                onChange={(e) => setNewBoundaryText(e.target.value.slice(0, 200))}
                placeholder={boundaries.length === 0 ? "e.g., No meetings before 10am" : "Add another boundary..."}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddBoundary();
                }}
                className="flex-1"
              />
              <Button onClick={handleAddBoundary} disabled={!newBoundaryText.trim() || boundariesSaving}>
                <Plus size={16} />
              </Button>
            </div>
          )}

          {boundaries.length >= MAX_BOUNDARIES && (
            <p className="text-xs text-muted-foreground text-center">
              Maximum {MAX_BOUNDARIES} boundaries. Remove one to add another.
            </p>
          )}

          {/* Prompts */}
          {boundaries.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Ask yourself:</p>
              <div className="flex flex-wrap gap-2">
                {BOUNDARY_PROMPTS.slice(0, 3).map((prompt, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground"
                  >
                    {prompt}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Rhythm teaser */}
      <Card className="mt-6 opacity-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Weekly Rhythm
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-normal">Coming Soon</span>
          </CardTitle>
          <CardDescription>
            Map your energy patterns. Deep work in the morning, admin in the afternoon.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Life Lanes teaser */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5 text-blue-500" />
            Life Lanes
          </CardTitle>
          <CardDescription>
            Balance visualization across all areas of your life.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={() => router.push("/warmap")}>
            Open Life Lanes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function IntentionSettingsPage() {
  return (
    <AuthGuard>
      <IntentionSettingsContent />
    </AuthGuard>
  );
}