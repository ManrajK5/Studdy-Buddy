-- Add metadata for functional task tracking
alter table public.assignments
  add column if not exists completed_at timestamptz,
  add column if not exists subtasks jsonb;

create index if not exists assignments_completed_at_idx
  on public.assignments(completed_at);