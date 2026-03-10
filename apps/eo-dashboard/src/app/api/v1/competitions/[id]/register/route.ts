import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { created, fail } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";

import { notifyUsers } from "@backend/services/notifications";
import { registerTeamForCompetition } from "@backend/services/teamRegistrations";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, { rateLimit: { limit: 30, windowMs: 60_000 } });
  if (!auth.ok) {
    return fail(
      auth.status,
      { code: auth.status === 429 ? "RATE_LIMITED" : "UNAUTHORIZED", message: auth.message },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  const { id } = await ctx.params;
  const body = await readJson<{ teamProfileId?: string; roster?: Record<string, unknown> }>(req);
  if (!body?.teamProfileId) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "teamProfileId is required" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  try {
    const res = await registerTeamForCompetition(auth.supabase, {
      teamProfileId: body.teamProfileId,
      userId: auth.userId,
      competitionId: id,
      roster: body.roster ?? {}
    });

    if (!res.ok) {
      return fail(res.status, { code: "INVALID_REQUEST", message: res.message }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const registration = res.registration as any;

    const { data: organizerMembers } = await auth.supabase
      .from("event_organizer_members")
      .select("user_id")
      .eq("event_organizer_id", registration.event_organizer_id)
      .eq("status", "active");
    const organizerUserIds = (organizerMembers ?? []).map((m) => m.user_id).filter(Boolean);

    if (organizerUserIds.length > 0) {
      await notifyUsers(auth.supabase, {
        eventOrganizerId: registration.event_organizer_id,
        userIds: organizerUserIds,
        title: "New team registration request",
        body: "A team submitted a registration request.",
        payload: { type: "team_registration_requested", competitionId: registration.competition_id, participantId: registration.id }
      });
    }

    const { data: teamMembers } = await auth.supabase
      .from("team_members")
      .select("user_id")
      .eq("team_profile_id", body.teamProfileId)
      .eq("status", "active");
    const teamUserIds = (teamMembers ?? []).map((m) => m.user_id).filter(Boolean);
    if (teamUserIds.length > 0) {
      await notifyUsers(auth.supabase, {
        eventOrganizerId: registration.event_organizer_id,
        userIds: teamUserIds,
        title: "Registration submitted",
        body: `${res.competitionName} registration is pending review.`,
        payload: { type: "registration_submitted", competitionId: registration.competition_id, participantId: registration.id }
      });
    }

    return created({ registration, needsPayment: res.needsPayment, currency: res.currency }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

