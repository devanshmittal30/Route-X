import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

// Helper to load .env.local
function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const env: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        env[key] = val;
      }
    }
  }
  return env;
}

const localEnv = loadEnvLocal();
const PROJECT_REF = 'uvtxpwnjvvxasjtopdby';

// Check available credentials
const DB_URL =
  process.env.SUPABASE_DB_URL ||
  localEnv.SUPABASE_DB_URL ||
  (process.env.SUPABASE_DB_PASSWORD || localEnv.SUPABASE_DB_PASSWORD
    ? `postgresql://postgres:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD || localEnv.SUPABASE_DB_PASSWORD)}@db.${PROJECT_REF}.supabase.co:5432/postgres`
    : '');

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || localEnv.SUPABASE_ACCESS_TOKEN || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || localEnv.SUPABASE_SERVICE_ROLE_KEY || '';

async function runSqlViaPg(connectionString: string, sql: string, label: string) {
  console.log(`Executing ${label} via Direct Postgres connection...`);
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
    console.log(`✅ ${label} applied successfully.`);
  } finally {
    await client.end();
  }
}

async function runSqlViaApi(token: string, sql: string, label: string) {
  console.log(`Executing ${label} via Supabase Management API...`);
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Management API error (${res.status}): ${errText}`);
  }
  console.log(`✅ ${label} applied successfully via Management API.`);
}

async function ensureStorageBucket(supabaseUrl: string, serviceKey: string) {
  console.log('Configuring "report-photos" storage bucket...');
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data: buckets } = await adminClient.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === 'report-photos');

  if (!exists) {
    const { error } = await adminClient.storage.createBucket('report-photos', {
      public: true,
      fileSizeLimit: 3145728, // 3 MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });
    if (error) {
      console.warn('⚠️ Could not create bucket via API:', error.message);
    } else {
      console.log('✅ Bucket "report-photos" created successfully.');
    }
  } else {
    console.log('ℹ️ Bucket "report-photos" already exists.');
  }
}

async function main() {
  console.log('====================================================');
  console.log(' RouteX Automated Supabase Setup');
  console.log(` Target Project: ${PROJECT_REF}`);
  console.log('====================================================\n');

  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/001_init.sql');
  const seedPath = path.resolve(process.cwd(), 'supabase/seed.sql');

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  let executed = false;

  if (DB_URL) {
    try {
      await runSqlViaPg(DB_URL, migrationSql, '001_init.sql migration');
      await runSqlViaPg(DB_URL, seedSql, 'seed.sql');
      executed = true;
    } catch (err: any) {
      console.error('Direct Postgres execution failed:', err.message);
    }
  }

  if (!executed && ACCESS_TOKEN) {
    try {
      await runSqlViaApi(ACCESS_TOKEN, migrationSql, '001_init.sql migration');
      await runSqlViaApi(ACCESS_TOKEN, seedSql, 'seed.sql');
      executed = true;
    } catch (err: any) {
      console.error('Management API execution failed:', err.message);
    }
  }

  if (executed) {
    const supabaseUrl = localEnv.VITE_SUPABASE_URL || `https://${PROJECT_REF}.supabase.co`;
    if (SERVICE_KEY) {
      await ensureStorageBucket(supabaseUrl, SERVICE_KEY);
    }
    console.log('\n🎉 Supabase schema and seed data setup complete!');
  } else {
    console.log('⚠️ No direct database credentials found in environment or .env.local.');
    console.log('\nTo run this script automatically, add either of the following to your .env.local:');
    console.log('  Option 1: SUPABASE_DB_PASSWORD=<your_supabase_db_password>');
    console.log('  Option 2: SUPABASE_DB_URL=postgresql://postgres:[password]@db.uvtxpwnjvvxasjtopdby.supabase.co:5432/postgres');
    console.log('  Option 3: SUPABASE_ACCESS_TOKEN=<your_sbp_token_from_supabase_dashboard>');
    console.log('\nThen re-run: npx tsx scripts/setup-supabase.ts');
  }
}

main().catch((e) => {
  console.error('Fatal setup error:', e);
  process.exit(1);
});
