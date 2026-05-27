import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

type Standing = {
  userId: string;
  name: string;
  totalPoints: number;
  predictionsCount: number;
  exactScores: number;
};

export async function GET() {
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

  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select("user_id, points");

  if (predictionsError) {
    return NextResponse.json(
      { error: predictionsError.message },
      { status: 500 }
    );
  }

  const standings: Standing[] = (profiles || []).map((profile) => {
    const userPredictions = (predictions || []).filter(
      (prediction) => prediction.user_id === profile.id
    );

    const totalPoints = userPredictions.reduce(
      (sum, prediction) => sum + (prediction.points || 0),
      0
    );

    const exactScores = userPredictions.filter(
      (prediction) => prediction.points === 12 || prediction.points === 24
    ).length;

    return {
      userId: profile.id,
      name: profile.display_name,
      totalPoints,
      predictionsCount: userPredictions.length,
      exactScores,
    };
  });

  standings.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }

    if (b.exactScores !== a.exactScores) {
      return b.exactScores - a.exactScores;
    }

    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({
    standings,
  });
}