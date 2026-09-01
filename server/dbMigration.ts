import fs from 'fs';
import path from 'path';
import pg from 'pg';

export interface MigrationResult {
  attempted: boolean;
  executed: boolean;
  message: string;
  error?: string;
  timestamp: string;
}

export async function runServerMigrationIfConfigured(): Promise<MigrationResult> {
  const timestamp = new Date().toISOString();
  const dbUrl = (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    ''
  ).trim();

  if (!dbUrl) {
    return {
      attempted: false,
      executed: false,
      message: 'No DATABASE_URL or POSTGRES_URL configured on server. Migration cannot be executed automatically without database connection credentials.',
      timestamp
    };
  }

  const sqlFilePath = path.join(process.cwd(), 'src', 'db', 'production_supabase_fix.sql');
  if (!fs.existsSync(sqlFilePath)) {
    return {
      attempted: true,
      executed: false,
      message: 'Migration file src/db/production_supabase_fix.sql not found on server.',
      timestamp
    };
  }

  const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

  let client: pg.Client | null = null;
  try {
    client = new pg.Client({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });

    await client.connect();
    console.log('[Database Migration] Connected to PostgreSQL instance. Executing production_supabase_fix.sql...');

    await client.query(sqlContent);
    await client.query("NOTIFY pgrst, 'reload schema';");

    console.log('[Database Migration] Schema migration successfully applied and PostgREST notified.');
    return {
      attempted: true,
      executed: true,
      message: 'Migration executed successfully against PostgreSQL database.',
      timestamp
    };
  } catch (err: any) {
    console.error('[Database Migration Error]:', err.message);
    return {
      attempted: true,
      executed: false,
      message: `Failed to execute migration: ${err.message}`,
      error: err.message,
      timestamp
    };
  } finally {
    if (client) {
      try {
        await client.end();
      } catch {
        // ignore closing error
      }
    }
  }
}
