import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { fail, noContent, ok } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireTeamRole } from "@/app/api/v1/_lib/teamRbac";

import { listTeamMembers, removeTeamMember, updateTeamMemberRole } from "@backend/services/teamMembers";

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
    const role = await requireTeamRole(auth.supabase, { teamProfileId: id, userId: auth.userId, allowedRoles: ["captain", "manager", "player"] });
    if (!role.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Not a team member" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }
    const data = await listTeamMembers(auth.supabase, { teamProfileId: id });
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
  const body = await readJson<{ memberId?: string; role?: "captain" | "manager" | "player" }>(req);
  if (!body?.memberId || !body.role) {
    return fail(400, { code: "INVALID_REQUEST", message: "memberId and role are required" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }

  try {
    const role = await requireTeamRole(auth.supabase, { teamProfileId: id, userId: auth.userId, allowedRoles: ["captain"] });
    if (!role.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Only captain can manage roles" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }
    const data = await updateTeamMemberRole(auth.supabase, { id: body.memberId, role: body.role });
    return ok(data, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, { rateLimit: { limit: 60, windowMs: 60_000 } });
  if (!auth.ok) {
    return fail(
      auth.status,
      { code: auth.status === 429 ? "RATE_LIMITED" : "UNAUTHORIZED", message: auth.message },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const memberId = url.searchParams.get("memberId");
  if (!memberId) {
    return fail(400, { code: "INVALID_REQUEST", message: "memberId is required" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }

  try {
    const role = await requireTeamRole(auth.supabase, { teamProfileId: id, userId: auth.userId, allowedRoles: ["captain"] });
    if (!role.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Only captain can remove members" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }
    await removeTeamMember(auth.supabase, { id: memberId });
    return noContent({ headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

