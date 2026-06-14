-- Global site management for OWNER / SUPER_ADMIN.
-- Run in Supabase SQL editor after the global_role script.

begin;

alter table public.sites
  add column if not exists status text;

update public.sites
set status = 'active'
where status is null
   or status not in ('active', 'disabled');

alter table public.sites
  alter column status set default 'active',
  alter column status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sites_status_check'
      and conrelid = 'public.sites'::regclass
  ) then
    alter table public.sites
      add constraint sites_status_check
      check (status in ('active', 'disabled'));
  end if;
end $$;

create or replace function public.is_global_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.global_role in ('OWNER', 'SUPER_ADMIN')
  );
$$;

grant execute on function public.is_global_admin() to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'sites'
      and policyname = 'Global admins can read all sites'
  ) then
    create policy "Global admins can read all sites"
    on public.sites
    for select
    to authenticated
    using (public.is_global_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'sites'
      and policyname = 'Global admins can insert sites'
  ) then
    create policy "Global admins can insert sites"
    on public.sites
    for insert
    to authenticated
    with check (public.is_global_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'sites'
      and policyname = 'Global admins can update sites'
  ) then
    create policy "Global admins can update sites"
    on public.sites
    for update
    to authenticated
    using (public.is_global_admin())
    with check (public.is_global_admin());
  end if;
end $$;

create or replace function public.delete_site_cascade(p_site_id uuid)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if not public.is_global_admin() then
    raise exception 'Access denied';
  end if;

  delete from public.article_tags
  where article_id in (
    select id
    from public.articles
    where site_id = p_site_id
  );

  delete from public.articles
  where site_id = p_site_id;

  delete from public.categories
  where site_id = p_site_id;

  delete from public.tags
  where site_id = p_site_id;

  delete from public.site_invitations
  where site_id = p_site_id;

  delete from public.site_members
  where site_id = p_site_id;

  delete from storage.objects
  where bucket_id = 'article-images'
    and name like ('sites/' || p_site_id::text || '/%');

  delete from public.sites
  where id = p_site_id;
end;
$$;

revoke all on function public.delete_site_cascade(uuid) from public;
grant execute on function public.delete_site_cascade(uuid) to authenticated;

commit;
