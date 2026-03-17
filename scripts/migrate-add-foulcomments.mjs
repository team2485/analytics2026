#!/usr/bin/env node
/**
 * One-time migration: add foulcomments column to phd2026.
 * Run from repo root: node analytics2026/scripts/migrate-add-foulcomments.mjs
 * Loads env from analytics2026/.env.local
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'pg';
const { Client } = pkg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const envPath = join(rootDir, '.env.local');

try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
} catch (e) {
  console.warn('No .env.local found, using existing process.env');
}

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing POSTGRES_URL or DATABASE_URL in .env.local');
  process.exit(1);
}

const client = new Client({ connectionString });
await client.connect();
try {
  await client.query('ALTER TABLE phd2026 ADD COLUMN IF NOT EXISTS foulcomments TEXT;');
  console.log('phd2026.foulcomments column added (or already exists).');
} finally {
  await client.end();
}
