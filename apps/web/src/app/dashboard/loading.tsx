export default function DashboardLoading() {
  const pulse = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .skeleton {
      animation: pulse 1.5s ease-in-out infinite;
      background: #F3F4F6;
      border-radius: 6px;
    }
  `;

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      fontFamily: 'system-ui, ui-sans-serif, sans-serif',
      background: '#FAFAFA',
    }}>
      <style>{pulse}</style>

      {/* Sidebar skeleton */}
      <div style={{
        width: 240,
        background: '#171717',
        padding: '1.5rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        flexShrink: 0,
      }}>
        {/* Logo skeleton */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '2rem',
          padding: '0 0.5rem',
        }}>
          <div className="skeleton" style={{ width: 28, height: 28, borderRadius: 6, background: '#2D2D2D' }} />
          <div className="skeleton" style={{ width: 64, height: 14, background: '#2D2D2D' }} />
        </div>

        {/* Nav item skeletons */}
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.625rem 0.75rem',
            borderRadius: 6,
          }}>
            <div className="skeleton" style={{ width: 16, height: 16, background: '#2D2D2D', flexShrink: 0 }} />
            <div className="skeleton" style={{ width: `${60 + i * 8}%`, height: 12, background: '#2D2D2D' }} />
          </div>
        ))}

        {/* Bottom vault info */}
        <div style={{ marginTop: 'auto', padding: '0.75rem', borderRadius: 8, background: '#1F1F1F' }}>
          <div className="skeleton" style={{ width: '80%', height: 10, background: '#2D2D2D', marginBottom: 6 }} />
          <div className="skeleton" style={{ width: '60%', height: 10, background: '#2D2D2D' }} />
        </div>
      </div>

      {/* Main content skeleton */}
      <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="skeleton" style={{ width: 200, height: 28 }} />
          <div className="skeleton" style={{ width: 120, height: 36, borderRadius: 6 }} />
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              padding: '1.25rem',
            }}>
              <div className="skeleton" style={{ width: '40%', height: 11, marginBottom: 12 }} />
              <div className="skeleton" style={{ width: '60%', height: 28 }} />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            gap: '2rem',
          }}>
            {['40%', '20%', '15%', '15%'].map((w, i) => (
              <div key={i} className="skeleton" style={{ width: w, height: 11 }} />
            ))}
          </div>

          {/* Table rows */}
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{
              padding: '1rem 1.25rem',
              borderBottom: i < 5 ? '1px solid #F3F4F6' : 'none',
              display: 'flex',
              gap: '2rem',
              alignItems: 'center',
            }}>
              {['40%', '20%', '15%', '15%'].map((w, j) => (
                <div key={j} className="skeleton" style={{ width: w, height: 13 }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
