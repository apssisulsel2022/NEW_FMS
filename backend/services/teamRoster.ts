import type { SupabaseClient } from "@supabase/supabase-js";

import { getMaxRosterSize, validatePlayerEligibility } from "./rosterEligibility";

export type RosterPlayerStatus = "active" | "injured" | "suspended" | "inactive";

export async function getTeamContext(supabase: SupabaseClient, params: { teamId: string }) {
  const { data, error } = await supabase
    .from("teams")
    .select("id,event_organizer_id,competition_id,team_profile_id,name")
    .eq("id", params.teamId)
    .single();
  if (error) throw error;
  return data as any;
}

export async function getCompetitionEligibilityCriteria(supabase: SupabaseClient, params: { competitionId: string }) {
  const { data, error } = await supabase
    .from("competitions")
    .select("id,eligibility_criteria,registration_closes_at")
    .eq("id", params.competitionId)
    .single();
  if (error) throw error;
  return data as any;
}

export async function listTeamRoster(
  supabase: SupabaseClient,
  params: { teamId: string; q?: string | null; rosterStatus?: string | null; position?: string | null; limit?: number; offset?: number }
) {
  const limit = params.limit ?? 100;
  const offset = params.offset ?? 0;

  let q = supabase
    .from("team_players")
    .select(
      "id,created_at,updated_at,status,event_organizer_id,team_id,player_id,jersey_number,position,start_date,end_date,roster_status,players:player_id(id,player_code,first_name,last_name,date_of_birth,nationality,gender,photo_path,email,phone,primary_position,jersey_number_preference)",
      { count: "exact" }
    )
    .eq("team_id", params.teamId)
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: false });

  if (params.rosterStatus) q = q.eq("roster_status", params.rosterStatus);
  if (params.position) q = q.eq("position", params.position);
  if (params.q) {
    q = q.or(`players.first_name.ilike.%${params.q}%,players.last_name.ilike.%${params.q}%,players.email.ilike.%${params.q}%`);
  }

  const { data, error, count } = await q;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function upsertPlayerByEmail(
  supabase: SupabaseClient,
  params: {
    eventOrganizerId: string;
    player: {
      firstName: string;
      lastName: string;
      dateOfBirth?: string | null;
      nationality?: string | null;
      gender?: string | null;
      photoPath?: string | null;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      emergencyContactName?: string | null;
      emergencyContactPhone?: string | null;
      primaryPosition?: string | null;
      jerseyNumberPreference?: number | null;
    };
  }
) {
  const email = params.player.email ? params.player.email.trim().toLowerCase() : null;

  if (email) {
    const { data: existing, error: existingError } = await supabase
      .from("players")
      .select("id")
      .eq("event_organizer_id", params.eventOrganizerId)
      .ilike("email", email)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing?.id) return { id: existing.id, created: false };
  }

  const { data, error } = await supabase
    .from("players")
    .insert({
      event_organizer_id: params.eventOrganizerId,
      first_name: params.player.firstName,
      last_name: params.player.lastName,
      date_of_birth: params.player.dateOfBirth ?? null,
      nationality: params.player.nationality ?? null,
      gender: params.player.gender ?? null,
      photo_path: params.player.photoPath ?? null,
      email,
      phone: params.player.phone ?? null,
      address: params.player.address ?? null,
      emergency_contact_name: params.player.emergencyContactName ?? null,
      emergency_contact_phone: params.player.emergencyContactPhone ?? null,
      primary_position: params.player.primaryPosition ?? null,
      jersey_number_preference: params.player.jerseyNumberPreference ?? null
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id as string, created: true };
}

