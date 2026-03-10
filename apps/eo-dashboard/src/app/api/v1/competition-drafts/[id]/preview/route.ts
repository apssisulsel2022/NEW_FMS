import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { fail, ok } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireOrganizerRole } from "@/app/api/v1/_lib/rbac";
import { mergeDraftPayload, validateCompetitionPayload } from "@/app/api/v1/_lib/competitionDraft";

import { getCompetitionDraft } from "@backend/services/competitionDrafts";
import { getCompetitionTemplate } from "@backend/services/competitionTemplates";

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
    const draft = await getCompetitionDraft(auth.supabase, { id });
    const role = await requireOrganizerRole(auth.supabase, {
      eventOrganizerId: draft.event_organizer_id,
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

    const template = draft.template_id ? await getCompetitionTemplate(auth.supabase, { id: draft.template_id }) : null;
    const merged = mergeDraftPayload({
      eventOrganizerId: draft.event_organizer_id,
      templatePayload: (template?.payload as any) ?? null,
      payload: (draft.payload as any) ?? {}
    });

    const v = validateCompetitionPayload(merged as any);
    if (!v.ok) {
      return fail(400, { code: "INVALID_REQUEST", message: v.message }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    return ok({ draft, template, preview: merged }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

