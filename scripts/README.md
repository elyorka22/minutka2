# Scripts usage guide

This folder contains one-time SQL patches, bootstrap SQL files, and utility scripts.

## Main rule

- For schema changes in active environments, use Prisma migrations from `backend/`.
- Do not use `prisma db push` on staging/production.

## Which script to use

- `supabase-init-schema.sql`
  - Use only for brand-new/empty database bootstrap.
  - It is a baseline SQL snapshot aligned with `backend/prisma/migrations/0001_init/migration.sql`.

- `supabase-init-storage.sql`
  - Use when initializing Supabase storage buckets/policies in a fresh environment.

- `supabase-add-*.sql`, `supabase-fix-*.sql`, `supabase-banner-title-nullable.sql`
  - Legacy one-off patches for older environments.
  - Run only if that specific change is missing in the target database.

- `supabase-add-partnership-applications.sql`
  - Legacy patch for old databases only.
  - New databases already get this table from the baseline schema/migration.

- `supabase-add-refresh-tokens.sql`
  - One-off patch for environments created before refresh token migration.
  - Skip if `prisma migrate deploy` already applied migration `0002_auth_refresh_tokens`.

- `supabase-add-order-short-code.sql`
  - One-off patch to add 4-digit unique order code (`shortCode`) for faster verbal coordination.
  - Skip if migration `0003_order_short_code` is already applied.

## Standard deploy flow (staging/prod)

From `backend/`:

1. Apply committed migrations:
   - `npx prisma migrate deploy`
2. Verify status:
   - `npx prisma migrate status`

Full migration process is documented in `backend/MIGRATIONS.md`.
