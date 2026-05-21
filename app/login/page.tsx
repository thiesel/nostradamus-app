"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    //alert("Succesvol ingelogd!");
    //console.log(data);
    window.location.href = "/overview";
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-4xl font-bold mb-6 text-center">
          Inloggen
        </h1>

        <div className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl bg-black border border-white/20 px-4 py-3"
          />

          <input
            type="password"
            placeholder="Wachtwoord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl bg-black border border-white/20 px-4 py-3"
          />

          <button
            onClick={handleLogin}
            className="rounded-xl bg-white text-black px-6 py-3 font-bold cursor-pointer hover:opacity-90 transition"
          >
            Inloggen
          </button>
        </div>
      </div>
    </main>
  );
}