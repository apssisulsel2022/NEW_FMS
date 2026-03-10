import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateCompetitionInput = {
  eventOrganizerId: string;
  name: string;
  slug: string;
  categoryId?: string | null;
  season?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

export async function listCompetitions(
  supabase: SupabaseClient,
  params: {
    eventOrganizerId: string;
    limit?: number;
    offset?: number;
    q?: string | null;
    sortBy?: "created_at" | "name" | "published_at";
    sortOrder?: "asc" | "desc";
    status?: string | null;
  }
) {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  let query = supabase
    .from("competitions")
    .select("*", { count: "exact" })
    .eq("event_organizer_id", params.eventOrganizerId)
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

export async function getCompetition(supabase: SupabaseClient, params: { id: string }) {
  const { data, error } = await supabase.from("competitions").select("*").eq("id", params.id).single();
  if (error) throw error;
  return data;
}

export async function createCompetition(supabase: SupabaseClient, input: CreateCompetitionInput) {
  const { data, error } = await supabase
    .from("competitions")
    .insert({
      event_organizer_id: input.eventOrganizerId,
      name: input.name,
      slug: input.slug,
      category_id: input.categoryId ?? null,
      season: input.season ?? null,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export type UpdateCompetitionInput = {
  name?: string;
  slug?: string;
  categoryId?: string | null;
  season?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string;
};

export async function updateCompetition(
  supabase: SupabaseClient,
  params: { id: string; patch: UpdateCompetitionInput }
) {
  const patch = params.patch;
  const update: any = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.slug !== undefined) update.slug = patch.slug;
  if (patch.categoryId !== undefined) update.category_id = patch.categoryId;
  if (patch.season !== undefined) update.season = patch.season;
  if (patch.startDate !== undefined) update.start_date = patch.startDate;
  if (patch.endDate !== undefined) update.end_date = patch.endDate;
  if (patch.status !== undefined) update.status = patch.status;

  const { data, error } = await supabase.from("competitions").update(update).eq("id", params.id).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteCompetition(supabase: SupabaseClient, params: { id: string }) {
  const { error } = await supabase.from("competitions").delete().eq("id", params.id);
  if (error) throw error;
}

export async function publishCompetition(supabase: SupabaseClient, params: { id: string }) {
  const { data, error } = await supabase
    .from("competitions")
    .update({ published_at: new Date().toISOString() })
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
