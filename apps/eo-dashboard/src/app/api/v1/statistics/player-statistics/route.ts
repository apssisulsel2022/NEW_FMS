import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { parsePagination } from "@/app/api/v1/_lib/query";
import { created, fail, okMeta } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";

import {
  createPlayerStatistics,
  listPlayerStatistics,
  type CreatePlayerStatisticsInput
} from "@backend/services/statistics";

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
  if (!eventOrganizerId) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "eventOrganizerId is required" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  const competitionId = url.searchParams.get("competitionId");
  const teamId = url.searchParams.get("teamId");
  const playerId = url.searchParams.get("playerId");

  const { limit, offset } = parsePagination(url, { limit: 50, maxLimit: 200 });

  try {
    const { data, count } = await listPlayerStatistics(auth.supabase, {
      eventOrganizerId,
      competitionId,
      teamId,
      playerId,
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

  const body = await readJson<Partial<CreatePlayerStatisticsInput>>(req);
  if (!body) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "Expected application/json body" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  if (!body.eventOrganizerId || !body.playerId) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "eventOrganizerId and playerId are required" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  try {
    const data = await createPlayerStatistics(auth.supabase, {
      eventOrganizerId: body.eventOrganizerId,
      playerId: body.playerId,
      competitionId: body.competitionId ?? null,
      teamId: body.teamId ?? null,
      stats: body.stats ?? {}
    });
    return created(data, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}
