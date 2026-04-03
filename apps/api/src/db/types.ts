import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface Database {
  shows: ShowTable;
  admins: AdminTable;
  admin_credentials: AdminCredentialTable;
  sessions: SessionTable;
  audit_events: AuditEventTable;
}

export interface ShowTable {
  id: Generated<string>;
  title: string;
  description: string;
  opening_date: string | null;
  closing_date: string | null;
  theater: string;
  image_url: string | null;
  composer: string | null;
  lyricist: string | null;
  book_writer: string | null;
  director: string | null;
  music_director: string | null;
  choreographer: string | null;
  is_currently_running: ColumnType<boolean, boolean | undefined, boolean>;
  category: string;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export type ShowRow = Selectable<ShowTable>;
export type InsertShow = Insertable<ShowTable>;
export type UpdateShow = Updateable<ShowTable>;

export interface AdminTable {
  id: Generated<string>;
  email: string;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export type AdminRow = Selectable<AdminTable>;
export type InsertAdmin = Insertable<AdminTable>;

export interface AdminCredentialTable {
  admin_id: string;
  password_hash: string;
  updated_at: Generated<string>;
}

export type AdminCredentialRow = Selectable<AdminCredentialTable>;

export interface SessionTable {
  id: Generated<string>;
  admin_id: string;
  expires_at: string;
  created_at: Generated<string>;
}

export type SessionRow = Selectable<SessionTable>;
export type InsertSession = Insertable<SessionTable>;

export interface AuditEventTable {
  id: Generated<string>;
  timestamp: Generated<string>;
  actor_type: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export type AuditEventRow = Selectable<AuditEventTable>;
export type InsertAuditEvent = Insertable<AuditEventTable>;
