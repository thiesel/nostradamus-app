import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPreviousRound } from "@/lib/getActiveRound";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET() {
  const previousRound = await getPreviousRound();

  if (!previousRound) {
    return NextResponse.json({
      round: null,
      bonusMatchId: null,
      players: [],
      matches: [],
      totals: {},
    });
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
    .select("id, home_team, away_team, home_score, away_score")
    .eq("round_id", previousRound.id)
    .order("match_date", { ascending: true });

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 });
  }

  const matchIds = (matches || []).map((match) => match.id);

  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select(
      "user_id, match_id, predicted_home_score, predicted_away_score, points"
    )
    .in("match_id", matchIds);

  if (predictionsError) {
    return NextResponse.json(
      { error: predictionsError.message },
      { status: 500 }
    );
  }

  const totals: Record<string, number> = {};

  for (const player of players || []) {
    totals[player.id] = 0;
  }

  const tableMatches = (matches || []).map((match) => {
    const playerScores: Record<
      string,
      {
        prediction: string;
        points: number;
      }
    > = {};

    for (const player of players || []) {
      const prediction = (predictions || []).find(
        (p) => p.user_id === player.id && p.match_id === match.id
      );

      if (prediction) {
        const points = prediction.points || 0;

        playerScores[player.id] = {
          prediction: `${prediction.predicted_home_score}-${prediction.predicted_away_score}`,
          points,
        };

        totals[player.id] += points;
      } else {
        playerScores[player.id] = {
          prediction: "-",
          points: 0,
        };
      }
    }

    return {
      id: match.id,
      match: `${match.home_team} - ${match.away_team}`,
      result:
        match.home_score !== null && match.away_score !== null
          ? `${match.home_score}-${match.away_score}`
          : "-",
      playerScores,
    };
  });

  return NextResponse.json({
    round: previousRound.round_number,
    bonusMatchId: previousRound.bonus_match_id,
    players: players || [],
    matches: tableMatches,
    totals,
  });
}