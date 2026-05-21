import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(request: Request) {
  const body = await request.json();

  const { roundId, matchId, userId } = body;

  if (!roundId || !matchId || !userId) {
    return NextResponse.json(
      { error: "roundId, matchId en userId zijn verplicht" },
      { status: 400 }
    );
  }

  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .select("id, loser_user_id")
    .eq("id", roundId)
    .single();

  if (roundError || !round) {
    return NextResponse.json(
      { error: "Ronde niet gevonden" },
      { status: 404 }
    );
  }

  if (round.loser_user_id !== userId) {
    return NextResponse.json(
      { error: "Alleen de weekloser mag de bonuswedstrijd kiezen" },
      { status: 403 }
    );
  }

  const { error: updateError } = await supabase
    .from("rounds")
    .update({
      bonus_match_id: matchId,
    })
    .eq("id", roundId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Bonuswedstrijd opgeslagen",
    roundId,
    matchId,
  });
}