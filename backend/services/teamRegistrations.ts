import type { SupabaseClient } from "@supabase/supabase-js";

export async function discoverCompetitions(
  supabase: SupabaseClient,
  params: {
    q?: string | null;
    categoryId?: string | null;
    startDateFrom?: string | null;
    startDateTo?: string | null;
    prizeMinCents?: number | null;
    skillLevel?: string | null;
    limit?: number;
    offset?: number;
  }
) {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  let query = supabase
    .from("competitions")
    .select(
      "id,event_organizer_id,category_id,name,slug,season,start_date,end_date,published_at,registration_opens_at,registration_closes_at,participant_limit,prize_structure,eligibility_criteria,judging_criteria,entry_fee_cents,currency,allow_public_registration,state",
      { count: "exact" }
    )
    .not("published_at", "is", null)
    .range(offset, offset + limit - 1)
    .order("start_date", { ascending: true });

  if (params.q) query = query.ilike("name", `%${params.q}%`);
  if (params.categoryId) query = query.eq("category_id", params.categoryId);
  if (params.startDateFrom) query = query.gte("start_date", params.startDateFrom);
  if (params.startDateTo) query = query.lte("start_date", params.startDateTo);
  if (params.skillLevel) query = query.contains("eligibility_criteria", { skillLevel: params.skillLevel });
  if (params.prizeMinCents !== null && params.prizeMinCents !== undefined) {
    query = query.gte("prize_structure->>totalCents", String(params.prizeMinCents));
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function registerTeamForCompetition(
  supabase: SupabaseClient,
  params: {
    teamProfileId: string;
    userId: string;
    competitionId: string;
    roster?: Record<string, unknown>;
  }
) {
  const { data: membership, error: memberError } = await supabase
    .from("team_members")
    .select("role,team_profile_id")
    .eq("team_profile_id", params.teamProfileId)
    .eq("user_id", params.userId)
    .eq("status", "active")
    .maybeSingle();
  if (memberError) throw memberError;
  if (!membership) return { ok: false as const, status: 403 as const, message: "Not a team member" };

  const { data: competition, error: compError } = await supabase
    .from("competitions")
    .select(
      "id,event_organizer_id,participant_limit,registration_opens_at,registration_closes_at,entry_fee_cents,currency,state,published_at,allow_public_registration,name"
    )
    .eq("id", params.competitionId)
    .single();
  if (compError) throw compError;

  if (!competition.published_at) return { ok: false as const, status: 400 as const, message: "Competition not published" };

  const now = Date.now();
  const opensAt = competition.registration_opens_at ? new Date(competition.registration_opens_at).getTime() : null;
  const closesAt = competition.registration_closes_at ? new Date(competition.registration_closes_at).getTime() : null;
  if (opensAt !== null && now < opensAt) return { ok: false as const, status: 400 as const, message: "Registration not open" };
  if (closesAt !== null && now > closesAt) return { ok: false as const, status: 400 as const, message: "Registration closed" };

  const { count: currentCount, error: countError } = await supabase
    .from("competition_participants")
    .select("id", { count: "exact", head: true })
    .eq("competition_id", params.competitionId)
    .eq("status", "active");
  if (countError) throw countError;
  if (competition.participant_limit && (currentCount ?? 0) >= competition.participant_limit) {
    return { ok: false as const, status: 400 as const, message: "Competition is full" };
  }

  const needsPayment = (competition.entry_fee_cents ?? 0) > 0;
  const paymentStatus = needsPayment ? "payment_required" : "not_required";

  const { data: registration, error: regError } = await supabase
    .from("competition_participants")
    .insert({
      event_organizer_id: competition.event_organizer_id,
      competition_id: params.competitionId,
      participant_type: "team",
      team_profile_id: params.teamProfileId,
      registration_status: "pending",
      payment_status: paymentStatus,
      meta: { roster: params.roster ?? {}, requestedByUserId: params.userId }
    })
    .select("*")
    .single();
  if (regError) throw regError;

  return { ok: true as const, registration, needsPayment, competitionName: competition.name, currency: competition.currency };
}

export async function listTeamRegistrations(
  supabase: SupabaseClient,
  params: { teamProfileId: string; limit?: number; offset?: number }
) {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  const { data, error, count } = await supabase
    .from("competition_participants")
    .select(
      "id,created_at,competition_id,event_organizer_id,team_id,registration_status,payment_status,meta,competitions:competition_id(id,name,slug,start_date,end_date,registration_closes_at,entry_fee_cents,currency,state,published_at)",
      { count: "exact" }
    )
    .eq("team_profile_id", params.teamProfileId)
    .eq("participant_type", "team")
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function reviewTeamRegistration(
  supabase: SupabaseClient,
  params: {
    competitionId: string;
    participantId: string;
    decision: "approved" | "denied";
    reason?: string | null;
  }
) {
  const { data: participant, error: participantError } = await supabase
    .from("competition_participants")
    .select(
      "id,event_organizer_id,competition_id,team_profile_id,team_id,registration_status,payment_status,meta,team_profiles:team_profile_id(id,name,slug,logo_path)"
    )
    .eq("id", params.participantId)
    .eq("competition_id", params.competitionId)
    .single();
  if (participantError) throw participantError;

  let teamId = participant.team_id as string | null;
  if (params.decision === "approved" && !teamId) {
    const teamProfile: any = participant.team_profiles;
    const { data: createdTeam, error: teamError } = await supabase
      .from("teams")
      .insert({
        event_organizer_id: participant.event_organizer_id,
        competition_id: participant.competition_id,
        team_profile_id: participant.team_profile_id,
        name: teamProfile?.name ?? "Team",
        slug: teamProfile?.slug ?? `team-${participant.team_profile_id}`,
        logo_path: teamProfile?.logo_path ?? null
      })
      .select("id")
      .single();
    if (teamError) throw teamError;
    teamId = createdTeam.id;
  }

  const { data: updated, error: updateError } = await supabase
    .from("competition_participants")
    .update({
      registration_status: params.decision,
      team_id: teamId,
      meta: { ...(participant.meta ?? {}), review: { decision: params.decision, reason: params.reason ?? null, reviewedAt: new Date().toISOString() } }
    })
    .eq("id", participant.id)
    .select("*")
    .single();
  if (updateError) throw updateError;

  return { participant: updated, teamId };
}
