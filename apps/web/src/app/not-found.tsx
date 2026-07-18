import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FAFAFA',
      fontFamily: 'system-ui, ui-sans-serif, sans-serif',
      padding: '2rem',
    }}>
      {/* Big 404 text */}
      <div style={{
        fontSize: '8rem',
        fontWeight: 900,
        color: '#171717',
        lineHeight: 1,
        letterSpacing: '-0.05em',
        marginBottom: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
      }}>
        4
        {/* Mneme logo dot as the zero */}
        <span style={{
          width: '5rem',
          height: '5rem',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}>
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="36" stroke="#E5E7EB" strokeWidth="4" />
            <circle cx="40" cy="40" r="18" fill="#FF9100" opacity="0.15" />
            <circle cx="40" cy="40" r="10" fill="#FF9100" />
          </svg>
        </span>
        4
      </div>

      <h1 style={{
        fontSize: '1.25rem',
        fontWeight: 700,
        color: '#171717',
        margin: '0 0 0.5rem 0',
        letterSpacing: '-0.02em',
      }}>
        Page not found
      </h1>

      <p style={{
        fontSize: '0.875rem',
        color: '#6B7280',
        margin: '0 0 2rem 0',
        maxWidth: 380,
        textAlign: 'center',
        lineHeight: 1.7,
      }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Your memories are still safe in your vault.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/dashboard"
          style={{
            padding: '0.625rem 1.25rem',
            background: '#171717',
            color: '#FFFFFF',
            borderRadius: 6,
            fontSize: '0.875rem',
            fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          Go to dashboard
        </Link>
        <Link
          href="/"
          style={{
            padding: '0.625rem 1.25rem',
            background: 'transparent',
            color: '#374151',
            border: '1.5px solid #E5E7EB',
            borderRadius: 6,
            fontSize: '0.875rem',
            fontWeight: 500,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Home
        </Link>
      </div>

      {/* Subtle grid decoration */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'radial-gradient(#E5E7EB 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        opacity: 0.4,
        zIndex: -1,
        pointerEvents: 'none',
      }} />
    </div>
  );
}
