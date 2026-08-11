"use client";
import { useState, useEffect } from "react";
import { Calendar, X, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isGoogleConnectedAsync, initiateGoogleAuth, handleGoogleCallback, disconnectGoogleCalendar } from "@/lib/google-calendar";
import { useAuth } from "@/lib/auth-context";

export default function GoogleCalendarConnect() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check connection status on mount and handle OAuth callback
  useEffect(() => {
    async function checkConnection() {
      if (!user) return;
      
      // Handle OAuth callback if present
      await handleGoogleCallback();
      
      // Check connection status
      const status = await isGoogleConnectedAsync();
      setConnected(status.connected);
      setLoading(false);
      
      // Show banner if not connected and not dismissed this session
      const key = `google_calendar_banner_dismissed_${user.id}`;
      const dismissed = sessionStorage.getItem(key) === "true";
      setShow(!status.connected && !dismissed);
    }

    checkConnection();
  }, [user]);

  const dismiss = () => {
    if (!user) return;
    const key = `google_calendar_banner_dismissed_${user.id}`;
    sessionStorage.setItem(key, "true");
    setShow(false);
    setError(null);
  };

  const handleConnect = () => {
    setError(null);
    const errorMsg = initiateGoogleAuth();
    if (errorMsg) {
      setError(errorMsg);
    }
  };

  const handleDisconnect = async () => {
    const success = await disconnectGoogleCalendar();
    if (success) {
      setConnected(false);
      setShow(true);
    }
  };

  // Show connected status
  if (connected) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/5 px-4 py-3 mb-6">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Check size={16} className="text-green-500 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            Google Calendar connected
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs text-muted-foreground hover:text-destructive h-8"
          onClick={handleDisconnect}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  // Show connect banner
  if (!show || loading) return null;

  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3 mb-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Calendar size={16} className="text-blue-500 flex-shrink-0" />
          <p className="text-sm text-muted-foreground truncate">
            Connect Google Calendar so Plan My Day schedules around your meetings.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
            onClick={handleConnect}
          >
            Connect Calendar
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