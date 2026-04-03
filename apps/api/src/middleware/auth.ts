import type { Kysely } from 'kysely';
import { SESSION_COOKIE_NAME } from '@curtaincall/shared';
import type { Database } from '../db/types.js';
import type { RequestContext, RouteHandler } from '../router.js';

/**
 * Extract session ID from cookie header.
 */
export function extractSessionId(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, ...rest] = cookie.split('=');
    if (name?.trim() === SESSION_COOKIE_NAME) {
      const value = rest.join('=').trim();
      return value || null;
    }
  }

  return null;
}

/**
 * Validate a session: check it exists in DB and is not expired.
 * Returns the admin ID if valid, null otherwise.
 */
export async function validateSession(
  db: Kysely<Database>,
  sessionId: string
): Promise<string | null> {
  const session = await db
    .selectFrom('sessions')
    .where('id', '=', sessionId)
    .where('expires_at', '>', new Date().toISOString())
    .selectAll()
    .executeTakeFirst();

  if (!session) return null;

  return session.admin_id;
}

/**
 * Middleware wrapper that requires a valid admin session.
 * Adds adminId and sessionId to the request context.
 */
export function requireAdmin(
  db: Kysely<Database>,
  handler: (context: RequestContext & { adminId: string; sessionId: string }) => Promise<Response>
): RouteHandler {
  return async (context: RequestContext): Promise<Response> => {
    const sessionId = extractSessionId(context.headers['cookie']);

    if (!sessionId) {
      return Response.json(
        { error: 'unauthorized', message: 'Authentication required', status: 401 },
        { status: 401 }
      );
    }

    const adminId = await validateSession(db, sessionId);

    if (!adminId) {
      return Response.json(
        { error: 'unauthorized', message: 'Session expired or invalid', status: 401 },
        { status: 401 }
      );
    }

    return handler({ ...context, adminId, sessionId });
  };
}
