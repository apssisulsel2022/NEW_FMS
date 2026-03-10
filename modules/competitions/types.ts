export type Competition = {
  id: string;
  event_organizer_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  season: string | null;
  start_date: string | null;
  end_date: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  status: string;
};

