import type { SupabaseClient } from "@supabase/supabase-js";

export async function requireTeamRole(
  supabase: SupabaseClient,
  params: { teamProfileId: string; userId: string; allowedRoles: string[] }
) {
  const { data, error } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_profile_id", params.teamProfileId)
    .eq("user_id", params.userId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  const role = data?.role ?? null;
  if (!role) return { ok: false as const, role: null as string | null };
  if (!params.allowedRoles.includes(role)) return { ok: false as const, role };
  return { ok: true as const, role };
}

