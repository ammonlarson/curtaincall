'use client';

import { useState, useEffect } from 'react';
import type { Admin } from '@curtaincall/shared';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import { apiUrl } from '@/api';
import { theme } from '@/styles/theme';

export default function AdminPage() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch(apiUrl('/admin/auth/me'), { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAdmin(data);
      } else {
        setAdmin(null);
      }
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }

  function handleLoginSuccess(adminData: Admin) {
    setAdmin(adminData);
  }

  async function handleLogout() {
    try {
      await fetch(apiUrl('/admin/auth/logout'), {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Logout even if request fails
    }
    setAdmin(null);
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: theme.colors.background,
      }}>
        <div style={{
          fontFamily: theme.fonts.heading,
          fontSize: '1.5rem',
          color: theme.colors.primary,
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>
          Curtain Call
        </div>
      </div>
    );
  }

  if (!admin) {
    return <AdminLogin onSuccess={handleLoginSuccess} />;
  }

  return <AdminDashboard admin={admin} onLogout={handleLogout} />;
}
