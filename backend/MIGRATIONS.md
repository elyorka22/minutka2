# Prisma migrations workflow

This project now uses versioned Prisma migrations in `backend/prisma/migrations`.

## Important rules

- Do not use `prisma db push` in production.
- Apply schema changes only via migrations committed to git.
- Always test migrations in staging before production.

## Local development

From `backend/`:

1. Create migration after schema changes:

```bash
npx prisma migrate dev --name <short_change_name>
```

2. Regenerate client:

```bash
npx prisma generate
```

## Staging / Production deploy

From `backend/` with target `DATABASE_URL` set:

```bash
npx prisma migrate deploy
```

Optional status check:

```bash
npx prisma migrate status
```

## Existing databases (already initialized manually)

If environment was created from SQL scripts before migrations existed:

1. Ensure schema matches current `prisma/schema.prisma`.
2. Mark the baseline migration as applied in that environment:

```bash
npx prisma migrate resolve --applied 0001_init
```

3. Then use only `prisma migrate deploy` for subsequent releases.

## Rollback policy

- Take a database backup/snapshot before applying migrations in production.
- If migration fails, restore from backup and investigate before retry.
