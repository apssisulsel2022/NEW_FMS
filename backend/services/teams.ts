import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateTeamInput = {
  eventOrganizerId: string;
  competitionId: string;
  name: string;
  slug: string;
  logoPath?: string | null;
};

export async function listTeams(
  supabase: SupabaseClient,
  params: {
    competitionId: string;
    limit?: number;
    offset?: number;
    q?: string | null;
    sortBy?: "created_at" | "name";
    sortOrder?: "asc" | "desc";
    status?: string | null;
  }
) {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  let query = supabase
    .from("teams")
    .select("*", { count: "exact" })
    .eq("competition_id", params.competitionId)
    .range(offset, offset + limit - 1);

  if (params.status) query = query.eq("status", params.status);
  if (params.q) query = query.ilike("name", `%${params.q}%`);

  const sortBy = params.sortBy ?? "created_at";
  const sortOrder = params.sortOrder ?? "desc";
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function getTeam(supabase: SupabaseClient, params: { id: string }) {
  const { data, error } = await supabase.from("teams").select("*").eq("id", params.id).single();
  if (error) throw error;
  return data;
}

export async function createTeam(supabase: SupabaseClient, input: CreateTeamInput) {
  const { data, error } = await supabase
    .from("teams")
    .insert({
      event_organizer_id: input.eventOrganizerId,
      competition_id: input.competitionId,
      name: input.name,
      slug: input.slug,
      logo_path: input.logoPath ?? null
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export type UpdateTeamInput = {
  name?: string;
  slug?: string;
  logoPath?: string | null;
  status?: string;
};

export async function updateTeam(supabase: SupabaseClient, params: { id: string; patch: UpdateTeamInput }) {
  const patch = params.patch;
  const update: any = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.slug !== undefined) update.slug = patch.slug;
  if (patch.logoPath !== undefined) update.logo_path = patch.logoPath;
  if (patch.status !== undefined) update.status = patch.status;

  const { data, error } = await supabase.from("teams").update(update).eq("id", params.id).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteTeam(supabase: SupabaseClient, params: { id: string }) {
  const { error } = await supabase.from("teams").delete().eq("id", params.id);
  if (error) throw error;
}
