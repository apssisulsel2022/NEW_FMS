import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { created, fail } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireOrganizerRole } from "@/app/api/v1/_lib/rbac";
import { slugify } from "@/app/api/v1/_lib/slug";

import { getCompetition } from "@backend/services/competitions";
import { createParticipantImportJob, updateParticipantImportJob } from "@backend/services/competitionImports";

function parseCsvLines(csv: string) {
  return csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
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
  const body = await readJson<{ csv?: string; hasHeader?: boolean }>(req);
  if (!body?.csv) {
    return fail(
      400,
      { code: "INVALID_REQUEST", message: "csv is required" },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  }

  try {
    const competition = await getCompetition(auth.supabase, { id });
    const role = await requireOrganizerRole(auth.supabase, {
      eventOrganizerId: competition.event_organizer_id,
      userId: auth.userId,
      allowedRoles: ["owner", "admin"]
    });
    if (!role.ok) {
      return fail(
        403,
        { code: "FORBIDDEN", message: "Insufficient role to import participants" },
        { headers: rateLimitHeaders(auth.rateLimit ?? null) }
      );
    }

    const job = await createParticipantImportJob(auth.supabase, {
      eventOrganizerId: competition.event_organizer_id,
      competitionId: id,
      createdByUserId: auth.userId,
      jobStatus: "running",
      sourceType: "csv",
      sourceMeta: { hasHeader: body.hasHeader ?? true }
    });

    const lines = parseCsvLines(body.csv);
    const dataLines = body.hasHeader === false ? lines : lines.slice(1);

    const seen = new Map<string, number>();
    const toInsert = dataLines
      .map((line, index) => {
        const [nameRaw, slugRaw] = line.split(",").map((s) => (s ?? "").trim());
        const name = nameRaw;
        if (!name) return { ok: false as const, index, line, reason: "name is required" };
        const baseSlug = slugify(slugRaw || name);
        if (!baseSlug) return { ok: false as const, index, line, reason: "invalid slug" };
        const count = (seen.get(baseSlug) ?? 0) + 1;
        seen.set(baseSlug, count);
        const slug = count === 1 ? baseSlug : `${baseSlug}-${count}`;
        return {
          ok: true as const,
          row: {
            event_organizer_id: competition.event_organizer_id,
            competition_id: id,
            name,
            slug,
            logo_path: null
          }
        };
      })
      .filter((x) => x.ok) as { ok: true; row: any }[];

    const rejected = dataLines
      .map((line, index) => {
        const [nameRaw, slugRaw] = line.split(",").map((s) => (s ?? "").trim());
        const name = nameRaw;
        const baseSlug = slugify(slugRaw || name);
        if (!name) return { index, line, reason: "name is required" };
        if (!baseSlug) return { index, line, reason: "invalid slug" };
        return null;
      })
      .filter(Boolean);

    const { data: teams, error: teamsError } = await auth.supabase
      .from("teams")
      .insert(toInsert.map((x) => x.row))
      .select("id");
    if (teamsError) throw teamsError;

    const teamIds = (teams ?? []).map((t) => t.id);
    if (teamIds.length > 0) {
      const rows = teamIds.map((teamId) => ({
        event_organizer_id: competition.event_organizer_id,
        competition_id: id,
        participant_type: "team",
        team_id: teamId,
        player_id: null,
        user_id: null,
        registration_status: "registered",
        payment_status: "not_required",
        meta: { source: "bulk_import" }
      }));
      const { error: partErr } = await auth.supabase.from("competition_participants").insert(rows);
      if (partErr) throw partErr;
    }

    const result = {
      createdTeams: teamIds.length,
      rejected,
      totalLines: dataLines.length
    };

    await updateParticipantImportJob(auth.supabase, { id: job.id, patch: { jobStatus: "completed", result } });
    return created({ jobId: job.id, ...result }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

