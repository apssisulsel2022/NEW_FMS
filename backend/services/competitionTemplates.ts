import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateCompetitionTemplateInput = {
  eventOrganizerId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  payload?: Record<string, unknown>;
};

export type UpdateCompetitionTemplateInput = Partial<CreateCompetitionTemplateInput> & { status?: string };

export async function listCompetitionTemplates(
  supabase: SupabaseClient,
  params: { eventOrganizerId?: string | null; limit?: number; offset?: number }
) {
  const limit = params.limit ?? 100;
  const offset = params.offset ?? 0;

  let q = supabase.from("competition_templates").select("*", { count: "exact" }).range(offset, offset + limit - 1);

  if (params.eventOrganizerId) {
    q = q.or(`event_organizer_id.eq.${params.eventOrganizerId},event_organizer_id.is.null`);
  }

  const { data, error, count } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function getCompetitionTemplate(supabase: SupabaseClient, params: { id: string }) {
  const { data, error } = await supabase.from("competition_templates").select("*").eq("id", params.id).single();
  if (error) throw error;
  return data;
}

export async function createCompetitionTemplate(supabase: SupabaseClient, input: CreateCompetitionTemplateInput) {
  const { data, error } = await supabase
    .from("competition_templates")
    .insert({
      event_organizer_id: input.eventOrganizerId ?? null,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      payload: input.payload ?? {}
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateCompetitionTemplate(
  supabase: SupabaseClient,
  params: { id: string; patch: UpdateCompetitionTemplateInput }
) {
  const patch = params.patch;
  const update: any = {};
  if (patch.eventOrganizerId !== undefined) update.event_organizer_id = patch.eventOrganizerId;
  if (patch.code !== undefined) update.code = patch.code;
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.payload !== undefined) update.payload = patch.payload;
  if (patch.status !== undefined) update.status = patch.status;

  const { data, error } = await supabase
    .from("competition_templates")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCompetitionTemplate(supabase: SupabaseClient, params: { id: string }) {
  const { error } = await supabase.from("competition_templates").delete().eq("id", params.id);
  if (error) throw error;
}

