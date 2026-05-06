-- ============================================================================
-- Push 3 — Daily Routine, Companions, Pings schema
-- ============================================================================
-- Adds the data layer for daily routines (reminders), 1:1 connections
-- (companions), lightweight messaging (pings), and notification preferences.
--
-- Idempotent: re-running this file is safe. Uses CREATE IF NOT EXISTS
-- everywhere, DROP POLICY IF EXISTS before CREATE POLICY, etc.
-- ============================================================================


-- ============================================================================
-- Extensions
-- ============================================================================

create extension if not exists moddatetime;       -- maintains updated_at
create extension if not exists pgcrypto;          -- gen_random_uuid()


-- ============================================================================
-- profiles — extends auth.users with app-specific fields
-- ============================================================================

create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  timezone      text not null default 'America/Toronto',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

drop trigger if exists set_updated_at on profiles;
create trigger set_updated_at before update on profiles
  for each row execute function moddatetime(updated_at);

-- Auto-create profile row when a new auth user signs up.
create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'timezone', 'America/Toronto')
  )
  on conflict (id) do nothing;
  return new;
end $$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- BACKFILL: kanban-era users already exist in auth.users but not in profiles.
-- This is critical — without it, joins on profiles.timezone return null and
-- timezone math silently bypasses for the people most likely to use the app.
insert into profiles (id, timezone)
select
  id,
  coalesce(raw_user_meta_data->>'timezone', 'America/Toronto')
from auth.users
on conflict (id) do nothing;


-- ============================================================================
-- Timezone helper functions
-- ============================================================================
-- All app code that touches dates or times tied to a user MUST use these.
-- Never use raw current_date or now() — those use server UTC and produce
-- silent off-by-one errors on completion dates near midnight.

create or replace function user_today(uid uuid) returns date as $$
  select (
    now() at time zone coalesce(
      (select timezone from profiles where id = uid),
      'UTC'
    )
  )::date
$$ language sql stable;

create or replace function user_now_time(uid uuid) returns time as $$
  select (
    now() at time zone coalesce(
      (select timezone from profiles where id = uid),
      'UTC'
    )
  )::time
$$ language sql stable;

grant execute on function user_today(uuid) to authenticated;
grant execute on function user_now_time(uuid) to authenticated;


-- ============================================================================
-- connections — 1:1 relationships ("companions" in UI)
-- ============================================================================

create table if not exists connections (
  id          uuid primary key default gen_random_uuid(),
  user_a      uuid not null references auth.users(id) on delete cascade,
  user_b      uuid not null references auth.users(id) on delete cascade,
  type        text not null default 'companion'
              check (type in ('companion','family','friend')),
  status      text not null default 'pending'
              check (status in ('pending','active','declined','removed')),
  created_at  timestamptz default now(),
  accepted_at timestamptz,
  unique (user_a, user_b),
  -- canonical ordering prevents duplicate (a,b)+(b,a) rows
  check (user_a < user_b)
);

create index if not exists connections_user_a_idx on connections (user_a) where status = 'active';
create index if not exists connections_user_b_idx on connections (user_b) where status = 'active';

-- Helper: are two users in an active connection?
create or replace function are_connected(a uuid, b uuid) returns boolean as $$
  select exists (
    select 1 from connections
    where status = 'active'
      and user_a = least(a, b)
      and user_b = greatest(a, b)
  )
$$ language sql stable;

grant execute on function are_connected(uuid, uuid) to authenticated;


-- ============================================================================
-- connection_invites — pending invites (email or 6-digit code)
-- ============================================================================

create table if not exists connection_invites (
  id            uuid primary key default gen_random_uuid(),
  inviter_id    uuid not null references auth.users(id) on delete cascade,
  invite_code   text unique,
  invitee_email text,
  status        text not null default 'pending'
                check (status in ('pending','accepted','expired','cancelled')),
  expires_at    timestamptz not null,
  created_at    timestamptz default now(),
  accepted_at   timestamptz,
  -- exactly one of code or email must be set
  check ((invite_code is not null) <> (invitee_email is not null))
);

