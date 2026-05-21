"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Standing = {
  userId: string;
  name: string;
  totalPoints: number;
};

function OverviewContent() {
  const [email, setEmail] = useState("");
  const [standings, setStandings] = useState<Standing[]>([]);
  const [hasPredictions, setHasPredictions] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [publicPredictionsOpen, setPublicPredictionsOpen] = useState(false);

  const searchParams = useSearchParams();
  const predictionsSaved = searchParams.get("predictionsSaved");

  useEffect(() => {
    async function loadUser() {
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

      if (standingsData.standings) {
        setStandings(standingsData.standings);
      }

      const publicPredictionsResponse = await fetch("/api/public-predictions");
      const publicPredictionsData = await publicPredictionsResponse.json();

      setPublicPredictionsOpen(publicPredictionsData.deadlinePassed === true);

      const { data: predictions } = await supabase
        .from("predictions")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (predictions && predictions.length > 0) {
        setHasPredictions(true);
      }
    }

    loadUser();
  }, []);

  useEffect(() => {
    if (predictionsSaved) {
      setShowPopup(true);

      const timer = setTimeout(() => {
        setShowPopup(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [predictionsSaved]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-5xl font-bold">Overview</h1>
            <p className="text-gray-400 mt-2">Ingelogd als: {email}</p>
          </div>

          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-6 py-3 rounded-xl font-bold cursor-pointer hover:opacity-90 transition"
          >
            Uitloggen
          </button>
        </div>

        {showPopup && (
          <div className="bg-green-500/20 border border-green-500 text-green-300 rounded-xl p-4 mb-6 animate-pulse">
            Voorspellingen succesvol ingediend!
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <h2 className="text-3xl font-bold mb-4">Tussenstand</h2>

            <div className="flex flex-col gap-3 text-gray-300">
              {standings.length === 0 ? (
                <p className="text-gray-400">Nog geen spelers gevonden.</p>
              ) : (
                standings.map((player, index) => (
                  <div
                    key={player.userId}
                    className="flex justify-between border-b border-white/10 pb-2"
                  >
                    <span>
                      {index + 1}. {player.name}
                    </span>
                    <span>{player.totalPoints} punten</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <h2 className="text-3xl font-bold mb-4">Acties</h2>

            <div className="flex flex-col gap-4">
              <Link
                href="/dashboard"
                className="block rounded-xl bg-white text-black px-6 py-3 font-bold text-center cursor-pointer hover:opacity-90 transition"
              >
                {hasPredictions
                  ? "Voorspellingen veranderen"
                  : "Voorspellingen invullen"}
              </Link>

              <Link
                href="/previous-round"
                className="block rounded-xl border border-white/20 text-white px-6 py-3 font-bold text-center cursor-pointer hover:bg-white/10 transition"
              >
                Score vorige ronde
              </Link>

              {publicPredictionsOpen ? (
                <Link
                    href="/predictions"
                    className="block rounded-xl border border-white/20 text-white px-6 py-3 font-bold text-center cursor-pointer hover:bg-white/10 transition"
                >
                    Openbare voorspellingen
                </Link>
              ) : (
                <button
                    disabled
                    className="block w-full rounded-xl border border-white/10 text-gray-500 px-6 py-3 font-bold text-center cursor-not-allowed opacity-50"
                >
                    Openbare voorspellingen
                </button>
            )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function OverviewPage() {
  return (
    <Suspense fallback={null}>
      <OverviewContent />
    </Suspense>
  );
}