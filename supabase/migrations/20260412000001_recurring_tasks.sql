-- ─────────────────────────────────────────
-- Recurring Tasks — Add recurrence fields to tasks
-- ─────────────────────────────────────────

-- Add recurrence fields to tasks table
alter table tasks
  add column if not exists recurrence_type text,
  add column if not exists recurrence_interval int default 1,
  add column if not exists recurrence_end_date date,
  add column if not exists recurrence_weekdays int[],
  add column if not exists parent_task_id uuid references tasks(id),
  add column if not exists skipped_dates date[],
  add column if not exists is_recurrence_template boolean default false;

-- Add check constraint for recurrence_type
alter table tasks
  add constraint check_recurrence_type 
  check (recurrence_type is null or recurrence_type in ('daily', 'weekly', 'monthly', 'yearly', 'custom'));

-- Create index for querying recurring task templates
create index if not exists idx_tasks_recurrence_template on tasks(is_recurrence_template) 
  where is_recurrence_template = true;

-- Create index for querying task instances by parent
create index if not exists idx_tasks_parent_task on tasks(parent_task_id) 
  where parent_task_id is not null;

-- Create index for querying by recurrence type
create index if not exists idx_tasks_recurrence_type on tasks(recurrence_type) 
  where recurrence_type is not null;

-- Add comment
comment on column tasks.recurrence_type is 'Type of recurrence: daily, weekly, monthly, yearly, or custom';
comment on column tasks.recurrence_interval is 'Interval between recurrences (e.g., every 2 weeks)';
comment on column tasks.recurrence_end_date is 'Optional end date for recurrence';
comment on column tasks.recurrence_weekdays is 'Array of weekdays (0-6, Sunday-Saturday) for custom recurrence';
comment on column tasks.parent_task_id is 'Reference to the template task for recurring instances';
comment on column tasks.skipped_dates is 'Array of dates skipped for this recurrence';
comment on column tasks.is_recurrence_template is 'Whether this task is a template for recurring instances';