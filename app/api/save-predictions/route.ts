import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getActiveRound } from "@/lib/getActiveRound";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

type PredictionInput = {
  match_id: number;
  predicted_home_score: number;
  predicted_away_score: number;
};

export async function POST(request: Request) {
  const body = await request.json();

  const userId = body.userId as string;
  const roundId = body.roundId as number;
  const predictions = body.predictions as PredictionInput[];

  if (!userId || !roundId || !predictions || predictions.length === 0) {
    return NextResponse.json(
      { error: "Ongeldige gegevens" },
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
      { error: "Je kunt alleen voorspellingen opslaan voor de actieve ronde." },
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
          "Deadline is verstreken. Voorspellingen kunnen niet meer worden opgeslagen.",
      },
      { status: 403 }
    );
  }

  const matchIds = predictions.map((prediction) => prediction.match_id);

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id, round_id")
    .in("id", matchIds);

  if (matchesError) {
    return NextResponse.json(
      { error: matchesError.message },
      { status: 500 }
    );
  }

  const invalidMatch = (matches || []).find(
    (match) => match.round_id !== activeRound.id
  );

  if (invalidMatch || (matches || []).length !== predictions.length) {
    return NextResponse.json(
      { error: "Niet alle wedstrijden horen bij de actieve ronde" },
      { status: 400 }
    );
  }

  const rows = predictions.map((prediction) => ({
    user_id: userId,
    match_id: prediction.match_id,
    predicted_home_score: prediction.predicted_home_score,
    predicted_away_score: prediction.predicted_away_score,
  }));

  const { error: upsertError } = await supabase
    .from("predictions")
    .upsert(rows, {
      onConflict: "user_id,match_id",
    });

  if (upsertError) {
    return NextResponse.json(
      { error: upsertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Voorspellingen opgeslagen",
    round: activeRound.round_number,
    saved: rows.length,
  });
}