import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateTeamProfileInput = {
  ownerUserId: string;
  name: string;
  slug: string;
  description?: string | null;
  logoPath?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  meta?: Record<string, unknown>;
};

export type UpdateTeamProfileInput = Partial<CreateTeamProfileInput> & { status?: string };

export async function listMyTeamProfiles(supabase: SupabaseClient, params: { userId: string }) {
  const { data, error } = await supabase
    .from("team_members")
    .select("team_profile_id, role, team_profiles:team_profile_id(id,name,slug,logo_path,description,owner_user_id)")
    .eq("user_id", params.userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    teamProfileId: row.team_profile_id,
    role: row.role,
    profile: row.team_profiles
  }));
}

export async function getTeamProfile(supabase: SupabaseClient, params: { id: string }) {
  const { data, error } = await supabase.from("team_profiles").select("*").eq("id", params.id).single();
  if (error) throw error;
  return data;
}

export async function createTeamProfile(supabase: SupabaseClient, input: CreateTeamProfileInput) {
  const { data: profile, error: profileError } = await supabase
    .from("team_profiles")
    .insert({
      owner_user_id: input.ownerUserId,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      logo_path: input.logoPath ?? null,
      contact_email: input.contactEmail ?? null,
      contact_phone: input.contactPhone ?? null,
      meta: input.meta ?? {}
    })
    .select("*")
    .single();
  if (profileError) throw profileError;

  const { error: memberError } = await supabase.from("team_members").insert({
    team_profile_id: profile.id,
    user_id: input.ownerUserId,
    role: "captain"
  });
  if (memberError) throw memberError;

  return profile;
}

export async function updateTeamProfile(supabase: SupabaseClient, params: { id: string; patch: UpdateTeamProfileInput }) {
  const patch = params.patch;
  const update: any = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.slug !== undefined) update.slug = patch.slug;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.logoPath !== undefined) update.logo_path = patch.logoPath;
  if (patch.contactEmail !== undefined) update.contact_email = patch.contactEmail;
  if (patch.contactPhone !== undefined) update.contact_phone = patch.contactPhone;
  if (patch.meta !== undefined) update.meta = patch.meta;
  if (patch.status !== undefined) update.status = patch.status;

  const { data, error } = await supabase.from("team_profiles").update(update).eq("id", params.id).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteTeamProfile(supabase: SupabaseClient, params: { id: string }) {
  const { error } = await supabase.from("team_profiles").delete().eq("id", params.id);
  if (error) throw error;
}

