export type Match = {
  id: string;
  event_organizer_id: string;
  competition_id: string;
  home_team_id: string;
  away_team_id: string;
  scheduled_at: string | null;
  venue: string | null;
  match_status: string;
  home_score: number;
  away_score: number;
  created_at: string;
  updated_at: string;
  status: string;
};

export type MatchEvent = {
  id: string;
  event_organizer_id: string;
  match_id: string;
  team_id: string | null;
  player_id: string | null;
  event_type: string;
  minute: number | null;
  second: number | null;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  status: string;
};

