import type { Kysely, Transaction } from 'kysely';
import type { Database } from './db/types.js';

export interface AuditEventInput {
  actor_type: 'admin' | 'system';
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

/**
 * Log an audit event to the audit_events table.
 * Can be called inside or outside a transaction.
 */
export async function logAuditEvent(
  db: Kysely<Database> | Transaction<Database>,
  event: AuditEventInput
): Promise<void> {
  await db
    .insertInto('audit_events')
    .values({
      actor_type: event.actor_type,
      actor_id: event.actor_id,
      action: event.action,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      before: event.before ?? null,
      after: event.after ?? null,
    })
    .execute();
}
