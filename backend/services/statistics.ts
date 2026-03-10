import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateStandingInput = {
  eventOrganizerId: string;
  competitionId: string;
  teamId: string;
  played?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  goalDiff?: number;
  points?: number;
};

export type UpdateStandingInput = Partial<
  Omit<CreateStandingInput, "eventOrganizerId" | "competitionId" | "teamId"> & { status: string }
>;

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

export async function getStanding(supabase: SupabaseClient, params: { id: string }) {
  const { data, error } = await supabase.from("standings").select("*").eq("id", params.id).single();
  if (error) throw error;
  return data;
}

export async function createStanding(supabase: SupabaseClient, input: CreateStandingInput) {
  const { data, error } = await supabase
    .from("standings")
    .insert({
      event_organizer_id: input.eventOrganizerId,
      competition_id: input.competitionId,
      team_id: input.teamId,
      played: input.played ?? 0,
      wins: input.wins ?? 0,
      draws: input.draws ?? 0,
      losses: input.losses ?? 0,
      goals_for: input.goalsFor ?? 0,
      goals_against: input.goalsAgainst ?? 0,
      goal_diff: input.goalDiff ?? 0,
      points: input.points ?? 0
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateStanding(supabase: SupabaseClient, params: { id: string; patch: UpdateStandingInput }) {
  const patch = params.patch;
  const update: any = {};
  if (patch.played !== undefined) update.played = patch.played;
  if (patch.wins !== undefined) update.wins = patch.wins;
  if (patch.draws !== undefined) update.draws = patch.draws;
  if (patch.losses !== undefined) update.losses = patch.losses;
  if (patch.goalsFor !== undefined) update.goals_for = patch.goalsFor;
  if (patch.goalsAgainst !== undefined) update.goals_against = patch.goalsAgainst;
  if (patch.goalDiff !== undefined) update.goal_diff = patch.goalDiff;
  if (patch.points !== undefined) update.points = patch.points;
  if ((patch as any).status !== undefined) update.status = (patch as any).status;

  const { data, error } = await supabase.from("standings").update(update).eq("id", params.id).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteStanding(supabase: SupabaseClient, params: { id: string }) {
  const { error } = await supabase.from("standings").delete().eq("id", params.id);
  if (error) throw error;
}

export type CreatePlayerStatisticsInput = {
  eventOrganizerId: string;
  playerId: string;
  competitionId?: string | null;
  teamId?: string | null;
  stats?: Record<string, unknown>;
};

export type UpdatePlayerStatisticsInput = {
  competitionId?: string | null;
  teamId?: string | null;
  stats?: Record<string, unknown>;
  status?: string;
};

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

export async function getPlayerStatistics(supabase: SupabaseClient, params: { id: string }) {
  const { data, error } = await supabase.from("player_statistics").select("*").eq("id", params.id).single();
  if (error) throw error;
  return data;
}

export async function createPlayerStatistics(supabase: SupabaseClient, input: CreatePlayerStatisticsInput) {
  const { data, error } = await supabase
    .from("player_statistics")
    .insert({
      event_organizer_id: input.eventOrganizerId,
      competition_id: input.competitionId ?? null,
      player_id: input.playerId,
      team_id: input.teamId ?? null,
      stats: input.stats ?? {}
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updatePlayerStatistics(
  supabase: SupabaseClient,
  params: { id: string; patch: UpdatePlayerStatisticsInput }
) {
  const patch = params.patch;
  const update: any = {};
  if (patch.competitionId !== undefined) update.competition_id = patch.competitionId;
  if (patch.teamId !== undefined) update.team_id = patch.teamId;
  if (patch.stats !== undefined) update.stats = patch.stats;
  if (patch.status !== undefined) update.status = patch.status;

  const { data, error } = await supabase
    .from("player_statistics")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deletePlayerStatistics(supabase: SupabaseClient, params: { id: string }) {
  const { error } = await supabase.from("player_statistics").delete().eq("id", params.id);
  if (error) throw error;
}

export type CreateCompetitionStatisticsInput = {
  eventOrganizerId: string;
  competitionId: string;
  stats?: Record<string, unknown>;
};

export type UpdateCompetitionStatisticsInput = {
  stats?: Record<string, unknown>;
  status?: string;
};

export async function getCompetitionStatistics(supabase: SupabaseClient, params: { competitionId: string }) {
  const { data, error } = await supabase
    .from("competition_statistics")
    .select("*")
    .eq("competition_id", params.competitionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listCompetitionStatistics(
  supabase: SupabaseClient,
  params: { eventOrganizerId: string; limit?: number; offset?: number }
) {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  const { data, error, count } = await supabase
    .from("competition_statistics")
    .select("*", { count: "exact" })
    .eq("event_organizer_id", params.eventOrganizerId)
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function getCompetitionStatisticsRow(supabase: SupabaseClient, params: { id: string }) {
  const { data, error } = await supabase.from("competition_statistics").select("*").eq("id", params.id).single();
  if (error) throw error;
  return data;
}

export async function createCompetitionStatistics(supabase: SupabaseClient, input: CreateCompetitionStatisticsInput) {
  const { data, error } = await supabase
    .from("competition_statistics")
    .insert({
      event_organizer_id: input.eventOrganizerId,
      competition_id: input.competitionId,
      stats: input.stats ?? {}
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateCompetitionStatistics(
  supabase: SupabaseClient,
  params: { id: string; patch: UpdateCompetitionStatisticsInput }
) {
  const patch = params.patch;
  const update: any = {};
  if (patch.stats !== undefined) update.stats = patch.stats;
  if (patch.status !== undefined) update.status = patch.status;

  const { data, error } = await supabase
    .from("competition_statistics")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCompetitionStatistics(supabase: SupabaseClient, params: { id: string }) {
  const { error } = await supabase.from("competition_statistics").delete().eq("id", params.id);
  if (error) throw error;
}
