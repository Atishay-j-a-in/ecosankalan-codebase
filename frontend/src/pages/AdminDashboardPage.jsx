import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import BottomNav from '../components/common/BottomNav';
import { getAdminStats, createBin, createEvent, bulkImportVouchers, createChallenge, updateChallenge, deleteChallenge, getAdminChallenges } from '../services/api';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Forms state
  const [activeTab, setActiveTab] = useState('stats'); // 'stats', 'bins', 'events', 'vouchers', 'challenges'
  const [successMsg, setSuccessMsg] = useState('');

  // Challenges state
  const [challenges, setChallenges] = useState([]);
  const [challengesLoading, setChallengesLoading] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [challengeTasks, setChallengeTasks] = useState([{ action: '', targetCount: 1, category: '' }]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data } = await getAdminStats();
      setStats(data);
    } catch (err) {
      setError(err.message || 'Failed to load admin stats');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBin = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await createBin({
        name: fd.get('name'),
        address: fd.get('address'),
        location: {
          type: 'Point',
          coordinates: [parseFloat(fd.get('lng')), parseFloat(fd.get('lat'))]
        },
        types: fd.get('types').split(',').map(s => s.trim()),
        capacityStatus: 'low'
      });
      setSuccessMsg('Bin created successfully!');
      e.target.reset();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await createEvent({
        title: fd.get('title'),
        description: fd.get('description'),
        address: fd.get('address'),
        location: {
          type: 'Point',
          coordinates: [parseFloat(fd.get('lng')), parseFloat(fd.get('lat'))]
        },
        eventDate: fd.get('date'),
        organiser: fd.get('organiser'),
        bonusPoints: parseInt(fd.get('points'))
      });
      setSuccessMsg('Event created successfully!');
      e.target.reset();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleImportVouchers = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const jsonStr = fd.get('jsonPayload');
      const vouchers = JSON.parse(jsonStr);
      const { data } = await bulkImportVouchers(vouchers);
      setSuccessMsg(`Imported ${data.insertedCount} vouchers. Skipped ${data.duplicateCount} duplicates.`);
      e.target.reset();
    } catch (err) {
      setError(err.message || 'Invalid JSON or upload failed');
    }
  };

  const loadChallenges = async () => {
    setChallengesLoading(true);
    try {
      const { data } = await getAdminChallenges();
      setChallenges(data);
    } catch (err) {
      setError(err.message || 'Failed to load challenges');
    } finally {
      setChallengesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'challenges') loadChallenges();
  }, [activeTab]);

  const handleCreateChallenge = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const tasks = challengeTasks.filter(t => t.action.trim());
    if (tasks.length === 0) {
      setError('At least one task is required');
      return;
    }
    try {
      await createChallenge({
        title: fd.get('title'),
        description: fd.get('description'),
        startDate: fd.get('startDate'),
        expiryDate: fd.get('expiryDate'),
        rewardPoints: parseInt(fd.get('rewardPoints')) || 0,
        rewardVoucherPartner: fd.get('rewardVoucherPartner') || undefined,
        tasks,
      });
      setSuccessMsg('Challenge created successfully!');
      e.target.reset();
      setChallengeTasks([{ action: '', targetCount: 1, category: '' }]);
      loadChallenges();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateChallenge = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      title: fd.get('title'),
      description: fd.get('description'),
      startDate: fd.get('startDate'),
      expiryDate: fd.get('expiryDate'),
      rewardPoints: parseInt(fd.get('rewardPoints')) || 0,
      rewardVoucherPartner: fd.get('rewardVoucherPartner') || undefined,
    };
    if (editingChallenge.tasks) {
      payload.tasks = editingChallenge.tasks;
    }
    try {
      const { data } = await updateChallenge(editingChallenge._id, payload);
      setSuccessMsg('Challenge updated successfully!');
      setEditingChallenge(null);
      loadChallenges();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteChallenge = async (id) => {
    if (!window.confirm('Deactivate this challenge? It will be hidden from users.')) return;
    try {
      await deleteChallenge(id);
      setSuccessMsg('Challenge deactivated');
      loadChallenges();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTaskChange = (index, field, value) => {
    const updated = [...challengeTasks];
    updated[index] = { ...updated[index], [field]: value };
    setChallengeTasks(updated);
  };

  const addTaskRow = () => {
    setChallengeTasks([...challengeTasks, { action: '', targetCount: 1, category: '' }]);
  };

  const removeTaskRow = (index) => {
    if (challengeTasks.length <= 1) return;
    setChallengeTasks(challengeTasks.filter((_, i) => i !== index));
  };

  const cardStyle = {
    background: 'var(--surface-container)',
    padding: '1.5rem',
    borderRadius: '16px',
    marginBottom: '1rem',
  };

  const inputStyle = {
    width: '100%', padding: '0.75rem', marginBottom: '1rem',
    borderRadius: '8px', border: '1px solid var(--outline-variant)',
    background: 'var(--surface)', color: 'var(--on-surface)'
  };

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', paddingBottom: '80px' }}>
      <Navbar />
      <main style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--on-surface)' }}>Admin Dashboard</h1>
          <button 
            onClick={() => navigate('/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--surface-variant)', color: 'var(--on-surface-variant)', border: 'none', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.875rem', cursor: 'pointer' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>arrow_back</span>
            User View
          </button>
        </div>
        
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {['stats', 'bins', 'events', 'vouchers', 'challenges'].map(tab => (
            <button 
              key={tab} 
              onClick={() => { setActiveTab(tab); setError(''); setSuccessMsg(''); }}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '99px',
                border: 'none',
                background: activeTab === tab ? 'var(--primary)' : 'var(--surface-variant)',
                color: activeTab === tab ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                textTransform: 'capitalize',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {error && <div className="log-error-banner"><span className="material-symbols-outlined">error</span>{error}</div>}
        {successMsg && <div className="vr-alert success"><span className="material-symbols-outlined">check_circle</span>{successMsg}</div>}

        {activeTab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)', color: 'var(--on-primary)' }}>
              <h2 style={{ marginBottom: '0.5rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined">monitoring</span> Platform Overview
              </h2>
              <p style={{ opacity: 0.8, fontSize: '0.9rem', marginBottom: '1.5rem' }}>Live analysis of EcoSankalan's impact and engagement.</p>
              
              {loading ? <p><span className="material-symbols-outlined log-spin">progress_activity</span> Fetching live data...</p> : stats ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px' }}>
                    <p style={{ opacity: 0.9, fontSize: '0.875rem', marginBottom: '0.25rem' }}>Total Users</p>
                    <p style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats.totalUsers}</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px' }}>
                    <p style={{ opacity: 0.9, fontSize: '0.875rem', marginBottom: '0.25rem' }}>Waste Logged</p>
                    <p style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats.totalWasteKg} <span style={{fontSize: '1rem', fontWeight: 'normal'}}>kg</span></p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px' }}>
                    <p style={{ opacity: 0.9, fontSize: '0.875rem', marginBottom: '0.25rem' }}>Events Held</p>
                    <p style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats.totalEventsConducted}</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px' }}>
                    <p style={{ opacity: 0.9, fontSize: '0.875rem', marginBottom: '0.25rem' }}>Challenges</p>
                    <p style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats.totalChallengeCompletions}</p>
                  </div>
                </div>
              ) : <p>No data available</p>}
            </div>

            {/* Analysis card */}
            {stats && (
              <div style={cardStyle}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{color: 'var(--primary)'}}>insights</span> Engagement Analysis
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                      <span>User Participation Rate</span>
                      <span style={{fontWeight: 'bold'}}>{Math.min(100, Math.round((stats.totalChallengeCompletions / (stats.totalUsers || 1)) * 100))}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--surface-variant)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (stats.totalChallengeCompletions / (stats.totalUsers || 1)) * 100)}%`, height: '100%', background: 'var(--primary)' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                      <span>Waste Logs per User</span>
                      <span style={{fontWeight: 'bold'}}>{(stats.totalWasteKg / (stats.totalUsers || 1)).toFixed(1)} kg</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--surface-variant)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (stats.totalWasteKg / (stats.totalUsers || 1)) * 10)}%`, height: '100%', background: 'var(--secondary)' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button 
              onClick={loadStats}
              disabled={loading}
              style={{ width: '100%', padding: '0.875rem', background: 'var(--surface-variant)', color: 'var(--on-surface-variant)', border: 'none', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              <span className={`material-symbols-outlined ${loading ? 'log-spin' : ''}`}>sync</span> Refresh Live Data
            </button>
          </div>
        )}

        {activeTab === 'bins' && (
          <div style={cardStyle}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Add New Bin</h2>
            <form onSubmit={handleCreateBin}>
              <input name="name" placeholder="Bin Name (e.g. Dry Waste Hub)" required style={inputStyle} />
              <input name="address" placeholder="Address" required style={inputStyle} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input name="lat" type="number" step="any" placeholder="Latitude" required style={inputStyle} />
                <input name="lng" type="number" step="any" placeholder="Longitude" required style={inputStyle} />
              </div>
              <input name="types" placeholder="Types (comma separated: plastic, paper)" required style={inputStyle} />
              <button type="submit" style={{ width: '100%', padding: '0.75rem', background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', borderRadius: '8px' }}>
                Create Bin
              </button>
            </form>
          </div>
        )}

        {activeTab === 'events' && (
          <div style={cardStyle}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Add New Event</h2>
            <form onSubmit={handleCreateEvent}>
              <input name="title" placeholder="Event Title" required style={inputStyle} />
              <textarea name="description" placeholder="Description" required style={{...inputStyle, height: '80px'}} />
              <input name="address" placeholder="Address" required style={inputStyle} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input name="lat" type="number" step="any" placeholder="Latitude" required style={inputStyle} />
                <input name="lng" type="number" step="any" placeholder="Longitude" required style={inputStyle} />
              </div>
              <input name="date" type="datetime-local" required style={inputStyle} />
              <input name="organiser" placeholder="Organiser Name" required style={inputStyle} />
              <input name="points" type="number" placeholder="Bonus Points (e.g. 100)" required style={inputStyle} />
              <button type="submit" style={{ width: '100%', padding: '0.75rem', background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', borderRadius: '8px' }}>
                Create Event
              </button>
            </form>
          </div>
        )}

        {activeTab === 'vouchers' && (
          <div style={cardStyle}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Bulk Import Vouchers</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--outline)', marginBottom: '1rem' }}>
              Paste a JSON array of vouchers. e.g. <br/>
              <code>{`[{"code": "XYZ123", "partnerName": "Amazon", "discountLabel": "10% OFF"}]`}</code>
            </p>
            <form onSubmit={handleImportVouchers}>
              <textarea name="jsonPayload" placeholder="JSON Array..." required style={{...inputStyle, height: '150px', fontFamily: 'monospace'}} />
              <button type="submit" style={{ width: '100%', padding: '0.75rem', background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', borderRadius: '8px' }}>
                Import Vouchers
              </button>
            </form>
          </div>
        )}

        {activeTab === 'challenges' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Create / Edit Challenge */}
            <div style={cardStyle}>
              <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>
                {editingChallenge ? 'Edit Challenge' : 'Create New Challenge'}
              </h2>
              <form onSubmit={editingChallenge ? handleUpdateChallenge : handleCreateChallenge}>
                <input name="title" placeholder="Challenge Title" defaultValue={editingChallenge?.title || ''} required style={inputStyle} />
                <textarea name="description" placeholder="Description" defaultValue={editingChallenge?.description || ''} required style={{...inputStyle, height: '80px'}} />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <input name="startDate" type="date" defaultValue={editingChallenge?.startDate ? editingChallenge.startDate.slice(0, 10) : todayStr()} required style={inputStyle} />
                  <input name="expiryDate" type="date" defaultValue={editingChallenge?.expiryDate ? editingChallenge.expiryDate.slice(0, 10) : ''} required style={inputStyle} />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <input name="rewardPoints" type="number" placeholder="Reward Points" defaultValue={editingChallenge?.rewardPoints || 0} style={inputStyle} />
                  <input name="rewardVoucherPartner" placeholder="Voucher Partner (optional)" defaultValue={editingChallenge?.rewardVoucherPartner || ''} style={inputStyle} />
                </div>

                {/* Tasks */}
                <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>Tasks</p>
                {!editingChallenge && challengeTasks.map((task, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <input placeholder="Action (e.g. log_waste)" value={task.action} onChange={(e) => handleTaskChange(i, 'action', e.target.value)} required style={{...inputStyle, marginBottom: 0, flex: 2}} />
                    <input type="number" placeholder="Target" value={task.targetCount} onChange={(e) => handleTaskChange(i, 'targetCount', parseInt(e.target.value) || 1)} min="1" required style={{...inputStyle, marginBottom: 0, flex: 1}} />
                    <input placeholder="Category" value={task.category} onChange={(e) => handleTaskChange(i, 'category', e.target.value)} style={{...inputStyle, marginBottom: 0, flex: 1}} />
                    <button type="button" onClick={() => removeTaskRow(i)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '0.25rem' }}>
                      <span className="material-symbols-outlined">remove_circle</span>
                    </button>
                  </div>
                ))}
                {!editingChallenge && (
                  <button type="button" onClick={addTaskRow} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'none', border: '1px dashed var(--outline)', borderRadius: '8px', padding: '0.5rem', width: '100%', justifyContent: 'center', cursor: 'pointer', color: 'var(--on-surface-variant)', marginBottom: '1rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>add</span> Add Task
                  </button>
                )}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" style={{ flex: 1, padding: '0.75rem', background: 'var(--primary)', color: 'var(--on-primary)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    {editingChallenge ? 'Update Challenge' : 'Create Challenge'}
                  </button>
                  {editingChallenge && (
                    <button type="button" onClick={() => setEditingChallenge(null)} style={{ padding: '0.75rem', background: 'var(--surface-variant)', color: 'var(--on-surface-variant)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Challenge List */}
            <div style={cardStyle}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{color: 'var(--primary)'}}>list</span> All Challenges
              </h3>

              {challengesLoading ? (
                <p><span className="material-symbols-outlined log-spin">progress_activity</span> Loading...</p>
              ) : challenges.length === 0 ? (
                <p style={{ color: 'var(--outline)' }}>No challenges created yet.</p>
              ) : (
                challenges.map(ch => (
                  <div key={ch._id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem', marginBottom: '0.5rem',
                    background: ch.isActive ? 'var(--surface-container)' : 'var(--surface-variant)',
                    borderRadius: '8px', opacity: ch.isActive ? 1 : 0.6,
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ch.title}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--outline)' }}>
                        {ch.startDate?.slice(0, 10)} → {ch.expiryDate?.slice(0, 10)} | {ch.tasks?.length || 0} tasks | {ch.rewardPoints} pts
                        {!ch.isActive && <span style={{ color: 'var(--error)', marginLeft: '0.5rem' }}>(inactive)</span>}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => setEditingChallenge(ch)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      {ch.isActive && (
                        <button onClick={() => handleDeleteChallenge(ch._id)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}>
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>
      <BottomNav />
    </div>
  );
}
