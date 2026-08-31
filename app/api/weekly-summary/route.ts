import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateWeeklySummary } from "@/lib/weekly-summary";

// GET /api/weekly-summary - Generate the user's AI weekly summary
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase env vars for service-role client");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const accessToken = authHeader.slice(7);

    // Verify the access token and get the user (service-role client can do this)
    const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Service-role client bypasses RLS for the read of this user's own data.
    // The user is already authenticated via the verified JWT above.
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const summary = await generateWeeklySummary(user.id, { client: serviceClient });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("GET /api/weekly-summary error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
