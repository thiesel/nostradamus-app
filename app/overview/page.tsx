"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Standing = {
  userId: string;
  name: string;
  totalPoints: number;
  predictionsCount: number;
  exactScores: number;
};

export default function OverviewPage() {
  const [email, setEmail] = useState("");
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOverview() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setEmail(user.email || "");

      const standingsResponse = await fetch("/api/standings");
      const standingsData = await standingsResponse.json();

      setStandings(standingsData.standings || []);

      setLoading(false);
    }

    loadOverview();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const leaderPoints = standings[0]?.totalPoints || 0;

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-5xl font-bold">Nostradamus</h1>

            <p className="text-gray-400 mt-2">
              Ingelogd als: {email}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:opacity-90 transition"
            >
              Voorspellingen beheren
            </Link>

            <Link
              href="/predictions"
              className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:opacity-90 transition"
            >
              Openbare voorspellingen
            </Link>

            <Link
              href="/previous-round"
              className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:opacity-90 transition"
            >
              Vorige ronde
            </Link>

            

            <button
              onClick={handleLogout}
              className="bg-red-700 text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition"
            >
              Uitloggen
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-4xl font-bold">Standings</h2>

              <p className="text-gray-400 mt-2">
                Live totaalscores van alle spelers
              </p>
            </div>
          </div>

          {loading ? (
            <p className="text-gray-400">Standings laden...</p>
          ) : standings.length === 0 ? (
            <p className="text-gray-400">
              Nog geen standings beschikbaar.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {standings.map((player, index) => {
                const difference = leaderPoints - player.totalPoints;

                return (
                  <div
                    key={player.userId}
                    className={`rounded-2xl border p-6 ${
                      index === 0
                        ? "border-yellow-400 bg-yellow-400/10"
                        : "border-white/10 bg-black/30"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                      <div>
                        <div className="flex items-center gap-4">
                          <div
                            className={`text-4xl font-black ${
                              index === 0
                                ? "text-yellow-300"
                                : "text-white"
                            }`}
                          >
                            #{index + 1}
                          </div>

                          <div>
                            <h3 className="text-3xl font-bold">
                              {player.name}
                            </h3>

                            <p className="text-gray-400 mt-1">
                              {player.predictionsCount} voorspellingen ·{" "}
                              {player.exactScores} exacte scores
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4">
                        <div className="rounded-xl bg-black/40 border border-white/10 px-6 py-4 min-w-[140px] text-center">
                          <div className="text-sm text-gray-400 mb-1">
                            Punten
                          </div>

                          <div className="text-4xl font-black text-green-300">
                            {player.totalPoints}
                          </div>
                        </div>

                        <div className="rounded-xl bg-black/40 border border-white/10 px-6 py-4 min-w-[140px] text-center">
                          <div className="text-sm text-gray-400 mb-1">
                            Achterstand
                          </div>

                          <div className="text-4xl font-black text-red-300">
                            {difference}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}