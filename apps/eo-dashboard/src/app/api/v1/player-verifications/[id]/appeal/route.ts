import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { fail, ok } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireTeamRole } from "@/app/api/v1/_lib/teamRbac";

import { appealVerificationRequest, getVerificationRequest } from "@backend/services/playerVerifications";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, { rateLimit: { limit: 60, windowMs: 60_000 } });
  if (!auth.ok) {
    return fail(
      auth.status,
      { code: auth.status === 429 ? "RATE_LIMITED" : "UNAUTHORIZED", message: auth.message },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  const { id } = await ctx.params;
  const body = await readJson<{ message?: string }>(req);
  const message = body?.message ? String(body.message).trim() : "";
  if (!message) {
    return fail(400, { code: "INVALID_REQUEST", message: "message is required" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }

  try {
    const request = await getVerificationRequest(auth.supabase, { id });
    if (!request.team_profile_id) {
      return fail(400, { code: "INVALID_REQUEST", message: "Appeal is not available for this request" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const role = await requireTeamRole(auth.supabase, {
      teamProfileId: request.team_profile_id,
      userId: auth.userId,
      allowedRoles: ["captain", "manager"]
    });
    if (!role.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Not authorized" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    if (request.workflow_status !== "rejected") {
      return fail(
        400,
        { code: "INVALID_REQUEST", message: "Appeals are allowed only for rejected requests" },
        { headers: rateLimitHeaders(auth.rateLimit ?? null) }
      );
    }

    const updated = await appealVerificationRequest(auth.supabase, { id, actorUserId: auth.userId, appealMessage: message });
    return ok(updated, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

