import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateParticipantImportJobInput = {
  eventOrganizerId: string;
  competitionId: string;
  createdByUserId: string;
  sourceType?: string;
  sourceMeta?: Record<string, unknown>;
  jobStatus?: string;
  result?: Record<string, unknown>;
};

export async function createParticipantImportJob(supabase: SupabaseClient, input: CreateParticipantImportJobInput) {
  const { data, error } = await supabase
    .from("competition_participant_import_jobs")
    .insert({
      event_organizer_id: input.eventOrganizerId,
      competition_id: input.competitionId,
      created_by_user_id: input.createdByUserId,
      job_status: input.jobStatus ?? "queued",
      source_type: input.sourceType ?? "csv",
      source_meta: input.sourceMeta ?? {},
      result: input.result ?? {}
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateParticipantImportJob(
  supabase: SupabaseClient,
  params: { id: string; patch: { jobStatus?: string; result?: Record<string, unknown> } }
) {
  const update: any = {};
  if (params.patch.jobStatus !== undefined) update.job_status = params.patch.jobStatus;
  if (params.patch.result !== undefined) update.result = params.patch.result;

  const { data, error } = await supabase
    .from("competition_participant_import_jobs")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

