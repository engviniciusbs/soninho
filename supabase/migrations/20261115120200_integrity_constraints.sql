-- At most one open (end_time is null) session per baby.
create unique index if not exists sleep_sessions_one_open_per_baby
  on public.sleep_sessions (baby_id) where end_time is null;
create unique index if not exists breastfeeding_sessions_one_open_per_baby
  on public.breastfeeding_sessions (baby_id) where end_time is null;

-- dedupe_key uniqueness: notification_events.dedupe_key and email_log.dedupe_key
-- already carry inline UNIQUE constraints (notification_events_dedupe_key_key,
-- email_log_dedupe_key_key) from their creation migrations, so nothing to add.
