import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const PROJECT_REF = 'uvtxpwnjvvxasjtopdby';
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || 'Route-X@123!';

// Try both pooler and direct host
const connectionStrings = [
  `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres:${encodeURIComponent(DB_PASSWORD)}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
  `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`,
];

async function apply() {
  const sqlFile = path.resolve(process.cwd(), 'supabase/migrations/002_reports_enhancements.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  let success = false;

  for (const connStr of connectionStrings) {
    console.log(`Connecting to database...`);
    const client = new Client({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });

    try {
      await client.connect();
      console.log('Connected! Applying 002_reports_enhancements.sql...');
      await client.query(sql);
      console.log('✅ Successfully applied 002_reports_enhancements.sql to Supabase!');
      await client.end();
      success = true;
      break;
    } catch (err: unknown) {
      console.warn('Attempt failed:', (err as Error).message);
      try {
        await client.end();
      } catch {
        // ignore
      }
    }
  }

  if (!success) {
    console.error('All connection attempts failed. The SQL can also be run directly in the Supabase SQL Editor.');
    process.exit(1);
  }
}

apply().catch((e) => {
  console.error(e);
  process.exit(1);
});

