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
        background: '#FFF7ED',
        color: '#9A3412',
        padding: '7px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontSize: '12.5px',
        fontWeight: 500,
        borderBottom: '1px solid #FED7AA',
        letterSpacing: '0.01em',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 9999, background: '#F08300', display: 'inline-block' }} />
      <span>
        <strong>DEMO MODE</strong> — Sample data only. Nothing here is real or saved.
      </span>
    </div>
  );
}
