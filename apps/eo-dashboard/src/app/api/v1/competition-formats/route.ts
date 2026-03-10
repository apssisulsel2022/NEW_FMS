import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { fail, okMeta } from "@/app/api/v1/_lib/responses";
import { parsePagination } from "@/app/api/v1/_lib/query";
import { requireAuth } from "@/app/api/v1/_lib/auth";

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

  const { limit, offset } = parsePagination(url, { limit: 50, maxLimit: 200 });

  try {
    const { data, error, count } = await auth.supabase
      .from("competition_formats")
      .select("id,event_organizer_id,code,name,format_type,rules,created_at", { count: "exact" })
      .or(`event_organizer_id.eq.${eventOrganizerId},event_organizer_id.is.null`)
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return okMeta(data ?? [], { limit, offset, count: count ?? 0 }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

