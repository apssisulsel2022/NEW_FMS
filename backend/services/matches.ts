import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateMatchInput = {
  eventOrganizerId: string;
  competitionId: string;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt?: string | null;
  venue?: string | null;
};

export type CreateMatchEventInput = {
  eventOrganizerId: string;
  matchId: string;
  teamId?: string | null;
  playerId?: string | null;
  eventType: string;
  minute?: number | null;
  second?: number | null;
  payload?: Record<string, unknown>;
};

export async function listMatches(
  supabase: SupabaseClient,
  params: {
    competitionId: string;
    limit?: number;
    offset?: number;
    q?: string | null;
    sortBy?: "scheduled_at" | "created_at";
    sortOrder?: "asc" | "desc";
    matchStatus?: string | null;
  }
) {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  let query = supabase
    .from("matches")
    .select("*", { count: "exact" })
    .eq("competition_id", params.competitionId)
    .range(offset, offset + limit - 1);

  if (params.matchStatus) query = query.eq("match_status", params.matchStatus);
  if (params.q) query = query.ilike("venue", `%${params.q}%`);

  const sortBy = params.sortBy ?? "scheduled_at";
  const sortOrder = params.sortOrder ?? "asc";
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function getMatch(supabase: SupabaseClient, params: { id: string }) {
  const { data, error } = await supabase.from("matches").select("*").eq("id", params.id).single();
  if (error) throw error;
  return data;
}

export async function createMatch(supabase: SupabaseClient, input: CreateMatchInput) {
  const { data, error } = await supabase
    .from("matches")
    .insert({
      event_organizer_id: input.eventOrganizerId,
      competition_id: input.competitionId,
      home_team_id: input.homeTeamId,
      away_team_id: input.awayTeamId,
      scheduled_at: input.scheduledAt ?? null,
      venue: input.venue ?? null
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export type UpdateMatchInput = {
  scheduledAt?: string | null;
  venue?: string | null;
  matchStatus?: string;
  publishedReport?: boolean;
  status?: string;
};

export async function updateMatch(supabase: SupabaseClient, params: { id: string; patch: UpdateMatchInput }) {
  const patch = params.patch;
  const update: any = {};
  if (patch.scheduledAt !== undefined) update.scheduled_at = patch.scheduledAt;
  if (patch.venue !== undefined) update.venue = patch.venue;
  if (patch.matchStatus !== undefined) update.match_status = patch.matchStatus;
  if (patch.publishedReport !== undefined) update.published_report = patch.publishedReport;
  if (patch.status !== undefined) update.status = patch.status;

  const { data, error } = await supabase.from("matches").update(update).eq("id", params.id).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteMatch(supabase: SupabaseClient, params: { id: string }) {
  const { error } = await supabase.from("matches").delete().eq("id", params.id);
  if (error) throw error;
}

export async function createMatchEvent(supabase: SupabaseClient, input: CreateMatchEventInput) {
  const { data, error } = await supabase
    .from("match_events")
    .insert({
      event_organizer_id: input.eventOrganizerId,
      match_id: input.matchId,
      team_id: input.teamId ?? null,
      player_id: input.playerId ?? null,
      event_type: input.eventType,
      minute: input.minute ?? null,
      second: input.second ?? null,
      payload: input.payload ?? {}
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listMatchEvents(
  supabase: SupabaseClient,
  params: { matchId: string; limit?: number; offset?: number; sortOrder?: "asc" | "desc" }
) {
  const limit = params.limit ?? 200;
  const offset = params.offset ?? 0;
  const sortOrder = params.sortOrder ?? "asc";

  const { data, error, count } = await supabase
    .from("match_events")
    .select("*", { count: "exact" })
    .eq("match_id", params.matchId)
    .order("created_at", { ascending: sortOrder === "asc" })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function updateScore(
  supabase: SupabaseClient,
  params: { matchId: string; homeScore: number; awayScore: number; matchStatus?: string }
) {
  const { data, error } = await supabase
    .from("matches")
    .update({
      home_score: params.homeScore,
      away_score: params.awayScore,
      match_status: params.matchStatus
    })
    .eq("id", params.matchId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
