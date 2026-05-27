import { createClient } from "@supabase/supabase-js";
import {
  getDebugCurrentMatchday,
  getDebugPreviousMatchday,
} from "@/lib/debug";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export type ActiveRound = {
  id: number;
  round_number: number;
  deadline: string | null;
  bonus_match_id: number | null;
  loser_user_id: string | null;
  processed: boolean;
};

export async function getActiveRound() {
  const { data: rounds, error } = await supabase
    .from("rounds")
    .select(
      "id, round_number, deadline, bonus_match_id, loser_user_id, processed"
    )
    .order("round_number", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  if (!rounds || rounds.length === 0) {
    return null;
  }

  const debugCurrentMatchday = getDebugCurrentMatchday();

  if (debugCurrentMatchday) {
    const debugRound = rounds.find(
      (round) => round.round_number === debugCurrentMatchday
    );

    if (debugRound) {
      return debugRound as ActiveRound;
    }
  }

  const activeRound = rounds.find((round) => round.processed === false);

  if (activeRound) {
    return activeRound as ActiveRound;
  }

  return rounds[rounds.length - 1] as ActiveRound;
}

export async function getPreviousRound() {
  const { data: rounds, error } = await supabase
    .from("rounds")
    .select(
      "id, round_number, deadline, bonus_match_id, loser_user_id, processed"
    )
    .order("round_number", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  if (!rounds || rounds.length === 0) {
    return null;
  }

  const debugPreviousMatchday = getDebugPreviousMatchday();

  if (debugPreviousMatchday) {
    const debugRound = rounds.find(
      (round) => round.round_number === debugPreviousMatchday
    );

    if (debugRound) {
      return debugRound as ActiveRound;
    }
  }

  const activeRound = await getActiveRound();

  if (!activeRound) {
    return null;
  }

  const previousRound = rounds
    .filter((round) => round.round_number < activeRound.round_number)
    .sort((a, b) => b.round_number - a.round_number)[0];

  return previousRound ? (previousRound as ActiveRound) : null;
}