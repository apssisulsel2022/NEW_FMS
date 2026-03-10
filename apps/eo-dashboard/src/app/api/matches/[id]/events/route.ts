import { NextResponse } from "next/server";

import { createMatchEvent } from "../../../../../../../../backend/services/matches";
import { createSupabaseClient } from "../../../../../../../../backend/services/supabase";

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

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const accessToken = getAccessToken(req);
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: matchId } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body?.eventOrganizerId || !body?.eventType) {
    return NextResponse.json({ error: "eventOrganizerId, eventType are required" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseClient(getEnv(), accessToken);
    const event = await createMatchEvent(supabase, {
      eventOrganizerId: body.eventOrganizerId,
      matchId,
      teamId: body.teamId ?? null,
      playerId: body.playerId ?? null,
      eventType: body.eventType,
      minute: body.minute ?? null,
      second: body.second ?? null,
      payload: body.payload ?? {}
    });
    return NextResponse.json({ data: event });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
