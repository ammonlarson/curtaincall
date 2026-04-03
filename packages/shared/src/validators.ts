import {
  SHOW_CATEGORIES,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_THEATER_LENGTH,
  MAX_PERSON_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from './constants.js';
import type { CreateShowInput, UpdateShowInput, CreateAdminInput, LoginInput, ChangePasswordInput, ShowCategory } from './types.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function ok(): ValidationResult {
  return { valid: true, errors: [] };
}

function fail(errors: string[]): ValidationResult {
  return { valid: false, errors };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidDate(value: string): boolean {
  const date = new Date(value);
  return !isNaN(date.getTime());
}

function isValidCategory(value: unknown): value is ShowCategory {
  return typeof value === 'string' && (SHOW_CATEGORIES as readonly string[]).includes(value);
}

function isValidEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value) && value.length <= MAX_EMAIL_LENGTH;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function validateOptionalString(value: unknown, fieldName: string, maxLength: number, errors: string[]): void {
  if (value !== undefined && value !== null) {
    if (typeof value !== 'string') {
      errors.push(`${fieldName} must be a string`);
    } else if (value.length > maxLength) {
      errors.push(`${fieldName} must be at most ${maxLength} characters`);
    }
  }
}

function validateOptionalDate(value: unknown, fieldName: string, errors: string[]): void {
  if (value !== undefined && value !== null) {
    if (typeof value !== 'string') {
      errors.push(`${fieldName} must be a string`);
    } else if (!isValidDate(value)) {
      errors.push(`${fieldName} must be a valid date`);
    }
  }
}

export function validateCreateShowInput(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object') {
    return fail(['Request body must be a JSON object']);
  }

  const errors: string[] = [];
  const data = input as Record<string, unknown>;

  if (!isNonEmptyString(data.title)) {
    errors.push('title is required');
  } else if (data.title.length > MAX_TITLE_LENGTH) {
    errors.push(`title must be at most ${MAX_TITLE_LENGTH} characters`);
  }

  if (!isNonEmptyString(data.description)) {
    errors.push('description is required');
  } else if (data.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`description must be at most ${MAX_DESCRIPTION_LENGTH} characters`);
  }

  if (!isNonEmptyString(data.theater)) {
    errors.push('theater is required');
  } else if (data.theater.length > MAX_THEATER_LENGTH) {
    errors.push(`theater must be at most ${MAX_THEATER_LENGTH} characters`);
  }

  if (!isValidCategory(data.category)) {
    errors.push(`category must be one of: ${SHOW_CATEGORIES.join(', ')}`);
  }

  validateOptionalDate(data.opening_date, 'opening_date', errors);
  validateOptionalDate(data.closing_date, 'closing_date', errors);

  if (data.image_url !== undefined && data.image_url !== null) {
    if (typeof data.image_url !== 'string' || !isValidUrl(data.image_url)) {
      errors.push('image_url must be a valid URL');
    }
  }

  validateOptionalString(data.composer, 'composer', MAX_PERSON_NAME_LENGTH, errors);
  validateOptionalString(data.lyricist, 'lyricist', MAX_PERSON_NAME_LENGTH, errors);
  validateOptionalString(data.book_writer, 'book_writer', MAX_PERSON_NAME_LENGTH, errors);
  validateOptionalString(data.director, 'director', MAX_PERSON_NAME_LENGTH, errors);
  validateOptionalString(data.music_director, 'music_director', MAX_PERSON_NAME_LENGTH, errors);
  validateOptionalString(data.choreographer, 'choreographer', MAX_PERSON_NAME_LENGTH, errors);

  if (data.is_currently_running !== undefined && typeof data.is_currently_running !== 'boolean') {
    errors.push('is_currently_running must be a boolean');
  }

  return errors.length > 0 ? fail(errors) : ok();
}

