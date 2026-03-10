-- Verify essential preprod schema/data health
\set ON_ERROR_STOP on

select current_database() as database_name, now() as checked_at;

-- Core tables expected by the app
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'settings',
    'projects',
    'checklist_items',
    'types',
    'materiel',
    'artists',
    'admin_secrets'
  )
order by table_name;

-- Quick smoke counts (should not fail if empty)
select
  (select count(*) from settings) as settings_count,
  (select count(*) from projects) as projects_count,
  (select count(*) from checklist_items) as checklist_items_count;

