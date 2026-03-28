/**
 * Full logical copy: source Postgres → target Postgres (pg_dump / pg_restore).
 * Run from repo: `cd backend && npm run migrate:supabase`
 *
 * Env:
 *   MIGRATE_SOURCE_DATABASE_URL — from your Mac use Railway **public** URL (proxy), not *.railway.internal
 *   MIGRATE_TARGET_DATABASE_URL — Supabase **direct** db.*.supabase.co:5432/postgres
 *
 * Requires: pg_dump and pg_restore on PATH.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const source = process.env.MIGRATE_SOURCE_DATABASE_URL;
const target = process.env.MIGRATE_TARGET_DATABASE_URL;

if (!source || !target) {
  console.error('Set MIGRATE_SOURCE_DATABASE_URL and MIGRATE_TARGET_DATABASE_URL');
  process.exit(1);
}

if (target.includes('railway.internal') || target.includes('rlwy.net')) {
  console.warn(
    '[warn] MIGRATE_TARGET looks like Railway, not Supabase. Target should be db.<ref>.supabase.co:5432',
  );
}

const outDir = path.join(root, '.tmp-migrate');
fs.mkdirSync(outDir, { recursive: true });
const dumpFile = path.join(outDir, `dump-${Date.now()}.custom`);

console.log('pg_dump →', dumpFile);
const dump = spawnSync(
  'pg_dump',
  ['--dbname=' + source, '--format=custom', '--no-owner', '--no-acl', '--file', dumpFile],
  { stdio: 'inherit', env: process.env },
);
if (dump.error) {
  console.error(dump.error);
  process.exit(1);
}
if (dump.status !== 0) {
  process.exit(dump.status ?? 1);
}

console.log('pg_restore → target');
const restore = spawnSync(
  'pg_restore',
  ['--dbname=' + target, '--no-owner', '--no-acl', '--verbose', dumpFile],
  { stdio: 'inherit', env: process.env },
);
if (restore.error) {
  console.error(restore.error);
  process.exit(1);
}
if (restore.status !== 0) {
  console.warn(
    'pg_restore exited non-zero; check Supabase for extension/owner messages and verify data.',
  );
}

console.log('Done.');
