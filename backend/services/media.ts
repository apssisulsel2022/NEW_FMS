import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateMediaInput = {
  eventOrganizerId: string;
  mediaType: string;
  storagePath: string;
  competitionId?: string | null;
  matchId?: string | null;
  meta?: Record<string, unknown>;
};

export type UpdateMediaInput = {
  mediaType?: string;
  storagePath?: string;
  meta?: Record<string, unknown>;
  status?: string;
};

export async function listMedia(
  supabase: SupabaseClient,
  params: {
    eventOrganizerId: string;
    competitionId?: string | null;
    matchId?: string | null;
    mediaType?: string | null;
    limit?: number;
    offset?: number;
    sortBy?: "created_at";
    sortOrder?: "asc" | "desc";
  }
) {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const sortBy = params.sortBy ?? "created_at";
  const sortOrder = params.sortOrder ?? "desc";

  let query = supabase
    .from("generated_media")
    .select("*", { count: "exact" })
    .eq("event_organizer_id", params.eventOrganizerId)
    .range(offset, offset + limit - 1)
    .order(sortBy, { ascending: sortOrder === "asc" });

  if (params.competitionId) query = query.eq("competition_id", params.competitionId);
  if (params.matchId) query = query.eq("match_id", params.matchId);
  if (params.mediaType) query = query.eq("media_type", params.mediaType);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function getMedia(supabase: SupabaseClient, params: { id: string }) {
  const { data, error } = await supabase.from("generated_media").select("*").eq("id", params.id).single();
  if (error) throw error;
  return data;
}

export async function createMedia(supabase: SupabaseClient, input: CreateMediaInput) {
  const { data, error } = await supabase
    .from("generated_media")
    .insert({
      event_organizer_id: input.eventOrganizerId,
      competition_id: input.competitionId ?? null,
      match_id: input.matchId ?? null,
      media_type: input.mediaType,
      storage_path: input.storagePath,
      meta: input.meta ?? {}
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateMedia(supabase: SupabaseClient, params: { id: string; patch: UpdateMediaInput }) {
  const patch = params.patch;
  const update: any = {};
  if (patch.mediaType !== undefined) update.media_type = patch.mediaType;
  if (patch.storagePath !== undefined) update.storage_path = patch.storagePath;
  if (patch.meta !== undefined) update.meta = patch.meta;
  if (patch.status !== undefined) update.status = patch.status;

  const { data, error } = await supabase
    .from("generated_media")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMedia(supabase: SupabaseClient, params: { id: string }) {
  const { error } = await supabase.from("generated_media").delete().eq("id", params.id);
  if (error) throw error;
}

