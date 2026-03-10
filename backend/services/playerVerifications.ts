import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateVerificationRequestInput = {
  eventOrganizerId: string;
  teamProfileId?: string | null;
  playerId: string;
  createdByUserId: string;
};

export async function listVerificationRequests(
  supabase: SupabaseClient,
  params: {
    eventOrganizerId?: string | null;
    teamProfileId?: string | null;
    workflowStatus?: string | null;
    q?: string | null;
    limit?: number;
    offset?: number;
  }
) {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  let query = supabase
    .from("player_verification_requests")
    .select(
      "id,created_at,updated_at,event_organizer_id,team_profile_id,player_id,workflow_status,submitted_at,ai_status,decided_at,decided_by_user_id,decision,decision_reason,appeal_submitted_at,players:player_id(id,player_code,first_name,last_name,date_of_birth,email,phone,nik_last4,verification_status)",
      { count: "exact" }
    )
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: false });

  if (params.eventOrganizerId) query = query.eq("event_organizer_id", params.eventOrganizerId);
  if (params.teamProfileId) query = query.eq("team_profile_id", params.teamProfileId);
  if (params.workflowStatus) query = query.eq("workflow_status", params.workflowStatus);
  if (params.q) {
    query = query.or(
      `players.first_name.ilike.%${params.q}%,players.last_name.ilike.%${params.q}%,players.email.ilike.%${params.q}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function getVerificationRequest(supabase: SupabaseClient, params: { id: string }) {
  const { data, error } = await supabase
    .from("player_verification_requests")
    .select(
      "*,players:player_id(id,player_code,first_name,last_name,date_of_birth,email,phone,address,emergency_contact_name,emergency_contact_phone,primary_position,jersey_number_preference,nik_last4,verification_status)"
    )
    .eq("id", params.id)
    .single();
  if (error) throw error;
  return data;
}

export async function createVerificationRequest(supabase: SupabaseClient, input: CreateVerificationRequestInput) {
  const { data, error } = await supabase
    .from("player_verification_requests")
    .insert({
      event_organizer_id: input.eventOrganizerId,
      team_profile_id: input.teamProfileId ?? null,
      player_id: input.playerId,
      created_by_user_id: input.createdByUserId
    })
    .select("id,event_organizer_id,team_profile_id,player_id,workflow_status,created_at")
    .single();
  if (error) throw error;

  await supabase.from("players").update({ last_verification_request_id: data.id }).eq("id", input.playerId);

  return data;
}

export async function addVerificationDocument(
  supabase: SupabaseClient,
  params: {
    eventOrganizerId: string;
    requestId: string;
    docType: string;
    contentEncrypted: string;
    contentSha256: string;
    mimeType?: string | null;
    fileName?: string | null;
    fileSizeBytes?: number | null;
    capturedAt?: string | null;
    uploadedByUserId?: string | null;
    meta?: Record<string, unknown>;
  }
) {
  const { data, error } = await supabase
    .from("player_verification_documents")
    .insert({
      event_organizer_id: params.eventOrganizerId,
      request_id: params.requestId,
      doc_type: params.docType,
      content_encrypted: params.contentEncrypted,
      content_sha256: params.contentSha256,
      mime_type: params.mimeType ?? null,
      file_name: params.fileName ?? null,
      file_size_bytes: params.fileSizeBytes ?? null,
      captured_at: params.capturedAt ?? null,
      uploaded_by_user_id: params.uploadedByUserId ?? null,
      meta: params.meta ?? {}
    })
    .select("id,doc_type,mime_type,file_name,file_size_bytes,created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function listVerificationDocuments(supabase: SupabaseClient, params: { requestId: string }) {
  const { data, error } = await supabase
    .from("player_verification_documents")
    .select("id,created_at,doc_type,mime_type,file_name,file_size_bytes,captured_at,uploaded_by_user_id")
    .eq("request_id", params.requestId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getVerificationDocument(supabase: SupabaseClient, params: { id: string }) {
  const { data, error } = await supabase.from("player_verification_documents").select("*").eq("id", params.id).single();
  if (error) throw error;
  return data;
}

export async function addVerificationEvent(
  supabase: SupabaseClient,
  params: { eventOrganizerId: string; requestId: string; actorUserId?: string | null; action: string; details?: Record<string, unknown> }
) {
  const { data, error } = await supabase
    .from("player_verification_events")
    .insert({
      event_organizer_id: params.eventOrganizerId,
      request_id: params.requestId,
      actor_user_id: params.actorUserId ?? null,
      action: params.action,
      details: params.details ?? {}
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listVerificationEvents(supabase: SupabaseClient, params: { requestId: string; limit?: number }) {
  const limit = params.limit ?? 200;
  const { data, error } = await supabase
    .from("player_verification_events")
    .select("*")
    .eq("request_id", params.requestId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function submitVerificationRequest(
  supabase: SupabaseClient,
  params: { id: string; actorUserId: string; aiResult?: Record<string, unknown> }
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("player_verification_requests")
    .update({
      workflow_status: "submitted",
      submitted_at: now,
      ai_status: "queued",
      ai_result: params.aiResult ?? {}
    })
    .eq("id", params.id)
    .select("*")
    .single();
  if (error) throw error;

  await addVerificationEvent(supabase, {
    eventOrganizerId: data.event_organizer_id,
    requestId: data.id,
    actorUserId: params.actorUserId,
    action: "submitted",
    details: { aiStatus: "queued" }
  });

  return data;
}

export async function decideVerificationRequest(
  supabase: SupabaseClient,
  params: {
    id: string;
    actorUserId: string;
    decision: "approved" | "rejected";
    reason?: string | null;
    notes?: string | null;
  }
) {
  const now = new Date().toISOString();
  const workflowStatus = params.decision === "approved" ? "approved" : "rejected";

  const { data, error } = await supabase
    .from("player_verification_requests")
    .update({
      workflow_status: workflowStatus,
      decided_at: now,
      decided_by_user_id: params.actorUserId,
      decision: params.decision,
      decision_reason: params.reason ?? null,
      decision_notes: params.notes ?? null
    })
    .eq("id", params.id)
    .select("*")
    .single();
  if (error) throw error;

  const verificationStatus = params.decision === "approved" ? "verified" : "rejected";
  const playerUpdate: any = {
    verification_status: verificationStatus,
    last_verification_request_id: data.id
  };
  if (params.decision === "approved") {
    playerUpdate.verified_at = now;
    playerUpdate.verified_by_user_id = params.actorUserId;
  }

  await supabase.from("players").update(playerUpdate).eq("id", data.player_id);

  await addVerificationEvent(supabase, {
    eventOrganizerId: data.event_organizer_id,
    requestId: data.id,
    actorUserId: params.actorUserId,
    action: `decision.${params.decision}`,
    details: { reason: params.reason ?? null }
  });

  return data;
}

export async function appealVerificationRequest(
  supabase: SupabaseClient,
  params: { id: string; actorUserId: string; appealMessage: string }
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("player_verification_requests")
    .update({
      workflow_status: "appealed",
      appeal_message: params.appealMessage,
      appeal_submitted_at: now
    })
    .eq("id", params.id)
    .select("*")
    .single();
  if (error) throw error;

  await addVerificationEvent(supabase, {
    eventOrganizerId: data.event_organizer_id,
    requestId: data.id,
    actorUserId: params.actorUserId,
    action: "appealed",
    details: { message: params.appealMessage }
  });

  return data;
}

