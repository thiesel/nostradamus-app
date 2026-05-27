import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getActiveRound, getPreviousRound } from "@/lib/getActiveRound";

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

  return isBonus ? points * 2 : points;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "Niet toegestaan" },
      { status: 401 }
    );
  }

  const currentRound = await getActiveRound();
  const previousRound = await getPreviousRound();

  if (!currentRound || !previousRound) {
    return NextResponse.json(
      { error: "Geen geldige huidige of vorige ronde gevonden" },
      { status: 500 }
    );
  }

  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select(`
      id,
      user_id,
      predicted_home_score,
      predicted_away_score,
      matches!inner (
        id,
        round_id,
        home_team,
        away_team,
        home_score,
        away_score
      )
    `)
    .eq("matches.round_id", previousRound.id);

  if (predictionsError) {
    return NextResponse.json(
      { error: predictionsError.message },
      { status: 500 }
    );
  }

  const calculatedResults: {
    userId: string;
    matchId: number;
    match: string;
    bonus: boolean;
    points: number;
  }[] = [];

  for (const prediction of predictions || []) {
    const match = prediction.matches as any;

    if (
      !match ||
      match.home_score === null ||
      match.away_score === null
    ) {
      continue;
    }

    const isBonus = match.id === previousRound.bonus_match_id;

    const points = calculatePoints(
      prediction.predicted_home_score,
      prediction.predicted_away_score,
      match.home_score,
      match.away_score,
      isBonus
    );

    const { error: updateError } = await supabase
      .from("predictions")
      .update({ points })
      .eq("id", prediction.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    calculatedResults.push({
      userId: prediction.user_id,
      matchId: match.id,
      match: `${match.home_team} - ${match.away_team}`,
      bonus: isBonus,
      points,
    });
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .order("display_name", { ascending: true });

  if (profilesError) {
    return NextResponse.json(
      { error: profilesError.message },
      { status: 500 }
    );
  }

  const weekScores = (profiles || []).map((profile) => {
    const weekScore = calculatedResults
      .filter((result) => result.userId === profile.id)
      .reduce((sum, result) => sum + result.points, 0);

    return {
      userId: profile.id,
      name: profile.display_name,
      weekScore,
    };
  });

  weekScores.sort((a, b) => a.weekScore - b.weekScore);

  const weekLoser = weekScores[0];

  if (!weekLoser) {
    return NextResponse.json(
      { error: "Geen weekloser gevonden" },
      { status: 400 }
    );
  }

  const { error: updatePreviousRoundError } = await supabase
    .from("rounds")
    .update({
      processed: true,
    })
    .eq("id", previousRound.id);

  if (updatePreviousRoundError) {
    return NextResponse.json(
      { error: updatePreviousRoundError.message },
      { status: 500 }
    );
  }

  const { error: updateCurrentRoundError } = await supabase
    .from("rounds")
    .update({
      loser_user_id: weekLoser.userId,
    })
    .eq("id", currentRound.id);

  if (updateCurrentRoundError) {
    return NextResponse.json(
      { error: updateCurrentRoundError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Ronde verwerkt",
    currentRound: currentRound.round_number,
    previousRound: previousRound.round_number,
    previousRoundProcessed: true,
    calculatedPredictions: calculatedResults.length,
    weekLoser,
    allWeekScores: weekScores,
  });
}