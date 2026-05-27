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

  if (!rounds || rounds.length < 2) {
    return NextResponse.json({
      round: null,
      players: [],
      matches: [],
      totals: {},
    });
  }

  //const previousRound = rounds[1];
  let previousRound = rounds[1];

  if (process.env.DEBUG_PREVIOUS_MATCHDAY) {
    const debugRound = rounds.find(
      (round) => round.round_number === Number(process.env.DEBUG_PREVIOUS_MATCHDAY)
    );

    if (debugRound) {
      previousRound = debugRound;
    }
  }

  console.log("DEBUG_PREVIOUS_MATCHDAY:", process.env.DEBUG_PREVIOUS_MATCHDAY);
  console.log("GEKOZEN PREVIOUS ROUND:", previousRound);

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

  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select(
      "user_id, match_id, predicted_home_score, predicted_away_score, points"
    );

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