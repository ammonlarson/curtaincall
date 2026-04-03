import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { Database } from './types.js';

const { Pool } = pg;

let dbInstance: Kysely<Database> | null = null;
let dbPassword: string | null = null;

async function resolvePassword(): Promise<string> {
  if (dbPassword) return dbPassword;

  // Check for direct env var first (local dev)
  if (process.env['DB_PASSWORD']) {
    dbPassword = process.env['DB_PASSWORD'];
    return dbPassword;
  }

  // In production, fetch from AWS Secrets Manager
  const secretArn = process.env['DB_SECRET_ARN'];
  if (secretArn) {
    const { SecretsManagerClient, GetSecretValueCommand } = await import(
      '@aws-sdk/client-secrets-manager'
    );
    const client = new SecretsManagerClient({});
    const result = await client.send(
      new GetSecretValueCommand({ SecretId: secretArn })
    );
    if (result.SecretString) {
      const secret = JSON.parse(result.SecretString) as { password?: string };
      dbPassword = secret.password ?? '';
      return dbPassword;
    }
  }

  throw new Error('No database password configured. Set DB_PASSWORD or DB_SECRET_ARN.');
}

export async function getDb(): Promise<Kysely<Database>> {
  if (dbInstance) return dbInstance;

  const password = await resolvePassword();

  const pool = new Pool({
    host: process.env['DB_HOST'] ?? 'localhost',
    port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
    database: process.env['DB_NAME'] ?? 'curtaincall',
    user: process.env['DB_USER'] ?? 'curtaincall',
    password,
    max: 10,
    ssl: process.env['DB_SSL'] === 'true'
      ? { rejectUnauthorized: true }
      : undefined,
  });

  dbInstance = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  return dbInstance;
}

export async function closeDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.destroy();
    dbInstance = null;
  }
}
