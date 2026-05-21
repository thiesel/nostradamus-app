"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleRegister() {

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        alert(error.message);
        return;
    }

    const user = data.user;

    if (!user) {
        alert("Gebruiker niet gevonden");
        return;
    }

    const { error: profileError } = await supabase
        .from("profiles")
        .insert({
            id: user.id,
            display_name: name,
        });

    if (profileError) {
        alert(profileError.message);
        return;
    }

    //alert("Account succesvol aangemaakt!");
    //console.log(data);
    window.location.href = "/?registered=true";

    /*if (error) {
      alert(error.message);
      return;
    }*/

  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8">

        <h1 className="text-4xl font-bold mb-6 text-center">
          Account aanmaken
        </h1>

        <div className="flex flex-col gap-4">

          <input
            type="text"
            placeholder="Naam"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl bg-black border border-white/20 px-4 py-3"
          />

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
            onClick={handleRegister}
            className="rounded-xl bg-white text-black px-6 py-3 font-bold cursor-pointer hover:opacity-90 transition"
          >
            Account aanmaken
          </button>

        </div>
      </div>
    </main>
  );
}