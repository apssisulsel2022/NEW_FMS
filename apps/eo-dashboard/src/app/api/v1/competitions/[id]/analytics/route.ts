import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { fail, ok } from "@/app/api/v1/_lib/responses";
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

  try {
    const competition = await getCompetition(auth.supabase, { id });
    const role = await requireOrganizerRole(auth.supabase, {
      eventOrganizerId: competition.event_organizer_id,
      userId: auth.userId,
      allowedRoles: ["owner", "admin", "staff"]
    });
    if (!role.ok) {
      return fail(
        403,
        { code: "FORBIDDEN", message: "Not a member of this event organizer" },
        { headers: rateLimitHeaders(auth.rateLimit ?? null) }
      );
    }

    const { data, error } = await auth.supabase
      .from("competition_analytics_summary")
      .select("*")
      .eq("competition_id", id)
      .maybeSingle();
    if (error) throw error;
    return ok(data ?? null, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

