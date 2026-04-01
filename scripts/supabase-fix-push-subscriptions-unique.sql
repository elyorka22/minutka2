-- Push subscription duplicates fix:
-- 1) leave one row per endpoint
-- 2) enforce unique endpoint constraint

-- Keep newest row for each endpoint, remove older duplicates.
DELETE FROM "PushSubscription" p
USING "PushSubscription" d
WHERE p.endpoint = d.endpoint
  AND p.id < d.id;

-- Enforce uniqueness for one device = one subscription.
CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key"
  ON "PushSubscription"("endpoint");
