import { NextResponse } from "next/server";

import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { fail } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireOrganizerRole } from "@/app/api/v1/_lib/rbac";
import { requireTeamRole } from "@/app/api/v1/_lib/teamRbac";

import { getTeamContext, listTeamRoster } from "@backend/services/teamRoster";

function csvEscape(value: unknown) {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[,"\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
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
    const team = await getTeamContext(auth.supabase, { teamId: id });

    const organizerRole = await requireOrganizerRole(auth.supabase, {
      eventOrganizerId: team.event_organizer_id,
      userId: auth.userId,
      allowedRoles: ["owner", "admin", "staff"]
    }).catch(() => ({ ok: false as const }));

    const teamRole = team.team_profile_id
      ? await requireTeamRole(auth.supabase, {
          teamProfileId: team.team_profile_id,
          userId: auth.userId,
          allowedRoles: ["captain", "manager", "player"]
        })
      : ({ ok: false as const } as any);

    if (!organizerRole.ok && !teamRole.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Not authorized" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const { data } = await listTeamRoster(auth.supabase, { teamId: id, limit: 500, offset: 0 });

    const header = [
      "team_player_id",
      "player_id",
      "player_code",
      "first_name",
      "last_name",
      "date_of_birth",
      "email",
      "phone",
      "position",
      "jersey_number",
      "roster_status",
      "start_date",
      "end_date"
    ];
    const lines = [header.join(",")];

    for (const row of data) {
      const p: any = (row as any).players;
      const values = [
        (row as any).id,
        (row as any).player_id,
        p?.player_code ?? "",
        p?.first_name ?? "",
        p?.last_name ?? "",
        p?.date_of_birth ?? "",
        p?.email ?? "",
        p?.phone ?? "",
        (row as any).position ?? "",
        (row as any).jersey_number ?? "",
        (row as any).roster_status ?? "",
        (row as any).start_date ?? "",
        (row as any).end_date ?? ""
      ].map(csvEscape);
      lines.push(values.join(","));
    }

    const csv = lines.join("\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename=\"team-${id}-roster.csv\"`,
        ...rateLimitHeaders(auth.rateLimit ?? null)
      }
    });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}

