"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Player = {
  id: string;
  display_name: string;
};

type PredictionMatch = {
  id: number;
  match: string;
  matchDate: string;
  playerPredictions: {
    [playerId: string]: string;
  };
};

export default function PredictionsPage() {
  const [round, setRound] = useState<number | null>(null);
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [message, setMessage] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<PredictionMatch[]>([]);
  const [bonusMatchId, setBonusMatchId] = useState<number | null>(null);

  useEffect(() => {
    async function loadPredictions() {
      const response = await fetch("/api/public-predictions");
      const data = await response.json();

      setRound(data.round);
      setDeadlinePassed(data.deadlinePassed);
      setMessage(data.message || "");
      setPlayers(data.players || []);
      setMatches(data.matches || []);
      setBonusMatchId(data.bonusMatchId);
    }

    loadPredictions();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-5xl font-bold">
              Openbare voorspellingen
            </h1>

            <p className="text-gray-400 mt-2">
              {round
                ? `Speelronde ${round}`
                : "Geen speelronde gevonden"}
            </p>
          </div>

          <Link
            href="/overview"
            className="bg-white text-black px-6 py-3 rounded-xl font-bold cursor-pointer hover:opacity-90 transition"
          >
            Terug
          </Link>
        </div>

        {!deadlinePassed ? (
          <div className="rounded-2xl bg-red-500/10 border border-red-500 p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Voorspellingen verborgen
            </h2>

            <p className="text-gray-300">
              {message ||
                "Voorspellingen worden zichtbaar zodra de deadline verstreken is."}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 overflow-x-auto">
            {matches.length === 0 ? (
              <p className="text-gray-400">
                Geen voorspellingen gevonden.
              </p>
            ) : (
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-left text-gray-300">
                    <th className="p-3">Wedstrijd</th>

                    {players.map((player) => (
                      <th
                        key={player.id}
                        className="p-3 text-center"
                      >
                        {player.display_name}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {matches.map((match) => (
                    <tr
                      key={match.id}
                      className="border-b border-white/10"
                    >
                      <td className="p-3 font-bold">
                        <div className="flex items-center gap-3">
                            <span>{match.match}</span>
                            {bonusMatchId === match.id && (
                                <span className="rounded-full bg-yellow-400/20 border border-yellow text-yellow-300 px-3 py-1 text-xs font-bold">
                                    Bonus x2
                                </span>
                            )}
                        </div>
                      </td>

                      {players.map((player) => (
                        <td
                          key={player.id}
                          className="p-3 text-center"
                        >
                          <div className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 font-bold">
                            {match.playerPredictions[player.id] || "-"}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </main>
  );
}