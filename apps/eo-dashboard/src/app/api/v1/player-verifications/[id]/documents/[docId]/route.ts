import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { fail, ok } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireOrganizerRole } from "@/app/api/v1/_lib/rbac";
import { requireTeamRole } from "@/app/api/v1/_lib/teamRbac";
import { decryptBytes, requirePiiSecret } from "@/app/api/v1/_lib/pii";

import { getVerificationDocument, getVerificationRequest } from "@backend/services/playerVerifications";

export async function GET(req: Request, ctx: { params: Promise<{ id: string; docId: string }> }) {
  const auth = await requireAuth(req, { rateLimit: { limit: 120, windowMs: 60_000 } });
  if (!auth.ok) {
    return fail(
      auth.status,
      { code: auth.status === 429 ? "RATE_LIMITED" : "UNAUTHORIZED", message: auth.message },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  const { id, docId } = await ctx.params;

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

    const doc = await getVerificationDocument(auth.supabase, { id: docId });
    if (doc.request_id !== id) {
      return fail(404, { code: "NOT_FOUND", message: "Document not found" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const secret = requirePiiSecret();
    const bytes = decryptBytes(doc.content_encrypted, secret);
    const dataBase64 = bytes.toString("base64");
    const mimeType = doc.mime_type ?? "application/octet-stream";

    return ok({ id: doc.id, docType: doc.doc_type, mimeType, dataBase64 }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

