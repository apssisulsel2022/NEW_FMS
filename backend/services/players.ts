import type { SupabaseClient } from "@supabase/supabase-js";

export type CreatePlayerInput = {
  eventOrganizerId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  nationality?: string | null;
  gender?: string | null;
  photoPath?: string | null;
  nikEncrypted?: string | null;
  nikHmac?: string | null;
  nikLast4?: string | null;
};

export type UpdatePlayerInput = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string | null;
  nationality?: string | null;
  gender?: string | null;
  photoPath?: string | null;
  status?: string;
  nikEncrypted?: string | null;
  nikHmac?: string | null;
  nikLast4?: string | null;
  nikSetAt?: string | null;
};

const playerSelect =
  "id,created_at,updated_at,status,event_organizer_id,first_name,last_name,date_of_birth,nationality,gender,photo_path,nik_last4,nik_set_at";

export async function listPlayers(
  supabase: SupabaseClient,
  params: {
    eventOrganizerId: string;
    limit?: number;
    offset?: number;
    q?: string | null;
    sortBy?: "created_at" | "last_name" | "first_name";
    sortOrder?: "asc" | "desc";
    status?: string | null;
  }
) {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  let query = supabase
    .from("players")
    .select(playerSelect, { count: "exact" })
    .eq("event_organizer_id", params.eventOrganizerId)
    .range(offset, offset + limit - 1);

  if (params.status) query = query.eq("status", params.status);
  if (params.q) query = query.or(`first_name.ilike.%${params.q}%,last_name.ilike.%${params.q}%`);

  const sortBy = params.sortBy ?? "created_at";
  const sortOrder = params.sortOrder ?? "desc";
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function getPlayer(supabase: SupabaseClient, params: { id: string }) {
  const { data, error } = await supabase
    .from("players")
    .select(playerSelect)
    .eq("id", params.id)
    .single();
  if (error) throw error;
  return data;
}

export async function createPlayer(supabase: SupabaseClient, input: CreatePlayerInput) {
  const { data, error } = await supabase
    .from("players")
    .insert({
      event_organizer_id: input.eventOrganizerId,
      first_name: input.firstName,
      last_name: input.lastName,
      date_of_birth: input.dateOfBirth ?? null,
      nationality: input.nationality ?? null,
      gender: input.gender ?? null,
      photo_path: input.photoPath ?? null,
      nik_encrypted: input.nikEncrypted ?? null,
      nik_hmac: input.nikHmac ?? null,
      nik_last4: input.nikLast4 ?? null,
      nik_set_at: input.nikEncrypted ? new Date().toISOString() : null
    })
    .select(playerSelect)
    .single();

  if (error) throw error;
  return data;
}

export async function updatePlayer(supabase: SupabaseClient, params: { id: string; patch: UpdatePlayerInput }) {
  const patch = params.patch;
  const update: any = {};
  if (patch.firstName !== undefined) update.first_name = patch.firstName;
  if (patch.lastName !== undefined) update.last_name = patch.lastName;
  if (patch.dateOfBirth !== undefined) update.date_of_birth = patch.dateOfBirth;
  if (patch.nationality !== undefined) update.nationality = patch.nationality;
  if (patch.gender !== undefined) update.gender = patch.gender;
  if (patch.photoPath !== undefined) update.photo_path = patch.photoPath;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.nikEncrypted !== undefined) update.nik_encrypted = patch.nikEncrypted;
  if (patch.nikHmac !== undefined) update.nik_hmac = patch.nikHmac;
  if (patch.nikLast4 !== undefined) update.nik_last4 = patch.nikLast4;
  if (patch.nikSetAt !== undefined) update.nik_set_at = patch.nikSetAt;

  const { data, error } = await supabase
    .from("players")
    .update(update)
    .eq("id", params.id)
    .select(playerSelect)
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlayer(supabase: SupabaseClient, params: { id: string }) {
  const { error } = await supabase.from("players").delete().eq("id", params.id);
  if (error) throw error;
}
