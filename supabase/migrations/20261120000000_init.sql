-- Chat App: initial schema
-- One team workspace with native channels/DMs plus conversations brought in
-- from other apps (Messages group texts, Slack, Telegram, Messenger).

create schema if not exists private;

-- ---------- Types ----------
create type public.message_source as enum ('chat', 'messages', 'slack', 'telegram', 'messenger');
create type public.conversation_kind as enum ('channel', 'dm', 'external');
create type public.tag_status as enum ('none', 'suggested', 'confirmed');

-- ---------- Tables ----------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  display_name text not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index members_user_id_idx on public.members (user_id);

-- Emails allowed to join a workspace. Checked on first sign-in.
create table public.invites (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'member' check (role in ('owner', 'member')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, email)
);
create index invites_email_idx on public.invites (lower(email));

-- People we talk to, including those outside the app (e.g. a phone number in a group text).
create table public.people (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  display_name text not null,
  user_id uuid references auth.users(id) on delete set null,
  phone text,
  slack_user_id text,
  telegram_user_id text,
  created_at timestamptz not null default now()
);
create index people_workspace_idx on public.people (workspace_id);
create unique index people_workspace_phone_uidx on public.people (workspace_id, phone) where phone is not null;
create unique index people_workspace_user_uidx on public.people (workspace_id, user_id) where user_id is not null;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  color text not null default '#2E4BFF',
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind public.conversation_kind not null,
  source public.message_source not null default 'chat',
  name text,
  external_id text,
  default_project_id uuid references public.projects(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);
create index conversations_workspace_idx on public.conversations (workspace_id, last_message_at desc);
create unique index conversations_external_uidx on public.conversations (workspace_id, source, external_id) where external_id is not null;
create index conversations_default_project_idx on public.conversations (default_project_id);

create table public.conversation_people (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  primary key (conversation_id, person_id)
);
create index conversation_people_person_idx on public.conversation_people (person_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  author_user_id uuid references auth.users(id) on delete set null,
  body text not null,
  source public.message_source not null default 'chat',
  external_id text,
  project_id uuid references public.projects(id) on delete set null,
  tag_status public.tag_status not null default 'none',
  tag_reason text,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_workspace_idx on public.messages (workspace_id, created_at desc);
create index messages_person_idx on public.messages (person_id, created_at desc);
create index messages_project_idx on public.messages (project_id, created_at desc);
create index messages_author_idx on public.messages (author_user_id);
create unique index messages_external_uidx on public.messages (workspace_id, source, external_id) where external_id is not null;

-- ---------- Helper (private schema, not exposed through the API) ----------
create or replace function private.is_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.members m
    where m.workspace_id = ws and m.user_id = (select auth.uid())
  );
$$;
revoke all on function private.is_member(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_member(uuid) to authenticated;

-- Keep conversations.last_message_at fresh.
create or replace function private.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;
revoke all on function private.touch_conversation() from public, anon, authenticated;
create trigger messages_touch_conversation after insert on public.messages
  for each row execute function private.touch_conversation();

-- On sign-up: if the email was invited, join the workspace and get a person row.
create or replace function private.accept_invites()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare inv record;
begin
  for inv in select * from public.invites i where lower(i.email) = lower(new.email) loop
    insert into public.members (workspace_id, user_id, display_name, role)
      values (inv.workspace_id, new.id, coalesce(inv.display_name, split_part(new.email, '@', 1)), inv.role)
      on conflict do nothing;
    insert into public.people (workspace_id, display_name, user_id)
      values (inv.workspace_id, coalesce(inv.display_name, split_part(new.email, '@', 1)), new.id)
      on conflict do nothing;
  end loop;
  return new;
end;
$$;
revoke all on function private.accept_invites() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.accept_invites();

-- ---------- Row level security ----------
alter table public.workspaces enable row level security;
alter table public.members enable row level security;
alter table public.invites enable row level security;
alter table public.people enable row level security;
alter table public.projects enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_people enable row level security;
alter table public.messages enable row level security;

create policy "members read workspace" on public.workspaces for select to authenticated
  using ((select private.is_member(id)));

create policy "members read members" on public.members for select to authenticated
  using ((select private.is_member(workspace_id)));
create policy "update own member row" on public.members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "members read invites" on public.invites for select to authenticated
  using ((select private.is_member(workspace_id)));
create policy "members create invites" on public.invites for insert to authenticated
  with check ((select private.is_member(workspace_id)) and invited_by = (select auth.uid()) and role = 'member');

create policy "members read people" on public.people for select to authenticated
  using ((select private.is_member(workspace_id)));
create policy "members add people" on public.people for insert to authenticated
  with check ((select private.is_member(workspace_id)));
create policy "members edit people" on public.people for update to authenticated
  using ((select private.is_member(workspace_id))) with check ((select private.is_member(workspace_id)));

create policy "members read projects" on public.projects for select to authenticated
  using ((select private.is_member(workspace_id)));
create policy "members add projects" on public.projects for insert to authenticated
  with check ((select private.is_member(workspace_id)));
create policy "members edit projects" on public.projects for update to authenticated
  using ((select private.is_member(workspace_id))) with check ((select private.is_member(workspace_id)));

create policy "members read conversations" on public.conversations for select to authenticated
  using ((select private.is_member(workspace_id)));
create policy "members create chat conversations" on public.conversations for insert to authenticated
  with check ((select private.is_member(workspace_id)) and source = 'chat' and created_by = (select auth.uid()));
create policy "members edit conversations" on public.conversations for update to authenticated
  using ((select private.is_member(workspace_id))) with check ((select private.is_member(workspace_id)));

create policy "members read conversation people" on public.conversation_people for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id and (select private.is_member(c.workspace_id))));
create policy "members add conversation people" on public.conversation_people for insert to authenticated
  with check (exists (select 1 from public.conversations c where c.id = conversation_id and (select private.is_member(c.workspace_id))));

create policy "members read messages" on public.messages for select to authenticated
  using ((select private.is_member(workspace_id)));
-- Members can post native chat messages as themselves. Messages from other apps
-- are written by server webhooks with the service role.
create policy "members post chat messages" on public.messages for insert to authenticated
  with check (
    (select private.is_member(workspace_id))
    and source = 'chat'
    and author_user_id = (select auth.uid())
    and exists (select 1 from public.conversations c where c.id = conversation_id and c.workspace_id = messages.workspace_id)
  );
-- Members can tag any message in their workspace (project + status only is enforced in the app).
create policy "members tag messages" on public.messages for update to authenticated
  using ((select private.is_member(workspace_id))) with check ((select private.is_member(workspace_id)));

-- Only tag columns are updatable by members.
revoke update on public.messages from authenticated;
grant update (project_id, tag_status, tag_reason) on public.messages to authenticated;

-- ---------- Data API grants ----------
grant usage on schema public to authenticated;
grant select on public.workspaces, public.members, public.invites, public.people, public.projects,
  public.conversations, public.conversation_people, public.messages to authenticated;
grant insert on public.invites, public.people, public.projects, public.conversations,
  public.conversation_people, public.messages to authenticated;
grant update (display_name) on public.members to authenticated;
grant update on public.people, public.projects to authenticated;
grant update (name, default_project_id) on public.conversations to authenticated;
revoke all on all tables in schema public from anon;

-- ---------- Realtime ----------
alter publication supabase_realtime add table public.messages;
