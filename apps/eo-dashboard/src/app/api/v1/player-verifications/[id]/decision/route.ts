import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { fail, ok } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireOrganizerRole } from "@/app/api/v1/_lib/rbac";

import { notifyUsers } from "@backend/services/notifications";
import { decideVerificationRequest, getVerificationRequest } from "@backend/services/playerVerifications";

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
  const body = await readJson<{ decision?: "approved" | "rejected"; reason?: string; notes?: string }>(req);
  if (!body?.decision) {
    return fail(400, { code: "INVALID_REQUEST", message: "decision is required" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }

  try {
    const request = await getVerificationRequest(auth.supabase, { id });
    const role = await requireOrganizerRole(auth.supabase, {
      eventOrganizerId: request.event_organizer_id,
      userId: auth.userId,
      allowedRoles: ["owner", "admin"]
    });
    if (!role.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Not authorized" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    if (request.workflow_status !== "submitted" && request.workflow_status !== "in_review" && request.workflow_status !== "appealed") {
      return fail(
        400,
        { code: "INVALID_REQUEST", message: `Cannot decide from status ${request.workflow_status}` },
        { headers: rateLimitHeaders(auth.rateLimit ?? null) }
      );
    }

    const updated = await decideVerificationRequest(auth.supabase, {
      id,
      actorUserId: auth.userId,
      decision: body.decision,
      reason: body.reason ?? null,
      notes: body.notes ?? null
    });

    if (updated.team_profile_id) {
      const { data: members } = await auth.supabase
        .from("team_members")
        .select("user_id")
        .eq("team_profile_id", updated.team_profile_id)
        .eq("status", "active");
      const userIds = (members ?? []).map((m) => m.user_id).filter(Boolean);
      if (userIds.length > 0) {
        await notifyUsers(auth.supabase, {
          eventOrganizerId: null,
          userIds,
          title: body.decision === "approved" ? "Player verified" : "Player verification rejected",
          body: body.reason ? `Reason: ${body.reason}` : null,
          payload: {
            type: "player_verification_decision",
            eventOrganizerId: updated.event_organizer_id,
            requestId: id,
            playerId: updated.player_id,
            decision: body.decision
          }
        });
      }
    }

    const { data: player } = await auth.supabase
      .from("players")
      .select("email")
      .eq("id", updated.player_id)
      .maybeSingle();

    if (player?.email) {
      await auth.supabase.from("outbox_events").insert({
        event_organizer_id: null,
        topic: "email.send",
        payload: {
          to: player.email,
          template: "player_verification_status",
          vars: {
            decision: body.decision,
            reason: body.reason ?? null
          },
          context: { eventOrganizerId: updated.event_organizer_id, requestId: id, playerId: updated.player_id }
        }
      });
    }

    return ok(updated, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

