import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { fail, ok } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireOrganizerRole } from "@/app/api/v1/_lib/rbac";
import { requireTeamRole } from "@/app/api/v1/_lib/teamRbac";

import { getVerificationRequest } from "@backend/services/playerVerifications";

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
    const data = await getVerificationRequest(auth.supabase, { id });
    const organizerRole = await requireOrganizerRole(auth.supabase, {
      eventOrganizerId: data.event_organizer_id,
      userId: auth.userId,
      allowedRoles: ["owner", "admin", "staff"]
    }).catch(() => ({ ok: false as const }));

    const teamRole = data.team_profile_id
      ? await requireTeamRole(auth.supabase, {
          teamProfileId: data.team_profile_id,
          userId: auth.userId,
          allowedRoles: ["captain", "manager", "player"]
        })
      : ({ ok: false as const } as any);

    if (!organizerRole.ok && !teamRole.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Not authorized" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    return ok(data, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, { rateLimit: { limit: 120, windowMs: 60_000 } });
  if (!auth.ok) {
    return fail(
      auth.status,
      { code: auth.status === 429 ? "RATE_LIMITED" : "UNAUTHORIZED", message: auth.message },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }
  const { id } = await ctx.params;
  const body = await readJson<{ workflowStatus?: string; meta?: Record<string, unknown> }>(req);
  if (!body) {
    return fail(400, { code: "INVALID_REQUEST", message: "Expected application/json body" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }

  try {
    const current = await getVerificationRequest(auth.supabase, { id });
    const role = await requireOrganizerRole(auth.supabase, {
      eventOrganizerId: current.event_organizer_id,
      userId: auth.userId,
      allowedRoles: ["owner", "admin", "staff"]
    });
    if (!role.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Not authorized" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const patch: any = {};
    if (body.workflowStatus !== undefined) patch.workflow_status = body.workflowStatus;
    if (body.meta !== undefined) patch.meta = body.meta;

    const { data, error } = await auth.supabase
      .from("player_verification_requests")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;

    return ok(data, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

