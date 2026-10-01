import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/common/BottomNav';
import Navbar from '../components/common/Navbar';
import { logWaste, scanWasteImage } from '../services/api';
import '../styles/waste.css';

import { useStats } from '../context/StatsContext';

const CATEGORIES = [
  { id: 'plastic',  label: 'Plastic',  icon: 'inventory_2',            bg: 'bg-secondary-container', iconColor: 'text-on-secondary-container' },
  { id: 'organic',  label: 'Organic',  icon: 'compost',                bg: 'bg-primary-container',   iconColor: 'text-on-primary-container',  fill: true },
  { id: 'e-waste',  label: 'E-waste',  icon: 'devices_other',          bg: 'bg-tertiary-fixed',      iconColor: 'text-on-tertiary-fixed-variant' },
  { id: 'metal',    label: 'Metal',    icon: 'precision_manufacturing', bg: 'bg-surface-container-highest', iconColor: 'text-on-surface-variant' },
  { id: 'paper',    label: 'Paper',    icon: 'description',            bg: 'bg-secondary-fixed',     iconColor: 'text-on-secondary-fixed-variant' },
  { id: 'other',    label: 'Other',    icon: 'pending',                bg: 'bg-surface-dim',         iconColor: 'text-on-surface' },
];

// Hazardous waste types (backend enum)
const HAZARDS = [
  { id: 'sanitary',       label: 'Sanitary waste' },
  { id: 'biomedical',     label: 'Biomedical / masks' },
  { id: 'e-waste-unsafe', label: 'Unsafe e-waste (batteries, CFL)' },
  { id: 'chemical',       label: 'Chemical / paint' },
  { id: 'sharp',          label: 'Sharps (glass, blades)' },
  { id: 'other-hazard',   label: 'Other hazard' },
];

// Points per kg for preview (matches backend)
const PTS_MAP = { plastic: 5, organic: 3, 'e-waste': 10, metal: 6, paper: 4, other: 2 };
const CO2_MAP = { plastic: 1.5, organic: 0.5, 'e-waste': 2.0, metal: 1.8, paper: 0.9, other: 0.3 };

