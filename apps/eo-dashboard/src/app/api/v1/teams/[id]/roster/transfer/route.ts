import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { created, fail } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireOrganizerRole } from "@/app/api/v1/_lib/rbac";
import { requireTeamRole } from "@/app/api/v1/_lib/teamRbac";

import { notifyUsers } from "@backend/services/notifications";
import { getTeamContext, transferPlayer } from "@backend/services/teamRoster";

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
  const body = await readJson<{ toTeamId?: string; playerId?: string; position?: string; jerseyNumber?: number }>(req);
  if (!body?.toTeamId || !body.playerId) {
    return fail(400, { code: "INVALID_REQUEST", message: "toTeamId and playerId are required" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }

  try {
    const fromTeam = await getTeamContext(auth.supabase, { teamId: id });
    const toTeam = await getTeamContext(auth.supabase, { teamId: body.toTeamId });

    const organizerRole = await requireOrganizerRole(auth.supabase, {
      eventOrganizerId: fromTeam.event_organizer_id,
      userId: auth.userId,
      allowedRoles: ["owner", "admin"]
    }).catch(() => ({ ok: false as const }));

    const teamRole =
      fromTeam.team_profile_id && toTeam.team_profile_id
        ? await requireTeamRole(auth.supabase, { teamProfileId: fromTeam.team_profile_id, userId: auth.userId, allowedRoles: ["captain", "manager"] })
        : ({ ok: false as const } as any);

    if (!organizerRole.ok && !teamRole.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Not authorized" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const res = await transferPlayer(auth.supabase, {
      fromTeamId: id,
      toTeamId: body.toTeamId,
      playerId: body.playerId,
      position: body.position ?? null,
      jerseyNumber: body.jerseyNumber ?? null
    });

    if (!res.ok) {
      return fail(res.status, { code: "INVALID_REQUEST", message: res.message }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const teamProfileId = fromTeam.team_profile_id as string | null;
    if (teamProfileId) {
      const { data: members } = await auth.supabase.from("team_members").select("user_id").eq("team_profile_id", teamProfileId).eq("status", "active");
      const userIds = (members ?? []).map((m: any) => m.user_id).filter(Boolean);
      if (userIds.length > 0) {
        await notifyUsers(auth.supabase, {
          eventOrganizerId: null,
          userIds,
          title: "Roster updated",
          body: "A player was transferred between rosters.",
          payload: { type: "roster_player_transferred", eventOrganizerId: fromTeam.event_organizer_id, fromTeamId: id, toTeamId: body.toTeamId, playerId: body.playerId }
        });
      }
    }

    await auth.supabase.from("outbox_events").insert({
      event_organizer_id: null,
      topic: "roster.changed",
      payload: { action: "transferred", fromTeamId: id, toTeamId: body.toTeamId, playerId: body.playerId, eventOrganizerId: fromTeam.event_organizer_id }
    });

    return created(res, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

