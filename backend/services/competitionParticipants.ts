import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateCompetitionParticipantInput = {
  eventOrganizerId: string;
  competitionId: string;
  participantType?: "team" | "player" | "user";
  teamId?: string | null;
  playerId?: string | null;
  userId?: string | null;
  registrationStatus?: string;
  paymentStatus?: string;
  externalRef?: string | null;
  meta?: Record<string, unknown>;
};

export type UpdateCompetitionParticipantInput = Partial<CreateCompetitionParticipantInput> & { status?: string };

export async function listCompetitionParticipants(
  supabase: SupabaseClient,
  params: { competitionId: string; participantType?: string | null; limit?: number; offset?: number }
) {
  const limit = params.limit ?? 100;
  const offset = params.offset ?? 0;

  let q = supabase
    .from("competition_participants")
    .select("*", { count: "exact" })
    .eq("competition_id", params.competitionId)
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: false });

  if (params.participantType) q = q.eq("participant_type", params.participantType);

  const { data, error, count } = await q;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function createCompetitionParticipant(supabase: SupabaseClient, input: CreateCompetitionParticipantInput) {
  const { data, error } = await supabase
    .from("competition_participants")
    .insert({
      event_organizer_id: input.eventOrganizerId,
      competition_id: input.competitionId,
      participant_type: input.participantType ?? "team",
      team_id: input.teamId ?? null,
      player_id: input.playerId ?? null,
      user_id: input.userId ?? null,
      registration_status: input.registrationStatus ?? "registered",
      payment_status: input.paymentStatus ?? "not_required",
      external_ref: input.externalRef ?? null,
      meta: input.meta ?? {}
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCompetitionParticipant(supabase: SupabaseClient, params: { id: string }) {
  const { error } = await supabase.from("competition_participants").delete().eq("id", params.id);
  if (error) throw error;
}

