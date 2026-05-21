"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function Home() {

  const searchParams = useSearchParams();

  const registered = searchParams.get("registered");

  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {

    if (registered) {

      setShowPopup(true);

      const timer = setTimeout(() => {
        setShowPopup(false);
      }, 3000);

      return () => clearTimeout(timer);

    }

  }, [registered]);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-xl">

        <h1 className="text-5xl font-bold mb-3">
          Nostradamus
        </h1>

        <p className="text-gray-300 mb-8">
          Eredivisie voorspellingen
        </p>

        {showPopup && (
          <div className="bg-green-500/20 border border-green-500 text-green-300 rounded-xl p-4 mb-6 animate-pulse">
            Account succesvol aangemaakt!
          </div>
        )}

        <div className="flex flex-col gap-4">

          <Link
            href="/login"
            className="rounded-xl bg-white text-black px-6 py-3 font-bold cursor-pointer hover:opacity-90 transition"
          >
            Inloggen
          </Link>

          <Link
            href="/register"
            className="rounded-xl border border-white/20 px-6 py-3 font-bold cursor-pointer hover:bg-white/10 transition"
          >
            Account aanmaken
          </Link>

        </div>
      </div>
    </main>
  );
}