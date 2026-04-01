# Release Migration Checklist

Use this checklist for every staging/production release when Prisma migrate is unreliable through Supabase pooler.

## 0) Security first

- Rotate DB password if it was exposed anywhere.
- Update deploy secrets with the new password.

## 1) Apply release SQL in Supabase

Run the required SQL script(s) in Supabase SQL Editor.

For refresh-token release:

- `scripts/supabase-add-refresh-tokens.sql`

## 2) Verify schema objects after SQL apply

Run these checks in Supabase SQL Editor:

```sql
select to_regclass('"RefreshToken"') as table_name;
```

Expected: `"RefreshToken"`.

```sql
select indexname
from pg_indexes
where tablename = 'RefreshToken'
order by indexname;
```

Expected indexes:

- `RefreshToken_pkey`
- `RefreshToken_tokenHash_key`
- `RefreshToken_userId_idx`
- `RefreshToken_expiresAt_idx`

```sql
select conname
from pg_constraint
where conname = 'RefreshToken_userId_fkey';
```

Expected: one row.

## 3) Record manual migration audit in DB

Run once to create audit table:

```sql
create table if not exists public._manual_migrations (
  id bigserial primary key,
  migration_name text not null unique,
  applied_at timestamptz not null default now(),
  applied_by text null,
  notes text null
);
```

Record applied migrations:

```sql
insert into public._manual_migrations (migration_name, applied_by, notes)
values
  ('0001_init', 'admin', 'baseline applied earlier'),
  ('0002_auth_refresh_tokens', 'admin', 'applied via scripts/supabase-add-refresh-tokens.sql')
on conflict (migration_name) do nothing;
```

Verify audit rows:

```sql
select migration_name, applied_at, applied_by
from public._manual_migrations
order by applied_at desc;
```

## 4) Pre-release technical checks

From project root:

```bash
cd backend && npm run build
cd ../frontend && npm run build
cd ../backend && npm run test:e2e
```

Health check:

```bash
curl -sS "https://YOUR_BACKEND_DOMAIN/health"
```

Expected: JSON with `"ok": true` and `"database": "up"`.

## 5) Post-release smoke checks

- Login with valid user.
- Refresh flow works (expired access token is refreshed).
- Logout revokes refresh token.
- Customer creates order.
- Restaurant admin updates order status.
- Courier sees/takes order.

## 6) Go / No-Go

- Go only if all sections above are green.
- If any schema check, health, or smoke check fails: stop release and fix first.
