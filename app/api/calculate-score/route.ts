import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

function getResultType(home: number, away: number) {
  if (home > away) return "HOME";
  if (away > home) return "AWAY";
  return "DRAW";
}

function calculatePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
  isBonus: boolean
) {
  const predictedResult = getResultType(predictedHome, predictedAway);
  const actualResult = getResultType(actualHome, actualAway);

  const exactScore =
    predictedHome === actualHome && predictedAway === actualAway;

  const correctWinner = predictedResult === actualResult;

  const oneTeamScoreCorrect =
    predictedHome === actualHome || predictedAway === actualAway;

  let points = 0;

  if (exactScore) {
    points = 12;
  } else if (correctWinner && oneTeamScoreCorrect) {
    points = 4;
  } else if (correctWinner) {
    points = 3;
  } else if (oneTeamScoreCorrect) {
    points = 1;
  }

  if (isBonus) {
    points = points * 2;
  }

  return points;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "userId ontbreekt" },
      { status: 400 }
    );
  }

  const { data: activeRound, error: roundError } = await supabase
    .from("rounds")
    .select("id, round_number, bonus_match_id")
    .order("round_number", { ascending: false })
    .limit(1)
    .single();

  if (roundError || !activeRound) {
    return NextResponse.json(
      { error: "Geen actieve ronde gevonden" },
      { status: 500 }
    );
  }

  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select(`
      id,
      match_id,
      predicted_home_score,
      predicted_away_score,
      matches (
        id,
        home_team,
        away_team,
        home_score,
        away_score
      )
    `)
    .eq("user_id", userId);

  if (predictionsError) {
    return NextResponse.json(
      { error: predictionsError.message },
      { status: 500 }
    );
  }

  const results = [];

  for (const prediction of predictions || []) {
    const match = prediction.matches as any;

    if (
      !match ||
      match.home_score === null ||
      match.away_score === null
    ) {
      continue;
    }

    const isBonus = match.id === activeRound.bonus_match_id;

    const points = calculatePoints(
      prediction.predicted_home_score,
      prediction.predicted_away_score,
      match.home_score,
      match.away_score,
      isBonus
    );

    await supabase
      .from("predictions")
      .update({ points })
      .eq("id", prediction.id);

    results.push({
      match: `${match.home_team} - ${match.away_team}`,
      prediction: `${prediction.predicted_home_score}-${prediction.predicted_away_score}`,
      result: `${match.home_score}-${match.away_score}`,
      bonus: isBonus,
      points,
    });
  }

  const totalPoints = results.reduce((sum, item) => sum + item.points, 0);

  return NextResponse.json({
    userId,
    round: activeRound.round_number,
    totalPoints,
    results,
  });
}