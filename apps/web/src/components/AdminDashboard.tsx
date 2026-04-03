'use client';

import { useState } from 'react';
import type { Admin } from '@curtaincall/shared';
import AdminShows from './AdminShows';
import AdminAddShow from './AdminAddShow';
import AdminBulkImport from './AdminBulkImport';
import AdminAuditLog from './AdminAuditLog';
import AdminAccount from './AdminAccount';
import { theme } from '@/styles/theme';

type Tab = 'shows' | 'add' | 'bulk' | 'audit' | 'account';

interface AdminDashboardProps {
  admin: Admin;
  onLogout: () => void;
}

const tabs: { key: Tab; label: string }[] = [
  { key: 'shows', label: 'Shows' },
  { key: 'add', label: 'Add Show' },
  { key: 'bulk', label: 'Bulk Import' },
  { key: 'audit', label: 'Audit Log' },
  { key: 'account', label: 'Account' },
];

export default function AdminDashboard({ admin, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('shows');

  function renderContent() {
    switch (activeTab) {
      case 'shows':
        return <AdminShows />;
      case 'add':
        return <AdminAddShow onShowCreated={() => setActiveTab('shows')} />;
      case 'bulk':
        return <AdminBulkImport onImportComplete={() => setActiveTab('shows')} />;
      case 'audit':
        return <AdminAuditLog />;
      case 'account':
        return <AdminAccount admin={admin} />;
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: theme.colors.background }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1.5rem',
        background: theme.colors.surface,
        borderBottom: `1px solid ${theme.colors.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h1 style={{
            fontFamily: theme.fonts.heading,
            fontSize: '1.25rem',
            color: theme.colors.primary,
            letterSpacing: '0.02em',
          }}>
            Curtain Call
          </h1>

          <nav style={{ display: 'flex', gap: '0.25rem' }}>
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: '0.5rem 1rem',
                  background: activeTab === key ? `${theme.colors.primary}20` : 'transparent',
                  color: activeTab === key ? theme.colors.primary : theme.colors.textMuted,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: activeTab === key ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: theme.fonts.body,
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== key) {
                    (e.target as HTMLButtonElement).style.background = theme.colors.surfaceHover;
                    (e.target as HTMLButtonElement).style.color = theme.colors.text;
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== key) {
                    (e.target as HTMLButtonElement).style.background = 'transparent';
                    (e.target as HTMLButtonElement).style.color = theme.colors.textMuted;
                  }
                }}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: theme.colors.textMuted, fontSize: '0.8125rem' }}>
            {admin.email}
          </span>
          <button
            onClick={onLogout}
            style={{
              padding: '0.4rem 0.875rem',
              background: 'transparent',
              color: theme.colors.textMuted,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '6px',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: theme.fonts.body,
            }}
            onMouseEnter={(e) => {
              const btn = e.target as HTMLButtonElement;
              btn.style.borderColor = theme.colors.danger;
              btn.style.color = theme.colors.danger;
            }}
            onMouseLeave={(e) => {
              const btn = e.target as HTMLButtonElement;
              btn.style.borderColor = theme.colors.border;
              btn.style.color = theme.colors.textMuted;
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
        {renderContent()}
      </main>
    </div>
  );
}
