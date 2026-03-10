import { NextResponse } from "next/server";

import { mapToHttpError } from "@/app/api/v1/_lib/errors";
import { rateLimitHeaders } from "@/app/api/v1/_lib/headers";
import { fail } from "@/app/api/v1/_lib/responses";
import { requireAuth } from "@/app/api/v1/_lib/auth";
import { requireOrganizerRole } from "@/app/api/v1/_lib/rbac";

import { getCompetition } from "@backend/services/competitions";

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
    const competition = await getCompetition(auth.supabase, { id });
    const role = await requireOrganizerRole(auth.supabase, {
      eventOrganizerId: competition.event_organizer_id,
      userId: auth.userId,
      allowedRoles: ["owner", "admin", "staff"]
    });
    if (!role.ok) {
      return fail(403, { code: "FORBIDDEN", message: "Not authorized" }, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
    }

    const { data, error } = await auth.supabase
      .from("competition_participants")
      .select("id,created_at,registration_status,payment_status,team_profiles:team_profile_id(id,name,slug,contact_email,contact_phone)")
      .eq("competition_id", id)
      .eq("participant_type", "team")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const header = ["participant_id", "created_at", "registration_status", "payment_status", "team_id", "team_name", "team_slug", "contact_email", "contact_phone"];
    const lines = [header.join(",")];

    for (const row of data ?? []) {
      const tp: any = (row as any).team_profiles;
      const values = [
        (row as any).id,
        (row as any).created_at,
        (row as any).registration_status,
        (row as any).payment_status,
        tp?.id ?? "",
        tp?.name ?? "",
        tp?.slug ?? "",
        tp?.contact_email ?? "",
        tp?.contact_phone ?? ""
      ].map(csvEscape);
      lines.push(values.join(","));
    }

    const csv = lines.join("\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename=\"competition-${id}-registrations.csv\"`,
        ...rateLimitHeaders(auth.rateLimit ?? null)
      }
    });
  } catch (e: unknown) {
    const mapped = mapToHttpError(e);
    return fail(mapped.status, mapped.error, { headers: rateLimitHeaders(auth.rateLimit ?? null) });
  }
}
