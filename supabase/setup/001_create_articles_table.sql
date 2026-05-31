-- =====================================================
-- BLOG ADMIN KIT
-- Articles Table + RLS + Policies
-- =====================================================

create extension if not exists "pgcrypto";

create table if not exists public.articles (
                                               id uuid primary key default gen_random_uuid(),

                                               title text not null,
                                               slug text not null unique,

                                               summary text not null,
                                               content text not null,

                                               cover_image_url text,
                                               cover_image_alt text,

                                               seo_title text,
                                               seo_description text,

                                               category_name text,

                                               status text not null default 'draft',

                                               published_at timestamptz,

                                               created_by uuid references auth.users(id) on delete set null,
                                               created_at timestamptz not null default now(),

                                               updated_by uuid references auth.users(id) on delete set null,
                                               updated_at timestamptz not null default now()
);

alter table public.articles
    drop constraint if exists articles_status_check;

alter table public.articles
    add constraint articles_status_check
        check (status in ('draft', 'published'));

create unique index if not exists articles_slug_unique_idx
    on public.articles (slug);

create or replace function public.set_updated_at()
    returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists set_articles_updated_at
    on public.articles;

create trigger set_articles_updated_at
    before update on public.articles
    for each row
execute function public.set_updated_at();

alter table public.articles
    enable row level security;

drop policy if exists "Public can read published articles" on public.articles;
drop policy if exists "Authenticated users can read all articles" on public.articles;
drop policy if exists "Authenticated users can insert articles" on public.articles;
drop policy if exists "Authenticated users can update articles" on public.articles;
drop policy if exists "Authenticated users can delete articles" on public.articles;

create policy "Public can read published articles"
    on public.articles
    for select
    using (
    status = 'published'
    );

create policy "Authenticated users can read all articles"
    on public.articles
    for select
    to authenticated
    using (
    true
    );

create policy "Authenticated users can insert articles"
    on public.articles
    for insert
    to authenticated
    with check (
    true
    );

create policy "Authenticated users can update articles"
    on public.articles
    for update
    to authenticated
    using (
    true
    )
    with check (
    true
    );

create policy "Authenticated users can delete articles"
    on public.articles
    for delete
    to authenticated
    using (
    true
    );
