import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { created, fail, ok } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { slugify } from "@/app/api/v1/_lib/slug";

import { createTeamProfile, listMyTeamProfiles, type CreateTeamProfileInput } from "@backend/services/teamProfiles";

export async function GET(req: Request) {
  const auth = await requireAuth(req, { rateLimit: { limit: 240, windowMs: 60_000 } });
  if (!auth.ok) {
    return fail(
      auth.status,
      { code: auth.status === 429 ? "RATE_LIMITED" : "UNAUTHORIZED", message: auth.message },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  try {
    const data = await listMyTeamProfiles(auth.supabase, { userId: auth.userId });
    return ok(data, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
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

  const body = await readJson<Partial<CreateTeamProfileInput>>(req);
  if (!body) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "Expected application/json body" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = slugify(typeof body.slug === "string" ? body.slug : name);
  if (!name || !slug) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "name is required" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  try {
    const data = await createTeamProfile(auth.supabase, {
      ownerUserId: auth.userId,
      name,
      slug,
      description: body.description ?? null,
      logoPath: body.logoPath ?? null,
      contactEmail: (body as any).contactEmail ?? null,
      contactPhone: (body as any).contactPhone ?? null,
      meta: body.meta ?? {}
    });
    return created(data, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

