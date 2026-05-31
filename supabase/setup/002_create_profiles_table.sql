-- =====================================================
-- BLOG ADMIN KIT
-- Profiles Table + RLS + Trigger
-- =====================================================

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
                                               id uuid primary key references auth.users(id) on delete cascade,

                                               first_name text,
                                               last_name text,
                                               avatar_url text,

                                               created_at timestamptz not null default now(),
                                               updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
    returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at
    on public.profiles;

create trigger set_profiles_updated_at
    before update on public.profiles
    for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
    returns trigger as $$
begin
    insert into public.profiles (
        id,
        first_name,
        last_name,
        avatar_url
    )
    values (
               new.id,
               new.raw_user_meta_data ->> 'first_name',
               new.raw_user_meta_data ->> 'last_name',
               new.raw_user_meta_data ->> 'avatar_url'
           )
    on conflict (id) do nothing;

    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created
    on auth.users;

create trigger on_auth_user_created
    after insert on auth.users
    for each row
execute function public.handle_new_user();

insert into public.profiles (
    id,
    first_name,
    last_name,
    avatar_url
)
select
    id,
    raw_user_meta_data ->> 'first_name',
    raw_user_meta_data ->> 'last_name',
    raw_user_meta_data ->> 'avatar_url'
from auth.users
on conflict (id) do nothing;

alter table public.profiles
    enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can read own profile"
    on public.profiles
    for select
    to authenticated
    using (
    auth.uid() = id
    );

create policy "Users can insert own profile"
    on public.profiles
    for insert
    to authenticated
    with check (
    auth.uid() = id
    );

create policy "Users can update own profile"
    on public.profiles
    for update
    to authenticated
    using (
    auth.uid() = id
    )
    with check (
    auth.uid() = id
    );
