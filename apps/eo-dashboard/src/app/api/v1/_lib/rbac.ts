import type { SupabaseClient } from "@supabase/supabase-js";

export async function requireOrganizerRole(
  supabase: SupabaseClient,
  params: { eventOrganizerId: string; userId: string; allowedRoles: string[] }
) {
  const { data, error } = await supabase
    .from("event_organizer_members")
    .select("member_role")
    .eq("event_organizer_id", params.eventOrganizerId)
    .eq("user_id", params.userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  const role = data?.member_role ?? null;
  if (!role) return { ok: false as const, role: null as string | null };
  if (!params.allowedRoles.includes(role)) return { ok: false as const, role };
  return { ok: true as const, role };
}

