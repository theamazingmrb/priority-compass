-- ─────────────────────────────────────────
-- Notification Settings & Push Subscriptions
-- ─────────────────────────────────────────

-- User notification preferences
create table if not exists notification_preferences (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  user_id         uuid references auth.users(id) on delete cascade not null unique,
  
  -- Master toggle
  notifications_enabled boolean default false,
  
  -- Check-in reminders
  morning_checkin_enabled   boolean default true,
  morning_checkin_time      time default '08:00:00'::time,
  
  midday_checkin_enabled    boolean default true,
  midday_checkin_time      time default '12:00:00'::time,
  
  evening_checkin_enabled   boolean default true,
  evening_checkin_time     time default '20:00:00'::time,
  
  -- Task notifications
  task_start_enabled       boolean default true,
  task_start_minutes_before int default 15, -- minutes before task start
  
  overdue_task_enabled     boolean default true,
  overdue_task_check_time  time default '09:00:00'::time, -- when to check for overdue
  
  -- Reflection reminder
  reflection_enabled      boolean default true,
  reflection_time         time default '21:00:00'::time,
  
  constraint unique_user_prefs unique(user_id)
);

-- Push subscription storage (for web push)
create table if not exists push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  
  -- Web Push subscription object (JSON)
  endpoint      text not null,
  p256dh_key    text not null,  -- public key
  auth_key      text not null,  -- auth secret
  
  -- Device info for management
  user_agent    text,
  device_name   text,
  
  unique(endpoint) -- one subscription per endpoint
);

-- Notification log (optional: for debugging and analytics)
create table if not exists notification_log (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  
  notification_type text not null, -- 'morning_checkin', 'overdue_task', etc.
  title             text,
  body              text,
  sent              boolean default false,
  error_message     text
);

-- Enable RLS
alter table notification_preferences enable row level security;
alter table push_subscriptions enable row level security;
alter table notification_log enable row level security;

-- RLS Policies for notification_preferences
create policy "Users can view own notification preferences" on notification_preferences
  for select using (auth.uid() = user_id);

create policy "Users can insert own notification preferences" on notification_preferences
  for insert with check (auth.uid() = user_id);

create policy "Users can update own notification preferences" on notification_preferences
  for update using (auth.uid() = user_id);

-- RLS Policies for push_subscriptions
create policy "Users can view own push subscriptions" on push_subscriptions
  for select using (auth.uid() = user_id);

create policy "Users can insert own push subscriptions" on push_subscriptions
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own push subscriptions" on push_subscriptions
  for delete using (auth.uid() = user_id);

-- RLS Policies for notification_log
create policy "Users can view own notification log" on notification_log
  for select using (auth.uid() = user_id);

create policy "System can insert notification log" on notification_log
  for insert with check (true); -- Edge functions will handle this

-- Indexes
create index if not exists idx_notification_prefs_user_id on notification_preferences(user_id);
create index if not exists idx_push_subs_user_id on push_subscriptions(user_id);
create index if not exists idx_push_subs_endpoint on push_subscriptions(endpoint);
create index if not exists idx_notification_log_user_id on notification_log(user_id);
create index if not exists idx_notification_log_created_at on notification_log(created_at);

-- Trigger for updated_at
create trigger update_notification_preferences_updated_at
  before update on notification_preferences
  for each row execute function update_updated_at_column();

-- Function to get default notification preferences for new users
create or replace function get_default_notification_prefs()
returns json as $$
begin
  return json_build_object(
    'notifications_enabled', false,
    'morning_checkin_enabled', true,
    'morning_checkin_time', '08:00:00',
    'midday_checkin_enabled', true,
    'midday_checkin_time', '12:00:00',
    'evening_checkin_enabled', true,
    'evening_checkin_time', '20:00:00',
    'task_start_enabled', true,
    'task_start_minutes_before', 15,
    'overdue_task_enabled', true,
    'overdue_task_check_time', '09:00:00',
    'reflection_enabled', true,
    'reflection_time', '21:00:00'
  );
end;
$$ language plpgsql;