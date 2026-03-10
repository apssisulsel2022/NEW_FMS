import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { fail, ok } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { hashInviteToken } from "@/app/api/v1/_lib/invitations";

import { acceptTeamInvitation } from "@backend/services/teamInvitations";

export async function POST(req: Request) {
  const auth = await requireAuth(req, { rateLimit: { limit: 30, windowMs: 60_000 } });
  if (!auth.ok) {
    return fail(
      auth.status,
      { code: auth.status === 429 ? "RATE_LIMITED" : "UNAUTHORIZED", message: auth.message },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  const body = await readJson<{ token?: string }>(req);
  const token = body?.token ? String(body.token) : "";
  if (!token) {
    return fail(400, { code: "INVALID_REQUEST", message: "token is required" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }

  try {
    const res = await acceptTeamInvitation(auth.supabase, { tokenHash: hashInviteToken(token), userId: auth.userId });
    if (!res.ok) {
      const message =
        res.reason === "expired"
          ? "Invitation expired"
          : res.reason === "already_accepted"
            ? "Invitation already accepted"
            : "Invitation not found";
      return fail(400, { code: "INVALID_REQUEST", message }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }
    return ok(res, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