-- one open invite per inviter at a time (prevents code sprawl)
create unique index if not exists one_open_invite_per_inviter
  on connection_invites (inviter_id)
  where status = 'pending';

create index if not exists invite_code_lookup
  on connection_invites (invite_code) where status = 'pending';

create index if not exists invite_email_lookup
  on connection_invites (invitee_email) where status = 'pending';


-- ============================================================================
-- accept_invite(code) — atomic acceptance via SECURITY DEFINER RPC
-- ============================================================================
-- The invitee has no claim that ties them to a connection_invites row before
-- accepting it, so this can't be expressed as an RLS SELECT policy without
-- dangerously loosening it. The standard Postgres pattern is a SECURITY
-- DEFINER function that runs with elevated privileges, validates everything,
-- and writes the rows atomically. Client calls via supabase.rpc('accept_invite').

create or replace function accept_invite(code text) returns uuid as $$
declare
  v_invite      record;
  v_acceptor    uuid := auth.uid();
  v_a           uuid;
  v_b           uuid;
  v_connection  uuid;
begin
  if v_acceptor is null then
    raise exception 'Authentication required';
  end if;

  select * into v_invite
  from connection_invites
  where invite_code = code
    and status = 'pending'
    and expires_at > now()
  for update;

  if v_invite is null then
    raise exception 'Invalid or expired invite code';
  end if;

  if v_invite.inviter_id = v_acceptor then
    raise exception 'Cannot accept your own invite';
  end if;

  v_a := least(v_invite.inviter_id, v_acceptor);
  v_b := greatest(v_invite.inviter_id, v_acceptor);

  insert into connections (user_a, user_b, status, accepted_at)
  values (v_a, v_b, 'active', now())
  on conflict (user_a, user_b) do update
    set status = 'active', accepted_at = now()
  returning id into v_connection;

  update connection_invites
  set status = 'accepted', accepted_at = now()
  where id = v_invite.id;

  return v_connection;
end
$$ language plpgsql security definer;

revoke all on function accept_invite(text) from public;
grant execute on function accept_invite(text) to authenticated;


-- ============================================================================
-- reminders — generalized recurring/one-off items ("Daily Routine" in UI)
-- ============================================================================

create table if not exists reminders (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  created_by      uuid not null references auth.users(id),
  title           text not null check (char_length(title) between 1 and 200),
  notes           text check (char_length(notes) <= 2000),
  visibility      text not null default 'private'
                  check (visibility in ('private','shared')),
  recurrence      text not null default 'daily'
                  check (recurrence in ('daily','weekdays','custom','once')),
  custom_days     int[] check (custom_days <@ array[0,1,2,3,4,5,6]),
  due_time        time,
  target_user_id  uuid references auth.users(id),
  sort_order      int default 0,
  archived_at     timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

drop trigger if exists set_updated_at on reminders;
create trigger set_updated_at before update on reminders
  for each row execute function moddatetime(updated_at);

create index if not exists reminders_owner_idx on reminders (owner_id, archived_at);
create index if not exists reminders_target_idx on reminders (target_user_id) where target_user_id is not null;


-- ============================================================================
-- reminder_completions — one row per reminder per day completed
-- ============================================================================

create table if not exists reminder_completions (
  id                  uuid primary key default gen_random_uuid(),
  reminder_id         uuid not null references reminders(id) on delete cascade,
  completed_for_date  date not null,
  completed_at        timestamptz default now(),
  completed_by        uuid not null references auth.users(id),
  unique (reminder_id, completed_for_date)
);

create index if not exists reminder_completions_lookup
  on reminder_completions (reminder_id, completed_for_date);


-- ============================================================================
-- reminder_skips — snooze a single day without breaking streak
-- ============================================================================

create table if not exists reminder_skips (
  id                uuid primary key default gen_random_uuid(),
  reminder_id       uuid not null references reminders(id) on delete cascade,
  skipped_for_date  date not null,
  reason            text check (char_length(reason) <= 200),
  skipped_by        uuid not null references auth.users(id),
  created_at        timestamptz default now(),
  unique (reminder_id, skipped_for_date)
);


-- ============================================================================
-- messages — pings + lightweight text messages
-- ============================================================================
-- A "ping" is body IS NULL AND reminder_id IS NOT NULL ("nudge to do X").
-- A "message" has body IS NOT NULL ("hey, thinking of you").
-- Same table, no chat threading complexity yet.

create table if not exists messages (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references auth.users(id),
  recipient_id  uuid not null references auth.users(id),
  body          text check (char_length(body) <= 2000),
  reminder_id   uuid references reminders(id),
  read_at       timestamptz,
  created_at    timestamptz default now(),
  -- a message must have either body or a reminder reference (or both)
  check (body is not null or reminder_id is not null)
);

create index if not exists messages_inbox_idx
  on messages (recipient_id, read_at);


-- ============================================================================
-- notification_subscriptions — push delivery endpoints
-- ============================================================================

create table if not exists notification_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  platform      text not null check (platform in ('web_push','desktop_mac','ios')),
  endpoint      text not null,
  keys          jsonb,
  user_agent    text,
  created_at    timestamptz default now(),
  last_seen_at  timestamptz default now(),
  unique (user_id, endpoint)
);


