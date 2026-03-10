import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { created, fail, ok } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireOrganizerRole } from "@/app/api/v1/_lib/rbac";
import { requireTeamRole } from "@/app/api/v1/_lib/teamRbac";
import { encryptBytes, requirePiiSecret, sha256Hex } from "@/app/api/v1/_lib/pii";

import { addVerificationDocument, getVerificationRequest, listVerificationDocuments } from "@backend/services/playerVerifications";

function parseBase64Data(input: string) {
  const normalized = input.trim();
  const match = normalized.match(/^data:([^;]+);base64,(.+)$/);
  if (match) return { mimeType: match[1], base64: match[2] };
  return { mimeType: null as string | null, base64: normalized };
}

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
    const request = await getVerificationRequest(auth.supabase, { id });
    const organizerRole = await requireOrganizerRole(auth.supabase, {
      eventOrganizerId: request.event_organizer_id,
      userId: auth.userId,
      allowedRoles: ["owner", "admin", "staff"]
    }).catch(() => ({ ok: false as const }));

    const teamRole = request.team_profile_id
      ? await requireTeamRole(auth.supabase, {
          teamProfileId: request.team_profile_id,
          userId: auth.userId,
          allowedRoles: ["captain", "manager", "player"]
        })
      : ({ ok: false as const } as any);

    if (!organizerRole.ok && !teamRole.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Not authorized" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const data = await listVerificationDocuments(auth.supabase, { requestId: id });
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
  const body = await readJson<{
    docType?: string;
    dataBase64?: string;
    mimeType?: string | null;
    fileName?: string | null;
    capturedAt?: string | null;
  }>(req);

  if (!body?.docType || !body.dataBase64) {
    return fail(400, { code: "INVALID_REQUEST", message: "docType and dataBase64 are required" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }

  try {
    const request = await getVerificationRequest(auth.supabase, { id });

    const organizerRole = await requireOrganizerRole(auth.supabase, {
      eventOrganizerId: request.event_organizer_id,
      userId: auth.userId,
      allowedRoles: ["owner", "admin", "staff"]
    }).catch(() => ({ ok: false as const }));

    const teamRole = request.team_profile_id
      ? await requireTeamRole(auth.supabase, {
          teamProfileId: request.team_profile_id,
          userId: auth.userId,
          allowedRoles: ["captain", "manager"]
        })
      : ({ ok: false as const } as any);

    if (!organizerRole.ok && !teamRole.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Not authorized" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const parsed = parseBase64Data(body.dataBase64);
    const bytes = Buffer.from(parsed.base64, "base64");
    if (bytes.length === 0) {
      return fail(400, { code: "INVALID_REQUEST", message: "Empty document" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }
    if (bytes.length > 5_000_000) {
      return fail(400, { code: "INVALID_REQUEST", message: "Document too large (max 5MB)" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const secret = requirePiiSecret();
    const contentSha256 = sha256Hex(bytes);
    const contentEncrypted = encryptBytes(bytes, secret);

    const data = await addVerificationDocument(auth.supabase, {
      eventOrganizerId: request.event_organizer_id,
      requestId: id,
      docType: body.docType,
      contentEncrypted,
      contentSha256,
      mimeType: body.mimeType ?? parsed.mimeType,
      fileName: body.fileName ?? null,
      fileSizeBytes: bytes.length,
      capturedAt: body.capturedAt ?? null,
      uploadedByUserId: auth.userId,
      meta: {}
    });

    await auth.supabase.from("player_verification_events").insert({
      event_organizer_id: request.event_organizer_id,
      request_id: id,
      actor_user_id: auth.userId,
      action: "document.uploaded",
      details: { docType: body.docType, sha256: contentSha256, fileName: body.fileName ?? null }
    });

    return created(data, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

