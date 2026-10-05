-- Payment deadline is the calendar day before seasons.premiere_date.
alter table public.seasons add column if not exists premiere_date date;
