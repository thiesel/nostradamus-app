import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET() {
  const { data: rounds, error: roundsError } = await supabase
    .from("rounds")
    .select("id, round_number")
    .order("round_number", { ascending: false });

  if (roundsError) {
    return NextResponse.json({ error: roundsError.message }, { status: 500 });
  }

  if (!rounds || rounds.length < 2) {
    return NextResponse.json(
      { error: "Niet genoeg rondes gevonden" },
      { status: 400 }
    );
  }

  let currentRound = rounds[0];
  let previousRound = rounds[1];

  if (process.env.DEBUG_CURRENT_MATCHDAY) {
    const debugCurrent = rounds.find(
      (round) =>
        round.round_number === Number(process.env.DEBUG_CURRENT_MATCHDAY)
    );

    if (debugCurrent) {
      currentRound = debugCurrent;
    }
  }

  if (process.env.DEBUG_PREVIOUS_MATCHDAY) {
    const debugPrevious = rounds.find(
      (round) =>
        round.round_number === Number(process.env.DEBUG_PREVIOUS_MATCHDAY)
    );

    if (debugPrevious) {
      previousRound = debugPrevious;
    }
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .order("display_name", { ascending: true });

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const weekScores = [];

  for (const profile of profiles || []) {
    const { data: predictions, error: predictionsError } = await supabase
      .from("predictions")
      .select(`
        points,
        matches!inner (
          round_id
        )
      `)
      .eq("user_id", profile.id)
      .eq("matches.round_id", previousRound.id);

    if (predictionsError) {
      return NextResponse.json(
        { error: predictionsError.message },
        { status: 500 }
      );
    }

    const weekScore = (predictions || []).reduce(
      (sum, prediction) => sum + (prediction.points || 0),
      0
    );

    weekScores.push({
      userId: profile.id,
      name: profile.display_name,
      weekScore,
    });
  }

  if (weekScores.length === 0) {
    return NextResponse.json(
      { error: "Geen spelers gevonden" },
      { status: 400 }
    );
  }

  weekScores.sort((a, b) => a.weekScore - b.weekScore);

  const weekLoser = weekScores[0];

  const { error: updateError } = await supabase
    .from("rounds")
    .update({
      loser_user_id: weekLoser.userId,
    })
    .eq("id", currentRound.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Weekloser bepaald",
    currentRound: currentRound.round_number,
    previousRound: previousRound.round_number,
    weekLoser,
    allWeekScores: weekScores,
  });
}