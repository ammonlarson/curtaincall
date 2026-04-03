'use client';

import { useState, type FormEvent } from 'react';
import type { ShowCategory } from '@curtaincall/shared';
import {
  SHOW_CATEGORIES,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_THEATER_LENGTH,
  MAX_PERSON_NAME_LENGTH,
} from '@curtaincall/shared';
import ImageUpload from './ImageUpload';
import { theme } from '@/styles/theme';

interface AdminAddShowProps {
  onShowCreated: () => void;
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

const initialFormData: FormData = {
  title: '',
  description: '',
  theater: '',
  opening_date: '',
  closing_date: '',
  composer: '',
  lyricist: '',
  book_writer: '',
  director: '',
  music_director: '',
  choreographer: '',
  category: 'musical',
  is_currently_running: true,
  image_url: '',
};

export default function AdminAddShow({ onShowCreated }: AdminAddShowProps) {
  const [form, setForm] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

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
    };

    if (form.opening_date) body.opening_date = form.opening_date;
    if (form.closing_date) body.closing_date = form.closing_date;
    if (form.image_url) body.image_url = form.image_url;
    if (form.composer.trim()) body.composer = form.composer.trim();
    if (form.lyricist.trim()) body.lyricist = form.lyricist.trim();
    if (form.book_writer.trim()) body.book_writer = form.book_writer.trim();
    if (form.director.trim()) body.director = form.director.trim();
    if (form.music_director.trim()) body.music_director = form.music_director.trim();
    if (form.choreographer.trim()) body.choreographer = form.choreographer.trim();

    try {
      const res = await fetch('/admin/shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to create show');
      }

      setSuccess(true);
      setForm(initialFormData);
      setTimeout(() => {
        setSuccess(false);
        onShowCreated();
      }, 1500);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create show');
    } finally {
      setSubmitting(false);
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
      <h2 style={{
        fontFamily: theme.fonts.heading,
        fontSize: '1.5rem',
        color: theme.colors.text,
        marginBottom: '1.5rem',
      }}>
        Add New Show
      </h2>

      {success && (
        <div style={{
          background: `${theme.colors.success}20`,
          border: `1px solid ${theme.colors.success}50`,
          color: theme.colors.success,
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.875rem',
        }}>
          Show created successfully!
        </div>
      )}

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
              placeholder="e.g., Hamilton"
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
              placeholder="A brief description of the show..."
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
                placeholder="e.g., Richard Rodgers Theatre"
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
            transition: 'background 0.2s',
            fontFamily: theme.fonts.body,
          }}
          onMouseEnter={(e) => {
            if (!submitting) (e.target as HTMLButtonElement).style.background = theme.colors.primaryHover;
          }}
          onMouseLeave={(e) => {
            if (!submitting) (e.target as HTMLButtonElement).style.background = theme.colors.primary;
          }}
        >
          {submitting ? 'Creating...' : 'Create Show'}
        </button>
      </form>
    </div>
  );
}
