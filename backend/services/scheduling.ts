import type { SupabaseClient } from "@supabase/supabase-js";

import { generateRoundRobinFixtures } from "../../ai/fixture-generator/roundRobin";

export async function generateRoundRobinSchedule(
  supabase: SupabaseClient,
  params: {
    eventOrganizerId: string;
    competitionId: string;
    startAt: string;
    matchIntervalMinutes?: number;
    doubleRound?: boolean;
  }
) {
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id")
    .eq("competition_id", params.competitionId)
    .eq("status", "active");
  if (teamsError) throw teamsError;

  const teamIds = (teams ?? []).map((t) => t.id);
  const fixtures = generateRoundRobinFixtures(teamIds, { doubleRound: params.doubleRound ?? true });

  const start = new Date(params.startAt).getTime();
  const intervalMs = (params.matchIntervalMinutes ?? 120) * 60_000;

  const rows = fixtures.map((f, idx) => ({
    event_organizer_id: params.eventOrganizerId,
    competition_id: params.competitionId,
    home_team_id: f.homeTeamId,
    away_team_id: f.awayTeamId,
    scheduled_at: new Date(start + idx * intervalMs).toISOString(),
    venue: null
  }));

  if (rows.length === 0) return { created: 0, fixtures: [] as any[] };

  const { data: created, error } = await supabase.from("matches").insert(rows).select("id, scheduled_at, home_team_id, away_team_id");
  if (error) throw error;

  return { created: created?.length ?? 0, fixtures: created ?? [] };
}

