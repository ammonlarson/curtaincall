'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AuditEvent } from '@curtaincall/shared';
import { apiUrl } from '@/api';
import { theme } from '@/styles/theme';

const ACTION_COLORS: Record<string, string> = {
  create: theme.colors.success,
  update: theme.colors.warning,
  delete: theme.colors.danger,
  login: theme.colors.primary,
  logout: theme.colors.textMuted,
};

function getActionColor(action: string): string {
  for (const [key, color] of Object.entries(ACTION_COLORS)) {
    if (action.toLowerCase().includes(key)) return color;
  }
  return theme.colors.textMuted;
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function renderDiff(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  if (!before && !after) return null;
  const allKeys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);

  const changes: { key: string; from: unknown; to: unknown }[] = [];
  for (const key of allKeys) {
    if (key === 'updated_at' || key === 'created_at') continue;
    const bVal = before?.[key];
    const aVal = after?.[key];
    if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
      changes.push({ key, from: bVal, to: aVal });
    }
  }

  if (changes.length === 0) return null;

  return (
    <div style={{
      marginTop: '0.5rem',
      background: theme.colors.background,
      borderRadius: '4px',
      padding: '0.5rem 0.75rem',
      fontSize: '0.75rem',
      fontFamily: 'monospace',
    }}>
      {changes.map(({ key, from, to }) => (
        <div key={key} style={{ marginBottom: '0.25rem' }}>
          <span style={{ color: theme.colors.textMuted }}>{key}: </span>
          {from !== undefined && (
            <span style={{ color: theme.colors.danger, textDecoration: 'line-through' }}>
              {JSON.stringify(from)}
            </span>
          )}
          {from !== undefined && to !== undefined && <span style={{ color: theme.colors.textMuted }}> → </span>}
          {to !== undefined && (
            <span style={{ color: theme.colors.success }}>
              {JSON.stringify(to)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AdminAuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '30' });
      if (filterAction) params.set('action', filterAction);
      if (filterEntity) params.set('entity_type', filterEntity);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);

      const res = await fetch(apiUrl(`/admin/audit-events?${params}`), { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch audit events');
      const data = await res.json();
      if (Array.isArray(data)) {
        setEvents(data);
        setTotalPages(1);
      } else {
        setEvents(data.data || []);
        setTotalPages(data.total_pages || 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterEntity, dateFrom, dateTo]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const selectStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    background: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '6px',
    color: theme.colors.text,
    fontSize: '0.8125rem',
    outline: 'none',
  };

  return (
    <div>
      <h2 style={{
        fontFamily: theme.fonts.heading,
        fontSize: '1.5rem',
        color: theme.colors.text,
        marginBottom: '1.25rem',
      }}>
        Audit Log
      </h2>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }} style={selectStyle}>
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
        </select>
        <select value={filterEntity} onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }} style={selectStyle}>
          <option value="">All Entities</option>
          <option value="show">Show</option>
          <option value="admin">Admin</option>
          <option value="session">Session</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          placeholder="From"
          style={selectStyle}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          placeholder="To"
          style={selectStyle}
        />
        {(filterAction || filterEntity || dateFrom || dateTo) && (
          <button
            onClick={() => { setFilterAction(''); setFilterEntity(''); setDateFrom(''); setDateTo(''); setPage(1); }}
            style={{
              padding: '0.5rem 0.75rem',
              background: 'transparent',
              color: theme.colors.textMuted,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '6px',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              fontFamily: theme.fonts.body,
            }}
          >
            Clear Filters
          </button>
        )}
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
        <div style={{ textAlign: 'center', padding: '3rem', color: theme.colors.textMuted }}>Loading audit events...</div>
      ) : events.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: theme.colors.textMuted,
          background: theme.colors.surface,
          borderRadius: '8px',
          border: `1px solid ${theme.colors.border}`,
        }}>
          No audit events found.
        </div>
      ) : (
        <>
          {/* Timeline */}
          <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
            {/* Vertical line */}
            <div style={{
              position: 'absolute',
              left: '7px',
              top: 0,
              bottom: 0,
              width: '2px',
              background: theme.colors.border,
            }} />

            {events.map((event) => {
              const color = getActionColor(event.action);
              const isExpanded = expandedId === event.id;
              const hasDiff = event.before || event.after;
              return (
                <div
                  key={event.id}
                  style={{
                    position: 'relative',
                    marginBottom: '0.75rem',
                    cursor: hasDiff ? 'pointer' : 'default',
                  }}
                  onClick={() => hasDiff && setExpandedId(isExpanded ? null : event.id)}
                >
                  {/* Dot */}
                  <div style={{
                    position: 'absolute',
                    left: '-1.5rem',
                    top: '0.75rem',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: color,
                    border: `2px solid ${theme.colors.background}`,
                  }} />

                  <div style={{
                    background: theme.colors.surface,
                    borderRadius: '8px',
                    border: `1px solid ${theme.colors.border}`,
                    padding: '0.75rem 1rem',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: `${color}20`,
                          color,
                          textTransform: 'uppercase',
                        }}>
                          {event.action}
                        </span>
                        <span style={{ fontSize: '0.875rem', color: theme.colors.text }}>
                          {event.entity_type}
                          {event.entity_id && (
                            <span style={{ color: theme.colors.textMuted }}> #{event.entity_id.slice(0, 8)}</span>
                          )}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', color: theme.colors.textMuted }}>
                          {event.actor_type}:{event.actor_id.slice(0, 8)}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: theme.colors.textMuted }}>
                          {formatTimestamp(event.timestamp)}
                        </span>
                        {hasDiff && (
                          <span style={{ fontSize: '0.75rem', color: theme.colors.primary }}>
                            {isExpanded ? '\u25B2' : '\u25BC'}
                          </span>
                        )}
                      </div>
                    </div>

                    {isExpanded && renderDiff(event.before, event.after)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.375rem',
              marginTop: '1.5rem',
            }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
