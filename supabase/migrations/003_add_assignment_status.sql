-- Add explicit status for assignments (upcoming / in-progress / completed)
-- This enables manual status selection independent of due dates.

alter table public.assignments
  add column if not exists status text not null default 'upcoming';

do $$ begin
  alter table public.assignments
    add constraint assignments_status_check
    check (status in ('upcoming', 'in-progress', 'completed'));
exception
  when duplicate_object then null;
end $$;

create index if not exists assignments_status_idx
  on public.assignments(status);