export default function WasteLogPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const { refreshAllStats } = useStats();

  const [selected,   setSelected]   = useState('organic');
  const [qty,        setQty]        = useState(2.5);
  const [notes,      setNotes]      = useState('');
  const [showModal,  setShowModal]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scanning,   setScanning]   = useState(null);
  const [error,      setError]      = useState('');
  const [logResult,  setLogResult]  = useState(null); // holds { pointsEarned, co2Saved }
  const [isHazardous, setIsHazardous] = useState(false);
  const [hazardType,  setHazardType]  = useState('');
  const [safetyAck,   setSafetyAck]   = useState(false);

  // Escape closes the success modal (a11y)
  useEffect(() => {
    if (!showModal) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showModal]);

  const pts = Math.round((PTS_MAP[selected] || 2) * qty);
  const co2 = ((CO2_MAP[selected] || 0.3) * qty).toFixed(2);

  // ── Manual Log Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('');
    if (isHazardous && !hazardType) {
      setError('Please choose the hazard type for hazardous waste.');
      return;
    }
    if (isHazardous && !safetyAck) {
      setError('Please confirm you handled it safely (gloves/mask, no burning or mixing with household waste).');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await logWaste({
        category: selected,
        quantity: qty,
        unit: 'kg',
        description: notes,
        logMethod: 'manual',
        ...(isHazardous ? { isHazardous: true, hazardType, safetyAck: true } : {}),
      });
      setLogResult({ pointsEarned: data.pointsEarned, co2Saved: data.co2Saved });
      await refreshAllStats(); // Refresh global stats immediately after logging
      setShowModal(true);
    } catch (err) {
      setError(err.message || 'Failed to log waste. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setLogResult(null);
    setNotes('');
    setIsHazardous(false);
    setHazardType('');
    setSafetyAck(false);
  };

  // ── AI Scan ──────────────────────────────────────────────────────────────
  const handleAIScan = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e, source) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setScanning(source);
    setError('');
    const formData = new FormData();
    for (const file of files) {
      formData.append('images', file);
    }

    try {
      const { data } = await scanWasteImage(formData);
      const parsed = data.parsed || {};
      const report = parsed.reports?.[0] || {};
      
      // Calculate preview points/co2 using 0.5kg as a default AI weight
      const textToSearch = ((report.wasteCategory || '') + ' ' + (report.identifiedObject || '') + ' ' + (report.material || '')).toLowerCase();
      let catKey = 'other';
      if (textToSearch.includes('plastic') || textToSearch.includes('pet') || textToSearch.includes('polyester')) catKey = 'plastic';
      else if (textToSearch.includes('paper') || textToSearch.includes('cardboard') || textToSearch.includes('carton') || textToSearch.includes('newspaper')) catKey = 'paper';
      else if (textToSearch.includes('metal') || textToSearch.includes('can') || textToSearch.includes('aluminum') || textToSearch.includes('steel') || textToSearch.includes('iron') || textToSearch.includes('tin')) catKey = 'metal';
      else if (textToSearch.includes('organic') || textToSearch.includes('food') || textToSearch.includes('compost') || textToSearch.includes('fruit') || textToSearch.includes('veg') || textToSearch.includes('leaf') || textToSearch.includes('wood') || textToSearch.includes('peel')) catKey = 'organic';
      else if (textToSearch.includes('e-waste') || textToSearch.includes('electronic') || textToSearch.includes('battery') || textToSearch.includes('cable') || textToSearch.includes('phone') || textToSearch.includes('computer') || textToSearch.includes('wire')) catKey = 'e-waste';
      
      const previewQty = 0.5;
      const previewPts = Math.round((PTS_MAP[catKey] || 2) * previewQty);
      const previewCo2 = Number(((CO2_MAP[catKey] || 0.3) * previewQty).toFixed(2));

      // Navigate to scan result page with actual AI result
      navigate('/scan-result', {
        state: {
          result: {
            label:      report.identifiedObject || 'Unknown Item',
            category:   report.wasteCategory    || 'other',
            material:   report.material         || 'Unknown',
            binColor:   report.binColor         || 'None',
            confidence: typeof report.confidence === 'number' ? (report.confidence <= 1 ? Math.round(report.confidence * 100) : Math.round(report.confidence)) : 0,
            co2:        previewCo2,
            points:     previewPts,
            steps:      report.beforeThrowing   || [],
            reuseIdeas: report.reuseIdeas       || [],
            imageUrl:   URL.createObjectURL(files[0]),
          },
        },
      });
    } catch (err) {
      setError(err.message || 'AI scan failed. Please try manual entry.');
    } finally {
      setScanning(null);
      // Reset input so same file can be re-selected
      e.target.value = '';
    }
  };

  return (
    <div className="log-root">

      <Navbar />

      <main className="log-main">

        <section className="log-hero">
          <h1 className="log-hero-title">Log Waste Today</h1>
          <p className="log-hero-sub">Help us track your environmental impact by recording your disposals.</p>
        </section>

        {/* Error Banner */}
        {error && (
          <div className="log-error-banner">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        )}

        {/* AI Scan Card */}
        <section className="log-ai-card">
          <div className="log-ai-bg-icon">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '6rem' }}>photo_camera</span>
          </div>
          <div className="log-ai-content">
            <div className="log-ai-badge">AI Powered</div>
            <h2 className="log-ai-title">Instant AI Classification</h2>
            <p className="log-ai-desc">Don't know the category? Point your camera and let our AI handle the rest.</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', width: '100%' }}>
              <button
                className="log-ai-btn"
                style={{ flex: 1, padding: '0.75rem 0.5rem', fontSize: '0.9rem', background: 'var(--surface-variant)', color: 'var(--on-surface-variant)' }}
                onClick={() => fileInputRef.current?.click()}
                disabled={!!scanning}
              >
                {scanning === 'upload' ? (
                  <span className="material-symbols-outlined log-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined">upload_file</span>
                )}
                Upload
              </button>
              <button
                className="log-ai-btn"
                style={{ flex: 1, padding: '0.75rem 0.5rem', fontSize: '0.9rem' }}
                onClick={() => cameraInputRef.current?.click()}
                disabled={!!scanning}
              >
                {scanning === 'camera' ? (
                  <span className="material-symbols-outlined log-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined">photo_camera</span>
                )}
                Camera
              </button>
            </div>
            {/* Hidden file input for gallery upload (no capture attribute) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => handleFileSelect(e, 'upload')}
            />
            {/* Hidden file input for live camera (forces camera on mobile) */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={e => handleFileSelect(e, 'camera')}
            />
          </div>
        </section>

        {/* Category Grid */}
        <section className="log-section">
          <div className="log-section-header">
            <h3 className="log-section-title">Select Category</h3>
            <span className="log-section-tag">Manual Entry</span>
          </div>
          <div className="log-category-grid">
            {CATEGORIES.map(cat => (
              <button key={cat.id} className={`log-cat-btn${selected === cat.id ? ' selected' : ''}`} onClick={() => setSelected(cat.id)} aria-pressed={selected === cat.id} aria-label={`${cat.label} waste category`}>
                <div className={`log-cat-icon ${cat.bg}${selected === cat.id ? ' scaled' : ''}`}>
                  <span className={`material-symbols-outlined ${cat.iconColor}`} style={cat.fill ? { fontVariationSettings: "'FILL' 1" } : {}}>{cat.icon}</span>
                </div>
                <span className={`log-cat-label${selected === cat.id ? ' active' : ''}`}>{cat.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Quantity Slider */}
        <section className="log-qty-card">
          <div className="log-qty-header">
            <div>
              <h3 className="log-qty-title">Estimated Quantity</h3>
              <p className="log-qty-sub">Slide to specify weight</p>
            </div>
            <div className="log-qty-value">
              <span className="log-qty-num">{qty.toFixed(1)}</span>
              <span className="log-qty-unit">kg</span>
            </div>
          </div>
          <input
            className="log-slider"
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={qty}
            aria-label="Waste quantity in kilograms"
            aria-valuetext={`${qty.toFixed(1)} kilograms`}
            onChange={e => setQty(parseFloat(e.target.value))}
          />
          <div className="log-slider-labels">
            <span>0.1 kg</span><span>5.0 kg</span><span>10.0 kg</span>
          </div>
        </section>

        {/* Live CO2 preview */}
        <div className="log-co2-preview">
          <div className="log-co2-preview-item">
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>cloud_done</span>
            <div>
              <span className="log-co2-val">{co2} kg</span>
              <span className="log-co2-label">CO₂ Saved</span>
            </div>
          </div>
          <div className="log-co2-preview-divider" />
          <div className="log-co2-preview-item">
            <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontVariationSettings: "'FILL' 1" }}>eco</span>
            <div>
              <span className="log-co2-val">+{pts} pts</span>
              <span className="log-co2-label">Eco Points</span>
            </div>
          </div>
          <div className="log-co2-preview-hint">
            Factor: {CO2_MAP[selected]} kg CO₂/kg {selected}
          </div>
        </div>

        {/* Notes */}
        <section className="log-notes-section">
          <label className="log-notes-label">Notes</label>
          <textarea
            className="log-notes-textarea"
            placeholder="Additional details (e.g. brand names, condition)..."
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </section>

        {/* Hazardous waste flag (health & safety) */}
        <section className="log-notes-section">
          <label className="log-notes-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isHazardous}
              onChange={e => { setIsHazardous(e.target.checked); setSafetyAck(false); }}
              aria-label="This waste is hazardous"
            />
            ⚠️ This waste is hazardous
          </label>
          {isHazardous && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <select
                className="log-notes-textarea"
                value={hazardType}
                onChange={e => setHazardType(e.target.value)}
                aria-label="Hazard type"
                style={{ padding: '0.75rem' }}
              >
                <option value="">Select hazard type…</option>
                {HAZARDS.map(h => (
                  <option key={h.id} value={h.id}>{h.label}</option>
                ))}
              </select>
              <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: '12px', padding: '0.75rem', fontSize: '0.85rem', color: '#5d4037' }}>
                Never burn hazardous waste or mix it with household trash. Use gloves and a mask, seal it separately, and hand it to an authorised collector.
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={safetyAck}
                  onChange={e => setSafetyAck(e.target.checked)}
                  aria-label="I handled this hazardous waste safely"
                  style={{ marginTop: '0.2rem' }}
                />
                I handled this safely (gloves/mask, sealed separately, no burning)
              </label>
            </div>
          )}
        </section>

        <div className="log-submit-wrap">
          <button className="log-submit-btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <span className="material-symbols-outlined log-spin">progress_activity</span>
                Logging…
              </>
            ) : (
              <>
                Log Waste &amp; Earn Points
                <span className="material-symbols-outlined">auto_awesome</span>
              </>
            )}
          </button>
        </div>

      </main>

      <BottomNav />

      {/* Success Modal */}
      {showModal && (
        <div className="log-modal-overlay" role="dialog" aria-modal="true" aria-label="Waste logged successfully">
          <div className="log-modal-backdrop" onClick={handleClose} />
          <div className="log-modal-card">
            <div className="log-modal-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem' }}>check_circle</span>
            </div>
            <h2 className="log-modal-title">Impact Logged!</h2>
            <p className="log-modal-sub">You're making a real difference today.</p>
            <div className="log-modal-stats">
              <div className="log-modal-stat">
                <span className="log-modal-stat-val primary">+{logResult?.pointsEarned ?? pts}</span>
                <span className="log-modal-stat-label">Points</span>
              </div>
              <div className="log-modal-stat">
                <span className="log-modal-stat-val tertiary">{logResult?.co2Saved ?? co2} kg</span>
                <span className="log-modal-stat-label">CO₂ Saved</span>
              </div>
            </div>
            <p className="log-modal-co2-note">
              {CATEGORIES.find(c => c.id === selected)?.label} recycling saves {CO2_MAP[selected]} kg CO₂ per kg
            </p>
            <button className="log-modal-close-btn" onClick={handleClose}>Great, keep it up!</button>
          </div>
        </div>
      )}

    </div>
  );
}
