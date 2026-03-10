import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateCompetitionInput = {
  eventOrganizerId: string;
  name: string;
  slug: string;
  categoryId?: string | null;
  season?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
  participantLimit?: number | null;
  competitionFormatId?: string | null;
  prizeStructure?: Record<string, unknown>;
  eligibilityCriteria?: Record<string, unknown>;
  judgingCriteria?: Record<string, unknown>;
  entryFeeCents?: number | null;
  currency?: string | null;
  allowPublicRegistration?: boolean;
  defaultLocale?: string;
  state?: string;
};

const competitionSelect =
  "id,created_at,updated_at,status,event_organizer_id,category_id,name,slug,season,start_date,end_date,published_at,description,registration_opens_at,registration_closes_at,participant_limit,competition_format_id,prize_structure,eligibility_criteria,judging_criteria,entry_fee_cents,currency,allow_public_registration,default_locale,state";

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
    .select(competitionSelect, { count: "exact" })
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
  const { data, error } = await supabase
    .from("competitions")
    .select(competitionSelect)
    .eq("id", params.id)
    .single();
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
      end_date: input.endDate ?? null,
      description: input.description ?? null,
      registration_opens_at: input.registrationOpensAt ?? null,
      registration_closes_at: input.registrationClosesAt ?? null,
      participant_limit: input.participantLimit ?? null,
      competition_format_id: input.competitionFormatId ?? null,
      prize_structure: input.prizeStructure ?? {},
      eligibility_criteria: input.eligibilityCriteria ?? {},
      judging_criteria: input.judgingCriteria ?? {},
      entry_fee_cents: input.entryFeeCents ?? null,
      currency: input.currency ?? null,
      allow_public_registration: input.allowPublicRegistration ?? false,
      default_locale: input.defaultLocale ?? "en",
      state: input.state ?? "draft"
    })
    .select(competitionSelect)
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
  description?: string | null;
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
  participantLimit?: number | null;
  competitionFormatId?: string | null;
  prizeStructure?: Record<string, unknown>;
  eligibilityCriteria?: Record<string, unknown>;
  judgingCriteria?: Record<string, unknown>;
  entryFeeCents?: number | null;
  currency?: string | null;
  allowPublicRegistration?: boolean;
  defaultLocale?: string;
  state?: string;
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
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.registrationOpensAt !== undefined) update.registration_opens_at = patch.registrationOpensAt;
  if (patch.registrationClosesAt !== undefined) update.registration_closes_at = patch.registrationClosesAt;
  if (patch.participantLimit !== undefined) update.participant_limit = patch.participantLimit;
  if (patch.competitionFormatId !== undefined) update.competition_format_id = patch.competitionFormatId;
  if (patch.prizeStructure !== undefined) update.prize_structure = patch.prizeStructure;
  if (patch.eligibilityCriteria !== undefined) update.eligibility_criteria = patch.eligibilityCriteria;
  if (patch.judgingCriteria !== undefined) update.judging_criteria = patch.judgingCriteria;
  if (patch.entryFeeCents !== undefined) update.entry_fee_cents = patch.entryFeeCents;
  if (patch.currency !== undefined) update.currency = patch.currency;
  if (patch.allowPublicRegistration !== undefined) update.allow_public_registration = patch.allowPublicRegistration;
  if (patch.defaultLocale !== undefined) update.default_locale = patch.defaultLocale;
  if (patch.state !== undefined) update.state = patch.state;
  if (patch.status !== undefined) update.status = patch.status;

  const { data, error } = await supabase
    .from("competitions")
    .update(update)
    .eq("id", params.id)
    .select(competitionSelect)
    .single();
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
    .update({ published_at: new Date().toISOString(), state: "published" })
    .eq("id", params.id)
    .select(competitionSelect)
    .single();

  if (error) throw error;
  return data;
}
