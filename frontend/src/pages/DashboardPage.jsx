import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Navbar from '../components/common/Navbar';
import BottomNav from '../components/common/BottomNav';
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton';
import TutorialOverlay from '../components/common/TutorialOverlay';
import { getActiveChallenges, getUpcomingEvents, getProfile, getWasteHistory } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useStats } from '../context/StatsContext';
import '../styles/dashboard.css';

const WASTE_FACTS = [
  'Recycling one aluminum can saves enough energy to run a TV for 3 hours.',
  'A glass bottle takes up to 1 million years to decompose in a landfill.',
  'Composting food waste reduces methane emissions by up to 50%.',
  'Recycling one ton of paper saves 17 trees and 7,000 gallons of water.',
  'Plastic bags take 10–1,000 years to decompose in landfills.',
];

const CATEGORY_META = {
  plastic:   { icon: 'recycling',               color: 'var(--primary)' },
  organic:   { icon: 'compost',                 color: 'var(--tertiary)' },
  'e-waste': { icon: 'devices',                 color: '#782c39' },
  metal:     { icon: 'precision_manufacturing', color: '#1b6b3a' },
  paper:     { icon: 'description',             color: '#005127' },
  other:     { icon: 'pending',                 color: 'var(--outline)' },
};

// Derive Eco Score from stats (simple formula for now)
const computeEcoScore = (stats) => {
  if (!stats) return 0;
  const score = Math.min(100, Math.round(
    (stats.totalKg || 0) * 2 +
    (stats.totalCo2Saved || 0) * 1.5 +
    (stats.totalPointsEarned || 0) * 0.1
  ));
  return Math.max(10, score);
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [factIndex,   setFactIndex]   = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef(null);

  // Cached server state via React Query and StatsContext
  const { statsData, loading: statsLoading } = useStats();
  const stats = statsData.week; // waste stats for current week

  const { data: challenges = [], isLoading: challengesLoading } = useQuery({
    queryKey: ['challenges', 'active'],
    queryFn: async () => {
      const res = await getActiveChallenges();
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: async () => {
      const res = await getUpcomingEvents();
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await getProfile();
      return res.data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Recent waste history query — ensures recent activity feed shows at most the last 2 waste logs
  const { data: historyData } = useQuery({
    queryKey: ['wasteHistory', 'recent'],
    queryFn: async () => {
      const res = await getWasteHistory({ limit: 2 });
      return res.data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const recentLogs = (historyData?.logs || stats?.recentLogs || []).slice(0, 2);

  // Sync profile data to AuthContext if newer data arrived
  useEffect(() => {
    if (profile) {
      updateUser(profile);
    }
  }, [profile, updateUser]);

  // Daily Check-in Badge — shows ONCE per day via localStorage
  const [showBadge, setShowBadge] = useState(() => {
    try {
      const today = new Date().toDateString();
      const lastShown = localStorage.getItem('daily_badge_shown_date');
      if (lastShown !== today) {
        localStorage.setItem('daily_badge_shown_date', today);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  // Auto-dismiss badge after 35s
  useEffect(() => {
    if (!showBadge) return;
    const t = setTimeout(() => {
      localStorage.setItem('daily_badge_shown_date', new Date().toDateString());
      setShowBadge(false);
    }, 35000);
    return () => clearTimeout(t);
  }, [showBadge]);

  const handleCloseBadge = () => {
    sessionStorage.setItem('badge_shown', '1');
    setShowBadge(false);
  };

  // Auto-rotate facts every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setFactIndex(i => (i + 1) % WASTE_FACTS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const prevFact = (e) => {
    if (e) e.stopPropagation();
    setFactIndex(i => (i - 1 + WASTE_FACTS.length) % WASTE_FACTS.length);
  };

  const nextFact = (e) => {
    if (e) e.stopPropagation();
    setFactIndex(i => (i + 1) % WASTE_FACTS.length);
  };

  const handleCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el) return;
    setActiveSlide(Math.round(el.scrollLeft / el.offsetWidth));
  };

  const scrollToSlide = (idx) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.offsetWidth, behavior: 'smooth' });
    setActiveSlide(idx);
  };

  // Determine if full skeleton should show (FIRST VISIT only, when no cached data exists)
  const isInitialStatsLoading = !stats && statsLoading;
  const isInitialChallengesLoading = challengesLoading && challenges.length === 0;
  const showSkeleton = isInitialStatsLoading || isInitialChallengesLoading;

  // Computed values from real data
  const currentUser = profile || user;
  const ecoScore   = computeEcoScore(stats);
  const ecoPoints  = currentUser?.ecoPoints  ?? stats?.totalPointsEarned ?? 0;
  const wasteKg    = stats?.totalKg      ?? 0;
  const co2Saved   = stats?.totalCo2Saved ?? 0;
  const userName   = currentUser?.name?.split(' ')[0] || 'Eco Warrior';

  // Build active challenges for the carousel (empty array when none exist — no fake data)
  const bgImgs = [
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80',
    'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&q=80',
    'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&q=80',
    'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=800&q=80'
  ];

  const carouselItems = challenges.map((ch, i) => {
    const submittedDays = ch.userProgress?.submittedDays?.length || 0;
    const totalDays = ch.durationDays || 1;
    const progressPct = Math.min(100, Math.round((submittedDays / totalDays) * 100));

    return {
      id: ch._id,
      tag: 'Weekly Mission',
      title: ch.title,
      desc: ch.description || `Complete tasks and earn ${ch.rewardPoints || 100} eco points.`,
      progress: progressPct,
      participants: ch.participantCount ? `${ch.participantCount.toLocaleString()}` : '—',
      img: bgImgs[i % bgImgs.length],
      _raw: ch,
    };
  });

  // Build activity feed from real recent logs (empty array when none exist — no fake fallback data)
  const activityFeed = recentLogs.map((log) => {
    const cat = (log.category || '').toLowerCase();
    const metaConfig = CATEGORY_META[cat] || CATEGORY_META.other;
    const catFormatted = log.category ? log.category.charAt(0).toUpperCase() + log.category.slice(1) : 'Waste';
    const logDate = new Date(log.createdAt);
    const isToday = new Date().toDateString() === logDate.toDateString();
    const dateStr = isToday ? 'Today' : logDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    return {
      id: log._id,
      icon: metaConfig.icon,
      iconColor: metaConfig.color,
      title: `${catFormatted} Waste Logged`,
      meta: `${log.unit === 'g' ? (log.quantity / 1000).toFixed(2) : log.quantity.toFixed(1)} kg • ${dateStr}`,
      points: `+${log.pointsEarned} pts`,
      pointsType: 'positive',
      status: log.pointsEarned > 0 ? 'Verified' : 'Pending',
    };
  });

  return (
    <div className="dashboard-root">
      <TutorialOverlay />
      <Navbar />

      {showSkeleton ? (
        <DashboardSkeleton />
      ) : (
        <main className="dashboard-main">

          {/* ── Daily Check-in Badge */}
          {showBadge && (
            <div className="daily-badge-wrap" onClick={handleCloseBadge}>
              <div className="eco-badge" onClick={e => e.stopPropagation()}>
                <div className="eco-icon-wrap">
                  <div className="eco-icon-ring">
                    <span className="material-symbols-outlined eco-badge-logo" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>eco</span>
                  </div>
                </div>
                <div className="eco-content">
                  <h2>DAILY CHECKIN</h2>
                  <h4>Welcome back, {userName}!</h4>
                  <p>Consistency is key to a sustainable lifestyle. Keep going to unlock the "Eco Warrior" badge!</p>
                  <div className="eco-points">
                    <span className="points-dot">✤</span>
                    +10 Eco Points Today
                  </div>
                </div>
                <button className="eco-badge-close" onClick={handleCloseBadge} aria-label="Dismiss badge">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Immersive Nature Hero ── */}
          <section className="hero-immersive">
            <div className="hero-immersive-bg">
              <div className="hero-glass-sun" />
            </div>
            
            <div className="hero-immersive-content">
              <div className="hero-immersive-top">
                <div className="hi-text-content">
                  <div className="hi-greeting">Welcome back</div>
                  <h1 className="hi-title">{userName}</h1>
                  <p className="hi-subtitle">
                    {co2Saved > 0 
                      ? `Your sustainable habits saved ${co2Saved.toFixed(1)} kg of CO₂ this week.` 
                      : 'Start logging waste to build your eco score and track your impact.'}
                  </p>
                  <span className="hi-level-badge">Level {Math.floor(ecoScore / 20) + 1}</span>
                </div>
                
                <div className="hi-score-ring" onClick={() => navigate('/impact')}>
                  <span className="hi-score-val">{ecoScore}</span>
                  <span className="hi-score-lbl">ECO SCORE</span>
                </div>
              </div>

              <div className="hero-immersive-stats">
                <div className="hi-stat-card">
                  <span className="material-symbols-outlined hi-stat-icon" style={{ fontVariationSettings: "'FILL' 1" }}>savings</span>
                  <span className="hi-stat-val">{ecoPoints.toLocaleString('en-IN')}</span>
                  <span className="hi-stat-lbl">Points</span>
                </div>
                <div className="hi-stat-card">
                  <span className="material-symbols-outlined hi-stat-icon" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_done</span>
                  <span className="hi-stat-val">{co2Saved.toFixed(1)} kg</span>
                  <span className="hi-stat-lbl">CO₂ Saved</span>
                </div>
                <div className="hi-stat-card">
                  <span className="material-symbols-outlined hi-stat-icon" style={{ fontVariationSettings: "'FILL' 1" }}>delete_sweep</span>
                  <span className="hi-stat-val">{wasteKg.toFixed(1)} kg</span>
                  <span className="hi-stat-lbl">Logged</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── Daily Fact Strip ── */}
          <div className="daily-fact-strip">
            <button type="button" className="fact-nav-btn" onClick={prevFact} aria-label="Previous fact">
              <span className="material-symbols-outlined fact-arrow">chevron_left</span>
            </button>
            <span className="material-symbols-outlined fact-icon">lightbulb</span>
            <p className="fact-text">{WASTE_FACTS[factIndex]}</p>
            <button type="button" className="fact-nav-btn" onClick={nextFact} aria-label="Next fact">
              <span className="material-symbols-outlined fact-arrow">chevron_right</span>
            </button>
          </div>

          {/* ── Activity Feed + Challenge Carousel */}
          <section className="feed-grid">
            <div className="feed-col">
              <div className="feed-header">
                <h2 className="section-title">Recent Activity Feed</h2>
                <button className="view-all-btn" onClick={() => navigate('/waste-history')}>View All</button>
              </div>
              <div className="activity-list">
                {activityFeed.length > 0 ? (
                  activityFeed.map(item => (
                    <div className="activity-item" key={item.id}>
                      <div className="activity-left">
                        <div className="activity-icon-wrap">
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", color: item.iconColor }}>{item.icon}</span>
                        </div>
                        <div className="activity-info">
                          <h4 className="activity-title">{item.title}</h4>
                          <p className="activity-meta">{item.meta}</p>
                        </div>
                      </div>
                      <div className="activity-right">
                        <span className={`activity-points ${item.pointsType === 'negative' ? 'negative' : ''}`}>{item.points}</span>
                        <span className="activity-status">{item.status}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="activity-empty-state" style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--on-surface-variant)', background: 'var(--surface-container-low)', borderRadius: '1.25rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--outline)', marginBottom: '0.5rem' }}>history</span>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: 'var(--on-surface)' }}>No waste logged yet</p>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Log your recycled waste using the scan button to start tracking your impact.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="challenge-col">
              <div className="challenge-col-header">
                <h2 className="section-title">Current Challenges</h2>
                {carouselItems.length > 0 && (
                  <span className="challenge-counter">{activeSlide + 1} / {carouselItems.length}</span>
                )}
              </div>
              {carouselItems.length > 0 ? (
                <>
                  <div className="challenge-carousel" ref={carouselRef} onScroll={handleCarouselScroll}>
                    {carouselItems.map((ch) => (
                      <div className="challenge-slide" key={ch.id}>
                        <div className="challenge-card">
                          <div className="challenge-image-wrapper">
                            <img className="challenge-bg" src={ch.img} alt={ch.title} />
                            <span className="challenge-tag">{ch.tag}</span>
                          </div>
                          <div className="challenge-content">
                            <h3 className="challenge-title">{ch.title}</h3>
                            <p className="challenge-desc">{ch.desc}</p>
                            <div className="challenge-meta-row">
                              <span className="material-symbols-outlined challenge-people-icon">group</span>
                              <span className="challenge-people">{ch.participants} joined</span>
                            </div>
                            <div className="challenge-progress-bar">
                              <div className="challenge-progress-fill" style={{ width: `${ch.progress}%` }} />
                            </div>
                            <button className="challenge-btn" onClick={() => navigate('/weekly-challenges')}>
                              Accept Challenge
                              <span className="material-symbols-outlined">arrow_forward</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {carouselItems.length > 1 && (
                    <div className="challenge-dots">
                      {carouselItems.map((_, i) => (
                        <button key={i} className={`challenge-dot${activeSlide === i ? ' active' : ''}`} onClick={() => scrollToSlide(i)} aria-label={`Go to challenge ${i + 1}`} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="challenge-empty-state" style={{ padding: '2rem 1.5rem', textAlign: 'center', background: 'var(--surface-container-low)', borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--outline)' }}>emoji_events</span>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--on-surface)' }}>No Active Challenges</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>Check back soon for new community missions and eco rewards.</p>
                  <button className="challenge-btn" onClick={() => navigate('/weekly-challenges')} style={{ marginTop: '0.5rem', padding: '0.6rem 1.25rem' }}>
                    View All Challenges
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Weekly Challenges Section */}
          <section className="weekly-challenges-section">
            <div className="feed-header">
              <h2 className="section-title">Weekly Challenges</h2>
              <button className="view-all-btn" onClick={() => navigate('/weekly-challenges')}>View All</button>
            </div>
            <div className="weekly-challenges-preview">
              {challenges.slice(0, 2).map((ch, i) => (
                <div key={ch._id} className="wc-preview-card" onClick={() => navigate('/weekly-challenges')}>
                  <div className={`wc-preview-icon-wrap${i > 0 ? ' secondary' : ''}`}>
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>recycling</span>
                  </div>
                  <div className="wc-preview-info">
                    <h4 className="wc-preview-title">{ch.title}</h4>
                    <div className="wc-preview-bar-wrap">
                      <div className="wc-preview-bar"><div className="wc-preview-fill" style={{ width: '0%' }} /></div>
                      <span className="wc-preview-pct">0%</span>
                    </div>
                  </div>
                  <span className="wc-preview-status not-started">Not Started</span>
                </div>
              ))}

              {challenges.length === 0 && (
                <div className="wc-empty-card" style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--on-surface-variant)', background: 'var(--surface-container-low)', borderRadius: '1rem' }}>
                  <p style={{ margin: '0 0 0.25rem 0', fontWeight: 500 }}>No weekly challenges available</p>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>Stay tuned for upcoming community challenges!</p>
                </div>
              )}

              <button className="wc-see-all-btn" onClick={() => navigate('/weekly-challenges')}>
                <span className="material-symbols-outlined">grid_view</span>
                See All Weekly Challenges
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </section>

        </main>
      )}

      <BottomNav />
    </div>
  );
}
