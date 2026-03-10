import type { SupabaseClient } from "@supabase/supabase-js";

export async function listTeamMembers(supabase: SupabaseClient, params: { teamProfileId: string }) {
  const { data, error } = await supabase
    .from("team_members")
    .select("id,team_profile_id,user_id,role,status,joined_at,created_at,profiles:user_id(full_name,avatar_url)")
    .eq("team_profile_id", params.teamProfileId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function updateTeamMemberRole(
  supabase: SupabaseClient,
  params: { id: string; role: "captain" | "manager" | "player" }
) {
  const { data, error } = await supabase
    .from("team_members")
    .update({ role: params.role })
    .eq("id", params.id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function removeTeamMember(supabase: SupabaseClient, params: { id: string }) {
  const { error } = await supabase.from("team_members").delete().eq("id", params.id);
  if (error) throw error;
}

