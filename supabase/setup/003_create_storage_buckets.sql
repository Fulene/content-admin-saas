-- =====================================================
-- BLOG ADMIN KIT
-- Storage Buckets + Policies
-- =====================================================

-- =====================================================
-- BUCKETS
-- =====================================================

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values
    (
        'avatars',
        'avatars',
        true,
        5242880,
        array['image/jpeg', 'image/png', 'image/webp']
    ),
    (
        'article-images',
        'article-images',
        true,
        5242880,
        array['image/jpeg', 'image/png', 'image/webp']
    )
on conflict (id) do update set
                               public = excluded.public,
                               file_size_limit = excluded.file_size_limit,
                               allowed_mime_types = excluded.allowed_mime_types;

-- =====================================================
-- AVATARS POLICIES
-- Path convention:
-- avatars/{user_id}/avatar.webp
-- =====================================================

drop policy if exists "Public can read avatars"
    on storage.objects;

drop policy if exists "Users can upload own avatar"
    on storage.objects;

drop policy if exists "Users can update own avatar"
    on storage.objects;

drop policy if exists "Users can delete own avatar"
    on storage.objects;

create policy "Public can read avatars"
    on storage.objects
    for select
    using (
    bucket_id = 'avatars'
    );

create policy "Users can upload own avatar"
    on storage.objects
    for insert
    to authenticated
    with check (
    bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "Users can update own avatar"
    on storage.objects
    for update
    to authenticated
    using (
    bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
    )
    with check (
    bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "Users can delete own avatar"
    on storage.objects
    for delete
    to authenticated
    using (
    bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
    );

-- =====================================================
-- ARTICLE IMAGES POLICIES
-- Path convention:
-- article-images/{article_id}/cover.webp
-- =====================================================

drop policy if exists "Public can read article images"
    on storage.objects;

drop policy if exists "Authenticated users can upload article images"
    on storage.objects;

drop policy if exists "Authenticated users can update article images"
    on storage.objects;

drop policy if exists "Authenticated users can delete article images"
    on storage.objects;

create policy "Public can read article images"
    on storage.objects
    for select
    using (
    bucket_id = 'article-images'
    );

create policy "Authenticated users can upload article images"
    on storage.objects
    for insert
    to authenticated
    with check (
    bucket_id = 'article-images'
    );

create policy "Authenticated users can update article images"
    on storage.objects
    for update
    to authenticated
    using (
    bucket_id = 'article-images'
    )
    with check (
    bucket_id = 'article-images'
    );

create policy "Authenticated users can delete article images"
    on storage.objects
    for delete
    to authenticated
    using (
    bucket_id = 'article-images'
    );
