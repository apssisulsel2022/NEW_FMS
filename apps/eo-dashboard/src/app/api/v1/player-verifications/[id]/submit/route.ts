import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { fail, ok } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireOrganizerRole } from "@/app/api/v1/_lib/rbac";
import { requireTeamRole } from "@/app/api/v1/_lib/teamRbac";

import {
  getVerificationRequest,
  listVerificationDocuments,
  submitVerificationRequest
} from "@backend/services/playerVerifications";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
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

    if (request.workflow_status !== "draft" && request.workflow_status !== "rejected" && request.workflow_status !== "appealed") {
      return fail(
        400,
        { code: "INVALID_REQUEST", message: `Cannot submit from status ${request.workflow_status}` },
        { headers: rateLimitHeaders(auth.rateLimit ?? null) }
      );
    }

    const docs = await listVerificationDocuments(auth.supabase, { requestId: id });
    const hasIdFront = docs.some((d: any) => d.doc_type === "government_id_front");
    const hasSelfie = docs.some((d: any) => d.doc_type === "selfie" || d.doc_type === "live_capture");
    if (!hasIdFront || !hasSelfie) {
      return fail(
        400,
        { code: "INVALID_REQUEST", message: "Required documents: government_id_front and selfie/live_capture" },
        { headers: rateLimitHeaders(auth.rateLimit ?? null) }
      );
    }

    const { data: player, error: playerError } = await auth.supabase
      .from("players")
      .select("id,event_organizer_id,email,nik_hmac")
      .eq("id", request.player_id)
      .single();
    if (playerError) throw playerError;

    const duplicates: any = { email: [], nik: [] };
    if (player.email) {
      const { data: sameEmail } = await auth.supabase
        .from("players")
        .select("id")
        .eq("event_organizer_id", request.event_organizer_id)
        .ilike("email", String(player.email))
        .neq("id", player.id)
        .limit(10);
      duplicates.email = (sameEmail ?? []).map((x) => x.id);
    }
    if (player.nik_hmac) {
      const { data: sameNik } = await auth.supabase
        .from("players")
        .select("id")
        .eq("event_organizer_id", request.event_organizer_id)
        .eq("nik_hmac", player.nik_hmac)
        .neq("id", player.id)
        .limit(10);
      duplicates.nik = (sameNik ?? []).map((x) => x.id);
    }

    const aiResult = { duplicates, checks: { docVerification: "queued", faceMatch: "queued" } };

    const updated = await submitVerificationRequest(auth.supabase, { id, actorUserId: auth.userId, aiResult });

    await auth.supabase.from("outbox_events").insert({
      event_organizer_id: null,
      topic: "player.verification.submitted",
      payload: { requestId: id, eventOrganizerId: updated.event_organizer_id, playerId: updated.player_id }
    });

    return ok(updated, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

