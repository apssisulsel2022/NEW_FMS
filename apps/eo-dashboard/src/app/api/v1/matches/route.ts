import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { parsePagination, parseSearch, parseSort } from "@/app/api/v1/_lib/query";
import { created, fail, okMeta } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";

import { createMatch, listMatches, type CreateMatchInput } from "@backend/services/matches";

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
  const competitionId = url.searchParams.get("competitionId");
  if (!competitionId) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "competitionId is required" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  const { limit, offset } = parsePagination(url, { limit: 50, maxLimit: 100 });
  const q = parseSearch(url);
  const sort = parseSort(url, ["scheduled_at", "created_at"] as const, { sortBy: "scheduled_at", sortOrder: "asc" });
  const matchStatus = url.searchParams.get("matchStatus");

  try {
    const { data, count } = await listMatches(auth.supabase, {
      competitionId,
      limit,
      offset,
      q,
      matchStatus,
      sortBy: sort?.sortBy ?? "scheduled_at",
      sortOrder: sort?.sortOrder ?? "asc"
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

  const body = await readJson<Partial<CreateMatchInput>>(req);
  if (!body) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "Expected application/json body" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  if (!body.eventOrganizerId || !body.competitionId || !body.homeTeamId || !body.awayTeamId) {
    return fail(
      400,
      {
        code: "INVALID_REQUEST",
        message: "eventOrganizerId, competitionId, homeTeamId, awayTeamId are required"
      },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  try {
    const data = await createMatch(auth.supabase, {
      eventOrganizerId: body.eventOrganizerId,
      competitionId: body.competitionId,
      homeTeamId: body.homeTeamId,
      awayTeamId: body.awayTeamId,
      scheduledAt: body.scheduledAt ?? null,
      venue: body.venue ?? null
    });
    return created(data, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

