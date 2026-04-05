import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';
import type { Database } from './types.js';
import { hashPassword } from '../auth/password.js';

const { Pool } = pg;

export async function runMigrations(externalDb?: Kysely<Database>) {
  let db: Kysely<Database>;
  let shouldDestroy = false;

  if (externalDb) {
    db = externalDb;
  } else {
    const pool = new Pool({
      host: process.env['DB_HOST'] ?? 'localhost',
      port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
      database: process.env['DB_NAME'] ?? 'curtaincall',
      user: process.env['DB_USER'] ?? 'postgres',
      password: process.env['DB_PASSWORD'] ?? '',
      ssl: process.env['DB_SSL'] === 'true'
        ? { rejectUnauthorized: false }
        : undefined,
    });
    db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool }),
    });
    shouldDestroy = true;
  }

  console.log('Running migrations...');

  // Enable pgcrypto for gen_random_uuid()
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`.execute(db);

  // Create shows table
  await sql`
    CREATE TABLE IF NOT EXISTS shows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      opening_date DATE,
      closing_date DATE,
      theater VARCHAR(200) NOT NULL,
      image_url TEXT,
      composer VARCHAR(200),
      lyricist VARCHAR(200),
      book_writer VARCHAR(200),
      director VARCHAR(200),
      music_director VARCHAR(200),
      choreographer VARCHAR(200),
      is_currently_running BOOLEAN NOT NULL DEFAULT true,
      category VARCHAR(20) NOT NULL CHECK (category IN ('musical', 'play', 'revival', 'special')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.execute(db);

  // Create updated_at trigger function
  await sql`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `.execute(db);

  await sql`
    DROP TRIGGER IF EXISTS shows_updated_at ON shows
  `.execute(db);
  await sql`
    CREATE TRIGGER shows_updated_at
      BEFORE UPDATE ON shows
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
  `.execute(db);

  // Create indexes on shows
  await sql`CREATE INDEX IF NOT EXISTS idx_shows_category ON shows(category)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_shows_is_currently_running ON shows(is_currently_running)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_shows_title ON shows(title)`.execute(db);

  // Create admins table
  await sql`
    CREATE TABLE IF NOT EXISTS admins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(254) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.execute(db);

  await sql`
    DROP TRIGGER IF EXISTS admins_updated_at ON admins
  `.execute(db);
  await sql`
    CREATE TRIGGER admins_updated_at
      BEFORE UPDATE ON admins
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
  `.execute(db);

  // Create admin_credentials table
  await sql`
    CREATE TABLE IF NOT EXISTS admin_credentials (
      admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
      password_hash TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.execute(db);

  await sql`
    DROP TRIGGER IF EXISTS admin_credentials_updated_at ON admin_credentials
  `.execute(db);
  await sql`
    CREATE TRIGGER admin_credentials_updated_at
      BEFORE UPDATE ON admin_credentials
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
  `.execute(db);

  // Create sessions table
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_admin_id ON sessions(admin_id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`.execute(db);

  // Create audit_events table
  await sql`
    CREATE TABLE IF NOT EXISTS audit_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
      actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('admin', 'system')),
      actor_id UUID NOT NULL,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id UUID NOT NULL,
      before JSONB,
      after JSONB
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp DESC)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor_id)`.execute(db);

  // Create immutability trigger for audit_events
  await sql`
    CREATE OR REPLACE FUNCTION prevent_audit_modification()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'audit_events table is immutable. Updates and deletes are not allowed.';
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql
  `.execute(db);

  await sql`
    DROP TRIGGER IF EXISTS audit_events_immutable_update ON audit_events
  `.execute(db);
  await sql`
    CREATE TRIGGER audit_events_immutable_update
      BEFORE UPDATE ON audit_events
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification()
  `.execute(db);

  await sql`
    DROP TRIGGER IF EXISTS audit_events_immutable_delete ON audit_events
  `.execute(db);
  await sql`
    CREATE TRIGGER audit_events_immutable_delete
      BEFORE DELETE ON audit_events
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification()
  `.execute(db);

  // Seed initial admin from env vars
  const seedEmail = process.env['SEED_ADMIN_EMAIL'];
  const seedPassword = process.env['SEED_ADMIN_PASSWORD'];

  if (seedEmail && seedPassword) {
    const existing = await db
      .selectFrom('admins')
      .where('email', '=', seedEmail)
      .selectAll()
      .executeTakeFirst();

    if (!existing) {
      console.log(`Creating seed admin: ${seedEmail}`);
      const passwordHash = await hashPassword(seedPassword);

      const admin = await db
        .insertInto('admins')
        .values({ email: seedEmail })
        .returningAll()
        .executeTakeFirstOrThrow();

      await db
        .insertInto('admin_credentials')
        .values({
          admin_id: admin.id,
          password_hash: passwordHash,
        })
        .execute();

      console.log(`Seed admin created with id: ${admin.id}`);
    } else {
      console.log(`Seed admin already exists: ${seedEmail}`);
    }
  }

  console.log('Migrations complete.');
  if (shouldDestroy) {
    await db.destroy();
  }
}

// CLI entrypoint
const isDirectRun = process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js');
if (isDirectRun) {
  runMigrations().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
