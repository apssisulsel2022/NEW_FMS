import type { SupabaseClient } from "@supabase/supabase-js";

export async function listStandings(
  supabase: SupabaseClient,
  params: { competitionId: string; limit?: number; offset?: number; sortBy?: string; sortOrder?: "asc" | "desc" }
) {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const sortBy = params.sortBy ?? "points";
  const sortOrder = params.sortOrder ?? "desc";

  const { data, error, count } = await supabase
    .from("standings")
    .select("*", { count: "exact" })
    .eq("competition_id", params.competitionId)
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function listPlayerStatistics(
  supabase: SupabaseClient,
  params: {
    eventOrganizerId: string;
    competitionId?: string | null;
    teamId?: string | null;
    playerId?: string | null;
    limit?: number;
    offset?: number;
  }
) {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  let query = supabase
    .from("player_statistics")
    .select("*", { count: "exact" })
    .eq("event_organizer_id", params.eventOrganizerId)
    .range(offset, offset + limit - 1);

  if (params.competitionId) query = query.eq("competition_id", params.competitionId);
  if (params.teamId) query = query.eq("team_id", params.teamId);
  if (params.playerId) query = query.eq("player_id", params.playerId);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function getCompetitionStatistics(supabase: SupabaseClient, params: { competitionId: string }) {
  const { data, error } = await supabase
    .from("competition_statistics")
    .select("*")
    .eq("competition_id", params.competitionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

