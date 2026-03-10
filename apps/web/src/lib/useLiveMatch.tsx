"use client";

import { useEffect, useMemo, useState } from "react";

import { createSupabasePublicClient } from "@/lib/supabasePublic";

export type LiveMatchEvent = {
  id: string;
  created_at: string;
  event_type: string;
  minute: number | null;
  second: number | null;
  team_id: string | null;
  player_id: string | null;
  payload: Record<string, unknown>;
};

export function useLiveMatch(matchId: string) {
  const supabase = useMemo(() => createSupabasePublicClient(), []);
  const [events, setEvents] = useState<LiveMatchEvent[]>([]);

  useEffect(() => {
    if (!matchId) return;

    let active = true;

    supabase
      .from("match_events")
      .select("id, created_at, event_type, minute, second, team_id, player_id, payload")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) return;
        setEvents((data ?? []) as LiveMatchEvent[]);
      });

    const channel = supabase
      .channel(`match_events:${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "match_events", filter: `match_id=eq.${matchId}` },
        (payload) => {
          setEvents((prev) => [...prev, payload.new as LiveMatchEvent]);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, matchId]);

  return { events };
}

