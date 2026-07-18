'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[MNEME] Global error:', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: '#FAFAFA',
    }}>
      {/* Logo mark */}
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 8,
        background: '#171717',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '2rem',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4" fill="#FF9100" />
          <circle cx="12" cy="12" r="8" stroke="#FF9100" strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
      </div>

      <h1 style={{
        fontSize: '1.5rem',
        fontWeight: 700,
        color: '#171717',
        margin: '0 0 0.5rem 0',
        letterSpacing: '-0.025em',
      }}>
        Something went wrong
      </h1>

      <p style={{
        fontSize: '0.9rem',
        color: '#6B7280',
        margin: '0 0 2rem 0',
        maxWidth: 400,
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        {process.env.NODE_ENV === 'development'
          ? error.message
          : 'An unexpected error occurred. Your data is safe — please try again.'}
      </p>

      {error.digest && (
        <p style={{
          fontSize: '0.75rem',
          color: '#9CA3AF',
          marginBottom: '1.5rem',
          fontFamily: 'monospace',
        }}>
          Error ID: {error.digest}
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={reset}
          style={{
            padding: '0.625rem 1.25rem',
            background: '#171717',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 6,
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.01em',
          }}
        >
          Try again
        </button>
        <a
          href="/"
          style={{
            padding: '0.625rem 1.25rem',
            background: 'transparent',
            color: '#171717',
            border: '1.5px solid #E5E7EB',
            borderRadius: 6,
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Back to home
        </a>
      </div>
    </div>
  );
}
