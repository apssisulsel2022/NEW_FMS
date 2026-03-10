import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { created, fail } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireTeamRole } from "@/app/api/v1/_lib/teamRbac";

import { getCompetition } from "@backend/services/competitions";
import { notifyUsers } from "@backend/services/notifications";

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
  const body = await readJson<{ teamProfileId?: string; message?: string }>(req);
  const teamProfileId = body?.teamProfileId ? String(body.teamProfileId) : "";
  const message = body?.message ? String(body.message).trim() : "";
  if (!teamProfileId || !message) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "teamProfileId and message are required" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  if (message.length > 2000) {
    return fail(400, { code: "INVALID_REQUEST", message: "message too long" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }

  try {
    const membership = await requireTeamRole(auth.supabase, { teamProfileId, userId: auth.userId, allowedRoles: ["captain", "manager", "player"] });
    if (!membership.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Not a team member" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const competition = await getCompetition(auth.supabase, { id });

    const { data: members } = await auth.supabase
      .from("event_organizer_members")
      .select("user_id")
      .eq("event_organizer_id", competition.event_organizer_id)
      .eq("status", "active");
    const userIds = (members ?? []).map((m) => m.user_id).filter(Boolean);
    if (userIds.length > 0) {
      await notifyUsers(auth.supabase, {
        eventOrganizerId: null,
        userIds,
        title: "Team message",
        body: message,
        payload: { type: "team_message", eventOrganizerId: competition.event_organizer_id, competitionId: id, teamProfileId }
      });
    }

    return created({ ok: true }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}
