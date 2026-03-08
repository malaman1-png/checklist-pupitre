-- Add a default value to projects.name so insert({}) works
ALTER TABLE projects ALTER COLUMN name SET DEFAULT '';
