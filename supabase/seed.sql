-- Starting data for Nōnia. Run once after the migration.
with ws as (
  insert into public.workspaces (name) values ('Nōnia') returning id
), proj as (
  insert into public.projects (workspace_id, name, color)
  select ws.id, p.name, p.color from ws,
    (values ('GearHead', '#E8833A')) as p(name, color)
  returning workspace_id
), inv as (
  insert into public.invites (workspace_id, email, display_name, role)
  select ws.id, i.email, i.name, i.role from ws,
    (values ('john@johnsierramusic.com', 'John', 'owner'),
            ('antjuan@centralcoastcreatives.com', 'Antjuan', 'member')) as i(email, name, role)
  returning workspace_id
)
insert into public.conversations (workspace_id, kind, source, name)
select id, 'channel', 'chat', 'general' from ws
returning workspace_id;
