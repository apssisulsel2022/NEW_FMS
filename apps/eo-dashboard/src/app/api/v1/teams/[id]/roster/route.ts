import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { parsePagination, parseSearch } from "@/app/api/v1/_lib/query";
import { created, fail, okMeta } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireOrganizerRole } from "@/app/api/v1/_lib/rbac";
import { requireTeamRole } from "@/app/api/v1/_lib/teamRbac";

import { notifyUsers } from "@backend/services/notifications";
import { addPlayerToRoster, getTeamContext, listTeamRoster } from "@backend/services/teamRoster";

async function requireRosterReadAccess(supabase: any, params: { userId: string; team: any }) {
  const teamProfileId = params.team.team_profile_id as string | null;
  const organizerRole = await requireOrganizerRole(supabase, {
    eventOrganizerId: params.team.event_organizer_id,
    userId: params.userId,
    allowedRoles: ["owner", "admin", "staff"]
  }).catch(() => ({ ok: false as const }));
  if (organizerRole.ok) return { ok: true as const, mode: "organizer" as const };

  if (!teamProfileId) return { ok: false as const };
  const teamRole = await requireTeamRole(supabase, {
    teamProfileId,
    userId: params.userId,
    allowedRoles: ["captain", "manager", "player"]
  });
  if (!teamRole.ok) return { ok: false as const };
  return { ok: true as const, mode: "team" as const, role: teamRole.role };
}

async function requireRosterWriteAccess(supabase: any, params: { userId: string; team: any }) {
  const teamProfileId = params.team.team_profile_id as string | null;
  const organizerRole = await requireOrganizerRole(supabase, {
    eventOrganizerId: params.team.event_organizer_id,
    userId: params.userId,
    allowedRoles: ["owner", "admin"]
  }).catch(() => ({ ok: false as const }));
  if (organizerRole.ok) return { ok: true as const, mode: "organizer" as const };

  if (!teamProfileId) return { ok: false as const };
  const teamRole = await requireTeamRole(supabase, {
    teamProfileId,
    userId: params.userId,
    allowedRoles: ["captain", "manager"]
  });
  if (!teamRole.ok) return { ok: false as const };
  return { ok: true as const, mode: "team" as const, role: teamRole.role };
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, { rateLimit: { limit: 240, windowMs: 60_000 } });
  if (!auth.ok) {
    return fail(
      auth.status,
      { code: auth.status === 429 ? "RATE_LIMITED" : "UNAUTHORIZED", message: auth.message },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  const { id } = await ctx.params;
  const url = new URL(req.url);
  const q = parseSearch(url);
  const rosterStatus = url.searchParams.get("rosterStatus");
  const position = url.searchParams.get("position");
  const { limit, offset } = parsePagination(url, { limit: 100, maxLimit: 500 });

  try {
    const team = await getTeamContext(auth.supabase, { teamId: id });
    const access = await requireRosterReadAccess(auth.supabase, { userId: auth.userId, team });
    if (!access.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Not authorized" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const { data, count } = await listTeamRoster(auth.supabase, { teamId: id, q, rosterStatus, position, limit, offset });
    return okMeta(data, { limit, offset, count }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, { rateLimit: { limit: 60, windowMs: 60_000 } });
  if (!auth.ok) {
    return fail(
      auth.status,
      { code: auth.status === 429 ? "RATE_LIMITED" : "UNAUTHORIZED", message: auth.message },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  const { id } = await ctx.params;
  const body = await readJson<any>(req);
  if (!body) {
    return fail(400, { code: "INVALID_REQUEST", message: "Expected application/json body" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }

  try {
    const team = await getTeamContext(auth.supabase, { teamId: id });
    const access = await requireRosterWriteAccess(auth.supabase, { userId: auth.userId, team });
    if (!access.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Not authorized" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const requiredPlayerFields = body.player
      ? ["firstName", "lastName", "dateOfBirth", "phone", "emergencyContactName", "emergencyContactPhone", "primaryPosition"]
      : [];

    for (const key of requiredPlayerFields) {
      if (!body.player?.[key]) {
        return fail(400, { code: "INVALID_REQUEST", message: `player.${key} is required` }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
      }
    }

    const res = await addPlayerToRoster(auth.supabase, {
      teamId: id,
      playerId: body.playerId ?? null,
      player: body.player ?? null,
      roster: body.roster ?? null
    });

    if (!res.ok) {
      return fail(res.status, { code: "INVALID_REQUEST", message: res.message }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const teamProfileId = team.team_profile_id as string | null;
    if (teamProfileId) {
      const { data: members } = await auth.supabase.from("team_members").select("user_id").eq("team_profile_id", teamProfileId).eq("status", "active");
      const userIds = (members ?? []).map((m: any) => m.user_id).filter(Boolean);
      if (userIds.length > 0) {
        await notifyUsers(auth.supabase, {
          eventOrganizerId: null,
          userIds,
          title: "Roster updated",
          body: "A player was added to the roster.",
          payload: { type: "roster_player_added", eventOrganizerId: team.event_organizer_id, teamId: id, playerId: res.playerId }
        });
      }
    }

    await auth.supabase.from("outbox_events").insert({
      event_organizer_id: null,
      topic: "roster.changed",
      payload: { action: "added", teamId: id, playerId: res.playerId, eventOrganizerId: team.event_organizer_id }
    });

    return created(res, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

