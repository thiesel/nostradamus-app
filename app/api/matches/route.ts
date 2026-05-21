import { NextResponse } from "next/server";

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
      id: match.id,
      matchday: match.matchday,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      utcDate: match.utcDate,
      status: match.status,
      homeScore: match.score.fullTime.home,
      awayScore: match.score.fullTime.away,
    }));

    let activeMatchday: number;

    if (process.env.DEBUG_MATCHDAY) {
      activeMatchday = Number(process.env.DEBUG_MATCHDAY);
    } else {
      const unfinishedMatches = allMatches.filter(
        (match: any) => match.status !== "FINISHED"
      );

      if (unfinishedMatches.length === 0) {
        return NextResponse.json({
          activeMatchday: null,
          message: "Geen actieve speelronde gevonden",
          matches: [],
        });
      }

      activeMatchday = Math.min(
        ...unfinishedMatches.map((match: any) => match.matchday)
      );
    }

    const currentRoundMatches = allMatches.filter(
      (match: any) => match.matchday === activeMatchday
    );

    return NextResponse.json({
      activeMatchday,
      matches: currentRoundMatches,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Fout bij ophalen wedstrijden" },
      { status: 500 }
    );
  }
}