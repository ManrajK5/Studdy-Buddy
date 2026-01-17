-- Supabase SQL schema: profiles + assignments
-- Includes enum type for quiz/assignment/exam and basic RLS policies.

-- Enable required extension for gen_random_uuid()
create extension if not exists pgcrypto;

-- Profiles table (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Assignment type enum
do $$ begin
  create type public.assessment_type as enum ('quiz', 'assignment', 'exam');
exception
  when duplicate_object then null;
end $$;

-- Assignments table
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type public.assessment_type not null,
  due_date date,
  description text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assignments_user_id_idx on public.assignments(user_id);
create index if not exists assignments_due_date_idx on public.assignments(due_date);

-- Simple updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists assignments_set_updated_at on public.assignments;
create trigger assignments_set_updated_at
before update on public.assignments
for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.assignments enable row level security;

-- Profiles policies
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Assignments policies
create policy "assignments_select_own"
  on public.assignments for select
  using (auth.uid() = user_id);

create policy "assignments_insert_own"
  on public.assignments for insert
  with check (auth.uid() = user_id);

create policy "assignments_update_own"
  on public.assignments for update
  using (auth.uid() = user_id);

create policy "assignments_delete_own"
  on public.assignments for delete
  using (auth.uid() = user_id);
