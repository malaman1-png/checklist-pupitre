-- Enable Supabase Realtime on checklist_items and projects tables
ALTER PUBLICATION supabase_realtime ADD TABLE checklist_items;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
