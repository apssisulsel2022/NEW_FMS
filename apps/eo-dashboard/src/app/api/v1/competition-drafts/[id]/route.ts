import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { fail, noContent, ok } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireOrganizerRole } from "@/app/api/v1/_lib/rbac";

import {
  deleteCompetitionDraft,
  getCompetitionDraft,
  updateCompetitionDraft,
  type UpdateCompetitionDraftInput
} from "@backend/services/competitionDrafts";

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
    const data = await getCompetitionDraft(auth.supabase, { id });
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
  const body = await readJson<UpdateCompetitionDraftInput>(req);
  if (!body) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "Expected application/json body" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  const draft = await getCompetitionDraft(auth.supabase, { id }).catch(() => null);
  if (!draft?.event_organizer_id) {
    return fail(404, { code: "NOT_FOUND", message: "Draft not found" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }

  const role = await requireOrganizerRole(auth.supabase, {
    eventOrganizerId: draft.event_organizer_id,
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

  try {
    const data = await updateCompetitionDraft(auth.supabase, { id, patch: body });
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

  const draft = await getCompetitionDraft(auth.supabase, { id }).catch(() => null);
  if (!draft?.event_organizer_id) {
    return fail(404, { code: "NOT_FOUND", message: "Draft not found" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }

  const role = await requireOrganizerRole(auth.supabase, {
    eventOrganizerId: draft.event_organizer_id,
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

  try {
    await deleteCompetitionDraft(auth.supabase, { id });
    return noContent({ headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

