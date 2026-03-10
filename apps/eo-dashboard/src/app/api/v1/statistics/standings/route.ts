import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { parsePagination, parseSort } from "@/app/api/v1/_lib/query";
import { created, fail, okMeta } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";

import { createStanding, listStandings, type CreateStandingInput } from "@backend/services/statistics";

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

  const { limit, offset } = parsePagination(url, { limit: 50, maxLimit: 200 });
  const sort = parseSort(url, ["points", "goal_diff", "goals_for", "created_at"] as const, {
    sortBy: "points",
    sortOrder: "desc"
  });

  try {
    const { data, count } = await listStandings(auth.supabase, {
      competitionId,
      limit,
      offset,
      sortBy: sort?.sortBy ?? "points",
      sortOrder: sort?.sortOrder ?? "desc"
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

  const body = await readJson<Partial<CreateStandingInput>>(req);
  if (!body) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "Expected application/json body" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  if (!body.eventOrganizerId || !body.competitionId || !body.teamId) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "eventOrganizerId, competitionId, teamId are required" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  try {
    const data = await createStanding(auth.supabase, {
      eventOrganizerId: body.eventOrganizerId,
      competitionId: body.competitionId,
      teamId: body.teamId,
      played: body.played,
      wins: body.wins,
      draws: body.draws,
      losses: body.losses,
      goalsFor: body.goalsFor,
      goalsAgainst: body.goalsAgainst,
      goalDiff: body.goalDiff,
      points: body.points
    });
    return created(data, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}
