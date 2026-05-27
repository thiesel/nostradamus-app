"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Round = {
  id: number;
  round_number: number;
  bonus_match_id: number | null;
};

type Player = {
  id: string;
  display_name: string;
};

type Match = {
  id: number;
  round_id: number;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
};

type Prediction = {
  user_id: string;
  match_id: number;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  points: number | null;
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");

  const [rounds, setRounds] = useState<Round[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);

  useEffect(() => {
    async function checkAdminAndLoadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setEmail(user.email || "");

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error || !profile || profile.role !== "admin") {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      const response = await fetch("/api/admin/matches");
      const data = await response.json();

      setRounds(data.rounds || []);
      setPlayers(data.players || []);
      setMatches(data.matches || []);
      setPredictions(data.predictions || []);

      if (data.rounds && data.rounds.length > 0) {
        setSelectedRoundId(data.rounds[0].id);
      }

      setLoading(false);
    }

    checkAdminAndLoadData();
  }, []);

  const selectedRound = rounds.find((round) => round.id === selectedRoundId);

  const selectedMatches = matches.filter(
    (match) => match.round_id === selectedRoundId
  );

  const totals: Record<string, number> = {};

  for (const player of players) {
    totals[player.id] = 0;
  }

  for (const match of selectedMatches) {
    for (const player of players) {
      const prediction = predictions.find(
        (item) => item.user_id === player.id && item.match_id === match.id
      );

      totals[player.id] += prediction?.points || 0;
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <p className="text-gray-400">Admin rechten controleren...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Geen toegang</h1>

          <p className="text-gray-400 mb-6">
            Je hebt geen admin rechten voor deze pagina.
          </p>

          <Link
            href="/overview"
            className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:opacity-90 transition"
          >
            Terug naar overzicht
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-5xl font-bold">Admin dashboard</h1>

            <p className="text-gray-400 mt-2">
              Ingelogd als admin: {email}
            </p>
          </div>

          <Link
            href="/overview"
            className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:opacity-90 transition"
          >
            Terug
          </Link>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mb-8">
          <label className="block text-sm text-gray-400 mb-2">
            Kies speelronde
          </label>

          <select
            value={selectedRoundId ?? ""}
            onChange={(event) =>
              setSelectedRoundId(Number(event.target.value))
            }
            className="bg-black border border-white/20 rounded-xl px-4 py-3 text-white"
          >
            {rounds.map((round) => (
              <option key={round.id} value={round.id}>
                Speelronde {round.round_number}
              </option>
            ))}
          </select>

          {selectedRound && (
            <p className="text-gray-400 mt-4">
              Bonuswedstrijd ID:{" "}
              <span className="text-yellow-300 font-bold">
                {selectedRound.bonus_match_id ?? "Nog niet gekozen"}
              </span>
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 overflow-x-auto">
          <h2 className="text-3xl font-bold mb-6">Wedstrijden en scores</h2>

          {selectedMatches.length === 0 ? (
            <p className="text-gray-400">
              Geen wedstrijden gevonden voor deze ronde.
            </p>
          ) : (
            <table className="w-full min-w-[1100px] border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-left text-gray-300">
                  <th className="p-3">Datum</th>
                  <th className="p-3">Wedstrijd</th>
                  <th className="p-3 text-center">Uitslag</th>

                  {players.map((player) => (
                    <th key={player.id} className="p-3 text-center">
                      {player.display_name}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {selectedMatches.map((match) => {
                  const isBonusMatch =
                    selectedRound?.bonus_match_id === match.id;

                  return (
                    <tr key={match.id} className="border-b border-white/10">
                      <td className="p-3 text-gray-400">
                        {new Date(match.match_date).toLocaleString("nl-NL")}
                      </td>

                      <td className="p-3 font-bold">
                        <div className="flex items-center gap-2">
                          <span>
                            {match.home_team} - {match.away_team}
                          </span>

                          {isBonusMatch && (
                            <span className="rounded bg-yellow-400 px-2 py-1 text-xs font-black text-black">
                              BONUS x2
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <span className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 inline-block font-bold">
                          {match.home_score ?? "-"} - {match.away_score ?? "-"}
                        </span>
                      </td>

                      {players.map((player) => {
                        const prediction = predictions.find(
                          (item) =>
                            item.user_id === player.id &&
                            item.match_id === match.id
                        );

                        return (
                          <td key={player.id} className="p-3 text-center">
                            <div className="rounded-xl bg-black/40 border border-white/10 px-3 py-2">
                              <div className="font-bold">
                                {prediction
                                  ? `${prediction.predicted_home_score}-${prediction.predicted_away_score}`
                                  : "-"}
                              </div>

                              <div className="text-sm text-green-300">
                                {prediction?.points || 0} punten
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                <tr className="border-t-2 border-white/20">
                  <td className="p-3 font-bold text-xl">Totaal</td>
                  <td className="p-3"></td>
                  <td className="p-3"></td>

                  {players.map((player) => (
                    <td key={player.id} className="p-3 text-center">
                      <span className="text-xl font-bold text-green-300">
                        {totals[player.id] || 0}
                      </span>{" "}
                      punten
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}