-- ============================================================================
-- notification_preferences — quiet hours + per-companion mute
-- ============================================================================

create table if not exists notification_preferences (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  quiet_hours_start    time,
  quiet_hours_end      time,
  muted_connection_ids uuid[] default array[]::uuid[],
  email_notifications  boolean default false,
  updated_at           timestamptz default now()
);

drop trigger if exists set_updated_at on notification_preferences;
create trigger set_updated_at before update on notification_preferences
  for each row execute function moddatetime(updated_at);


-- ============================================================================
-- Row Level Security (RLS) — privacy guarantee at database level
-- ============================================================================

alter table profiles                  enable row level security;
alter table connections               enable row level security;
alter table connection_invites        enable row level security;
alter table reminders                 enable row level security;
alter table reminder_completions      enable row level security;
alter table reminder_skips            enable row level security;
alter table messages                  enable row level security;
alter table notification_subscriptions enable row level security;
alter table notification_preferences  enable row level security;


-- profiles: see your own; see display_name of anyone you're connected to
drop policy if exists "profiles_select_self_or_connection" on profiles;
create policy "profiles_select_self_or_connection" on profiles
  for select using (
    id = auth.uid() or are_connected(auth.uid(), id)
  );

drop policy if exists "profiles_update_self" on profiles;
create policy "profiles_update_self" on profiles
  for update using (id = auth.uid());

-- connections: only the two parties see them
drop policy if exists "connections_select_self" on connections;
create policy "connections_select_self" on connections
  for select using (
    user_a = auth.uid() or user_b = auth.uid()
  );

drop policy if exists "connections_update_self" on connections;
create policy "connections_update_self" on connections
  for update using (
    user_a = auth.uid() or user_b = auth.uid()
  );

drop policy if exists "connections_delete_self" on connections;
create policy "connections_delete_self" on connections
  for delete using (
    user_a = auth.uid() or user_b = auth.uid()
  );

-- connection_invites: inviter only (acceptance flows through accept_invite RPC)
drop policy if exists "invites_select_inviter" on connection_invites;
create policy "invites_select_inviter" on connection_invites
  for select using (inviter_id = auth.uid());

drop policy if exists "invites_insert_inviter" on connection_invites;
create policy "invites_insert_inviter" on connection_invites
  for insert with check (inviter_id = auth.uid());

drop policy if exists "invites_update_inviter" on connection_invites;
create policy "invites_update_inviter" on connection_invites
  for update using (inviter_id = auth.uid());

drop policy if exists "invites_delete_inviter" on connection_invites;
create policy "invites_delete_inviter" on connection_invites
  for delete using (inviter_id = auth.uid());

