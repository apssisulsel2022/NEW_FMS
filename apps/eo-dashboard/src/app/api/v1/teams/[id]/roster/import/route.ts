import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { readJson } from "@/app/api/v1/_lib/http";
import { created, fail } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireOrganizerRole } from "@/app/api/v1/_lib/rbac";
import { requireTeamRole } from "@/app/api/v1/_lib/teamRbac";

import { addPlayerToRoster, getTeamContext } from "@backend/services/teamRoster";

function parseCsvLines(csv: string) {
  return csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, { rateLimit: { limit: 15, windowMs: 60_000 } });
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
    return fail(400, { code: "INVALID_REQUEST", message: "csv is required" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }

  try {
    const team = await getTeamContext(auth.supabase, { teamId: id });

    const organizerRole = await requireOrganizerRole(auth.supabase, {
      eventOrganizerId: team.event_organizer_id,
      userId: auth.userId,
      allowedRoles: ["owner", "admin"]
    }).catch(() => ({ ok: false as const }));
    const teamRole = team.team_profile_id
      ? await requireTeamRole(auth.supabase, { teamProfileId: team.team_profile_id, userId: auth.userId, allowedRoles: ["captain", "manager"] })
      : ({ ok: false as const } as any);

    if (!organizerRole.ok && !teamRole.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Not authorized" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const lines = parseCsvLines(body.csv);
    const dataLines = body.hasHeader === false ? lines : lines.slice(1);

    let createdCount = 0;
    const rejected: { index: number; line: string; reason: string }[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const cols = line.split(",").map((s) => (s ?? "").trim());

      const firstName = cols[0] ?? "";
      const lastName = cols[1] ?? "";
      const dateOfBirth = cols[2] ?? "";
      const email = cols[3] ?? "";
      const phone = cols[4] ?? "";
      const primaryPosition = cols[5] ?? "";
      const jerseyNumber = cols[6] ? Number(cols[6]) : null;
      const rosterStatus = (cols[7] ?? "active") as any;
      const emergencyContactName = cols[8] ?? "";
      const emergencyContactPhone = cols[9] ?? "";
      const address = cols[10] ?? "";

      if (!firstName || !lastName || !dateOfBirth || !phone || !emergencyContactName || !emergencyContactPhone || !primaryPosition) {
        rejected.push({ index: i, line, reason: "missing required fields" });
        continue;
      }

      const res = await addPlayerToRoster(auth.supabase, {
        teamId: id,
        player: {
          firstName,
          lastName,
          dateOfBirth,
          email: email || null,
          phone,
          address: address || null,
          emergencyContactName,
          emergencyContactPhone,
          primaryPosition,
          jerseyNumberPreference: jerseyNumber
        },
        roster: { jerseyNumber, position: primaryPosition, rosterStatus }
      });

      if (!res.ok) {
        rejected.push({ index: i, line, reason: res.message });
        continue;
      }

      createdCount += 1;
    }

    return created(
      { created: createdCount, rejected, totalLines: dataLines.length },
      { headers: rateLimitHeaders(auth.rateLimit ?? null) }
    );
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

