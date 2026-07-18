export default function RootLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FFFFFF',
        fontFamily: 'system-ui, ui-sans-serif, sans-serif',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        {/* Spinner */}
        <div style={{ position: 'relative', width: 40, height: 40 }}>
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            style={{ animation: 'spin 0.8s linear infinite' }}
          >
            <circle
              cx="20" cy="20" r="16"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="3"
            />
            <circle
              cx="20" cy="20" r="16"
              fill="none"
              stroke="#171717"
              strokeWidth="3"
              strokeDasharray="25 75"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <p style={{
          fontSize: '0.8125rem',
          color: '#9CA3AF',
          margin: 0,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          fontWeight: 500,
        }}>
          Loading
        </p>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
