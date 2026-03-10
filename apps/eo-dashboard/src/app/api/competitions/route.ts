import { NextResponse } from "next/server";

import { createCompetition, listCompetitions } from "../../../../../../backend/services/competitions";
import { createSupabaseClient } from "../../../../../../backend/services/supabase";

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
  return { supabaseUrl, supabaseAnonKey };
}

function getAccessToken(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const parts = header.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") return parts[1];
  return null;
}

export async function GET(req: Request) {
  const accessToken = getAccessToken(req);
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const eventOrganizerId = searchParams.get("eventOrganizerId");
  if (!eventOrganizerId)
    return NextResponse.json({ error: "eventOrganizerId is required" }, { status: 400 });

  try {
    const supabase = createSupabaseClient(getEnv(), accessToken);
    const { data, count } = await listCompetitions(supabase, { eventOrganizerId });
    return NextResponse.json({ data, count });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const accessToken = getAccessToken(req);
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.eventOrganizerId || !body?.name || !body?.slug) {
    return NextResponse.json(
      { error: "eventOrganizerId, name, slug are required" },
      { status: 400 }
    );
  }

  try {
    const supabase = createSupabaseClient(getEnv(), accessToken);
    const competition = await createCompetition(supabase, {
      eventOrganizerId: body.eventOrganizerId,
      name: body.name,
      slug: body.slug,
      season: body.season ?? null,
      startDate: body.startDate ?? null,
      endDate: body.endDate ?? null,
      categoryId: body.categoryId ?? null
    });
    return NextResponse.json({ data: competition });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
