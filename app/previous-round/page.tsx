"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Player = {
  id: string;
  display_name: string;
};

type PreviousMatch = {
  id: number;
  match: string;
  result: string;
  playerScores: {
    [playerId: string]: {
      prediction: string;
      points: number;
    };
  };
};

export default function PreviousRoundPage() {
  const [round, setRound] = useState<number | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<PreviousMatch[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [bonusMatchId, setBonusMatchId] = useState<number | null>(null);

  useEffect(() => {
    async function loadPreviousRound() {
      const response = await fetch("/api/previous-round-score");
      const data = await response.json();

      setRound(data.round);
      setPlayers(data.players || []);
      setMatches(data.matches || []);
      setTotals(data.totals || {});
      setBonusMatchId(data.bonusMatchId ?? null);
    }

    loadPreviousRound();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-5xl font-bold">Score vorige ronde</h1>

            <p className="text-gray-400 mt-2">
              {round ? `Speelronde ${round}` : "Geen vorige ronde gevonden"}
            </p>
          </div>

          <Link
            href="/overview"
            className="bg-white text-black px-6 py-3 rounded-xl font-bold cursor-pointer hover:opacity-90 transition"
          >
            Terug
          </Link>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 overflow-x-auto">
          {matches.length === 0 ? (
            <p className="text-gray-400">Nog geen scores beschikbaar.</p>
          ) : (
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-left text-gray-300">
                  <th className="p-3">Wedstrijd</th>

                  <th className="p-3 text-center">
                    Uitslag
                  </th>

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
                {matches.map((match) => {
                  const isBonusMatch =
                    bonusMatchId === match.id;

                  return (
                    <tr
                      key={match.id}
                      className="border-b border-white/10"
                    >
                      <td className="p-3 font-bold">
                        <div className="flex items-center gap-2">
                          <span>{match.match}</span>

                          {isBonusMatch && (
                            <span className="rounded bg-yellow-400 px-2 py-1 text-xs font-black text-black">
                              BONUS x2
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <span className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 inline-block font-bold">
                          {match.result}
                        </span>
                      </td>

                      {players.map((player) => {
                        const score =
                          match.playerScores[player.id];

                        return (
                          <td
                            key={player.id}
                            className="p-3 text-center"
                          >
                            <div className="rounded-xl bg-black/40 border border-white/10 px-3 py-2">
                              <div className="font-bold">
                                {score?.prediction || "-"}
                              </div>

                              <div className="text-sm text-green-300">
                                {score?.points || 0} punten
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                <tr className="border-t-2 border-white/20">
                  <td className="p-3 font-bold text-xl">
                    Totaal
                  </td>

                  <td className="p-3"></td>

                  {players.map((player) => (
                    <td
                      key={player.id}
                      className="p-3 text-center"
                    >
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