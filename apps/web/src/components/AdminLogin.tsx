'use client';

import { useState, type FormEvent } from 'react';
import type { Admin } from '@curtaincall/shared';
import { theme } from '@/styles/theme';

interface AdminLoginProps {
  onSuccess: (admin: Admin) => void;
}

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, remember_me: rememberMe }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message || 'Invalid credentials');
        return;
      }

      const admin = await res.json();
      onSuccess(admin);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${theme.colors.background} 0%, #0f0f23 50%, ${theme.colors.burgundy}33 100%)`,
      padding: '1rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: theme.colors.surface,
        borderRadius: '12px',
        border: `1px solid ${theme.colors.border}`,
        padding: '2.5rem',
        boxShadow: `0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px ${theme.colors.primary}10`,
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontFamily: theme.fonts.heading,
            fontSize: '2rem',
            color: theme.colors.primary,
            marginBottom: '0.5rem',
            letterSpacing: '0.02em',
          }}>
            Curtain Call
          </h1>
          <p style={{
            color: theme.colors.textMuted,
            fontSize: '0.875rem',
          }}>
            Admin Panel
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: `${theme.colors.danger}20`,
              border: `1px solid ${theme.colors.danger}50`,
              color: theme.colors.danger,
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.8125rem',
              color: theme.colors.textMuted,
              marginBottom: '0.375rem',
              fontWeight: 500,
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: theme.colors.background,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '8px',
                color: theme.colors.text,
                fontSize: '0.9375rem',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = theme.colors.primary}
              onBlur={(e) => e.target.style.borderColor = theme.colors.border}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.8125rem',
              color: theme.colors.textMuted,
              marginBottom: '0.375rem',
              fontWeight: 500,
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: theme.colors.background,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '8px',
                color: theme.colors.text,
                fontSize: '0.9375rem',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = theme.colors.primary}
              onBlur={(e) => e.target.style.borderColor = theme.colors.border}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              color: theme.colors.textMuted,
            }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  accentColor: theme.colors.primary,
                  width: '16px',
                  height: '16px',
                }}
              />
              Remember me for 30 days
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: loading ? theme.colors.textMuted : theme.colors.primary,
              color: theme.colors.background,
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s, transform 0.1s',
              fontFamily: theme.fonts.body,
            }}
            onMouseEnter={(e) => {
              if (!loading) (e.target as HTMLButtonElement).style.background = theme.colors.primaryHover;
            }}
            onMouseLeave={(e) => {
              if (!loading) (e.target as HTMLButtonElement).style.background = theme.colors.primary;
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
