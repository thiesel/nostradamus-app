import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

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

  const standings = [];

  for (const profile of profiles || []) {
    const { data: predictions, error: predictionsError } = await supabase
      .from("predictions")
      .select("points")
      .eq("user_id", profile.id);

    if (predictionsError) {
      return NextResponse.json(
        { error: predictionsError.message },
        { status: 500 }
      );
    }

    const totalPoints = (predictions || []).reduce(
      (sum, prediction) => sum + (prediction.points || 0),
      0
    );

    standings.push({
      userId: profile.id,
      name: profile.display_name,
      totalPoints,
    });
  }

  standings.sort((a, b) => b.totalPoints - a.totalPoints);

  return NextResponse.json({
    standings,
  });
}