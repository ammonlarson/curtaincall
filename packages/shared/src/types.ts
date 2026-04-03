export interface Show {
  id: string;
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
  is_currently_running: boolean;
  category: ShowCategory;
  created_at: string;
  updated_at: string;
}

export type ShowCategory = 'musical' | 'play' | 'revival' | 'special';

export interface Admin {
  id: string;
  email: string;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor_type: 'admin' | 'system';
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export interface Session {
  id: string;
  admin_id: string;
  expires_at: string;
  created_at: string;
}

export interface CreateShowInput {
  title: string;
  description: string;
  opening_date?: string | null;
  closing_date?: string | null;
  theater: string;
  image_url?: string | null;
  composer?: string | null;
  lyricist?: string | null;
  book_writer?: string | null;
  director?: string | null;
  music_director?: string | null;
  choreographer?: string | null;
  is_currently_running?: boolean;
  category: ShowCategory;
}

export interface UpdateShowInput {
  title?: string;
  description?: string;
  opening_date?: string | null;
  closing_date?: string | null;
  theater?: string;
  image_url?: string | null;
  composer?: string | null;
  lyricist?: string | null;
  book_writer?: string | null;
  director?: string | null;
  music_director?: string | null;
  choreographer?: string | null;
  is_currently_running?: boolean;
  category?: ShowCategory;
}

export interface CreateAdminInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface ChangePasswordInput {
  current_password: string;
  new_password: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ApiError {
  error: string;
  message: string;
  status: number;
}
