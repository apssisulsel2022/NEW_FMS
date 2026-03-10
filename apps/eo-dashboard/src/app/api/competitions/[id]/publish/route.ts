import { NextResponse } from "next/server";

import { publishCompetition } from "../../../../../../../../backend/services/competitions";
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

  const { id } = await ctx.params;

  try {
    const supabase = createSupabaseClient(getEnv(), accessToken);
    const competition = await publishCompetition(supabase, { id });
    return NextResponse.json({ data: competition });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
