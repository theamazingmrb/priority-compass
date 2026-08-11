"use client";
import { useState, useEffect } from "react";
import { Music, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpotify } from "@/lib/spotify-context";
import { useAuth } from "@/lib/auth-context";
import { initiateSpotifyAuth } from "@/lib/spotify";

export default function SpotifyConnectBanner() {
  const { user: spotifyUser } = useSpotify();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const key = `spotify_banner_dismissed_${user.id}_${user.last_sign_in_at ?? ""}`;
    const isDismissed = sessionStorage.getItem(key) === "true";
    setDismissed(isDismissed);
  }, [user]);

  const dismiss = () => {
    if (!user) return;
    const key = `spotify_banner_dismissed_${user.id}_${user.last_sign_in_at ?? ""}`;
    sessionStorage.setItem(key, "true");
    setDismissed(true);
    setError(null);
  };

  const handleConnect = () => {
    setError(null);
    const errorMsg = initiateSpotifyAuth();
    if (errorMsg) {
      setError(errorMsg);
    }
  };

  if (spotifyUser || dismissed) return null;

  return (
    <div className="rounded-xl border border-green-500/30 bg-green-500/5 px-4 py-3 mb-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Music size={16} className="text-green-500 flex-shrink-0" />
          <p className="text-sm text-muted-foreground truncate">
            Connect Spotify to attach music to journal entries and build your personal soundtrack.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
            onClick={handleConnect}
          >
            Connect Spotify
          </Button>
          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      {error && (
        <div className="flex items-start gap-2 mt-2 text-sm text-destructive">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
