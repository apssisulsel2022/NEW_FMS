import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { fail, ok } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireOrganizerRole } from "@/app/api/v1/_lib/rbac";
import { requireTeamRole } from "@/app/api/v1/_lib/teamRbac";

import { notifyUsers } from "@backend/services/notifications";
import { getTeamContext, removeRosterEntry, updateRosterEntry } from "@backend/services/teamRoster";

async function requireRosterWriteAccess(supabase: any, params: { userId: string; team: any }) {
  const organizerRole = await requireOrganizerRole(supabase, {
    eventOrganizerId: params.team.event_organizer_id,
    userId: params.userId,
    allowedRoles: ["owner", "admin"]
  }).catch(() => ({ ok: false as const }));
  if (organizerRole.ok) return { ok: true as const };

  const teamProfileId = params.team.team_profile_id as string | null;
  if (!teamProfileId) return { ok: false as const };
  const teamRole = await requireTeamRole(supabase, { teamProfileId, userId: params.userId, allowedRoles: ["captain", "manager"] });
  if (!teamRole.ok) return { ok: false as const };
  return { ok: true as const };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; teamPlayerId: string }> }) {
  const auth = await requireAuth(req, { rateLimit: { limit: 120, windowMs: 60_000 } });
  if (!auth.ok) {
    return fail(
      auth.status,
      { code: auth.status === 429 ? "RATE_LIMITED" : "UNAUTHORIZED", message: auth.message },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  const { id, teamPlayerId } = await ctx.params;
  const body = await readJson<{ jerseyNumber?: number | null; position?: string | null; rosterStatus?: any }>(req);
  if (!body) {
    return fail(400, { code: "INVALID_REQUEST", message: "Expected application/json body" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }

  try {
    const team = await getTeamContext(auth.supabase, { teamId: id });
    const access = await requireRosterWriteAccess(auth.supabase, { userId: auth.userId, team });
    if (!access.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Not authorized" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const data = await updateRosterEntry(auth.supabase, {
      id: teamPlayerId,
      patch: {
        jerseyNumber: body.jerseyNumber,
        position: body.position ?? null,
        rosterStatus: body.rosterStatus ?? null
      }
    });

    const teamProfileId = team.team_profile_id as string | null;
    if (teamProfileId) {
      const { data: members } = await auth.supabase.from("team_members").select("user_id").eq("team_profile_id", teamProfileId).eq("status", "active");
      const userIds = (members ?? []).map((m: any) => m.user_id).filter(Boolean);
      if (userIds.length > 0) {
        await notifyUsers(auth.supabase, {
          eventOrganizerId: null,
          userIds,
          title: "Roster updated",
          body: "A roster entry was updated.",
          payload: { type: "roster_player_updated", eventOrganizerId: team.event_organizer_id, teamId: id, teamPlayerId }
        });
      }
    }

    await auth.supabase.from("outbox_events").insert({
      event_organizer_id: null,
      topic: "roster.changed",
      payload: { action: "updated", teamId: id, teamPlayerId, eventOrganizerId: team.event_organizer_id }
    });

    return ok(data, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string; teamPlayerId: string }> }) {
  const auth = await requireAuth(req, { rateLimit: { limit: 60, windowMs: 60_000 } });
  if (!auth.ok) {
    return fail(
      auth.status,
      { code: auth.status === 429 ? "RATE_LIMITED" : "UNAUTHORIZED", message: auth.message },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  const { id, teamPlayerId } = await ctx.params;

  try {
    const team = await getTeamContext(auth.supabase, { teamId: id });
    const access = await requireRosterWriteAccess(auth.supabase, { userId: auth.userId, team });
    if (!access.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Not authorized" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const data = await removeRosterEntry(auth.supabase, { id: teamPlayerId });

    const teamProfileId = team.team_profile_id as string | null;
    if (teamProfileId) {
      const { data: members } = await auth.supabase.from("team_members").select("user_id").eq("team_profile_id", teamProfileId).eq("status", "active");
      const userIds = (members ?? []).map((m: any) => m.user_id).filter(Boolean);
      if (userIds.length > 0) {
        await notifyUsers(auth.supabase, {
          eventOrganizerId: null,
          userIds,
          title: "Roster updated",
          body: "A player was removed from the roster.",
          payload: { type: "roster_player_removed", eventOrganizerId: team.event_organizer_id, teamId: id, teamPlayerId }
        });
      }
    }

    await auth.supabase.from("outbox_events").insert({
      event_organizer_id: null,
      topic: "roster.changed",
      payload: { action: "removed", teamId: id, teamPlayerId, eventOrganizerId: team.event_organizer_id }
    });

    return ok(data, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

