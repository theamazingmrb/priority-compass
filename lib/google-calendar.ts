import { Task } from "@/types";
import { supabase } from "./supabase";

interface GoogleCredentials {
  accessToken: string;
  expiresAt: number; // ms timestamp
}

interface GCalEvent {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

// Memory cache for the current session (avoids repeated API calls)
let cachedConnection: { connected: boolean; email?: string } | null = null;

/**
 * Check if Google Calendar is connected for the current user
 * Uses database storage (cross-device sync)
 */
export async function isGoogleConnectedAsync(): Promise<{ connected: boolean; email?: string }> {
  if (cachedConnection) return cachedConnection;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { connected: false };
  }

  try {
    const res = await fetch("/api/google/tokens", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!res.ok) {
      return { connected: false };
    }

    const data = await res.json();
    cachedConnection = { connected: data.connected, email: data.email };
    return cachedConnection;
  } catch {
    return { connected: false };
  }
}

/**
 * Synchronous check - returns cached value or false
 * For use in components that can't be async
 */
export function isGoogleConnected(): boolean {
  return cachedConnection?.connected ?? false;
}

/**
 * Store Google tokens in the database after OAuth callback
 */
export async function saveGoogleCredentials(
  refreshToken: string,
  accessToken: string,
  expiresIn: number,
  email?: string
): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    console.error("No session for saving Google credentials");
    return false;
  }

  try {
    const res = await fetch("/api/google/tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken, email }),
    });

    if (!res.ok) {
      console.error("Failed to save Google credentials");
      return false;
    }

    // Update memory cache
    cachedConnection = { connected: true, email };
    
    // Store access token in memory for this session
    _memoryCredentials = {
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    return true;
  } catch (err) {
    console.error("Error saving Google credentials:", err);
    return false;
  }
}

/**
 * Disconnect Google Calendar
 */
export async function disconnectGoogleCalendar(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return false;

  try {
    const res = await fetch("/api/google/tokens", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!res.ok) return false;

    cachedConnection = null;
    _memoryCredentials = null;
    return true;
  } catch {
    return false;
  }
}

// In-memory token cache for the current session
let _memoryCredentials: GoogleCredentials | null = null;

/**
 * Get a valid access token (refreshing if needed)
 */
async function getValidToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  // Check if we have a valid cached token
  if (_memoryCredentials && Date.now() < _memoryCredentials.expiresAt - 60_000) {
    return _memoryCredentials.accessToken;
  }

  // Refresh the token
  try {
    const res = await fetch("/api/google/refresh", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        // Token revoked or expired - clear connection
        cachedConnection = null;
        _memoryCredentials = null;
      }
      return null;
    }

    const data = await res.json();
    
    // Cache the new token
    _memoryCredentials = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return data.access_token;
  } catch {
    return null;
  }
}

/**
 * Initiate Google OAuth flow
 * Returns an error message if OAuth isn't configured, or null if the redirect started.
 */
export function initiateGoogleAuth(): string | null {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

  if (!clientId || clientId.startsWith("your-") || clientId.length < 20) {
    return "Google Calendar isn't configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_REDIRECT_URI to your environment.";
  }
  if (!redirectUri || redirectUri.startsWith("your-") || !redirectUri.startsWith("http")) {
    return "Google Calendar isn't configured. Set NEXT_PUBLIC_GOOGLE_REDIRECT_URI to your callback URL.";
  }

  // Generate state for CSRF protection
  const state = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Store state in cookie (survives cross-site redirect on mobile)
  document.cookie = `google_oauth_state=${state}; path=/; max-age=600; SameSite=Lax`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  window.location.href = authUrl.toString();
  return null;
}

/**
 * Handle OAuth callback - process tokens from cookie and save to database
 * Call this on page load when google_connected=true is in the URL
 */
export async function handleGoogleCallback(): Promise<boolean> {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("google_connected") !== "true") return false;

  // Clean up URL early
  window.history.replaceState({}, document.title, window.location.pathname);

  // Fetch tokens from the session endpoint (reads from cookie)
  try {
    const res = await fetch("/api/google/session");
    if (!res.ok) return false;

    const data = await res.json();

    // Read state from cookie (survives mobile redirect)
    const getCookie = (name: string): string | null => {
      const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
      return match ? match[2] : null;
    };

    const expectedState = getCookie("google_oauth_state");
    document.cookie = "google_oauth_state=; path=/; max-age=0"; // Clear cookie

    if (!expectedState || data.state !== expectedState) {
      console.error("Google OAuth state mismatch — possible CSRF");
      return false;
    }

    // Save to database
    const success = await saveGoogleCredentials(
      data.refresh_token,
      data.access_token,
      data.expires_in,
      data.email
    );

    return success;
  } catch (err) {
    console.error("Error processing Google callback:", err);
    return false;
  }
}

/**
 * Get calendar events as locked "busy blocks" for scheduling
 */
export async function getCalendarBusyBlocks(date: Date): Promise<Task[]> {
  const token = await getValidToken();
  if (!token) return [];

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", startOfDay.toISOString());
  url.searchParams.set("timeMax", endOfDay.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];

    const data = await res.json();

    return ((data.items as GCalEvent[]) || [])
      .filter((e) => e.start?.dateTime && e.end?.dateTime)
      .map((e): Task => ({
        id: `gcal-${e.id}`,
        user_id: "",
        title: e.summary || "Calendar Event",
        description: null,
        status: "active",
        project_id: null,
        notes: null,
        due_date: null,
        image_url: null,
        priority_level: 2,
        scheduling_mode: "manual",
        estimated_duration: Math.round(
          (new Date(e.end.dateTime!).getTime() - new Date(e.start.dateTime!).getTime()) / 60_000
        ),
        start_time: e.start.dateTime!,
        end_time: e.end.dateTime!,
        locked: true,
        google_event_id: e.id,
        created_at: "",
        updated_at: "",
        focus_mode: null,
        recurrence_type: null,
        recurrence_interval: 1,
        recurrence_end_date: null,
        recurrence_weekdays: null,
        parent_task_id: null,
        skipped_dates: null,
        is_recurrence_template: false,
      }));
  } catch {
    return [];
  }
}

/**
 * Create or update a calendar event for a task
 */
export async function syncTaskToCalendar(task: Task): Promise<string | null> {
  if (!task.start_time || !task.end_time) return null;
  const token = await getValidToken();
  if (!token) return null;

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const body = {
    summary: task.title,
    ...(task.description ? { description: task.description } : {}),
    start: { dateTime: task.start_time, timeZone: tz },
    end: { dateTime: task.end_time, timeZone: tz },
  };

  try {
    if (task.google_event_id) {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${task.google_event_id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) return null;
      return task.google_event_id;
    } else {
      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.id as string;
    }
  } catch {
    return null;
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(googleEventId: string): Promise<void> {
  const token = await getValidToken();
  if (!token) return;
  try {
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    );
  } catch {
    // Best-effort deletion
  }
}