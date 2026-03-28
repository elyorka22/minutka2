# Rollback: Supabase → Railway Postgres

If something fails after pointing the app at Supabase, you can go back to Railway **without** deleting the Supabase project.

## Preconditions

- Railway Postgres still exists and still contains a good snapshot (you did **not** drop it after cutover).

## Steps

1. **Railway (backend service)**  
   Set `DATABASE_URL` to the **original Railway** Postgres connection string.

2. **`DIRECT_URL`**  
   Optional on Railway if you use one direct connection: you can omit it or set it equal to `DATABASE_URL`.  
   Prisma CLI reads `DATABASE_URL` from `prisma.config.ts`; migrations against Supabase direct DB are typically run as  
   `DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy`.

3. **Redeploy** the NestJS service on Railway (or restart if env is applied live).

4. **Verify**  
   - `GET https://<your-api>/health` → `{ "ok": true, "database": "up" }`  
   - `cd backend && DATABASE_URL=<railway-url> npx prisma validate`

5. **Optional**  
   Point `NEXT_PUBLIC_API_BASE_URL` on Vercel back to the same API URL if you changed anything during migration.

## Notes

- Old image URLs under `/uploads/...` on the API host keep working while `express.static` serves the `uploads` folder.
- New uploads that went only to Supabase Storage are **not** on Railway disk; rollback keeps DB rows pointing at Supabase CDN URLs (they remain valid if the bucket stays public).
