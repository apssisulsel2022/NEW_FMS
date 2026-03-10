import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { parsePagination, parseSort } from "@/app/api/v1/_lib/query";
import { created, fail, okMeta } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";

import { createMedia, listMedia, type CreateMediaInput } from "@backend/services/media";

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
  const matchId = url.searchParams.get("matchId");
  const mediaType = url.searchParams.get("mediaType");

  const { limit, offset } = parsePagination(url, { limit: 50, maxLimit: 200 });
  const sort = parseSort(url, ["created_at"] as const, { sortBy: "created_at", sortOrder: "desc" });

  try {
    const { data, count } = await listMedia(auth.supabase, {
      eventOrganizerId,
      competitionId,
      matchId,
      mediaType,
      limit,
      offset,
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

  const body = await readJson<Partial<CreateMediaInput>>(req);
  if (!body) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "Expected application/json body" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  if (!body.eventOrganizerId || !body.mediaType || !body.storagePath) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "eventOrganizerId, mediaType, storagePath are required" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  try {
    const data = await createMedia(auth.supabase, {
      eventOrganizerId: body.eventOrganizerId,
      mediaType: body.mediaType,
      storagePath: body.storagePath,
      competitionId: body.competitionId ?? null,
      matchId: body.matchId ?? null,
      meta: body.meta ?? {}
    });
    return created(data, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}