export function validateUpdateShowInput(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object') {
    return fail(['Request body must be a JSON object']);
  }

  const errors: string[] = [];
  const data = input as Record<string, unknown>;

  if (data.title !== undefined) {
    if (!isNonEmptyString(data.title)) {
      errors.push('title cannot be empty');
    } else if (data.title.length > MAX_TITLE_LENGTH) {
      errors.push(`title must be at most ${MAX_TITLE_LENGTH} characters`);
    }
  }

  if (data.description !== undefined) {
    if (!isNonEmptyString(data.description)) {
      errors.push('description cannot be empty');
    } else if (data.description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push(`description must be at most ${MAX_DESCRIPTION_LENGTH} characters`);
    }
  }

  if (data.theater !== undefined) {
    if (!isNonEmptyString(data.theater)) {
      errors.push('theater cannot be empty');
    } else if (data.theater.length > MAX_THEATER_LENGTH) {
      errors.push(`theater must be at most ${MAX_THEATER_LENGTH} characters`);
    }
  }

  if (data.category !== undefined && !isValidCategory(data.category)) {
    errors.push(`category must be one of: ${SHOW_CATEGORIES.join(', ')}`);
  }

  validateOptionalDate(data.opening_date, 'opening_date', errors);
  validateOptionalDate(data.closing_date, 'closing_date', errors);

  if (data.image_url !== undefined && data.image_url !== null) {
    if (typeof data.image_url !== 'string' || !isValidUrl(data.image_url)) {
      errors.push('image_url must be a valid URL');
    }
  }

  validateOptionalString(data.composer, 'composer', MAX_PERSON_NAME_LENGTH, errors);
  validateOptionalString(data.lyricist, 'lyricist', MAX_PERSON_NAME_LENGTH, errors);
  validateOptionalString(data.book_writer, 'book_writer', MAX_PERSON_NAME_LENGTH, errors);
  validateOptionalString(data.director, 'director', MAX_PERSON_NAME_LENGTH, errors);
  validateOptionalString(data.music_director, 'music_director', MAX_PERSON_NAME_LENGTH, errors);
  validateOptionalString(data.choreographer, 'choreographer', MAX_PERSON_NAME_LENGTH, errors);

  if (data.is_currently_running !== undefined && typeof data.is_currently_running !== 'boolean') {
    errors.push('is_currently_running must be a boolean');
  }

  return errors.length > 0 ? fail(errors) : ok();
}

export function validateCreateAdminInput(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object') {
    return fail(['Request body must be a JSON object']);
  }

  const errors: string[] = [];
  const data = input as Record<string, unknown>;

  if (!isNonEmptyString(data.email)) {
    errors.push('email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('email must be a valid email address');
  }

  if (!isNonEmptyString(data.password)) {
    errors.push('password is required');
  } else if (data.password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  } else if (data.password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`password must be at most ${MAX_PASSWORD_LENGTH} characters`);
  }

  return errors.length > 0 ? fail(errors) : ok();
}

export function validateLoginInput(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object') {
    return fail(['Request body must be a JSON object']);
  }

  const errors: string[] = [];
  const data = input as Record<string, unknown>;

  if (!isNonEmptyString(data.email)) {
    errors.push('email is required');
  }

  if (!isNonEmptyString(data.password)) {
    errors.push('password is required');
  }

  if (data.remember_me !== undefined && typeof data.remember_me !== 'boolean') {
    errors.push('remember_me must be a boolean');
  }

  return errors.length > 0 ? fail(errors) : ok();
}

export function validateChangePasswordInput(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object') {
    return fail(['Request body must be a JSON object']);
  }

  const errors: string[] = [];
  const data = input as Record<string, unknown>;

  if (!isNonEmptyString(data.current_password)) {
    errors.push('current_password is required');
  }

  if (!isNonEmptyString(data.new_password)) {
    errors.push('new_password is required');
  } else if (data.new_password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`new_password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  } else if (data.new_password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`new_password must be at most ${MAX_PASSWORD_LENGTH} characters`);
  }

  return errors.length > 0 ? fail(errors) : ok();
}

export function sanitizeShowInput<T extends Record<string, unknown>>(input: T): T {
  const sanitized = { ...input };
  for (const key of Object.keys(sanitized)) {
    const value = sanitized[key];
    if (typeof value === 'string') {
      (sanitized as Record<string, unknown>)[key] = value.trim();
    }
  }
  return sanitized;
}