-- reminders: own + shared from active connections
drop policy if exists "reminders_select" on reminders;
create policy "reminders_select" on reminders
  for select using (
    created_by = auth.uid()
    or owner_id = auth.uid()
    or (visibility = 'shared' and are_connected(auth.uid(), created_by))
    or (visibility = 'shared' and are_connected(auth.uid(), owner_id))
  );

drop policy if exists "reminders_insert" on reminders;
create policy "reminders_insert" on reminders
  for insert with check (created_by = auth.uid());

drop policy if exists "reminders_update_creator" on reminders;
create policy "reminders_update_creator" on reminders
  for update using (created_by = auth.uid());

drop policy if exists "reminders_delete_creator" on reminders;
create policy "reminders_delete_creator" on reminders
  for delete using (created_by = auth.uid());

-- reminder_completions: visible if parent reminder is visible
drop policy if exists "completions_select_via_reminder" on reminder_completions;
create policy "completions_select_via_reminder" on reminder_completions
  for select using (
    reminder_id in (select id from reminders)
  );

drop policy if exists "completions_insert_self" on reminder_completions;
create policy "completions_insert_self" on reminder_completions
  for insert with check (
    completed_by = auth.uid()
    and reminder_id in (select id from reminders)
  );

drop policy if exists "completions_delete_self" on reminder_completions;
create policy "completions_delete_self" on reminder_completions
  for delete using (
    completed_by = auth.uid()
  );

-- reminder_skips: same as completions
drop policy if exists "skips_select_via_reminder" on reminder_skips;
create policy "skips_select_via_reminder" on reminder_skips
  for select using (
    reminder_id in (select id from reminders)
  );

drop policy if exists "skips_insert_self" on reminder_skips;
create policy "skips_insert_self" on reminder_skips
  for insert with check (
    skipped_by = auth.uid()
    and reminder_id in (select id from reminders)
  );

drop policy if exists "skips_delete_self" on reminder_skips;
create policy "skips_delete_self" on reminder_skips
  for delete using (skipped_by = auth.uid());

-- messages: only sender and recipient
drop policy if exists "messages_select_self" on messages;
create policy "messages_select_self" on messages
  for select using (
    sender_id = auth.uid() or recipient_id = auth.uid()
  );

drop policy if exists "messages_insert_self" on messages;
create policy "messages_insert_self" on messages
  for insert with check (sender_id = auth.uid());

drop policy if exists "messages_update_recipient" on messages;
create policy "messages_update_recipient" on messages
  for update using (recipient_id = auth.uid());

-- notification_subscriptions: only the user themselves
drop policy if exists "subs_select_self" on notification_subscriptions;
create policy "subs_select_self" on notification_subscriptions
  for select using (user_id = auth.uid());

drop policy if exists "subs_insert_self" on notification_subscriptions;
create policy "subs_insert_self" on notification_subscriptions
  for insert with check (user_id = auth.uid());

drop policy if exists "subs_update_self" on notification_subscriptions;
create policy "subs_update_self" on notification_subscriptions
  for update using (user_id = auth.uid());

drop policy if exists "subs_delete_self" on notification_subscriptions;
create policy "subs_delete_self" on notification_subscriptions
  for delete using (user_id = auth.uid());

-- notification_preferences: only the user themselves
drop policy if exists "prefs_select_self" on notification_preferences;
create policy "prefs_select_self" on notification_preferences
  for select using (user_id = auth.uid());

drop policy if exists "prefs_insert_self" on notification_preferences;
create policy "prefs_insert_self" on notification_preferences
  for insert with check (user_id = auth.uid());

drop policy if exists "prefs_update_self" on notification_preferences;
create policy "prefs_update_self" on notification_preferences
  for update using (user_id = auth.uid());


-- ============================================================================
-- Realtime subscriptions
-- ============================================================================
-- Tables we want to push live updates for via Supabase Realtime.

alter publication supabase_realtime add table reminders;
alter publication supabase_realtime add table reminder_completions;
alter publication supabase_realtime add table reminder_skips;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table connections;


-- ============================================================================
-- Done.
-- ============================================================================
