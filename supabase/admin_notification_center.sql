-- ============================================================
-- GROW CIG ADMIN NOTIFICATION CENTER
-- Run this entire file in the Supabase SQL Editor.
--
-- Requires the existing:
--   public.member_notifications
--   public.staff_has_permission(text)
--
-- The Flutter member app already reads member_notifications.
-- ============================================================

-- ------------------------------------------------------------
-- 1. ADMIN SEND HISTORY
-- One row per send action, even when a message goes to all users.
-- ------------------------------------------------------------

create table if not exists public.admin_notification_broadcasts (
  id uuid primary key default gen_random_uuid(),
  recipient_scope text not null
    check (recipient_scope in ('all', 'single')),
  recipient_user_id uuid null references auth.users(id) on delete set null,
  recipient_label text not null,
  recipient_count integer not null default 0
    check (recipient_count >= 0),
  title text not null,
  message text not null,
  type text not null default 'admin_message',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists admin_notification_broadcasts_created_idx
on public.admin_notification_broadcasts (created_at desc);

alter table public.admin_notification_broadcasts
enable row level security;

revoke all
on table public.admin_notification_broadcasts
from anon, authenticated;

-- ------------------------------------------------------------
-- 2. LIST MEMBER APP RECIPIENTS
--
-- profiles.id is the same auth user id used by the Flutter app.
-- Access is restricted to staff with settings.manage.
-- ------------------------------------------------------------

create or replace function public.admin_list_notification_recipients()
returns table (
  user_id uuid,
  full_name text,
  email text,
  account_number text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not coalesce(
    public.staff_has_permission('settings.manage'),
    false
  ) then
    raise exception 'Permission denied';
  end if;

  return query
  select
    p.id as user_id,
    p.full_name::text,
    p.email::text,
    p.account_number::text
  from public.profiles p
  where exists (
    select 1
    from auth.users u
    where u.id = p.id
  )
  order by
    lower(coalesce(p.full_name, '')),
    lower(coalesce(p.account_number, ''));
end;
$$;

revoke all
on function public.admin_list_notification_recipients()
from public, anon;

grant execute
on function public.admin_list_notification_recipients()
to authenticated;

-- ------------------------------------------------------------
-- 3. SEND ADMIN NOTIFICATION
--
-- p_user_id = NULL  -> send to every member profile
-- p_user_id = UUID  -> send to one member
--
-- The insert goes directly into member_notifications, which is
-- exactly what the Flutter bell screen already reads.
-- ------------------------------------------------------------

create or replace function public.admin_send_member_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text default 'admin_message'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff_id uuid;
  v_broadcast_id uuid;
  v_scope text;
  v_recipient_label text;
  v_count integer := 0;
  v_clean_title text;
  v_clean_message text;
  v_clean_type text;
begin
  v_staff_id := auth.uid();

  if v_staff_id is null then
    raise exception 'Authentication required';
  end if;

  if not coalesce(
    public.staff_has_permission('settings.manage'),
    false
  ) then
    raise exception 'Permission denied';
  end if;

  v_clean_title := nullif(trim(p_title), '');
  v_clean_message := nullif(trim(p_message), '');
  v_clean_type := coalesce(
    nullif(trim(p_type), ''),
    'admin_message'
  );

  if v_clean_title is null then
    raise exception 'Notification title is required';
  end if;

  if length(v_clean_title) > 120 then
    raise exception 'Notification title is too long';
  end if;

  if v_clean_message is null then
    raise exception 'Notification message is required';
  end if;

  if length(v_clean_message) > 1000 then
    raise exception 'Notification message is too long';
  end if;

  v_broadcast_id := gen_random_uuid();

  if p_user_id is null then
    v_scope := 'all';
    v_recipient_label := 'All Members';

    insert into public.member_notifications (
      user_id,
      title,
      message,
      type,
      is_read,
      metadata
    )
    select
      p.id,
      v_clean_title,
      v_clean_message,
      v_clean_type,
      false,
      jsonb_build_object(
        'source', 'admin',
        'broadcast_id', v_broadcast_id,
        'sender_user_id', v_staff_id
      )
    from public.profiles p
    where exists (
      select 1
      from auth.users u
      where u.id = p.id
    );

    get diagnostics v_count = row_count;

    if v_count = 0 then
      raise exception 'No member profiles are available';
    end if;
  else
    v_scope := 'single';

    select
      coalesce(
        nullif(trim(p.full_name), ''),
        nullif(trim(p.email), ''),
        nullif(trim(p.account_number), ''),
        'Member'
      )
    into v_recipient_label
    from public.profiles p
    where p.id = p_user_id
      and exists (
        select 1
        from auth.users u
        where u.id = p.id
      );

    if not found then
      raise exception 'Member profile not found';
    end if;

    insert into public.member_notifications (
      user_id,
      title,
      message,
      type,
      is_read,
      metadata
    )
    values (
      p_user_id,
      v_clean_title,
      v_clean_message,
      v_clean_type,
      false,
      jsonb_build_object(
        'source', 'admin',
        'broadcast_id', v_broadcast_id,
        'sender_user_id', v_staff_id
      )
    );

    v_count := 1;
  end if;

  insert into public.admin_notification_broadcasts (
    id,
    recipient_scope,
    recipient_user_id,
    recipient_label,
    recipient_count,
    title,
    message,
    type,
    created_by
  )
  values (
    v_broadcast_id,
    v_scope,
    p_user_id,
    v_recipient_label,
    v_count,
    v_clean_title,
    v_clean_message,
    v_clean_type,
    v_staff_id
  );

  return jsonb_build_object(
    'success', true,
    'broadcast_id', v_broadcast_id,
    'recipient_scope', v_scope,
    'recipient_count', v_count
  );
end;
$$;

revoke all
on function public.admin_send_member_notification(
  uuid,
  text,
  text,
  text
)
from public, anon;

grant execute
on function public.admin_send_member_notification(
  uuid,
  text,
  text,
  text
)
to authenticated;

-- ------------------------------------------------------------
-- 4. ADMIN SEND HISTORY
-- ------------------------------------------------------------

create or replace function public.admin_recent_notification_broadcasts(
  p_limit integer default 50
)
returns table (
  id uuid,
  recipient_scope text,
  recipient_user_id uuid,
  recipient_label text,
  recipient_count integer,
  title text,
  message text,
  type text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not coalesce(
    public.staff_has_permission('settings.manage'),
    false
  ) then
    raise exception 'Permission denied';
  end if;

  v_limit := greatest(
    1,
    least(
      coalesce(p_limit, 50),
      100
    )
  );

  return query
  select
    b.id,
    b.recipient_scope,
    b.recipient_user_id,
    b.recipient_label,
    b.recipient_count,
    b.title,
    b.message,
    b.type,
    b.created_at
  from public.admin_notification_broadcasts b
  order by b.created_at desc
  limit v_limit;
end;
$$;

revoke all
on function public.admin_recent_notification_broadcasts(integer)
from public, anon;

grant execute
on function public.admin_recent_notification_broadcasts(integer)
to authenticated;

notify pgrst, 'reload schema';
