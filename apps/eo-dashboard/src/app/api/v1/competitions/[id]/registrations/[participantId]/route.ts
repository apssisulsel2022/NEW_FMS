import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { fail, ok } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireOrganizerRole } from "@/app/api/v1/_lib/rbac";

import { getCompetition } from "@backend/services/competitions";
import { notifyUsers } from "@backend/services/notifications";
import { reviewTeamRegistration } from "@backend/services/teamRegistrations";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; participantId: string }> }) {
  const auth = await requireAuth(req, { rateLimit: { limit: 60, windowMs: 60_000 } });
  if (!auth.ok) {
    return fail(
      auth.status,
      { code: auth.status === 429 ? "RATE_LIMITED" : "UNAUTHORIZED", message: auth.message },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  const { id, participantId } = await ctx.params;
  const body = await readJson<{ decision?: "approved" | "denied"; reason?: string }>(req);
  if (!body?.decision) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "decision is required" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  try {
    const competition = await getCompetition(auth.supabase, { id });
    const role = await requireOrganizerRole(auth.supabase, {
      eventOrganizerId: competition.event_organizer_id,
      userId: auth.userId,
      allowedRoles: ["owner", "admin"]
    });
    if (!role.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Not authorized" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const { participant, teamId } = await reviewTeamRegistration(auth.supabase, {
      competitionId: id,
      participantId,
      decision: body.decision,
      reason: body.reason ?? null
    });

    const teamProfileId = (participant as any).team_profile_id as string | null;
    if (teamProfileId) {
      const { data: teamMembers } = await auth.supabase
        .from("team_members")
        .select("user_id")
        .eq("team_profile_id", teamProfileId)
        .eq("status", "active");
      const userIds = (teamMembers ?? []).map((m) => m.user_id).filter(Boolean);
      if (userIds.length > 0) {
        const title = body.decision === "approved" ? "Registration approved" : "Registration denied";
        const msg = body.decision === "approved" ? "Your team has been approved." : "Your team registration was denied.";
        await notifyUsers(auth.supabase, {
          eventOrganizerId: competition.event_organizer_id,
          userIds,
          title,
          body: body.reason ? `${msg} Reason: ${body.reason}` : msg,
          payload: {
            type: "registration_reviewed",
            competitionId: id,
            participantId,
            decision: body.decision,
            teamId
          }
        });
      }
    }

    return ok({ participant, teamId }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

