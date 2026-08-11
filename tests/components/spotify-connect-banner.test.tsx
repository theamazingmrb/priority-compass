import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SpotifyConnectBanner from "@/components/spotify-connect-banner";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockLogin = vi.fn();
let mockSpotifyUser: unknown = null;

vi.mock("@/lib/spotify-context", () => ({
  useSpotify: () => ({ user: mockSpotifyUser, login: mockLogin }),
}));

const mockInitiateSpotifyAuth = vi.fn();

vi.mock("@/lib/spotify", () => ({
  initiateSpotifyAuth: (...args: unknown[]) => mockInitiateSpotifyAuth(...args),
}));

let mockAuthUser: { id: string; last_sign_in_at?: string } | null = {
  id: "u1",
  last_sign_in_at: "2026-03-14T00:00:00Z",
};

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: mockAuthUser }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mockSpotifyUser = null;
  mockAuthUser = { id: "u1", last_sign_in_at: "2026-03-14T00:00:00Z" };
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SpotifyConnectBanner", () => {
  it("renders nothing when spotify is already connected", async () => {
    mockSpotifyUser = { id: "sp1", name: "Test User" };

    const { container } = render(<SpotifyConnectBanner />);

    // Wait for useEffect to run
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("renders nothing when user is not logged in", async () => {
    mockAuthUser = null;

    const { container } = render(<SpotifyConnectBanner />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("shows banner when spotify not connected and not dismissed", async () => {
    render(<SpotifyConnectBanner />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Connect Spotify/i })).toBeInTheDocument();
    });
  });

  it("shows 'Connect Spotify' button", async () => {
    render(<SpotifyConnectBanner />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Connect Spotify/i })).toBeInTheDocument();
    });
  });

  it("calls initiateSpotifyAuth when 'Connect Spotify' button clicked", async () => {
    const user = userEvent.setup();
    mockInitiateSpotifyAuth.mockReturnValue(null);

    render(<SpotifyConnectBanner />);

    await waitFor(() => screen.getByRole("button", { name: /Connect Spotify/i }));
    await user.click(screen.getByRole("button", { name: /Connect Spotify/i }));

    expect(mockInitiateSpotifyAuth).toHaveBeenCalledOnce();
  });

  it("shows an error message when Spotify isn't configured", async () => {
    const user = userEvent.setup();
    mockInitiateSpotifyAuth.mockReturnValue("Spotify isn't configured. Add NEXT_PUBLIC_SPOTIFY_CLIENT_ID to your environment.");

    render(<SpotifyConnectBanner />);

    await waitFor(() => screen.getByRole("button", { name: /Connect Spotify/i }));
    await user.click(screen.getByRole("button", { name: /Connect Spotify/i }));

    expect(screen.getByText(/Spotify isn't configured/i)).toBeInTheDocument();
  });

  it("dismisses banner when X button clicked", async () => {
    const user = userEvent.setup();

    render(<SpotifyConnectBanner />);

    await waitFor(() => screen.getByTitle(/Dismiss/i));
    await user.click(screen.getByTitle(/Dismiss/i));

    expect(screen.queryByText(/Connect Spotify to attach music/)).not.toBeInTheDocument();
  });

  it("stores dismissal key in sessionStorage on dismiss", async () => {
    const user = userEvent.setup();

    render(<SpotifyConnectBanner />);

    await waitFor(() => screen.getByTitle(/Dismiss/i));
    await user.click(screen.getByTitle(/Dismiss/i));

    const key = `spotify_banner_dismissed_u1_2026-03-14T00:00:00Z`;
    expect(sessionStorage.getItem(key)).toBe("true");
  });

  it("does not show when already dismissed in this session", async () => {
    const key = `spotify_banner_dismissed_u1_2026-03-14T00:00:00Z`;
    sessionStorage.setItem(key, "true");

    const { container } = render(<SpotifyConnectBanner />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("uses empty string for last_sign_in_at when not present", async () => {
    mockAuthUser = { id: "u1" }; // no last_sign_in_at

    render(<SpotifyConnectBanner />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Connect Spotify/i })).toBeInTheDocument();
    });

    // Dismiss and check key uses empty string
    const user = userEvent.setup();
    await user.click(screen.getByTitle(/Dismiss/i));

    const key = `spotify_banner_dismissed_u1_`;
    expect(sessionStorage.getItem(key)).toBe("true");
  });
});
