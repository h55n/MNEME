'use client';

/**
 * DemoBanner — shown when the app is running in demo mode (no backend connected).
 * This banner is intentionally hard to miss so users don't mistake simulated data
 * for real production data.
 *
 * Only renders in development builds (DEMO_MODE is blocked in production).
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
        <strong>DEMO MODE</strong> — No backend connected. All data is simulated and not persisted.
        Set <code style={{ background: 'rgba(0,0,0,0.12)', padding: '1px 4px', borderRadius: 3 }}>
          NEXT_PUBLIC_API_URL
        </code> to connect a real MNEME API.
      </span>
    </div>
  );
}
