import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getActiveRound } from "@/lib/getActiveRound";

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

  const activeRound = await getActiveRound();

  if (!activeRound) {
    return NextResponse.json(
      { error: "Geen actieve ronde gevonden" },
      { status: 404 }
    );
  }

  if (roundId !== activeRound.id) {
    return NextResponse.json(
      { error: "Je kunt alleen een bonuswedstrijd kiezen voor de actieve ronde." },
      { status: 403 }
    );
  }

  if (!activeRound.deadline) {
    return NextResponse.json(
      { error: "Deze ronde heeft geen deadline ingesteld" },
      { status: 500 }
    );
  }

  const deadline = new Date(activeRound.deadline);
  const now = new Date();

  const disableDeadline =
    process.env.NEXT_PUBLIC_DISABLE_DEADLINE === "true";

  const deadlinePassed = disableDeadline ? false : now > deadline;

  if (deadlinePassed) {
    return NextResponse.json(
      {
        error:
          "Deadline is verstreken. De bonuswedstrijd kan niet meer worden aangepast.",
      },
      { status: 403 }
    );
  }

  if (activeRound.loser_user_id !== userId) {
    return NextResponse.json(
      { error: "Alleen de weekloser mag de bonuswedstrijd kiezen" },
      { status: 403 }
    );
  }

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, round_id")
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    return NextResponse.json(
      { error: "Wedstrijd niet gevonden" },
      { status: 404 }
    );
  }

  if (match.round_id !== activeRound.id) {
    return NextResponse.json(
      { error: "Deze wedstrijd hoort niet bij de actieve ronde" },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from("rounds")
    .update({
      bonus_match_id: matchId,
    })
    .eq("id", activeRound.id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Bonuswedstrijd opgeslagen",
    roundId: activeRound.id,
    roundNumber: activeRound.round_number,
    matchId,
  });
}