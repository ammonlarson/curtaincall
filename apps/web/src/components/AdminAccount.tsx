'use client';

import { useState, type FormEvent } from 'react';
import type { Admin } from '@curtaincall/shared';
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from '@curtaincall/shared';
import { theme } from '@/styles/theme';

interface AdminAccountProps {
  admin: Admin;
}

export default function AdminAccount({ admin }: AdminAccountProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (newPassword.length > MAX_PASSWORD_LENGTH) {
      setError(`Password must be at most ${MAX_PASSWORD_LENGTH} characters`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/admin/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to change password');
      }

      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
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

  return (
    <div style={{ maxWidth: '500px' }}>
      <h2 style={{
        fontFamily: theme.fonts.heading,
        fontSize: '1.5rem',
        color: theme.colors.text,
        marginBottom: '1.5rem',
      }}>
        Account
      </h2>

      {/* Account Info */}
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
          Account Details
        </h3>
        <div style={{ marginBottom: '0.75rem' }}>
          <span style={{ color: theme.colors.textMuted, fontSize: '0.8125rem' }}>Email</span>
          <div style={{ color: theme.colors.text, fontSize: '0.9375rem' }}>{admin.email}</div>
        </div>
        <div>
          <span style={{ color: theme.colors.textMuted, fontSize: '0.8125rem' }}>Account Created</span>
          <div style={{ color: theme.colors.text, fontSize: '0.9375rem' }}>
            {new Date(admin.created_at).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })}
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div style={{
        background: theme.colors.surface,
        borderRadius: '8px',
        border: `1px solid ${theme.colors.border}`,
        padding: '1.5rem',
      }}>
        <h3 style={{
          fontFamily: theme.fonts.heading,
          fontSize: '1.125rem',
          color: theme.colors.primary,
          marginBottom: '1rem',
        }}>
          Change Password
        </h3>

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
            {success}
          </div>
        )}

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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = theme.colors.primary}
              onBlur={(e) => e.target.style.borderColor = theme.colors.border}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={MAX_PASSWORD_LENGTH}
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = theme.colors.primary}
              onBlur={(e) => e.target.style.borderColor = theme.colors.border}
            />
            <span style={{ color: theme.colors.textMuted, fontSize: '0.75rem' }}>
              {MIN_PASSWORD_LENGTH}-{MAX_PASSWORD_LENGTH} characters
            </span>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              style={{
                ...inputStyle,
                borderColor: confirmPassword && confirmPassword !== newPassword
                  ? theme.colors.danger
                  : theme.colors.border,
              }}
              onFocus={(e) => e.target.style.borderColor = theme.colors.primary}
              onBlur={(e) => {
                e.target.style.borderColor = confirmPassword && confirmPassword !== newPassword
                  ? theme.colors.danger
                  : theme.colors.border;
              }}
            />
            {confirmPassword && confirmPassword !== newPassword && (
              <span style={{ color: theme.colors.danger, fontSize: '0.75rem' }}>Passwords do not match</span>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '0.75rem 1.5rem',
              background: submitting ? theme.colors.textMuted : theme.colors.primary,
              color: theme.colors.background,
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: theme.fonts.body,
            }}
          >
            {submitting ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
