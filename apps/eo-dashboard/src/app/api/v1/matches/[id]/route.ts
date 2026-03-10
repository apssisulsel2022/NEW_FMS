import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { fail, noContent, ok } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";

import {
  deleteMatch,
  getMatch,
  updateMatch,
  updateScore,
  type UpdateMatchInput
} from "@backend/services/matches";

type MatchPatchBody = UpdateMatchInput & {
  homeScore?: number;
  awayScore?: number;
};

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
    const data = await getMatch(auth.supabase, { id });
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
  const body = await readJson<MatchPatchBody>(req);
  if (!body) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "Expected application/json body" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  try {
    const shouldUpdateScore = typeof body.homeScore === "number" && typeof body.awayScore === "number";
    if (shouldUpdateScore) {
      await updateScore(auth.supabase, {
        matchId: id,
        homeScore: body.homeScore as number,
        awayScore: body.awayScore as number,
        matchStatus: body.matchStatus
      });
    }

    const hasOtherFields =
      body.scheduledAt !== undefined ||
      body.venue !== undefined ||
      body.matchStatus !== undefined ||
      body.publishedReport !== undefined ||
      body.status !== undefined;

    if (hasOtherFields) {
      const data = await updateMatch(auth.supabase, {
        id,
        patch: {
          scheduledAt: body.scheduledAt,
          venue: body.venue,
          matchStatus: body.matchStatus,
          publishedReport: body.publishedReport,
          status: body.status
        }
      });
      return ok(data, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const data = await getMatch(auth.supabase, { id });
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
    await deleteMatch(auth.supabase, { id });
    return noContent({ headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}
