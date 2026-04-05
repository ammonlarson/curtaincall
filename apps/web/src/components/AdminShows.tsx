'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Show } from '@curtaincall/shared';
import { useTableControls } from '@/hooks/useTableControls';
import AdminEditShow from './AdminEditShow';
import { apiUrl } from '@/api';
import { theme } from '@/styles/theme';

const CATEGORY_LABELS: Record<string, string> = {
  musical: 'Musical',
  play: 'Play',
  revival: 'Revival',
  special: 'Special',
};

export default function AdminShows() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const fetchShows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/admin/shows?per_page=500'), { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch shows');
      const data = await res.json();
      setShows(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shows');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchShows(); }, [fetchShows]);

  // Apply category and status filters before passing to table controls
  const filteredByDropdowns = shows.filter((show) => {
    if (filterCategory && show.category !== filterCategory) return false;
    if (filterStatus === 'running' && !show.is_currently_running) return false;
    if (filterStatus === 'closed' && show.is_currently_running) return false;
    return true;
  });

  const {
    searchText, setSearchText, sortField, sortDirection, toggleSort,
    page, setPage, paginatedItems, totalPages,
  } = useTableControls(filteredByDropdowns, {
    searchFields: ['title', 'theater', 'category'],
    defaultSort: 'title',
    pageSize: 20,
  });

  async function handleDelete(id: string) {
    try {
      const res = await fetch(apiUrl(`/admin/shows/${id}`), {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete show');
      setShows((prev) => prev.filter((s) => s.id !== id));
      setDeletingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  function renderSortIcon(field: keyof Show) {
    if (sortField !== field) return ' \u2195';
    return sortDirection === 'asc' ? ' \u2191' : ' \u2193';
  }

  const thStyle = (field: keyof Show): React.CSSProperties => ({
    padding: '0.625rem 0.75rem',
    textAlign: 'left',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: sortField === field ? theme.colors.primary : theme.colors.textMuted,
    borderBottom: `1px solid ${theme.colors.border}`,
    whiteSpace: 'nowrap',
    userSelect: 'none',
  });

  const tdStyle: React.CSSProperties = {
    padding: '0.625rem 0.75rem',
    borderBottom: `1px solid ${theme.colors.border}`,
    fontSize: '0.875rem',
    verticalAlign: 'middle',
  };

  if (editingShow) {
    return (
      <AdminEditShow
        show={editingShow}
        onSave={() => { setEditingShow(null); fetchShows(); }}
        onCancel={() => setEditingShow(null)}
        onDelete={() => { setEditingShow(null); fetchShows(); }}
      />
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <h2 style={{
          fontFamily: theme.fonts.heading,
          fontSize: '1.5rem',
          color: theme.colors.text,
        }}>
          Shows
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search shows..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              background: theme.colors.surface,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '6px',
              color: theme.colors.text,
              fontSize: '0.875rem',
              width: '220px',
              outline: 'none',
            }}
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              background: theme.colors.surface,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '6px',
              color: theme.colors.text,
              fontSize: '0.875rem',
              outline: 'none',
            }}
          >
            <option value="">All Categories</option>
            <option value="musical">Musical</option>
            <option value="play">Play</option>
            <option value="revival">Revival</option>
            <option value="special">Special</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              background: theme.colors.surface,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '6px',
              color: theme.colors.text,
              fontSize: '0.875rem',
              outline: 'none',
            }}
          >
            <option value="">All Status</option>
            <option value="running">Running</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{
          background: `${theme.colors.danger}20`,
          border: `1px solid ${theme.colors.danger}50`,
          color: theme.colors.danger,
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: theme.colors.textMuted }}>
          Loading shows...
        </div>
      ) : paginatedItems.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: theme.colors.textMuted,
          background: theme.colors.surface,
          borderRadius: '8px',
          border: `1px solid ${theme.colors.border}`,
        }}>
          {searchText || filterCategory || filterStatus ? 'No shows match your filters.' : 'No shows yet. Add your first show!'}
        </div>
      ) : (
        <>
          <div style={{
            background: theme.colors.surface,
            borderRadius: '8px',
            border: `1px solid ${theme.colors.border}`,
            overflow: 'hidden',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle('image_url' as keyof Show), cursor: 'default' }}>Image</th>
                    <th style={thStyle('title')} onClick={() => toggleSort('title')}>Title{renderSortIcon('title')}</th>
                    <th style={thStyle('theater')} onClick={() => toggleSort('theater')}>Theater{renderSortIcon('theater')}</th>
                    <th style={thStyle('category')} onClick={() => toggleSort('category')}>Category{renderSortIcon('category')}</th>
                    <th style={thStyle('is_currently_running')} onClick={() => toggleSort('is_currently_running')}>Status{renderSortIcon('is_currently_running')}</th>
                    <th style={thStyle('opening_date')} onClick={() => toggleSort('opening_date')}>Opens{renderSortIcon('opening_date')}</th>
                    <th style={thStyle('closing_date')} onClick={() => toggleSort('closing_date')}>Closes{renderSortIcon('closing_date')}</th>
                    <th style={{ ...thStyle('id' as keyof Show), cursor: 'default', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((show) => (
                    <tr
                      key={show.id}
                      style={{ transition: 'background 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = theme.colors.surfaceHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={tdStyle}>
                        {show.image_url ? (
                          <img
                            src={show.image_url}
                            alt={show.title}
                            style={{
                              width: '48px',
                              height: '36px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              background: theme.colors.background,
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '48px',
                            height: '36px',
                            borderRadius: '4px',
                            background: theme.colors.background,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: theme.colors.textMuted,
                            fontSize: '0.6875rem',
                          }}>
                            N/A
                          </div>
                        )}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 500, color: theme.colors.text }}>{show.title}</td>
                      <td style={tdStyle}>{show.theater}</td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          background: `${theme.colors.primary}20`,
                          color: theme.colors.primary,
                        }}>
                          {CATEGORY_LABELS[show.category] || show.category}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          background: show.is_currently_running
                            ? `${theme.colors.success}20`
                            : `${theme.colors.textMuted}20`,
                          color: show.is_currently_running
                            ? theme.colors.success
                            : theme.colors.textMuted,
                        }}>
                          {show.is_currently_running ? 'Running' : 'Closed'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                        {show.opening_date ? new Date(show.opening_date).toLocaleDateString() : '\u2014'}
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                        {show.closing_date ? new Date(show.closing_date).toLocaleDateString() : '\u2014'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {deletingId === show.id ? (
                          <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleDelete(show.id)}
                              style={{
                                padding: '0.3rem 0.625rem',
                                background: theme.colors.danger,
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontFamily: theme.fonts.body,
                              }}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              style={{
                                padding: '0.3rem 0.625rem',
                                background: 'transparent',
                                color: theme.colors.textMuted,
                                border: `1px solid ${theme.colors.border}`,
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontFamily: theme.fonts.body,
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => setEditingShow(show)}
                              style={{
                                padding: '0.3rem 0.625rem',
                                background: `${theme.colors.primary}20`,
                                color: theme.colors.primary,
                                border: `1px solid ${theme.colors.primary}40`,
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontFamily: theme.fonts.body,
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeletingId(show.id)}
                              style={{
                                padding: '0.3rem 0.625rem',
                                background: 'transparent',
                                color: theme.colors.textMuted,
                                border: `1px solid ${theme.colors.border}`,
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontFamily: theme.fonts.body,
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.375rem',
              marginTop: '1.25rem',
            }}>
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                style={{
                  padding: '0.4rem 0.75rem',
                  background: theme.colors.surface,
                  color: page <= 1 ? theme.colors.textMuted : theme.colors.text,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 ? 0.5 : 1,
                  fontFamily: theme.fonts.body,
                }}
              >
                Previous
              </button>
              <span style={{ color: theme.colors.textMuted, fontSize: '0.8125rem', padding: '0 0.5rem' }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                style={{
                  padding: '0.4rem 0.75rem',
                  background: theme.colors.surface,
                  color: page >= totalPages ? theme.colors.textMuted : theme.colors.text,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages ? 0.5 : 1,
                  fontFamily: theme.fonts.body,
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
