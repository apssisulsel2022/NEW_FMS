import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { created, fail } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireOrganizerRole } from "@/app/api/v1/_lib/rbac";
import { mergeDraftPayload, validateCompetitionPayload } from "@/app/api/v1/_lib/competitionDraft";

import { getCompetitionDraft, updateCompetitionDraft } from "@backend/services/competitionDrafts";
import { getCompetitionTemplate } from "@backend/services/competitionTemplates";
import { createCompetition } from "@backend/services/competitions";
import { notifyUsers } from "@backend/services/notifications";

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
  const body = (await readJson<{ publish?: boolean }>(req)) ?? {};
  const publish = body.publish ?? true;

  try {
    const draft = await getCompetitionDraft(auth.supabase, { id });
    const role = await requireOrganizerRole(auth.supabase, {
      eventOrganizerId: draft.event_organizer_id,
      userId: auth.userId,
      allowedRoles: ["owner", "admin"]
    });
    if (!role.ok) {
      return fail(
        403,
        { code: "FORBIDDEN", message: "Insufficient role to publish competitions" },
        { headers: rateLimitHeaders(auth.rateLimit ?? null) }
      );
    }

    const template = draft.template_id ? await getCompetitionTemplate(auth.supabase, { id: draft.template_id }) : null;
    const merged = mergeDraftPayload({
      eventOrganizerId: draft.event_organizer_id,
      templatePayload: (template?.payload as any) ?? null,
      payload: (draft.payload as any) ?? {}
    }) as any;

    const v = validateCompetitionPayload(merged);
    if (!v.ok) {
      return fail(400, { code: "INVALID_REQUEST", message: v.message }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const competition = await createCompetition(auth.supabase, {
      eventOrganizerId: draft.event_organizer_id,
      name: merged.name,
      slug: merged.slug,
      description: merged.description ?? null,
      categoryId: merged.categoryId ?? null,
      season: merged.season ?? null,
      startDate: merged.startDate ?? null,
      endDate: merged.endDate ?? null,
      registrationOpensAt: merged.registrationOpensAt ?? null,
      registrationClosesAt: merged.registrationClosesAt ?? null,
      participantLimit: merged.participantLimit ?? null,
      competitionFormatId: merged.competitionFormatId ?? null,
      prizeStructure: merged.prizeStructure ?? {},
      eligibilityCriteria: merged.eligibilityCriteria ?? {},
      judgingCriteria: merged.judgingCriteria ?? {},
      entryFeeCents: merged.entryFeeCents ?? null,
      currency: merged.currency ?? null,
      allowPublicRegistration: merged.allowPublicRegistration ?? false,
      defaultLocale: merged.defaultLocale ?? "en",
      state: publish ? "published" : "draft"
    });

    await updateCompetitionDraft(auth.supabase, {
      id,
      patch: { publishedCompetitionId: competition.id, previewEnabled: true }
    });

    const { data: members } = await auth.supabase
      .from("event_organizer_members")
      .select("user_id")
      .eq("event_organizer_id", draft.event_organizer_id)
      .eq("status", "active");
    const userIds = (members ?? []).map((m) => m.user_id).filter(Boolean);

    if (publish && userIds.length > 0) {
      await notifyUsers(auth.supabase, {
        eventOrganizerId: draft.event_organizer_id,
        userIds,
        title: "Competition published",
        body: `${competition.name} is now published.`,
        payload: { competitionId: competition.id, type: "competition_published" }
      });
    }

    if (publish) {
      await auth.supabase.from("competitions").update({ published_at: new Date().toISOString() }).eq("id", competition.id);
    }

    return created(competition, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

