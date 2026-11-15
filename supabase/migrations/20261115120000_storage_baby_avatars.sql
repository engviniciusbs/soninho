-- Baby avatars bucket and storage policies. Idempotent: already present in production.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('baby-avatars', 'baby-avatars', true, 5242880, '{image/jpeg,image/png,image/webp,image/gif}')
on conflict (id) do nothing;

drop policy if exists "Public can read avatars" on storage.objects;
create policy "Public can read avatars" on storage.objects
  for select using (bucket_id = 'baby-avatars');

drop policy if exists "Users can upload their own avatars" on storage.objects;
create policy "Users can upload their own avatars" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'baby-avatars' and (storage.foldername(name))[1] = (auth.uid())::text);

drop policy if exists "Users can update their own avatars" on storage.objects;
create policy "Users can update their own avatars" on storage.objects
  for update to authenticated
  using (bucket_id = 'baby-avatars' and (storage.foldername(name))[1] = (auth.uid())::text);

drop policy if exists "Users can delete their own avatars" on storage.objects;
create policy "Users can delete their own avatars" on storage.objects
  for delete to authenticated
  using (bucket_id = 'baby-avatars' and (storage.foldername(name))[1] = (auth.uid())::text);
