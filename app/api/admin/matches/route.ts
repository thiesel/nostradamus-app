import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET() {
  const { data: rounds, error: roundsError } = await supabase
    .from("rounds")
    .select("id, round_number, bonus_match_id")
    .order("round_number", { ascending: false });

  if (roundsError) {
    return NextResponse.json({ error: roundsError.message }, { status: 500 });
  }

  const { data: players, error: playersError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .order("display_name", { ascending: true });

  if (playersError) {
    return NextResponse.json({ error: playersError.message }, { status: 500 });
  }

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select(`
      id,
      round_id,
      home_team,
      away_team,
      home_score,
      away_score,
      match_date
    `)
    .order("match_date", { ascending: true });

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 });
  }

  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select(`
      user_id,
      match_id,
      predicted_home_score,
      predicted_away_score,
      points
    `);

  if (predictionsError) {
    return NextResponse.json(
      { error: predictionsError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    rounds: rounds || [],
    players: players || [],
    matches: matches || [],
    predictions: predictions || [],
  });
}