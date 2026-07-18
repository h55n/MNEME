'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[MNEME Dashboard] Error:', error);
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '3rem 2rem',
      fontFamily: 'system-ui, ui-sans-serif, sans-serif',
    }}>
      {/* Warning icon */}
      <div style={{
        width: 56,
        height: 56,
        borderRadius: 8,
        background: '#FFF7ED',
        border: '1.5px solid #FED7AA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.5rem',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            stroke="#FF9100" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h2 style={{
        fontSize: '1.25rem',
        fontWeight: 700,
        color: '#171717',
        margin: '0 0 0.5rem 0',
        letterSpacing: '-0.02em',
      }}>
        Dashboard error
      </h2>

      <p style={{
        fontSize: '0.875rem',
        color: '#6B7280',
        margin: '0 0 1.5rem 0',
        maxWidth: 360,
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        {process.env.NODE_ENV === 'development'
          ? error.message
          : 'Failed to load this section. Your vault data is not affected.'}
      </p>

      {error.digest && (
        <p style={{
          fontSize: '0.7rem',
          color: '#9CA3AF',
          marginBottom: '1.25rem',
          fontFamily: 'ui-monospace, monospace',
          background: '#F9FAFB',
          padding: '0.25rem 0.5rem',
          borderRadius: 4,
          border: '1px solid #E5E7EB',
        }}>
          {error.digest}
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={reset}
          style={{
            padding: '0.5rem 1rem',
            background: '#171717',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 6,
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
        <a
          href="/dashboard"
          style={{
            padding: '0.5rem 1rem',
            background: 'transparent',
            color: '#374151',
            border: '1.5px solid #E5E7EB',
            borderRadius: 6,
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: 'pointer',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Reload dashboard
        </a>
      </div>
    </div>
  );
}
