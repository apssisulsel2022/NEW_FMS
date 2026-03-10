import type { SupabaseClient } from "@supabase/supabase-js";

export async function notifyUsers(
  supabase: SupabaseClient,
  params: {
    eventOrganizerId: string;
    userIds: string[];
    title: string;
    body?: string | null;
    payload?: Record<string, unknown>;
    channel?: string;
  }
) {
  const rows = params.userIds.map((userId) => ({
    event_organizer_id: params.eventOrganizerId,
    user_id: userId,
    channel: params.channel ?? "in_app",
    title: params.title,
    body: params.body ?? null,
    payload: params.payload ?? {}
  }));

  const { data, error } = await supabase.from("notifications").insert(rows).select("id");
  if (error) throw error;
  return data ?? [];
}

