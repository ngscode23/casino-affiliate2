-- Admin RPC for catalog categories (write via security definer)
create or replace function public.admin_upsert_category(
  p_id uuid,
  p_slug text,
  p_title text,
  p_description text,
  p_sort_order integer,
  p_is_active boolean,
  p_parent_id uuid
) returns catalog.categories
language plpgsql
security definer
set search_path = catalog, public
as $$
declare
  result catalog.categories;
begin
  if p_id is null then
    insert into catalog.categories (slug, title, description, sort_order, is_active, parent_id)
    values (p_slug, p_title, p_description, p_sort_order, p_is_active, p_parent_id)
    returning * into result;
  else
    update catalog.categories
    set slug = p_slug,
        title = p_title,
        description = p_description,
        sort_order = p_sort_order,
        is_active = p_is_active,
        parent_id = p_parent_id
    where id = p_id
    returning * into result;
  end if;

  return result;
end;
$$;

create or replace function public.admin_delete_category(p_id uuid)
returns catalog.categories
language plpgsql
security definer
set search_path = catalog, public
as $$
declare
  result catalog.categories;
begin
  delete from catalog.categories where id = p_id returning * into result;
  return result;
end;
$$;

grant execute on function public.admin_upsert_category(uuid, text, text, text, integer, boolean, uuid) to authenticated;
grant execute on function public.admin_delete_category(uuid) to authenticated;
