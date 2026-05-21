import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET() {
  try {
    const response = await fetch(
      "https://api.football-data.org/v4/competitions/DED/matches",
      {
        headers: {
          "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY || "",
        },
      }
    );

    const data = await response.json();

    const allMatches = data.matches.map((match: any) => ({
      api_id: match.id,
      matchday: match.matchday,
      home_team: match.homeTeam.name,
      away_team: match.awayTeam.name,
      match_date: match.utcDate,
      status: match.status,
      home_score: match.score.fullTime.home,
      away_score: match.score.fullTime.away,
    }));

    /*const unfinishedMatches = allMatches.filter(
      (match: any) => match.status !== "FINISHED"
    );

    if (unfinishedMatches.length === 0) {
      return NextResponse.json({
        message: "Geen actieve speelronde gevonden",
      });
    }

    const activeMatchday = Math.min(
      ...unfinishedMatches.map((match: any) => match.matchday)
    );*/

    let activeMatchday: number;

    if (process.env.DEBUG_CURRENT_MATCHDAY) {
        activeMatchday = Number(process.env.DEBUG_CURRENT_MATCHDAY);
    } else {
        const unfinishedMatches = allMatches.filter(
            (match: any) => match.status !== "FINISHED"
        );

        if (unfinishedMatches.length === 0) {
            return NextResponse.json({
            message: "Geen actieve speelronde gevonden",
            });
        }

        activeMatchday = Math.min(
            ...unfinishedMatches.map((match: any) => match.matchday)
        );
        }

    const currentRoundMatches = allMatches.filter(
      (match: any) => match.matchday === activeMatchday
    );

    const firstMatchDate = new Date(
      currentRoundMatches
        .map((match: any) => match.match_date)
        .sort()[0]
    );

    const deadline = new Date(firstMatchDate);
    deadline.setDate(deadline.getDate() - 1);
    deadline.setHours(23, 59, 0, 0);

    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .upsert(
        {
          round_number: activeMatchday,
          deadline: deadline.toISOString(),
        },
        {
          onConflict: "round_number",
        }
      )
      .select()
      .single();

    if (roundError) {
      return NextResponse.json({ error: roundError.message }, { status: 500 });
    }

    const matchRows = currentRoundMatches.map((match: any) => ({
      api_id: match.api_id,
      round_id: round.id,
      home_team: match.home_team,
      away_team: match.away_team,
      match_date: match.match_date,
      home_score: match.home_score,
      away_score: match.away_score,
    }));

    const { error: matchesError } = await supabase
      .from("matches")
      .upsert(matchRows, {
        onConflict: "api_id",
      })
      //.insert(matchRows);

    if (matchesError) {
      return NextResponse.json({ error: matchesError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Actieve speelronde geïmporteerd",
      activeMatchday,
      deadline: deadline.toISOString(),
      matchesImported: matchRows.length,
    });

    /*return NextResponse.json({
      message: "Actieve speelronde geïmporteerd",
      debugCurrentMatchday: process.env.DEBUG_CURRENT_MATCHDAY || null,
      oldDebugMatchday: process.env.DEBUG_MATCHDAY || null,
      activeMatchday,
      deadline: deadline.toISOString(),
      matchesImported: matchRows.length,
    });*/

  } catch (error) {
    return NextResponse.json(
      { error: "Importeren mislukt" },
      { status: 500 }
    );
  }
}