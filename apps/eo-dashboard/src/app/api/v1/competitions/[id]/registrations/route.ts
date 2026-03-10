import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { parsePagination } from "@/app/api/v1/_lib/query";
import { fail, okMeta } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireOrganizerRole } from "@/app/api/v1/_lib/rbac";

import { getCompetition } from "@backend/services/competitions";

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
  const { limit, offset } = parsePagination(url, { limit: 50, maxLimit: 200 });
  const registrationStatus = url.searchParams.get("registrationStatus");

  try {
    const competition = await getCompetition(auth.supabase, { id });
    const role = await requireOrganizerRole(auth.supabase, {
      eventOrganizerId: competition.event_organizer_id,
      userId: auth.userId,
      allowedRoles: ["owner", "admin", "staff"]
    });
    if (!role.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Not authorized" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    let query = auth.supabase
      .from("competition_participants")
      .select(
        "id,created_at,registration_status,payment_status,team_profile_id,team_id,meta,team_profiles:team_profile_id(id,name,slug,logo_path,owner_user_id)",
        { count: "exact" }
      )
      .eq("competition_id", id)
      .eq("participant_type", "team")
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (registrationStatus) query = query.eq("registration_status", registrationStatus);

    const { data, error, count } = await query;
    if (error) throw error;

    return okMeta(data ?? [], { limit, offset, count: count ?? 0 }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

