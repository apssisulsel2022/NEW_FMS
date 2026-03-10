import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { parsePagination, parseSearch, parseSort } from "@/app/api/v1/_lib/query";
import { created, fail, okMeta } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";

import { createPlayer, listPlayers, type CreatePlayerInput } from "@backend/services/players";
import { encryptNik, validateNik } from "@/app/api/v1/_lib/nik";

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

  const { limit, offset } = parsePagination(url, { limit: 50, maxLimit: 100 });
  const q = parseSearch(url);
  const sort = parseSort(url, ["created_at", "last_name", "first_name"] as const, {
    sortBy: "created_at",
    sortOrder: "desc"
  });
  const status = url.searchParams.get("status");

  try {
    const { data, count } = await listPlayers(auth.supabase, {
      eventOrganizerId,
      limit,
      offset,
      q,
      status,
      sortBy: sort?.sortBy ?? "created_at",
      sortOrder: sort?.sortOrder ?? "desc"
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

  const body = await readJson<Partial<CreatePlayerInput>>(req);
  if (!body) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "Expected application/json body" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  if (!body.eventOrganizerId || !body.firstName || !body.lastName) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "eventOrganizerId, firstName, lastName are required" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  try {
    const piiKey = process.env.FMS_PII_ENCRYPTION_KEY ?? "";
    const nikInput = (body as any).nik as string | undefined;
    let nikEncrypted: string | null = null;
    let nikHmac: string | null = null;
    let nikLast4: string | null = null;

    if (nikInput !== undefined) {
      if (!piiKey) {
        return fail(
          500,
          { code: "SERVER_ERROR", message: "Server misconfiguration" },
          { headers: rateLimitHeaders(auth.rateLimit ?? null) }
        );
      }
      const validated = validateNik(nikInput);
      if (!validated.ok) {
        return fail(
          400,
          { code: "INVALID_REQUEST", message: validated.message },
          { headers: rateLimitHeaders(auth.rateLimit ?? null) }
        );
      }
      const enc = encryptNik(validated.value, piiKey);
      nikEncrypted = enc.encrypted;
      nikHmac = enc.hmac;
      nikLast4 = enc.last4;
    }

    const data = await createPlayer(auth.supabase, {
      eventOrganizerId: body.eventOrganizerId,
      firstName: body.firstName,
      lastName: body.lastName,
      dateOfBirth: body.dateOfBirth ?? null,
      nationality: body.nationality ?? null,
      gender: body.gender ?? null,
      photoPath: body.photoPath ?? null,
      nikEncrypted,
      nikHmac,
      nikLast4
    });
    return created(data, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}
