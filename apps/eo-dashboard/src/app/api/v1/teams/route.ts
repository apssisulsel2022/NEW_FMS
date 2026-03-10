import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { parsePagination, parseSearch, parseSort } from "@/app/api/v1/_lib/query";
import { created, fail, okMeta } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";

import { createTeam, listTeams, type CreateTeamInput } from "@backend/services/teams";

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
  const sort = parseSort(url, ["created_at", "name"] as const, { sortBy: "created_at", sortOrder: "desc" });
  const status = url.searchParams.get("status");

  try {
    const { data, count } = await listTeams(auth.supabase, {
      competitionId,
      limit,
      offset,
      q,
      status,
      sortBy: sort?.sortBy ?? "created_at",
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

  const body = await readJson<Partial<CreateTeamInput>>(req);
  if (!body) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "Expected application/json body" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  if (!body.eventOrganizerId || !body.competitionId || !body.name || !body.slug) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "eventOrganizerId, competitionId, name, slug are required" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  try {
    const data = await createTeam(auth.supabase, {
      eventOrganizerId: body.eventOrganizerId,
      competitionId: body.competitionId,
      name: body.name,
      slug: body.slug,
      logoPath: body.logoPath ?? null
    });
    return created(data, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}
