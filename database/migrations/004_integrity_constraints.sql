alter table public.match_lineup_players
  add constraint match_lineup_players_position_code_fk
  foreign key (position_code)
  references public.player_positions(code)
  on update cascade
  on delete restrict
  not valid;

