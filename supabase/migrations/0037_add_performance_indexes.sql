-- Performance indexes identified during production audit
-- These cover the most common query patterns in the admin, chart, and reading flows.

-- Speed up chart listing per user (dashboard, admin enrichment)
CREATE INDEX IF NOT EXISTS idx_chart_snapshots_user_id
  ON chart_snapshots (chart_id);

-- Speed up position lookups per snapshot (chart detail page)
CREATE INDEX IF NOT EXISTS idx_chart_positions_snapshot_id
  ON chart_positions (chart_snapshot_id);

-- Speed up aspect lookups per snapshot (chart detail page)
CREATE INDEX IF NOT EXISTS idx_chart_aspects_snapshot_id
  ON chart_aspects (chart_snapshot_id);

-- Speed up reading queries by provider (admin analytics)
CREATE INDEX IF NOT EXISTS idx_readings_model_provider
  ON readings (model_provider);

-- Speed up monthly usage reporting (admin users list, access checks)
CREATE INDEX IF NOT EXISTS idx_usage_counters_period
  ON usage_counters (user_id, period_start, period_end);

-- Speed up entitlement lookups by type and status (report access checks)
CREATE INDEX IF NOT EXISTS idx_report_entitlements_type_status
  ON report_entitlements (reading_type, status);
