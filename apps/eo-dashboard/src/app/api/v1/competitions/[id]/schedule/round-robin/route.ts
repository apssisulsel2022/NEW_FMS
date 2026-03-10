import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { created, fail } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireOrganizerRole } from "@/app/api/v1/_lib/rbac";

import { getCompetition } from "@backend/services/competitions";
import { generateRoundRobinSchedule } from "@backend/services/scheduling";

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
  const body = await readJson<{ startAt?: string; matchIntervalMinutes?: number; doubleRound?: boolean }>(req);
  if (!body?.startAt) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "startAt is required" },
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
      return fail(
        403,
        { code: "FORBIDDEN", message: "Insufficient role to generate schedule" },
        { headers: rateLimitHeaders(auth.rateLimit ?? null) }
      );
    }

    const res = await generateRoundRobinSchedule(auth.supabase, {
      eventOrganizerId: competition.event_organizer_id,
      competitionId: id,
      startAt: body.startAt,
      matchIntervalMinutes: body.matchIntervalMinutes ?? 120,
      doubleRound: body.doubleRound ?? true
    });

    return created(res, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

