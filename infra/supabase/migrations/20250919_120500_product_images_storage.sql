-- Ensure storage bucket and policies for product images used in admin uploads

-- Recreate helper to identify admin users based on JWT claims
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
      or coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false)
      or coalesce((auth.jwt() ->> 'role') = 'admin', false);
$$;

-- Create (or update) public product-images bucket so uploads do not fail
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('product-images', 'product-images', true)
  on conflict (id) do update
    set name = excluded.name,
        public = true;
end $$;

-- Allow anyone to read files from the product-images bucket
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'objects'
  ) THEN
    EXECUTE 'drop policy if exists "product_images_public_read" on storage.objects';
    EXECUTE $$create policy "product_images_public_read"
      on storage.objects for select to public
      using (bucket_id = ''product-images'');$$;
  END IF;
END $$;

-- Allow only authenticated admins to upload/manage files in the product-images bucket
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'objects'
  ) THEN
    EXECUTE 'drop policy if exists "product_images_admin_write" on storage.objects';
    EXECUTE $$create policy "product_images_admin_write"
      on storage.objects for all to authenticated
      using (bucket_id = ''product-images'' and public.is_admin())
      with check (bucket_id = ''product-images'' and public.is_admin());$$;
  END IF;
END $$;

