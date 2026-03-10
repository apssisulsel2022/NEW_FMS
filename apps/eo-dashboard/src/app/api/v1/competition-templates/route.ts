import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { parsePagination } from "@/app/api/v1/_lib/query";
import { created, fail, okMeta } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireOrganizerRole } from "@/app/api/v1/_lib/rbac";

import {
  createCompetitionTemplate,
  listCompetitionTemplates,
  type CreateCompetitionTemplateInput
} from "@backend/services/competitionTemplates";

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
  const { limit, offset } = parsePagination(url, { limit: 50, maxLimit: 200 });

  try {
    const { data, count } = await listCompetitionTemplates(auth.supabase, {
      eventOrganizerId: eventOrganizerId ? eventOrganizerId : null,
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
  const auth = await requireAuth(req, { rateLimit: { limit: 60, windowMs: 60_000 } });
  if (!auth.ok) {
    return fail(
      auth.status,
      { code: auth.status === 429 ? "RATE_LIMITED" : "UNAUTHORIZED", message: auth.message },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  const body = await readJson<Partial<CreateCompetitionTemplateInput>>(req);
  if (!body) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "Expected application/json body" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  if (!body.code || !body.name) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "code, name are required" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  if (body.eventOrganizerId) {
    const role = await requireOrganizerRole(auth.supabase, {
      eventOrganizerId: body.eventOrganizerId,
      userId: auth.userId,
      allowedRoles: ["owner", "admin"]
    });
    if (!role.ok) {
      return fail(
        403,
        { code: "FORBIDDEN", message: "Insufficient role to manage templates" },
        { headers: rateLimitHeaders(auth.rateLimit ?? null) }
      );
    }
  }

  try {
    const data = await createCompetitionTemplate(auth.supabase, {
      eventOrganizerId: body.eventOrganizerId ?? null,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      payload: body.payload ?? {}
    });
    return created(data, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

