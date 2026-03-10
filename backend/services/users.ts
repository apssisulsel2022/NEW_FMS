import type { SupabaseClient } from "@supabase/supabase-js";

export type UpsertMyProfileInput = {
  fullName?: string | null;
  avatarUrl?: string | null;
};

export async function getMyProfile(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("profiles").select("*").single();
  if (error) throw error;
  return data;
}

export async function upsertMyProfile(supabase: SupabaseClient, params: { userId: string; input: UpsertMyProfileInput }) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: params.userId,
        full_name: params.input.fullName ?? null,
        avatar_url: params.input.avatarUrl ?? null
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateMyProfile(
  supabase: SupabaseClient,
  params: { userId: string; input: UpsertMyProfileInput }
) {
  const update: any = {};
  if (params.input.fullName !== undefined) update.full_name = params.input.fullName;
  if (params.input.avatarUrl !== undefined) update.avatar_url = params.input.avatarUrl;

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", params.userId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMyProfile(supabase: SupabaseClient, params: { userId: string }) {
  const { error } = await supabase
    .from("profiles")
    .update({ status: "deleted" })
    .eq("id", params.userId)
    .select("*")
    .single();
  if (error) throw error;
}

export async function listMyRoles(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("roles ( name )")
    .eq("status", "active");

  if (error) throw error;

  const roles = (data ?? [])
    .map((r: any) => r.roles?.name as string | undefined)
    .filter((v: string | undefined): v is string => !!v);

  return roles;
}
