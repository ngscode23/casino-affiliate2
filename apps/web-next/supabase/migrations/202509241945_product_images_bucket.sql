-- Ensure product image storage bucket and metadata column

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
      or coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false)
      or coalesce((auth.jwt() ->> 'role') = 'admin', false);
$$;

do $$
begin
  insert into storage.buckets (id, name, public)
  values ('product-images', 'product-images', true)
  on conflict (id) do update
    set name = excluded.name,
        public = true;
end $$;

-- Allow public read access to product images
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'objects'
  ) THEN
    EXECUTE 'drop policy if exists "product_images_public_read" on storage.objects';
    EXECUTE 'create policy "product_images_public_read" '
         'on storage.objects for select to anon '
         'using (bucket_id = ''product-images'')';
  END IF;
END $$;

-- Restrict mutations to admins only (service role bypasses RLS for admin API)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'objects'
  ) THEN
    EXECUTE 'drop policy if exists "product_images_admin_write" on storage.objects';
    EXECUTE 'create policy "product_images_admin_write" '
         'on storage.objects for all to authenticated '
         'using (bucket_id = ''product-images'' and public.is_admin()) '
         'with check (bucket_id = ''product-images'' and public.is_admin())';
  END IF;
END $$;

-- Track product image path inside shop.products
alter table if exists shop.products
  add column if not exists image_path text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'shop'
      and table_name = 'products'
      and column_name = 'image_path'
  ) then
    execute 'comment on column shop.products.image_path is ''Supabase Storage object path for primary product image''';
  end if;
end $$;
