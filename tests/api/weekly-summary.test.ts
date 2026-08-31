import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/weekly-summary/route";
import { generateWeeklySummary } from "@/lib/weekly-summary";

// ── Mocks ─────────────────────────────────────────────────────────────────────
const { mockAuthGetUser, mockFrom, mockCreateClient } = vi.hoisted(() => ({
  mockAuthGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockCreateClient: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "Content-Type": "application/json" },
      }),
  },
  NextRequest: class {},
}));

// Both the auth client and the service-role client resolve to this same mock.
vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

vi.mock("@/lib/weekly-summary", () => ({
  generateWeeklySummary: vi.fn(),
}));

const mockGenerate = generateWeeklySummary as ReturnType<typeof vi.fn>;

const MOCK_USER = { id: "u1", email: "test@example.com" };
const MOCK_SUMMARY = {
  weekStart: "2026-08-10",
  weekEnd: "2026-08-16",
  headline: "Test headline",
  narrative: "Test narrative",
  insights: ["Insight one"],
  suggestions: ["Suggestion one"],
  stats: { focusMinutes: 10, focusSessions: 1, completionRate: 100, tasksCompleted: 1, checkinCount: 1, bestDay: "Monday", bestHour: 9 },
  generatedBy: "fallback",
  model: null,
};

function createRequest(headers: Record<string, string> = {}): NextRequest {
  return {
    url: "http://localhost/api/weekly-summary",
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role");
  mockCreateClient.mockReturnValue({
    auth: { getUser: mockAuthGetUser },
    from: mockFrom,
  });
  mockAuthGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
  mockFrom.mockReturnValue({ select: vi.fn() });
});

describe("GET /api/weekly-summary", () => {
  it("returns 401 without an auth header", async () => {
    const response = await GET(createRequest());
    expect(response.status).toBe(401);
  });

  it("returns 500 when supabase env vars are missing", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const response = await GET(createRequest({ authorization: "Bearer token123" }));
    expect(response.status).toBe(500);
  });

  it("returns the summary when authenticated", async () => {
    mockGenerate.mockResolvedValue(MOCK_SUMMARY);

    const response = await GET(createRequest({ authorization: "Bearer token123" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary).toEqual(MOCK_SUMMARY);
    expect(mockGenerate).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ client: expect.anything() })
    );
  });

  it("returns 401 on invalid token", async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: { message: "Invalid" } });
    const response = await GET(createRequest({ authorization: "Bearer invalid" }));
    expect(response.status).toBe(401);
  });

  it("returns 500 when generation throws", async () => {
    mockGenerate.mockRejectedValue(new Error("boom"));
    const response = await GET(createRequest({ authorization: "Bearer token123" }));
    expect(response.status).toBe(500);
  });
});
