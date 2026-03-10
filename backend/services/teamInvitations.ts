import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateTeamInvitationInput = {
  teamProfileId: string;
  createdByUserId: string;
  invitedEmail?: string | null;
  invitedUserId?: string | null;
  role?: "captain" | "manager" | "player";
  tokenHash: string;
  expiresAt: string;
};

export async function createTeamInvitation(supabase: SupabaseClient, input: CreateTeamInvitationInput) {
  const { data, error } = await supabase
    .from("team_invitations")
    .insert({
      team_profile_id: input.teamProfileId,
      created_by_user_id: input.createdByUserId,
      invited_email: input.invitedEmail ?? null,
      invited_user_id: input.invitedUserId ?? null,
      role: input.role ?? "player",
      token_hash: input.tokenHash,
      expires_at: input.expiresAt
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listTeamInvitations(supabase: SupabaseClient, params: { teamProfileId: string }) {
  const { data, error } = await supabase
    .from("team_invitations")
    .select("*")
    .eq("team_profile_id", params.teamProfileId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function acceptTeamInvitation(
  supabase: SupabaseClient,
  params: { tokenHash: string; userId: string }
) {
  const { data: invitation, error: invError } = await supabase
    .from("team_invitations")
    .select("*")
    .eq("token_hash", params.tokenHash)
    .eq("status", "active")
    .maybeSingle();
  if (invError) throw invError;
  if (!invitation) return { ok: false as const, reason: "not_found" as const };
  if (invitation.accepted_at) return { ok: false as const, reason: "already_accepted" as const };
  if (new Date(invitation.expires_at).getTime() < Date.now()) return { ok: false as const, reason: "expired" as const };

  const { error: memberError } = await supabase.from("team_members").upsert(
    {
      team_profile_id: invitation.team_profile_id,
      user_id: params.userId,
      role: invitation.role
    },
    { onConflict: "team_profile_id,user_id" }
  );
  if (memberError) throw memberError;

  const { error: updateError } = await supabase
    .from("team_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);
  if (updateError) throw updateError;

  return { ok: true as const, teamProfileId: invitation.team_profile_id, role: invitation.role as string };
}

