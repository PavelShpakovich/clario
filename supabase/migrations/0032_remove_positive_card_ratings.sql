delete from public.card_ratings where rating = 1;

alter table public.card_ratings drop constraint if exists card_ratings_rating_check;

alter table public.card_ratings
  add constraint card_ratings_rating_check
  check (rating = -1);