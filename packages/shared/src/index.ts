export type {
  Show,
  ShowCategory,
  Admin,
  AuditEvent,
  Session,
  CreateShowInput,
  UpdateShowInput,
  CreateAdminInput,
  LoginInput,
  ChangePasswordInput,
  PaginatedResponse,
  ApiError,
} from './types.js';

export {
  SHOW_CATEGORIES,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_THEATER_LENGTH,
  MAX_PERSON_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  SESSION_TTL_HOURS,
  SESSION_TTL_REMEMBER_DAYS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  SESSION_COOKIE_NAME,
} from './constants.js';

export {
  validateCreateShowInput,
  validateUpdateShowInput,
  validateCreateAdminInput,
  validateLoginInput,
  validateChangePasswordInput,
  sanitizeShowInput,
} from './validators.js';

export type { ValidationResult } from './validators.js';
