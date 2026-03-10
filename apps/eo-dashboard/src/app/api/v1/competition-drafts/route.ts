import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { parsePagination } from "@/app/api/v1/_lib/query";
import { created, fail, okMeta } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireOrganizerRole } from "@/app/api/v1/_lib/rbac";

import {
  createCompetitionDraft,
  listCompetitionDrafts,
  type CreateCompetitionDraftInput
} from "@backend/services/competitionDrafts";

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

  const createdByUserId = url.searchParams.get("createdByUserId");
  const { limit, offset } = parsePagination(url, { limit: 50, maxLimit: 200 });

  try {
    const { data, count } = await listCompetitionDrafts(auth.supabase, {
      eventOrganizerId,
      createdByUserId: createdByUserId ? createdByUserId : null,
      limit,
      offset
    });
    return okMeta(data, { limit, offset, count }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth(req, { rateLimit: { limit: 120, windowMs: 60_000 } });
  if (!auth.ok) {
    return fail(
      auth.status,
      { code: auth.status === 429 ? "RATE_LIMITED" : "UNAUTHORIZED", message: auth.message },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  const body = await readJson<Partial<CreateCompetitionDraftInput>>(req);
  if (!body) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "Expected application/json body" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  if (!body.eventOrganizerId) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "eventOrganizerId is required" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  const role = await requireOrganizerRole(auth.supabase, {
    eventOrganizerId: body.eventOrganizerId,
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
    const data = await createCompetitionDraft(auth.supabase, {
      eventOrganizerId: body.eventOrganizerId,
      createdByUserId: auth.userId,
      templateId: body.templateId ?? null,
      step: body.step ?? 1,
      payload: body.payload ?? {},
      previewEnabled: body.previewEnabled ?? false
    });
    return created(data, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

