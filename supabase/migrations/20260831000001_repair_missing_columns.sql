-- ─────────────────────────────────────────
-- Repair: add missing columns to production.
-- Same footgun as the tables: these migrations were recorded in the remote
-- history but their DDL never actually ran (PGRST204 "Could not find the
-- column ... in the schema cache"). All statements are idempotent.
-- ─────────────────────────────────────────

-- tasks.focus_mode (20260410000002_focus_mode)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS focus_mode TEXT
  CHECK (focus_mode IN ('deep', 'quick', 'planning', 'admin'));
CREATE INDEX IF NOT EXISTS idx_tasks_focus_mode ON tasks(focus_mode) WHERE focus_mode IS NOT NULL;
COMMENT ON COLUMN tasks.focus_mode IS 'Task categorization by focus type: deep (full creative attention), quick (under 15 min), planning (organizing/strategizing), admin (logistical/repetitive)';

-- reflections.accomplished_intent (20260410120000_reflection_accomplished_intent)
ALTER TABLE reflections ADD COLUMN IF NOT EXISTS accomplished_intent BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN reflections.accomplished_intent IS 'Whether the user accomplished their daily intent for this reflection period';

-- warmap_items.north_star_alignment (20260410180000_warmap_alignment)
ALTER TABLE warmap_items ADD COLUMN IF NOT EXISTS north_star_alignment text;
CREATE INDEX IF NOT EXISTS idx_warmap_items_alignment ON warmap_items(north_star_alignment)
  WHERE north_star_alignment IS NOT NULL;

-- profiles google calendar sync (20260413000000_google_calendar_sync)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS google_email TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_google_connected ON profiles(google_connected_at) WHERE google_connected_at IS NOT NULL;
