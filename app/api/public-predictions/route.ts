import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET() {
  const { data: rounds, error: roundsError } = await supabase
    .from("rounds")
    .select("id, round_number, deadline, bonus_match_id")
    .order("round_number", { ascending: false })
    //.limit(1);

  if (roundsError) {
    return NextResponse.json({ error: roundsError.message }, { status: 500 });
  }

  //const activeRound = rounds?.[0];
  let activeRound = rounds?.[0];

  if (process.env.DEBUG_CURRENT_MATCHDAY) {
    const debugRound = rounds?.find(
      (round) =>
        round.round_number === Number(process.env.DEBUG_CURRENT_MATCHDAY)
    );
    if (debugRound) {
      activeRound = debugRound;
    }
  }

  if (!activeRound) {
    return NextResponse.json({
      round: null,
      deadlinePassed: false,
      players: [],
      matches: [],
    });
  }

  const deadline = new Date(activeRound.deadline);
  const now = new Date();

  /*const disableDeadline =
    process.env.NEXT_PUBLIC_DISABLE_DEADLINE === "true";

  const deadlinePassed = disableDeadline ? true : now > deadline;*/

  const debugDeadlinePassed = process.env.NEXT_PUBLIC_DEBUG_DEADLINE_PASSED;

  const deadlinePassed =
    debugDeadlinePassed === "true"
      ? true
      : debugDeadlinePassed === "false"
      ? false
      : now > deadline;

  if (!deadlinePassed) {
    return NextResponse.json({
      round: activeRound.round_number,
      deadlinePassed: false,
      players: [],
      matches: [],
      message: "Voorspellingen zijn nog verborgen tot de deadline.",
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
    .select("id, home_team, away_team, match_date")
    .eq("round_id", activeRound.id)
    .order("match_date", { ascending: true });

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 });
  }

  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select(
      "user_id, match_id, predicted_home_score, predicted_away_score"
    );

  if (predictionsError) {
    return NextResponse.json(
      { error: predictionsError.message },
      { status: 500 }
    );
  }

  const tableMatches = (matches || []).map((match) => {
    const playerPredictions: Record<string, string> = {};

    for (const player of players || []) {
      const prediction = (predictions || []).find(
        (p) => p.user_id === player.id && p.match_id === match.id
      );

      playerPredictions[player.id] = prediction
        ? `${prediction.predicted_home_score}-${prediction.predicted_away_score}`
        : "-";
    }

    return {
      id: match.id,
      match: `${match.home_team} - ${match.away_team}`,
      matchDate: match.match_date,
      playerPredictions,
    };
  });

  return NextResponse.json({
    round: activeRound.round_number,
    deadlinePassed: true,
    bonusMatchId: activeRound.bonus_match_id,
    players: players || [],
    matches: tableMatches,
  });
}