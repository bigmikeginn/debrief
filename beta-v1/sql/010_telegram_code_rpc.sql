create or replace function public.create_telegram_link_code(force_new boolean default false)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := auth.jwt() ->> 'email';
  existing_code text;
  next_code text;
  attempts integer := 0;
begin
  if current_user_id is null then
    raise exception 'You must be logged in to create a Telegram link code.';
  end if;

  insert into public.profiles (id, display_name, email)
  values (
    current_user_id,
    coalesce(current_email, 'Debrief user'),
    current_email
  )
  on conflict (id) do update
  set email = coalesce(excluded.email, public.profiles.email);

  if force_new then
    update public.telegram_link_codes
    set used_at = now()
    where user_id = current_user_id
      and used_at is null;
  else
    select code
    into existing_code
    from public.telegram_link_codes
    where user_id = current_user_id
      and used_at is null
      and expires_at > now()
    order by created_at desc
    limit 1;

    if existing_code is not null then
      return existing_code;
    end if;
  end if;

  loop
    attempts := attempts + 1;
    next_code := lpad(floor(random() * 1000000)::int::text, 6, '0');

    begin
      insert into public.telegram_link_codes (user_id, code, expires_at)
      values (current_user_id, next_code, now() + interval '30 minutes');
      return next_code;
    exception
      when unique_violation then
        if attempts >= 8 then
          raise exception 'Could not create a unique Telegram link code. Please try again.';
        end if;
    end;
  end loop;
end;
$$;

grant execute on function public.create_telegram_link_code(boolean) to authenticated;
