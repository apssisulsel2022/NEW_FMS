import type { SupabaseClient } from "@supabase/supabase-js";

export type EventOrganizerSummary = {
  id: string;
  name: string;
  slug: string;
};

export async function listMyEventOrganizers(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("event_organizer_members")
    .select("event_organizers ( id, name, slug )")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? [])
    .map((r: any) => r.event_organizers as EventOrganizerSummary | null)
    .filter((v: EventOrganizerSummary | null): v is EventOrganizerSummary => !!v);

  return rows;
}

