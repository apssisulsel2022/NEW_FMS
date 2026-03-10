import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { parsePagination, parseSearch } from "@/app/api/v1/_lib/query";
import { fail, okMeta } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";

import { discoverCompetitions } from "@backend/services/teamRegistrations";

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
  const q = parseSearch(url);
  const { limit, offset } = parsePagination(url, { limit: 50, maxLimit: 200 });
  const categoryId = url.searchParams.get("categoryId");
  const startDateFrom = url.searchParams.get("startDateFrom");
  const startDateTo = url.searchParams.get("startDateTo");
  const skillLevel = url.searchParams.get("skillLevel");
  const prizeMinCentsRaw = url.searchParams.get("prizeMinCents");
  const prizeMinCents = prizeMinCentsRaw ? Number(prizeMinCentsRaw) : null;

  try {
    const { data, count } = await discoverCompetitions(auth.supabase, {
      q,
      categoryId,
      startDateFrom,
      startDateTo,
      skillLevel,
      prizeMinCents,
      limit,
      offset
    });
    return okMeta(data, { limit, offset, count }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

