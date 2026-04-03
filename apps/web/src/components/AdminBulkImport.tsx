'use client';

import { useState, useRef, type ChangeEvent } from 'react';
import type { CreateShowInput, ShowCategory } from '@curtaincall/shared';
import { SHOW_CATEGORIES, MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH } from '@curtaincall/shared';
import { theme } from '@/styles/theme';

interface AdminBulkImportProps {
  onImportComplete: () => void;
}

interface RowError {
  row: number;
  field: string;
  message: string;
}

interface ImportResult {
  created: number;
  failed: number;
  errors: { row: number; message: string }[];
}

export default function AdminBulkImport({ onImportComplete }: AdminBulkImportProps) {
  const [jsonText, setJsonText] = useState('');
  const [parsedShows, setParsedShows] = useState<CreateShowInput[]>([]);
  const [parseErrors, setParseErrors] = useState<string>('');
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<'input' | 'preview' | 'result'>('input');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function parseCSV(text: string): Record<string, string>[] {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
      rows.push(row);
    }
    return rows;
  }

  function csvRowsToShows(rows: Record<string, string>[]): CreateShowInput[] {
    return rows.map((row) => ({
      title: row.title || '',
      description: row.description || '',
      theater: row.theater || '',
      category: (SHOW_CATEGORIES.includes(row.category as ShowCategory) ? row.category : 'musical') as ShowCategory,
      opening_date: row.opening_date || undefined,
      closing_date: row.closing_date || undefined,
      composer: row.composer || undefined,
      lyricist: row.lyricist || undefined,
      book_writer: row.book_writer || undefined,
      director: row.director || undefined,
      music_director: row.music_director || undefined,
      choreographer: row.choreographer || undefined,
      is_currently_running: row.is_currently_running === 'true' || row.is_currently_running === '1',
      image_url: row.image_url || undefined,
    }));
  }

  function validateShows(shows: CreateShowInput[]): RowError[] {
    const errs: RowError[] = [];
    shows.forEach((show, idx) => {
      const row = idx + 1;
      if (!show.title?.trim()) errs.push({ row, field: 'title', message: 'Title is required' });
      else if (show.title.length > MAX_TITLE_LENGTH) errs.push({ row, field: 'title', message: `Title too long (max ${MAX_TITLE_LENGTH})` });
      if (!show.description?.trim()) errs.push({ row, field: 'description', message: 'Description is required' });
      else if (show.description.length > MAX_DESCRIPTION_LENGTH) errs.push({ row, field: 'description', message: `Description too long` });
      if (!show.theater?.trim()) errs.push({ row, field: 'theater', message: 'Theater is required' });
      if (!SHOW_CATEGORIES.includes(show.category)) errs.push({ row, field: 'category', message: `Invalid category: ${show.category}` });
    });
    return errs;
  }

  function handleParseJSON() {
    setParseErrors('');
    setRowErrors([]);
    try {
      const parsed = JSON.parse(jsonText);
      const shows: CreateShowInput[] = Array.isArray(parsed) ? parsed : [parsed];
      if (shows.length === 0) {
        setParseErrors('No shows found in JSON');
        return;
      }
      const errs = validateShows(shows);
      setRowErrors(errs);
      setParsedShows(shows);
      setStep('preview');
    } catch (err) {
      setParseErrors(`Invalid JSON: ${err instanceof Error ? err.message : 'Parse error'}`);
    }
  }

  function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (file.name.endsWith('.csv')) {
        const rows = parseCSV(text);
        if (rows.length === 0) {
          setParseErrors('No data found in CSV');
          return;
        }
        const shows = csvRowsToShows(rows);
        const errs = validateShows(shows);
        setRowErrors(errs);
        setParsedShows(shows);
        setStep('preview');
      } else {
        setJsonText(text);
        try {
          const parsed = JSON.parse(text);
          const shows: CreateShowInput[] = Array.isArray(parsed) ? parsed : [parsed];
          const errs = validateShows(shows);
          setRowErrors(errs);
          setParsedShows(shows);
          setStep('preview');
        } catch {
          setParseErrors('Invalid JSON file');
        }
      }
    };
    reader.readAsText(file);
    // Reset so same file can be re-selected
    e.target.value = '';
  }

  async function handleImport() {
    if (rowErrors.length > 0) return;
    setImporting(true);

    try {
      const res = await fetch('/admin/shows/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(parsedShows),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Bulk import failed');
      }

      const data = await res.json();
      setResult({
        created: data.created ?? parsedShows.length,
        failed: data.failed ?? 0,
        errors: data.errors ?? [],
      });
      setStep('result');
    } catch (err) {
      setParseErrors(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  function handleReset() {
    setJsonText('');
    setParsedShows([]);
    setParseErrors('');
    setRowErrors([]);
    setResult(null);
    setStep('input');
  }

  const tdStyle: React.CSSProperties = {
    padding: '0.5rem 0.625rem',
    borderBottom: `1px solid ${theme.colors.border}`,
    fontSize: '0.8125rem',
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  if (step === 'result' && result) {
    return (
      <div style={{ maxWidth: '700px' }}>
        <h2 style={{
          fontFamily: theme.fonts.heading,
          fontSize: '1.5rem',
          color: theme.colors.text,
          marginBottom: '1.5rem',
        }}>
          Import Results
        </h2>

        <div style={{
          background: theme.colors.surface,
          borderRadius: '8px',
          border: `1px solid ${theme.colors.border}`,
          padding: '2rem',
          textAlign: 'center',
          marginBottom: '1.5rem',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '3rem',
            marginBottom: '1.5rem',
          }}>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: theme.colors.success }}>{result.created}</div>
              <div style={{ fontSize: '0.875rem', color: theme.colors.textMuted }}>Created</div>
            </div>
            {result.failed > 0 && (
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: theme.colors.danger }}>{result.failed}</div>
                <div style={{ fontSize: '0.875rem', color: theme.colors.textMuted }}>Failed</div>
              </div>
            )}
          </div>

          {result.errors.length > 0 && (
            <div style={{
              background: `${theme.colors.danger}10`,
              border: `1px solid ${theme.colors.danger}30`,
              borderRadius: '6px',
              padding: '1rem',
              textAlign: 'left',
            }}>
              <div style={{ fontWeight: 600, color: theme.colors.danger, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                Errors:
              </div>
              {result.errors.map((err, i) => (
                <div key={i} style={{ fontSize: '0.8125rem', color: theme.colors.textMuted, marginBottom: '0.25rem' }}>
                  Row {err.row}: {err.message}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onImportComplete}
            style={{
              padding: '0.75rem 1.5rem',
              background: theme.colors.primary,
              color: theme.colors.background,
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: theme.fonts.body,
            }}
          >
            View Shows
          </button>
          <button
            onClick={handleReset}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              color: theme.colors.textMuted,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '8px',
              fontSize: '0.9375rem',
              cursor: 'pointer',
              fontFamily: theme.fonts.body,
            }}
          >
            Import More
          </button>
        </div>
      </div>
    );
  }

  if (step === 'preview') {
    const errorRows = new Set(rowErrors.map((e) => e.row));
    return (
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
        }}>
          <h2 style={{
            fontFamily: theme.fonts.heading,
            fontSize: '1.5rem',
            color: theme.colors.text,
          }}>
            Preview Import ({parsedShows.length} shows)
          </h2>
          <button
            onClick={handleReset}
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
            Back
          </button>
        </div>

        {rowErrors.length > 0 && (
          <div style={{
            background: `${theme.colors.danger}20`,
            border: `1px solid ${theme.colors.danger}50`,
            color: theme.colors.danger,
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}>
            <strong>{rowErrors.length} validation error(s) found.</strong> Fix them before importing.
            <ul style={{ margin: '0.5rem 0 0 1.5rem', fontSize: '0.8125rem' }}>
              {rowErrors.slice(0, 10).map((err, i) => (
                <li key={i}>Row {err.row}, {err.field}: {err.message}</li>
              ))}
              {rowErrors.length > 10 && <li>...and {rowErrors.length - 10} more</li>}
            </ul>
          </div>
        )}

        <div style={{
          background: theme.colors.surface,
          borderRadius: '8px',
          border: `1px solid ${theme.colors.border}`,
          overflow: 'hidden',
          marginBottom: '1.5rem',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...tdStyle, fontWeight: 600, color: theme.colors.textMuted, fontSize: '0.75rem', textTransform: 'uppercase' }}>#</th>
                  <th style={{ ...tdStyle, fontWeight: 600, color: theme.colors.textMuted, fontSize: '0.75rem', textTransform: 'uppercase' }}>Title</th>
                  <th style={{ ...tdStyle, fontWeight: 600, color: theme.colors.textMuted, fontSize: '0.75rem', textTransform: 'uppercase' }}>Theater</th>
                  <th style={{ ...tdStyle, fontWeight: 600, color: theme.colors.textMuted, fontSize: '0.75rem', textTransform: 'uppercase' }}>Category</th>
                  <th style={{ ...tdStyle, fontWeight: 600, color: theme.colors.textMuted, fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {parsedShows.map((show, idx) => (
                  <tr
                    key={idx}
                    style={{
                      background: errorRows.has(idx + 1) ? `${theme.colors.danger}10` : 'transparent',
                    }}
                  >
                    <td style={tdStyle}>{idx + 1}</td>
                    <td style={{ ...tdStyle, color: theme.colors.text, fontWeight: 500 }}>{show.title || '(empty)'}</td>
                    <td style={tdStyle}>{show.theater || '(empty)'}</td>
                    <td style={tdStyle}>{show.category}</td>
                    <td style={tdStyle}>{show.is_currently_running ? 'Running' : 'Closed'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <button
          onClick={handleImport}
          disabled={importing || rowErrors.length > 0}
          style={{
            padding: '0.75rem 2rem',
            background: (importing || rowErrors.length > 0) ? theme.colors.textMuted : theme.colors.primary,
            color: theme.colors.background,
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: (importing || rowErrors.length > 0) ? 'not-allowed' : 'pointer',
            fontFamily: theme.fonts.body,
          }}
        >
          {importing ? 'Importing...' : `Import ${parsedShows.length} Shows`}
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <h2 style={{
        fontFamily: theme.fonts.heading,
        fontSize: '1.5rem',
        color: theme.colors.text,
        marginBottom: '1.5rem',
      }}>
        Bulk Import Shows
      </h2>

      {parseErrors && (
        <div style={{
          background: `${theme.colors.danger}20`,
          border: `1px solid ${theme.colors.danger}50`,
          color: theme.colors.danger,
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.875rem',
        }}>
          {parseErrors}
        </div>
      )}

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
          marginBottom: '0.75rem',
        }}>
          Upload CSV File
        </h3>
        <p style={{ color: theme.colors.textMuted, fontSize: '0.8125rem', marginBottom: '1rem' }}>
          Upload a CSV with headers: title, description, theater, category, opening_date, closing_date, is_currently_running, composer, lyricist, book_writer, director, music_director, choreographer
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '0.625rem 1.25rem',
            background: `${theme.colors.primary}20`,
            color: theme.colors.primary,
            border: `1px solid ${theme.colors.primary}40`,
            borderRadius: '6px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            fontFamily: theme.fonts.body,
          }}
        >
          Choose CSV or JSON File
        </button>
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
          marginBottom: '0.75rem',
        }}>
          Paste JSON
        </h3>
        <p style={{ color: theme.colors.textMuted, fontSize: '0.8125rem', marginBottom: '1rem' }}>
          Paste a JSON array of show objects.
        </p>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={12}
          placeholder={`[\n  {\n    "title": "Hamilton",\n    "description": "The story of American founding father...",\n    "theater": "Richard Rodgers Theatre",\n    "category": "musical",\n    "is_currently_running": true\n  }\n]`}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '6px',
            color: theme.colors.text,
            fontSize: '0.8125rem',
            fontFamily: 'monospace',
            resize: 'vertical',
            outline: 'none',
          }}
        />
        <button
          onClick={handleParseJSON}
          disabled={!jsonText.trim()}
          style={{
            marginTop: '0.75rem',
            padding: '0.625rem 1.25rem',
            background: !jsonText.trim() ? theme.colors.textMuted : theme.colors.primary,
            color: theme.colors.background,
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: !jsonText.trim() ? 'not-allowed' : 'pointer',
            fontFamily: theme.fonts.body,
          }}
        >
          Parse & Preview
        </button>
      </div>
    </div>
  );
}
