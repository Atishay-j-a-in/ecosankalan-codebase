import '../../styles/skeleton.css';

export default function DashboardSkeleton() {
  return (
    <main className="dashboard-main skeleton-page" aria-busy="true" aria-label="Loading dashboard">

      {/* ── Immersive Nature Hero Skeleton (matches current hero-immersive) ── */}
      <section className="hero-immersive">
        <div className="hero-immersive-bg">
          <div className="hero-glass-sun" />
        </div>

        <div className="hero-immersive-content">
          <div className="hero-immersive-top">
            <div className="hi-text-content">
              <div className="skel skel-line" style={{ width: 100, height: 12, opacity: 0.4, marginBottom: 10 }} />
              <div className="skel skel-line" style={{ width: 180, height: 32, opacity: 0.5, marginBottom: 10 }} />
              <div className="skel skel-line" style={{ width: '80%', height: 14, opacity: 0.35, marginBottom: 14 }} />
              <div className="skel skel-pill" style={{ width: 75, height: 22, opacity: 0.35 }} />
            </div>

            <div className="hi-score-ring" style={{ pointerEvents: 'none' }}>
              <div className="skel skel-circle" style={{ width: 44, height: 44, opacity: 0.35 }} />
            </div>
          </div>

          <div className="hero-immersive-stats">
            {[1, 2, 3].map((i) => (
              <div className="hi-stat-card" key={i} style={{ gap: 6 }}>
                <div className="skel skel-circle" style={{ width: 24, height: 24, opacity: 0.35, marginBottom: 4 }} />
                <div className="skel skel-line" style={{ width: 48, height: 18, opacity: 0.45 }} />
                <div className="skel skel-line" style={{ width: 36, height: 10, opacity: 0.3 }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Daily Fact Strip Skeleton ── */}
      <div className="daily-fact-strip" style={{ opacity: 0.85 }}>
        <div className="skel skel-circle" style={{ width: 24, height: 24 }} />
        <div className="skel skel-line" style={{ flex: 1, height: 14, margin: '0 8px' }} />
      </div>

      {/* ── Feed + Challenge Skeleton (matches feed-grid) ── */}
      <section className="feed-grid">
        <div className="feed-col">
          <div className="feed-header">
            <div className="skel skel-line" style={{ width: 180, height: 22 }} />
            <div className="skel skel-pill" style={{ width: 64, height: 28 }} />
          </div>
          <div className="activity-list">
            {[1, 2, 3].map((i) => (
              <div className="activity-item" key={i}>
                <div className="activity-left">
                  <div className="skel skel-circle" style={{ width: 44, height: 44 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="skel skel-line" style={{ width: 140, height: 14 }} />
                    <div className="skel skel-line" style={{ width: 90, height: 11 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <div className="skel skel-pill" style={{ width: 52, height: 18 }} />
                  <div className="skel skel-line" style={{ width: 44, height: 12 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="challenge-col">
          <div className="challenge-col-header">
            <div className="skel skel-line" style={{ width: 150, height: 22 }} />
            <div className="skel skel-line" style={{ width: 40, height: 14 }} />
          </div>
          <div className="challenge-card" style={{ overflow: 'hidden' }}>
            <div className="skel" style={{ width: '100%', height: 130 }} />
            <div className="challenge-content" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '1rem' }}>
              <div className="skel skel-line" style={{ width: '70%', height: 18 }} />
              <div className="skel skel-line" style={{ width: '90%', height: 12 }} />
              <div className="skel skel-line" style={{ width: '40%', height: 12 }} />
              <div className="skel skel-pill" style={{ width: '100%', height: 36, marginTop: 4 }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Weekly Challenges Skeleton ── */}
      <section className="weekly-challenges-section">
        <div className="feed-header">
          <div className="skel skel-line" style={{ width: 160, height: 22 }} />
          <div className="skel skel-pill" style={{ width: 64, height: 28 }} />
        </div>
        <div className="weekly-challenges-preview">
          {[1, 2].map((i) => (
            <div key={i} className="wc-preview-card" style={{ pointerEvents: 'none' }}>
              <div className="wc-preview-icon-wrap" style={{ background: 'var(--surface-container-high)' }}>
                <div className="skel skel-circle" style={{ width: 24, height: 24 }} />
              </div>
              <div className="wc-preview-info" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skel skel-line" style={{ width: '60%', height: 14 }} />
                <div className="skel skel-line" style={{ width: '80%', height: 8 }} />
              </div>
              <div className="skel skel-pill" style={{ width: 70, height: 22 }} />
            </div>
          ))}
        </div>
      </section>

    </main>
  );
}
