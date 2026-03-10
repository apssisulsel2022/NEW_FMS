import type { SupabaseClient } from "@supabase/supabase-js";

import { generateRoundRobinFixtures } from "../../ai/fixture-generator/roundRobin";

export async function claimNextJob(supabase: SupabaseClient, params: { workerId: string }) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("automation_jobs")
    .update({ job_status: "running", locked_at: now, locked_by: params.workerId })
    .eq("job_status", "queued")
    .lte("run_after", now)
    .is("locked_at", null)
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function completeJob(
  supabase: SupabaseClient,
  params: { jobId: string; status: "succeeded" | "failed"; lastError?: string | null }
) {
  const { error } = await supabase
    .from("automation_jobs")
    .update({
      job_status: params.status,
      last_error: params.lastError ?? null
    })
    .eq("id", params.jobId);

  if (error) throw error;
}

export async function processJob(supabase: SupabaseClient, job: any) {
  if (job.job_type === "fixture_generate") {
    await generateFixturesForCompetition(supabase, {
      eventOrganizerId: job.event_organizer_id,
      competitionId: job.competition_id
    });
    return;
  }

  if (job.job_type === "standings_initialize") {
    await initializeStandings(supabase, {
      eventOrganizerId: job.event_organizer_id,
      competitionId: job.competition_id
    });
    return;
  }
}

async function generateFixturesForCompetition(
  supabase: SupabaseClient,
  params: { eventOrganizerId: string; competitionId: string }
) {
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id")
    .eq("competition_id", params.competitionId)
    .eq("event_organizer_id", params.eventOrganizerId)
    .order("created_at", { ascending: true });

  if (teamsError) throw teamsError;
  const teamIds = (teams ?? []).map((t) => t.id as string);

  const fixtures = generateRoundRobinFixtures(teamIds, { doubleRound: true });
  if (fixtures.length === 0) return;

  const rows = fixtures.map((f) => ({
    event_organizer_id: params.eventOrganizerId,
    competition_id: params.competitionId,
    home_team_id: f.homeTeamId,
    away_team_id: f.awayTeamId
  }));

  const { error: insertError } = await supabase.from("matches").insert(rows);
  if (insertError) throw insertError;
}

async function initializeStandings(
  supabase: SupabaseClient,
  params: { eventOrganizerId: string; competitionId: string }
) {
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id")
    .eq("competition_id", params.competitionId)
    .eq("event_organizer_id", params.eventOrganizerId);

  if (teamsError) throw teamsError;
  const rows = (teams ?? []).map((t) => ({
    event_organizer_id: params.eventOrganizerId,
    competition_id: params.competitionId,
    team_id: t.id
  }));

  if (rows.length === 0) return;

  const { error: upsertError } = await supabase
    .from("standings")
    .upsert(rows, { onConflict: "competition_id,team_id" });

  if (upsertError) throw upsertError;
}

