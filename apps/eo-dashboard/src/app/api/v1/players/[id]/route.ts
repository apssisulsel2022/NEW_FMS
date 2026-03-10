import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { fail, noContent, ok } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";

import { deletePlayer, getPlayer, updatePlayer, type UpdatePlayerInput } from "@backend/services/players";
import { encryptNik, validateNik } from "@/app/api/v1/_lib/nik";

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
    const data = await getPlayer(auth.supabase, { id });
    return ok(data, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return PATCH(req, ctx);
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
  const body = await readJson<UpdatePlayerInput>(req);
  if (!body) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "Expected application/json body" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  try {
    const patch: any = { ...body };
    delete patch.nikEncrypted;
    delete patch.nikHmac;
    delete patch.nikLast4;
    delete patch.nikSetAt;
    const piiKey = process.env.FMS_PII_ENCRYPTION_KEY ?? "";
    const nikInput = (body as any).nik as string | null | undefined;
    if (nikInput !== undefined) {
      if (nikInput === null) {
        patch.nikEncrypted = null;
        patch.nikHmac = null;
        patch.nikLast4 = null;
        patch.nikSetAt = null;
      } else {
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
        patch.nikEncrypted = enc.encrypted;
        patch.nikHmac = enc.hmac;
        patch.nikLast4 = enc.last4;
        patch.nikSetAt = new Date().toISOString();
      }
    }

    const data = await updatePlayer(auth.supabase, { id, patch });
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

  try {
    await deletePlayer(auth.supabase, { id });
    return noContent({ headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}
