import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { created, fail, ok } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { generateInviteToken, hashInviteToken } from "@/app/api/v1/_lib/invitations";
import { requireTeamRole } from "@/app/api/v1/_lib/teamRbac";

import { createTeamInvitation, listTeamInvitations } from "@backend/services/teamInvitations";

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
    const role = await requireTeamRole(auth.supabase, { teamProfileId: id, userId: auth.userId, allowedRoles: ["captain", "manager"] });
    if (!role.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Insufficient role to view invitations" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }
    const data = await listTeamInvitations(auth.supabase, { teamProfileId: id });
    return ok(data, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, { rateLimit: { limit: 30, windowMs: 60_000 } });
  if (!auth.ok) {
    return fail(
      auth.status,
      { code: auth.status === 429 ? "RATE_LIMITED" : "UNAUTHORIZED", message: auth.message },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  const { id } = await ctx.params;
  const body = await readJson<{ invitedEmail?: string; invitedUserId?: string; role?: "captain" | "manager" | "player" }>(req);
  if (!body) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "Expected application/json body" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  try {
    const role = await requireTeamRole(auth.supabase, { teamProfileId: id, userId: auth.userId, allowedRoles: ["captain", "manager"] });
    if (!role.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Insufficient role to invite members" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const token = generateInviteToken();
    const tokenHash = hashInviteToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const invitation = await createTeamInvitation(auth.supabase, {
      teamProfileId: id,
      createdByUserId: auth.userId,
      invitedEmail: body.invitedEmail ?? null,
      invitedUserId: body.invitedUserId ?? null,
      role: body.role ?? "player",
      tokenHash,
      expiresAt
    });

    return created({ invitation, token }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

