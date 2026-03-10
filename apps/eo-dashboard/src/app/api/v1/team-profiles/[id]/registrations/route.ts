import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { parsePagination } from "@/app/api/v1/_lib/query";
import { fail, okMeta } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireTeamRole } from "@/app/api/v1/_lib/teamRbac";

import { listTeamRegistrations } from "@backend/services/teamRegistrations";

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

  try {
    const role = await requireTeamRole(auth.supabase, { teamProfileId: id, userId: auth.userId, allowedRoles: ["captain", "manager", "player"] });
    if (!role.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Not a team member" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }
    const { data, count } = await listTeamRegistrations(auth.supabase, { teamProfileId: id, limit, offset });
    return okMeta(data, { limit, offset, count }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

