import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getActiveRound } from "@/lib/getActiveRound";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET() {
  const activeRound = await getActiveRound();

  if (!activeRound) {
    return NextResponse.json(
      { error: "Geen actieve ronde gevonden" },
      { status: 404 }
    );
  }

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id, home_team, away_team, match_date")
    .eq("round_id", activeRound.id)
    .order("match_date", { ascending: true });

  if (matchesError) {
    return NextResponse.json(
      { error: matchesError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    activeRound,
    matches: matches || [],
  });
}