export async function addPlayerToRoster(
  supabase: SupabaseClient,
  params: {
    teamId: string;
    playerId?: string | null;
    player?: {
      firstName: string;
      lastName: string;
      dateOfBirth?: string | null;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      emergencyContactName?: string | null;
      emergencyContactPhone?: string | null;
      primaryPosition?: string | null;
      jerseyNumberPreference?: number | null;
    } | null;
    roster?: { jerseyNumber?: number | null; position?: string | null; rosterStatus?: RosterPlayerStatus | null } | null;
  }
) {
  const team = await getTeamContext(supabase, { teamId: params.teamId });
  const competition = await getCompetitionEligibilityCriteria(supabase, { competitionId: team.competition_id });

  const maxRosterSize = getMaxRosterSize(competition.eligibility_criteria);
  if (maxRosterSize !== null) {
    const { count, error } = await supabase
      .from("team_players")
      .select("id", { count: "exact", head: true })
      .eq("team_id", params.teamId)
      .eq("status", "active")
      .is("end_date", null);
    if (error) throw error;
    if ((count ?? 0) >= maxRosterSize) return { ok: false as const, status: 400 as const, message: `max roster size is ${maxRosterSize}` };
  }

  let playerId = params.playerId ?? null;
  if (!playerId) {
    if (!params.player) return { ok: false as const, status: 400 as const, message: "playerId or player is required" };
    const eligibility = validatePlayerEligibility({
      dateOfBirth: params.player.dateOfBirth ?? null,
      eligibilityCriteria: competition.eligibility_criteria ?? null
    });
    if (!eligibility.ok) return { ok: false as const, status: 400 as const, message: eligibility.message };
    const created = await upsertPlayerByEmail(supabase, { eventOrganizerId: team.event_organizer_id, player: params.player });
    playerId = created.id;
  } else {
    const { data: player, error } = await supabase
      .from("players")
      .select("id,event_organizer_id,date_of_birth")
      .eq("id", playerId)
      .single();
    if (error) throw error;
    if (player.event_organizer_id !== team.event_organizer_id) {
      return { ok: false as const, status: 400 as const, message: "player belongs to a different organizer" };
    }
    const eligibility = validatePlayerEligibility({
      dateOfBirth: player.date_of_birth ? String(player.date_of_birth) : null,
      eligibilityCriteria: competition.eligibility_criteria ?? null
    });
    if (!eligibility.ok) return { ok: false as const, status: 400 as const, message: eligibility.message };
  }

  const rosterStatus = params.roster?.rosterStatus ?? "active";
  const rosterPosition = params.roster?.position ?? (params.player?.primaryPosition ?? null);
  const jerseyNumber = params.roster?.jerseyNumber ?? (params.player?.jerseyNumberPreference ?? null);

  const { data: entry, error: insertError } = await supabase
    .from("team_players")
    .insert({
      event_organizer_id: team.event_organizer_id,
      team_id: params.teamId,
      player_id: playerId,
      jersey_number: jerseyNumber,
      position: rosterPosition,
      roster_status: rosterStatus,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: null
    })
    .select("*")
    .single();
  if (insertError) throw insertError;

  return { ok: true as const, entry, playerId };
}

export async function updateRosterEntry(
  supabase: SupabaseClient,
  params: { id: string; patch: { jerseyNumber?: number | null; position?: string | null; rosterStatus?: RosterPlayerStatus | null } }
) {
  const update: any = {};
  if (params.patch.jerseyNumber !== undefined) update.jersey_number = params.patch.jerseyNumber;
  if (params.patch.position !== undefined) update.position = params.patch.position;
  if (params.patch.rosterStatus !== undefined) update.roster_status = params.patch.rosterStatus;

  const { data, error } = await supabase.from("team_players").update(update).eq("id", params.id).select("*").single();
  if (error) throw error;
  return data;
}

export async function removeRosterEntry(supabase: SupabaseClient, params: { id: string }) {
  const endDate = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("team_players")
    .update({ end_date: endDate, roster_status: "inactive", status: "inactive" })
    .eq("id", params.id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function transferPlayer(
  supabase: SupabaseClient,
  params: { fromTeamId: string; toTeamId: string; playerId: string; position?: string | null; jerseyNumber?: number | null }
) {
  const fromTeam = await getTeamContext(supabase, { teamId: params.fromTeamId });
  const toTeam = await getTeamContext(supabase, { teamId: params.toTeamId });

  if (!fromTeam.team_profile_id || !toTeam.team_profile_id) {
    return { ok: false as const, status: 400 as const, message: "team profile link is required for transfers" };
  }
  if (fromTeam.team_profile_id !== toTeam.team_profile_id) {
    return { ok: false as const, status: 400 as const, message: "teams must belong to the same team profile" };
  }
  if (fromTeam.event_organizer_id !== toTeam.event_organizer_id) {
    return { ok: false as const, status: 400 as const, message: "teams must belong to the same organizer" };
  }

  const { data: current, error: currentError } = await supabase
    .from("team_players")
    .select("id")
    .eq("team_id", params.fromTeamId)
    .eq("player_id", params.playerId)
    .eq("status", "active")
    .is("end_date", null)
    .maybeSingle();
  if (currentError) throw currentError;
  if (!current?.id) return { ok: false as const, status: 404 as const, message: "player not found in fromTeam roster" };

  await removeRosterEntry(supabase, { id: current.id });

  const { data: created, error } = await supabase
    .from("team_players")
    .insert({
      event_organizer_id: toTeam.event_organizer_id,
      team_id: params.toTeamId,
      player_id: params.playerId,
      jersey_number: params.jerseyNumber ?? null,
      position: params.position ?? null,
      roster_status: "active",
      start_date: new Date().toISOString().slice(0, 10),
      end_date: null
    })
    .select("*")
    .single();
  if (error) throw error;

  return { ok: true as const, fromTeamId: params.fromTeamId, toTeamId: params.toTeamId, entry: created };
}

