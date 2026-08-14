import { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import BottomNav from '../components/common/BottomNav';
import { getWasteStats } from '../services/api';
import '../styles/impact.css';

import { useStats } from '../context/StatsContext';

const TIME_FILTERS = ['Today', 'This Week', 'This Month', 'All Time'];

// Constants for Donut Chart
const R = 15.9;
const CIRCUM_D = 2 * Math.PI * R;

const ACHIEVEMENT_TILES = [
  { icon: 'emoji_events',  label: 'Eco Starter',    desc: 'First log',   earned: true  },
  { icon: 'recycling',     label: 'Recycler',        desc: '10 logs',     earned: true  },
  { icon: 'local_florist', label: 'Green Thumb',     desc: '5 organic',   earned: true  },
  { icon: 'water_drop',    label: 'Water Saver',     desc: '100L saved',  earned: false },
  { icon: 'bolt',          label: 'Energy Wizard',   desc: '50kWh saved', earned: false },
  { icon: 'public',        label: 'Planet Guardian', desc: 'Top 1%',      earned: false },
];

export default function ImpactPage() {
  const [timeFilter, setTimeFilter] = useState('This Week');
  const [stats, setStats] = useState(null);
  
  const { fetchStatsForRange } = useStats();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadStats = async () => {
      setLoading(true);
      try {
        let range = 'week';
        if (timeFilter === 'This Month') range = 'month';
        if (timeFilter === 'All Time') range = 'all';
        
        const dataRes = await fetchStatsForRange(range);
        if (!active) return;
        
        let data = dataRes ? { ...dataRes } : {};
        // Basic local filtering for "Today"
        if (timeFilter === 'Today' && data.weeklyTrend) {
           const today = new Date().toLocaleDateString('en-CA');
           const todayData = data.weeklyTrend.filter(t => t.date && t.date.startsWith(today));
           
           data = {
              ...data,
              weeklyTrend: todayData,
              totalKg: todayData.reduce((sum, d) => sum + (d.kg || 0), 0),
           }
        }
        setStats(data);
      } catch (err) {
        console.error('Failed to load stats:', err);
        if (active) setStats(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadStats();
    return () => { active = false; };
  }, [timeFilter, fetchStatsForRange]);

  // Derived metrics
  const totalKg = stats?.totalKg || 0;
  const totalCo2 = stats?.totalCo2Saved || 0;
  const totalPoints = stats?.totalPointsEarned || 0;
  const bk = stats?.categoryBreakdown || {};

  // Score
  const ecoScore = Math.max(10, Math.min(100, Math.round((totalKg * 2) + (totalCo2 * 1.5) + (totalPoints * 0.1))));

  // Breakdown array
  const safeTotal = totalKg || 1;
  const BREAKDOWN = [
    { label: 'Plastic', pct: Math.round(((bk.plastic || 0) / safeTotal) * 100), color: 'var(--primary)', stroke: '#005127' },
    { label: 'Organic', pct: Math.round(((bk.organic || 0) / safeTotal) * 100), color: 'var(--secondary)', stroke: '#1b6d24' },
    { label: 'E-waste', pct: Math.round((((bk.eWaste || 0) + (bk.metal || 0)) / safeTotal) * 100), color: 'var(--tertiary)', stroke: '#782c39' },
    { label: 'Other',   pct: Math.round((((bk.other || 0) + (bk.paper || 0)) / safeTotal) * 100), color: 'var(--outline-variant)', stroke: '#bfc9bd' },
  ];

  let cumOffset = 0;
  const donutSegments = BREAKDOWN.map(b => {
    const dash = (b.pct / 100) * CIRCUM_D;
    const offset = -cumOffset;
    cumOffset += dash;
    return { ...b, dash, offset };
  });

  // Chart data
  const trend = stats?.weeklyTrend || [];
  const maxBar = Math.max(1, ...trend.map(t => t.kg || 0));

  return (
    <div className="impact-root">
      <Navbar />
      <main className="impact-main">

        <div className="impact-page-header">
          <span className="impact-eyebrow">Your Progress</span>
          <h1 className="impact-title">My Impact</h1>
        </div>

        <section className="impact-score-card">
          <div className="impact-score-left">
            <span className="impact-score-eyebrow">Eco-Score</span>
            <div className="impact-score-num-row">
              <span className="impact-score-num">{ecoScore}</span>
              <span className="impact-score-denom">/100</span>
            </div>
            <p className="impact-score-trend">
              <span className="material-symbols-outlined impact-trend-icon">trending_up</span>
              Keep logging to improve!
            </p>
          </div>
          <div className="impact-score-ring-wrap">
            <svg viewBox="0 0 100 100" className="impact-score-ring-svg">
              <circle cx="50" cy="50" r="45" fill="transparent"
                stroke="var(--surface-container-high)" strokeWidth="8" />
              <circle cx="50" cy="50" r="45" fill="transparent"
                stroke="var(--primary)" strokeWidth="8"
                strokeDasharray={`${(ecoScore / 100) * 282.7} 282.7`}
                strokeDashoffset="0"
                strokeLinecap="round"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
              />
            </svg>
            <div className="impact-score-ring-icon">
              <span className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}>spa</span>
            </div>
          </div>
          <div className="impact-score-bg-blob" />
        </section>

        <div className="impact-stats-row">
          {[
            { icon: 'delete_sweep', label: 'Total Logged',  value: `${totalKg.toLocaleString()} kg`, color: 'var(--secondary)' },
            { icon: 'cloud_done',   label: 'CO₂ Saved',     value: `${totalCo2.toFixed(1)} kg`, color: 'var(--primary)' },
            { icon: 'savings',      label: 'Eco Points',    value: totalPoints.toLocaleString(), color: 'var(--primary-container)' },
            { icon: 'recycling',    label: 'Recyclables',   value: `${((bk.plastic || 0) + (bk.paper || 0) + (bk.metal || 0) + (bk.eWaste || 0)).toFixed(1)} kg`, color: 'var(--tertiary)' },
          ].map(s => (
            <div className="impact-stat-tile" key={s.label}>
              <span className="material-symbols-outlined impact-stat-icon"
                style={{ color: s.color, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
              <span className="impact-stat-val">{s.value}</span>
              <span className="impact-stat-lbl">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="impact-time-chips">
          {TIME_FILTERS.map(f => (
            <button
              key={f}
              className={`impact-time-chip${timeFilter === f ? ' active' : ''}`}
              onClick={() => setTimeFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <section className="impact-card">
          <div className="impact-card-header-row">
            <div>
              <h2 className="impact-card-title">Waste Activity</h2>
              <p className="impact-card-sub">Distribution by material type (kg)</p>
            </div>
            <span className="material-symbols-outlined impact-card-icon-right">bar_chart</span>
          </div>
          
          <div className="impact-bar-chart">
            {trend.length > 0 ? trend.map((t, i) => {
              const dateLabel = timeFilter === 'This Week' || timeFilter === 'Today' 
                ? new Date(t.date || Date.now()).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
                : new Date(t.date || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              
              const p = t.plastic || 0;
              const o = t.organic || 0;
              const e = (t.eWaste || 0) + (t.metal || 0);
              const m = (t.other || 0) + (t.paper || 0);
              const total = p + o + e + m || 1; // avoid /0

              return (
                <div className="impact-bar-col-new" key={t.date + i}>
                  <div className="impact-bar-stack" style={{ height: `${(total / maxBar) * 100}%` }}>
                    <div style={{ height: `${(m/total)*100}%`, background: 'var(--outline-variant)', borderRadius: '2px 2px 0 0' }} />
                    <div style={{ height: `${(e/total)*100}%`, background: 'var(--tertiary-container)' }} />
                    <div style={{ height: `${(o/total)*100}%`, background: 'var(--secondary)' }} />
                    <div style={{ height: `${(p/total)*100}%`, background: 'rgba(0,81,39,0.8)', borderRadius: '0 0 2px 2px' }} />
                  </div>
                  <span className="impact-bar-lbl">{dateLabel}</span>
                </div>
              );
            }) : (
              <div style={{ width: '100%', textAlign: 'center', color: 'var(--outline)', padding: '2rem 0' }}>
                No data for this period
              </div>
            )}
          </div>
          <div className="impact-legend">
            {[
              { color: 'rgba(0,81,39,0.8)',           label: 'Plastic'  },
              { color: 'var(--secondary)',             label: 'Organic'  },
              { color: 'var(--tertiary-container)',    label: 'E-waste'  },
              { color: 'var(--outline-variant)',       label: 'Other'    },
            ].map(l => (
              <div className="impact-legend-item" key={l.label}>
                <span className="impact-legend-dot" style={{ background: l.color }} />
                <span>{l.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="impact-co2-card">
          <div className="impact-co2-top">
            <div className="impact-co2-icon-wrap">
              <span className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
            </div>
            <div className="impact-co2-badge">
              <span className="material-symbols-outlined">trending_up</span>
              Keep it up!
            </div>
          </div>
          <h3 className="impact-co2-num">{totalCo2.toLocaleString()} kg CO₂</h3>
          <p className="impact-co2-sub">Saved through conscious disposal</p>
          <div className="impact-co2-meta">
            <div>
              <span className="impact-co2-meta-label">Trees Equivalent</span>
              <span className="impact-co2-meta-val">{Math.round(totalCo2 / 21)} Mature Trees</span>
            </div>
            <div>
              <span className="impact-co2-meta-label">Impact Period</span>
              <span className="impact-co2-meta-val">{timeFilter}</span>
            </div>
          </div>
          <div className="impact-co2-blob" />
        </section>

        <div className="impact-breakdown-grid">
          <section className="impact-donut-card">
            <div className="impact-donut-wrap">
              <svg viewBox="0 0 36 36" className="impact-donut-svg">
                {donutSegments.map(seg => (
                  <circle key={seg.label}
                    cx="18" cy="18" r={R} fill="transparent"
                    stroke={seg.stroke} strokeWidth="3"
                    strokeDasharray={`${seg.dash} ${CIRCUM_D}`}
                    strokeDashoffset={seg.offset}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                  />
                ))}
              </svg>
              <span className="impact-donut-center">100%</span>
            </div>
            <div className="impact-donut-legend">
              <h3 className="impact-donut-title">Waste Breakdown</h3>
              {BREAKDOWN.map(b => (
                <div className="impact-donut-row" key={b.label}>
                  <div className="impact-donut-row-left">
                    <span className="impact-donut-dot" style={{ background: b.color }} />
                    <span className="impact-donut-lbl">{b.label}</span>
                  </div>
                  <span className="impact-donut-pct">{b.pct}%</span>
                </div>
              ))}
            </div>
          </section>

          <section className="impact-mini-stats">
            {[
              { icon: 'eco',        label: 'CO₂ Saved',     value: `${totalCo2} kg`,  color: 'var(--primary)'   },
              { icon: 'water_drop', label: 'Water Saved',   value: `${Math.round(totalKg * 40)} L`,  color: 'var(--secondary)' },
              { icon: 'bolt',       label: 'Energy Saved',  value: `${Math.round(totalKg * 1.5)} kWh`, color: 'var(--tertiary)'  },
              { icon: 'recycling',  label: 'Diverted',      value: `${totalKg} kg`,  color: 'var(--primary)'   },
            ].map(s => (
              <div className="impact-mini-tile" key={s.label}>
                <span className="material-symbols-outlined impact-mini-icon"
                  style={{ color: s.color, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                <span className="impact-mini-val">{s.value}</span>
                <span className="impact-mini-lbl">{s.label}</span>
              </div>
            ))}
          </section>
        </div>

        <section className="impact-card">
          <div className="impact-card-header-row">
            <span className="material-symbols-outlined impact-card-icon-left">flag</span>
            <h2 className="impact-card-title">Monthly Goal — 80 kg CO₂</h2>
          </div>
          <div className="impact-goal-bar-wrap">
            <div className="impact-goal-bar">
              <div className="impact-goal-fill" style={{ width: `${Math.min(100, (totalCo2 / 80) * 100)}%` }} />
            </div>
            <span className="impact-goal-pct">{totalCo2} / 80 kg <strong>({Math.round((totalCo2 / 80) * 100)}%)</strong></span>
          </div>
          {totalCo2 < 80 ? (
             <p className="impact-goal-note">You need <strong>{Math.max(0, 80 - totalCo2).toFixed(1)} kg more</strong> this month to hit your goal 🌱</p>
          ) : (
             <p className="impact-goal-note">You <strong>smashed your goal</strong> this month! Fantastic job! 🎉</p>
          )}
        </section>

        <section className="impact-card">
          <div className="impact-card-header-row">
            <span className="material-symbols-outlined impact-card-icon-left">military_tech</span>
            <h2 className="impact-card-title">Achievements</h2>
          </div>
          <div className="impact-badges-grid">
            {ACHIEVEMENT_TILES.map(b => (
              <div className={`impact-badge-tile${b.earned ? '' : ' locked'}`} key={b.label}>
                <span className="material-symbols-outlined impact-badge-tile-icon"
                  style={b.earned ? { fontVariationSettings: "'FILL' 1" } : {}}>{b.icon}</span>
                <span className="impact-badge-tile-label">{b.label}</span>
                <span className="impact-badge-tile-desc">{b.desc}</span>
                {!b.earned && (
                  <span className="material-symbols-outlined impact-badge-lock">lock</span>
                )}
              </div>
            ))}
          </div>
        </section>

      </main>
      <BottomNav />
    </div>
  );
}
