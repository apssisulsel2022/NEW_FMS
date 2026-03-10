import type { SupabaseClient } from "@supabase/supabase-js";

export type CompetitionDraftPayload = Record<string, unknown>;

export type CreateCompetitionDraftInput = {
  eventOrganizerId: string;
  createdByUserId: string;
  templateId?: string | null;
  step?: number;
  payload?: CompetitionDraftPayload;
  previewEnabled?: boolean;
};

export type UpdateCompetitionDraftInput = Partial<CreateCompetitionDraftInput> & {
  publishedCompetitionId?: string | null;
  status?: string;
};

export async function listCompetitionDrafts(
  supabase: SupabaseClient,
  params: { eventOrganizerId: string; createdByUserId?: string | null; limit?: number; offset?: number }
) {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  let q = supabase
    .from("competition_drafts")
    .select("*", { count: "exact" })
    .eq("event_organizer_id", params.eventOrganizerId)
    .range(offset, offset + limit - 1)
    .order("updated_at", { ascending: false });

  if (params.createdByUserId) q = q.eq("created_by_user_id", params.createdByUserId);

  const { data, error, count } = await q;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function getCompetitionDraft(supabase: SupabaseClient, params: { id: string }) {
  const { data, error } = await supabase.from("competition_drafts").select("*").eq("id", params.id).single();
  if (error) throw error;
  return data;
}

export async function createCompetitionDraft(supabase: SupabaseClient, input: CreateCompetitionDraftInput) {
  const { data, error } = await supabase
    .from("competition_drafts")
    .insert({
      event_organizer_id: input.eventOrganizerId,
      created_by_user_id: input.createdByUserId,
      template_id: input.templateId ?? null,
      step: input.step ?? 1,
      payload: input.payload ?? {},
      preview_enabled: input.previewEnabled ?? false
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateCompetitionDraft(
  supabase: SupabaseClient,
  params: { id: string; patch: UpdateCompetitionDraftInput }
) {
  const patch = params.patch;
  const update: any = {};
  if (patch.templateId !== undefined) update.template_id = patch.templateId;
  if (patch.step !== undefined) update.step = patch.step;
  if (patch.payload !== undefined) update.payload = patch.payload;
  if (patch.previewEnabled !== undefined) update.preview_enabled = patch.previewEnabled;
  if (patch.publishedCompetitionId !== undefined) update.published_competition_id = patch.publishedCompetitionId;
  if (patch.status !== undefined) update.status = patch.status;

  const { data, error } = await supabase.from("competition_drafts").update(update).eq("id", params.id).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteCompetitionDraft(supabase: SupabaseClient, params: { id: string }) {
  const { error } = await supabase.from("competition_drafts").delete().eq("id", params.id);
  if (error) throw error;
}

