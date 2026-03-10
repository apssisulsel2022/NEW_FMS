export type EventOrganizer = {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
  status: string;
};

export type EventOrganizerMember = {
  id: string;
  event_organizer_id: string;
  user_id: string;
  member_role: string;
  created_at: string;
  updated_at: string;
  status: string;
};

