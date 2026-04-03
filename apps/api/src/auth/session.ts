import type { Kysely } from 'kysely';
import { SESSION_TTL_HOURS, SESSION_TTL_REMEMBER_DAYS, SESSION_COOKIE_NAME } from '@curtaincall/shared';
import type { Database } from '../db/types.js';

/**
 * Create a new session for an admin.
 * Returns the session ID (UUID).
 */
export async function createSession(
  db: Kysely<Database>,
  adminId: string,
  rememberMe: boolean = false
): Promise<string> {
  const ttlMs = rememberMe
    ? SESSION_TTL_REMEMBER_DAYS * 24 * 60 * 60 * 1000
    : SESSION_TTL_HOURS * 60 * 60 * 1000;

  const expiresAt = new Date(Date.now() + ttlMs).toISOString();

  const session = await db
    .insertInto('sessions')
    .values({
      admin_id: adminId,
      expires_at: expiresAt,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return session.id;
}

/**
 * Delete a session by ID.
 */
export async function deleteSession(
  db: Kysely<Database>,
  sessionId: string
): Promise<void> {
  await db
    .deleteFrom('sessions')
    .where('id', '=', sessionId)
    .execute();
}

/**
 * Clean up expired sessions.
 */
export async function cleanExpiredSessions(
  db: Kysely<Database>
): Promise<void> {
  await db
    .deleteFrom('sessions')
    .where('expires_at', '<', new Date().toISOString())
    .execute();
}

/**
 * Build a Set-Cookie header for a session.
 */
export function buildSessionCookie(
  sessionId: string,
  rememberMe: boolean = false
): string {
  const maxAge = rememberMe
    ? SESSION_TTL_REMEMBER_DAYS * 24 * 60 * 60
    : SESSION_TTL_HOURS * 60 * 60;

  const secure = process.env['NODE_ENV'] === 'production' ? '; Secure' : '';

  return `${SESSION_COOKIE_NAME}=${sessionId}; HttpOnly${secure}; SameSite=Strict; Path=/admin; Max-Age=${maxAge}`;
}

/**
 * Build a Set-Cookie header that clears the session cookie.
 */
export function buildClearSessionCookie(): string {
  const secure = process.env['NODE_ENV'] === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=; HttpOnly${secure}; SameSite=Strict; Path=/admin; Max-Age=0`;
}
