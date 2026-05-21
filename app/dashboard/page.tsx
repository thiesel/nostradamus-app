"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Match = {
  id: number;
  home_team: string;
  away_team: string;
  match_date: string | null;
};

type PredictionMap = {
  [matchId: number]: {
    home: string;
    away: string;
  };
};

type ScoreResult = {
  match: string;
  prediction: string;
  result: string;
  bonus: boolean;
  points: number;
};

export default function DashboardPage() {
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<PredictionMap>({});
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [deadlineText, setDeadlineText] = useState("");
  const [scoreResults, setScoreResults] = useState<ScoreResult[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [roundNumber, setRoundNumber] = useState<number | null>(null);
  const [activeRoundId, setActiveRoundId] = useState<number | null>(null);
  const [canChooseBonus, setCanChooseBonus] = useState(false);
  const [bonusMatchId, setBonusMatchId] = useState<number | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setEmail(user.email || "");
      setUserId(user.id);

      const importResponse = await fetch("/api/import-current-round");
      const importData = await importResponse.json();

      if (!importData.activeMatchday) {
        alert("Geen actieve speelronde gevonden");
        return;
      }

      const { data: activeRound } = await supabase
        .from("rounds")
        .select("id, round_number, deadline, loser_user_id, bonus_match_id")
        .eq("round_number", importData.activeMatchday)
        .single();

      if (!activeRound) return;

      setActiveRoundId(activeRound.id);
      setRoundNumber(activeRound.round_number);
      setCanChooseBonus(activeRound.loser_user_id === user.id);
      setBonusMatchId(activeRound.bonus_match_id);

      const deadline = new Date(activeRound.deadline);
      const now = new Date();

      const disableDeadline =
        process.env.NEXT_PUBLIC_DISABLE_DEADLINE === "true";

      setDeadlinePassed(disableDeadline ? false : now > deadline);
      setDeadlineText(deadline.toLocaleString("nl-NL"));

      const { data: matchesData } = await supabase
        .from("matches")
        .select("id, home_team, away_team, match_date")
        .eq("round_id", activeRound.id)
        .order("match_date", { ascending: true });

      if (matchesData) setMatches(matchesData);

      const { data: predictionData } = await supabase
        .from("predictions")
        .select("*")
        .eq("user_id", user.id);

      if (predictionData) {
        const map: PredictionMap = {};

        predictionData.forEach((prediction) => {
          map[prediction.match_id] = {
            home: prediction.predicted_home_score.toString(),
            away: prediction.predicted_away_score.toString(),
          };
        });

        setPredictions(map);
      }

      const scoreResponse = await fetch(`/api/calculate-score?userId=${user.id}`);
      const scoreData = await scoreResponse.json();

      if (scoreData.results) {
        setScoreResults(scoreData.results);
        setTotalPoints(scoreData.totalPoints || 0);
      }
    }

    loadDashboard();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function updatePrediction(
    matchId: number,
    field: "home" | "away",
    value: string
  ) {
    setPredictions((prev) => ({
      ...prev,
      [matchId]: {
        home: prev[matchId]?.home || "",
        away: prev[matchId]?.away || "",
        [field]: value,
      },
    }));
  }

  function chooseBonusMatch(matchId: number) {
    if (!canChooseBonus) return;
    setBonusMatchId(matchId);
  }

  async function saveAllPredictions() {
    if (deadlinePassed) {
      alert("Voorspellingen zijn gesloten");
      return;
    }

    for (const match of matches) {
      const prediction = predictions[match.id];

      if (!prediction || prediction.home === "" || prediction.away === "") {
        alert(
          `Vul eerst een voorspelling in voor ${match.home_team} - ${match.away_team}`
        );
        return;
      }

      if (isNaN(Number(prediction.home)) || isNaN(Number(prediction.away))) {
        alert(`Ongeldige score bij ${match.home_team} - ${match.away_team}`);
        return;
      }
    }

    if (canChooseBonus && !bonusMatchId) {
      alert("Kies eerst een bonuswedstrijd");
      return;
    }

    if (canChooseBonus && activeRoundId && bonusMatchId) {
      const response = await fetch("/api/set-bonus-match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roundId: activeRoundId,
          matchId: bonusMatchId,
          userId: userId,
        }),
      });

      const data = await response.json();

      if(!response.ok) {
        alert(data.error || "Fout bij opslaan bonuswedstrijd");
        return;
      }
    }

    const rows = matches.map((match) => ({
      user_id: userId,
      match_id: match.id,
      predicted_home_score: Number(predictions[match.id].home),
      predicted_away_score: Number(predictions[match.id].away),
    }));

    const { error } = await supabase.from("predictions").upsert(rows, {
      onConflict: "user_id,match_id",
    });

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/overview?predictionsSaved=true";
  }

  function getScoreForMatch(match: Match) {
    return scoreResults.find(
      (score) => score.match === `${match.home_team} - ${match.away_team}`
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-5xl font-bold">Dashboard</h1>
            <p className="text-gray-400 mt-2">Ingelogd als: {email}</p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/overview"
              className="bg-white text-black px-6 py-3 rounded-xl font-bold cursor-pointer hover:opacity-90 transition"
            >
              Terug
            </Link>

            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-6 py-3 rounded-xl font-bold cursor-pointer hover:opacity-90 transition"
            >
              Uitloggen
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mb-6">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-3xl font-bold">
                Huidige speelronde {roundNumber ? roundNumber : ""}
              </h2>

              <p className="text-gray-400 mt-2">
                Deadline: {deadlineText || "Wordt geladen..."}
              </p>

              {canChooseBonus && (
                <p className="text-yellow-300 mt-2 font-bold">
                  Jij bent weekloser en mag de bonuswedstrijd kiezen.
                </p>
              )}
            </div>

            <button
              onClick={saveAllPredictions}
              disabled={deadlinePassed}
              className="rounded-xl bg-white text-black px-6 py-3 font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:opacity-90 transition"
            >
              Alles opslaan
            </button>
          </div>

          {deadlinePassed && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 rounded-xl p-4 mt-6">
              Voorspellingen zijn gesloten
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">Jouw scores</h2>

            <div className="rounded-xl border border-white/10 bg-black/40 px-6 py-3 text-xl">
              Totaal:{" "}
              <span className="text-green-300 font-bold">{totalPoints}</span>{" "}
              punten
            </div>
          </div>

          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_0.7fr_1fr] gap-4 text-gray-400 font-bold border-b border-white/10 pb-3 mb-2">
            <div>Wedstrijd</div>
            <div className="text-center">Punten</div>
            <div className="text-center">Uitslag</div>
            <div className="text-center">Bonus</div>
            <div className="text-center">Jouw voorspelling</div>
          </div>

          <div className="flex flex-col">
            {matches.map((match) => {
              const score = getScoreForMatch(match);
              const prediction = predictions[match.id];
              const bonusIsPublic = deadlinePassed;
              const isBonus = bonusMatchId === match.id;
              const showBonus = canChooseBonus || bonusIsPublic;

              return (
                <div
                  key={match.id}
                  className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_0.7fr_1fr] gap-4 items-center border-b border-white/10 py-5"
                >
                  <div>
                    <h3 className="text-xl font-bold">
                      {match.home_team} - {match.away_team}
                    </h3>

                    <p className="text-gray-400 text-sm mt-1">
                      {match.match_date
                        ? new Date(match.match_date).toLocaleString("nl-NL")
                        : "Datum onbekend"}
                    </p>
                  </div>

                  <div className="text-center">
                    {score ? (
                      <div>
                        <span className="text-3xl font-bold text-green-300">
                          {score.points}
                        </span>

                        {score.bonus && (
                          <div className="text-xs text-green-300 mt-1">
                            Bonus x2
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <div className="rounded-xl border border-white/10 bg-black/40 px-6 py-3 text-2xl font-bold min-w-[140px] text-center">
                      {score ? score.result : "-"}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    {canChooseBonus ? (
                      <input
                        type="checkbox"
                        checked={isBonus}
                        onChange={() => chooseBonusMatch(match.id)}
                        disabled={deadlinePassed}
                        className="h-6 w-6 cursor-pointer disabled:cursor-not-allowed"
                      />
                    ) : (
                      <div
                        className={`h-6 w-6 rounded border ${
                          showBonus && isBonus
                            ? "bg-yellow-400 border-yellow-400"
                            : "border-white/20"
                        }`}
                        title={showBonus && isBonus ? "Bonuswedstrijd" : ""}
                      />
                    )}
                  </div>

                  <div className="flex justify-center">
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        disabled={deadlinePassed}
                        value={prediction?.home || ""}
                        onChange={(e) =>
                          updatePrediction(match.id, "home", e.target.value)
                        }
                        className="w-16 rounded-xl bg-black border border-white/20 px-3 py-2 text-center text-lg disabled:opacity-40"
                      />

                      <span className="font-bold">-</span>

                      <input
                        type="number"
                        disabled={deadlinePassed}
                        value={prediction?.away || ""}
                        onChange={(e) =>
                          updatePrediction(match.id, "away", e.target.value)
                        }
                        className="w-16 rounded-xl bg-black border border-white/20 px-3 py-2 text-center text-lg disabled:opacity-40"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mt-6 text-gray-400">
          <h2 className="text-2xl font-bold text-white mb-3">Puntentelling</h2>
          <p>Winnaar fout + één teamscore goed = 1 punt</p>
          <p>Winnaar goed = 3 punten</p>
          <p>Winnaar goed + één teamscore goed = 4 punten</p>
          <p>Exacte score goed = 12 punten</p>
          <p>Bonuswedstrijd = punten x2</p>
        </div>
      </div>
    </main>
  );
}