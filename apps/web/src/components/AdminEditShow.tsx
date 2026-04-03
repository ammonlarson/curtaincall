'use client';

import { useState, type FormEvent } from 'react';
import type { Show, ShowCategory } from '@curtaincall/shared';
import {
  SHOW_CATEGORIES,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_THEATER_LENGTH,
  MAX_PERSON_NAME_LENGTH,
} from '@curtaincall/shared';
import ImageUpload from './ImageUpload';
import { theme } from '@/styles/theme';

interface AdminEditShowProps {
  show: Show;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

interface FormData {
  title: string;
  description: string;
  theater: string;
  opening_date: string;
  closing_date: string;
  composer: string;
  lyricist: string;
  book_writer: string;
  director: string;
  music_director: string;
  choreographer: string;
  category: ShowCategory;
  is_currently_running: boolean;
  image_url: string;
}

export default function AdminEditShow({ show, onSave, onCancel, onDelete }: AdminEditShowProps) {
  const [form, setForm] = useState<FormData>({
    title: show.title,
    description: show.description,
    theater: show.theater,
    opening_date: show.opening_date ? show.opening_date.slice(0, 10) : '',
    closing_date: show.closing_date ? show.closing_date.slice(0, 10) : '',
    composer: show.composer || '',
    lyricist: show.lyricist || '',
    book_writer: show.book_writer || '',
    director: show.director || '',
    music_director: show.music_director || '',
    choreographer: show.choreographer || '',
    category: show.category,
    is_currently_running: show.is_currently_running,
    image_url: show.image_url || '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function updateField<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    else if (form.title.length > MAX_TITLE_LENGTH) errs.title = `Max ${MAX_TITLE_LENGTH} characters`;
    if (!form.description.trim()) errs.description = 'Description is required';
    else if (form.description.length > MAX_DESCRIPTION_LENGTH) errs.description = `Max ${MAX_DESCRIPTION_LENGTH} characters`;
    if (!form.theater.trim()) errs.theater = 'Theater is required';
    else if (form.theater.length > MAX_THEATER_LENGTH) errs.theater = `Max ${MAX_THEATER_LENGTH} characters`;

    const personFields: (keyof FormData)[] = ['composer', 'lyricist', 'book_writer', 'director', 'music_director', 'choreographer'];
    for (const field of personFields) {
      if ((form[field] as string).length > MAX_PERSON_NAME_LENGTH) {
        errs[field] = `Max ${MAX_PERSON_NAME_LENGTH} characters`;
      }
    }

    if (form.opening_date && form.closing_date && form.opening_date > form.closing_date) {
      errs.closing_date = 'Closing date must be after opening date';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError('');

    const body: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim(),
      theater: form.theater.trim(),
      category: form.category,
      is_currently_running: form.is_currently_running,
      opening_date: form.opening_date || null,
      closing_date: form.closing_date || null,
      image_url: form.image_url || null,
      composer: form.composer.trim() || null,
      lyricist: form.lyricist.trim() || null,
      book_writer: form.book_writer.trim() || null,
      director: form.director.trim() || null,
      music_director: form.music_director.trim() || null,
      choreographer: form.choreographer.trim() || null,
    };

    try {
      const res = await fetch(`/admin/shows/${show.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to update show');
      }

      onSave();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to update show');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/admin/shows/${show.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete show');
      onDelete();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    background: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '6px',
    color: theme.colors.text,
    fontSize: '0.875rem',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8125rem',
    color: theme.colors.textMuted,
    marginBottom: '0.375rem',
    fontWeight: 500,
  };

  const fieldGroupStyle: React.CSSProperties = {
    marginBottom: '1rem',
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
      }}>
        <h2 style={{
          fontFamily: theme.fonts.heading,
          fontSize: '1.5rem',
          color: theme.colors.text,
        }}>
          Edit Show
        </h2>
        <button
          onClick={onCancel}
          style={{
            padding: '0.5rem 1rem',
            background: 'transparent',
            color: theme.colors.textMuted,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '6px',
            fontSize: '0.8125rem',
            cursor: 'pointer',
            fontFamily: theme.fonts.body,
          }}
        >
          Back to Shows
        </button>
      </div>

      {submitError && (
        <div style={{
          background: `${theme.colors.danger}20`,
          border: `1px solid ${theme.colors.danger}50`,
          color: theme.colors.danger,
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.875rem',
        }}>
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{
          background: theme.colors.surface,
          borderRadius: '8px',
          border: `1px solid ${theme.colors.border}`,
          padding: '1.5rem',
          marginBottom: '1.25rem',
        }}>
          <h3 style={{
            fontFamily: theme.fonts.heading,
            fontSize: '1.125rem',
            color: theme.colors.primary,
            marginBottom: '1rem',
          }}>
            Basic Information
          </h3>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              style={{ ...inputStyle, borderColor: errors.title ? theme.colors.danger : theme.colors.border }}
            />
            {errors.title && <span style={{ color: theme.colors.danger, fontSize: '0.75rem' }}>{errors.title}</span>}
          </div>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={4}
              style={{
                ...inputStyle,
                resize: 'vertical',
                borderColor: errors.description ? theme.colors.danger : theme.colors.border,
              }}
            />
            {errors.description && <span style={{ color: theme.colors.danger, fontSize: '0.75rem' }}>{errors.description}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Theater *</label>
              <input
                type="text"
                value={form.theater}
                onChange={(e) => updateField('theater', e.target.value)}
                style={{ ...inputStyle, borderColor: errors.theater ? theme.colors.danger : theme.colors.border }}
              />
              {errors.theater && <span style={{ color: theme.colors.danger, fontSize: '0.75rem' }}>{errors.theater}</span>}
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Category *</label>
              <select
                value={form.category}
                onChange={(e) => updateField('category', e.target.value as ShowCategory)}
                style={inputStyle}
              >
                {SHOW_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Opening Date</label>
              <input
                type="date"
                value={form.opening_date}
                onChange={(e) => updateField('opening_date', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Closing Date</label>
              <input
                type="date"
                value={form.closing_date}
                onChange={(e) => updateField('closing_date', e.target.value)}
                style={{ ...inputStyle, borderColor: errors.closing_date ? theme.colors.danger : theme.colors.border }}
              />
              {errors.closing_date && <span style={{ color: theme.colors.danger, fontSize: '0.75rem' }}>{errors.closing_date}</span>}
            </div>
            <div style={{ ...fieldGroupStyle, display: 'flex', alignItems: 'flex-end', paddingBottom: '0.375rem' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: theme.colors.text,
              }}>
                <input
                  type="checkbox"
                  checked={form.is_currently_running}
                  onChange={(e) => updateField('is_currently_running', e.target.checked)}
                  style={{ accentColor: theme.colors.primary, width: '16px', height: '16px' }}
                />
                Currently Running
              </label>
            </div>
          </div>
        </div>

        <div style={{
          background: theme.colors.surface,
          borderRadius: '8px',
          border: `1px solid ${theme.colors.border}`,
          padding: '1.5rem',
          marginBottom: '1.25rem',
        }}>
          <h3 style={{
            fontFamily: theme.fonts.heading,
            fontSize: '1.125rem',
            color: theme.colors.primary,
            marginBottom: '1rem',
          }}>
            Creative Team
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {([
              ['composer', 'Composer'],
              ['lyricist', 'Lyricist'],
              ['book_writer', 'Book Writer'],
              ['director', 'Director'],
              ['music_director', 'Music Director'],
              ['choreographer', 'Choreographer'],
            ] as [keyof FormData, string][]).map(([field, label]) => (
              <div key={field} style={fieldGroupStyle}>
                <label style={labelStyle}>{label}</label>
                <input
                  type="text"
                  value={form[field] as string}
                  onChange={(e) => updateField(field, e.target.value)}
                  style={{ ...inputStyle, borderColor: errors[field] ? theme.colors.danger : theme.colors.border }}
                />
                {errors[field] && <span style={{ color: theme.colors.danger, fontSize: '0.75rem' }}>{errors[field]}</span>}
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: theme.colors.surface,
          borderRadius: '8px',
          border: `1px solid ${theme.colors.border}`,
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}>
          <h3 style={{
            fontFamily: theme.fonts.heading,
            fontSize: '1.125rem',
            color: theme.colors.primary,
            marginBottom: '1rem',
          }}>
            Show Image
          </h3>
          <ImageUpload
            currentUrl={form.image_url || null}
            onUpload={(url) => updateField('image_url', url)}
          />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.75rem 2rem',
                background: submitting ? theme.colors.textMuted : theme.colors.primary,
                color: theme.colors.background,
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: theme.fonts.body,
              }}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                color: theme.colors.textMuted,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: 'pointer',
                fontFamily: theme.fonts.body,
              }}
            >
              Cancel
            </button>
          </div>

          <div>
            {confirmDelete ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ color: theme.colors.danger, fontSize: '0.875rem' }}>Delete this show?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    padding: '0.5rem 1rem',
                    background: theme.colors.danger,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    fontFamily: theme.fonts.body,
                  }}
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'transparent',
                    color: theme.colors.textMuted,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    fontFamily: theme.fonts.body,
                  }}
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'transparent',
                  color: theme.colors.danger,
                  border: `1px solid ${theme.colors.danger}40`,
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  fontFamily: theme.fonts.body,
                }}
              >
                Delete Show
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
