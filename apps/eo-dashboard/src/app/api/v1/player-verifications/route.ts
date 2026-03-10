import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { parsePagination, parseSearch } from "@/app/api/v1/_lib/query";
import { created, fail, okMeta } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireOrganizerRole } from "@/app/api/v1/_lib/rbac";
import { requireTeamRole } from "@/app/api/v1/_lib/teamRbac";

import {
  createVerificationRequest,
  listVerificationRequests,
  type CreateVerificationRequestInput
} from "@backend/services/playerVerifications";

export async function GET(req: Request) {
  const auth = await requireAuth(req, { rateLimit: { limit: 240, windowMs: 60_000 } });
  if (!auth.ok) {
    return fail(
      auth.status,
      { code: auth.status === 429 ? "RATE_LIMITED" : "UNAUTHORIZED", message: auth.message },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  const url = new URL(req.url);
  const eventOrganizerId = url.searchParams.get("eventOrganizerId");
  const teamProfileId = url.searchParams.get("teamProfileId");
  const workflowStatus = url.searchParams.get("workflowStatus");
  const q = parseSearch(url);
  const { limit, offset } = parsePagination(url, { limit: 50, maxLimit: 200 });

  try {
    if (eventOrganizerId) {
      const role = await requireOrganizerRole(auth.supabase, {
        eventOrganizerId,
        userId: auth.userId,
        allowedRoles: ["owner", "admin", "staff"]
      });
      if (!role.ok) {
        return fail(403, { code: "FORBIDDEN", message: "Not authorized" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
      }
    } else if (teamProfileId) {
      const role = await requireTeamRole(auth.supabase, {
        teamProfileId,
        userId: auth.userId,
        allowedRoles: ["captain", "manager", "player"]
      });
      if (!role.ok) {
        return fail(403, { code: "FORBIDDEN", message: "Not authorized" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
      }
    } else {
      return fail(
        400,
        { code: "INVALID_REQUEST", message: "eventOrganizerId or teamProfileId is required" },
        { headers: rateLimitHeaders(auth.rateLimit ?? null) }
      );
    }

    const { data, count } = await listVerificationRequests(auth.supabase, {
      eventOrganizerId: eventOrganizerId ? eventOrganizerId : null,
      teamProfileId: teamProfileId ? teamProfileId : null,
      workflowStatus,
      q,
      limit,
      offset
    });
    return okMeta(data, { limit, offset, count }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth(req, { rateLimit: { limit: 60, windowMs: 60_000 } });
  if (!auth.ok) {
    return fail(
      auth.status,
      { code: auth.status === 429 ? "RATE_LIMITED" : "UNAUTHORIZED", message: auth.message },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  const body = await readJson<Partial<CreateVerificationRequestInput>>(req);
  if (!body) {
    return fail(400, { code: "INVALID_REQUEST", message: "Expected application/json body" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }

  if (!body.playerId) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "playerId is required" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  try {
    const teamRole = body.teamProfileId
      ? await requireTeamRole(auth.supabase, {
          teamProfileId: body.teamProfileId,
          userId: auth.userId,
          allowedRoles: ["captain", "manager"]
        })
      : ({ ok: false as const } as any);

    const { data: player, error: playerError } = await auth.supabase
      .from("players")
      .select("id,event_organizer_id")
      .eq("id", body.playerId)
      .single();
    if (playerError) throw playerError;

    const eventOrganizerId = body.eventOrganizerId ?? player.event_organizer_id;

    const organizerRole = await requireOrganizerRole(auth.supabase, {
      eventOrganizerId,
      userId: auth.userId,
      allowedRoles: ["owner", "admin", "staff"]
    }).catch(() => ({ ok: false as const }));

    if (!organizerRole.ok && !teamRole.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Not authorized" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const data = await createVerificationRequest(auth.supabase, {
      eventOrganizerId,
      teamProfileId: body.teamProfileId ?? null,
      playerId: body.playerId,
      createdByUserId: auth.userId
    });
    return created(data, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}
