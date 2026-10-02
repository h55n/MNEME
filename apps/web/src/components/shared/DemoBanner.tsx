'use client';

/**
 * DemoBanner — shown when the app is running in demo mode (no backend connected).
 * This banner is intentionally hard to miss so users don't mistake simulated data
 * for real production data.
 *
 * Renders whenever demo mode is on (see lib/demo.ts).
 */
export function DemoBanner() {
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
        color: '#1c1917',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        fontWeight: 600,
        borderBottom: '2px solid #b45309',
        letterSpacing: '0.01em',
      }}
    >
      <span style={{ fontSize: '16px' }}>⚡</span>
      <span>
        <strong>DEMO MODE</strong> — Sample data only. Nothing here is real or saved.
      </span>
    </div>
  );
}
