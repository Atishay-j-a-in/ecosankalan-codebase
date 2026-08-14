import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import BottomNav from '../components/common/BottomNav';
import Loader from '../components/common/Loader';
import { getProducts, getMyVouchers, getProfile, getProductRedirectUrl } from '../services/api';
import '../styles/shop.css';

const PARTNERS = [
  { name: 'IKEA',      logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Ikea_logo.svg' },
  { name: 'Amazon',    logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg' },
  { name: 'Decathlon', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Decathlon_Logo.png' },
];

// Fallback products if backend returns empty
const FALLBACK_PRODUCTS = [
  { _id: '1', name: 'Bamboo Travel Set',      partnerName: 'IKEA',      ecoPointsCost: 450, category: 'Home',
    imageUrl: 'https://images.unsplash.com/photo-1605001083439-0346c1db032a?q=80&w=600&auto=format&fit=crop' },
  { _id: '2', name: 'Stainless Steel Bottle', partnerName: 'Amazon',    ecoPointsCost: 850, category: 'Reusable',
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?q=80&w=600&auto=format&fit=crop' },
  { _id: '3', name: 'Cork Yoga Mat',           partnerName: 'Decathlon', ecoPointsCost: 1200, category: 'Zero Waste',
    imageUrl: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?q=80&w=600&auto=format&fit=crop' },
  { _id: '4', name: 'Reusable Cotton Bags',    partnerName: 'IKEA',      ecoPointsCost: 350, category: 'Reusable',
    imageUrl: 'https://images.unsplash.com/photo-1596558450255-7c0b7be9d56a?q=80&w=600&auto=format&fit=crop' },
  { _id: '5', name: 'Solar Power Bank',        partnerName: 'Amazon',    ecoPointsCost: 2000, category: 'Electronics',
    imageUrl: 'https://images.unsplash.com/photo-1582216664998-cb580d5d5b78?q=80&w=600&auto=format&fit=crop' },
  { _id: '6', name: 'Bamboo Toothbrush Set',   partnerName: 'Decathlon', ecoPointsCost: 250, category: 'Zero Waste',
    imageUrl: 'https://images.unsplash.com/photo-1505085352341-2cba61a9bc27?q=80&w=600&auto=format&fit=crop' },
  { _id: '7', name: 'Compost Bin Kitchen',     partnerName: 'IKEA',      ecoPointsCost: 950, category: 'Kitchen',
    imageUrl: 'https://images.unsplash.com/photo-1585868288258-0524dc0f3689?q=80&w=600&auto=format&fit=crop' },
  { _id: '8', name: 'Glass Food Containers',   partnerName: 'Amazon',    ecoPointsCost: 700, category: 'Kitchen',
    imageUrl: 'https://images.unsplash.com/photo-1585250462002-302a6cecd552?q=80&w=600&auto=format&fit=crop' },
];

const FILTER_CHIPS = ['All', 'Home', 'Kitchen', 'Reusable', 'Zero Waste', 'Electronics'];

export default function ShopPage() {
  const navigate = useNavigate();

  const [products,      setProducts]      = useState([]);
  const [myVouchers,    setMyVouchers]    = useState([]);
  const [userPoints,    setUserPoints]    = useState(0);
  const [activeChip,    setActiveChip]    = useState('All');
  const [searchQuery,   setSearchQuery]   = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [revealedCodes, setRevealedCodes] = useState({});
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, vRes, uRes] = await Promise.all([
          getProducts(),
          getMyVouchers(),
          getProfile(),
        ]);
        setProducts(pRes.data.length > 0 ? pRes.data : FALLBACK_PRODUCTS);
        setMyVouchers(vRes.data);
        setUserPoints(uRes.data?.ecoPoints || 0);
      } catch (err) {
        // On error, show fallback products
        setProducts(FALLBACK_PRODUCTS);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleCode = (id) => setRevealedCodes(p => ({ ...p, [id]: !p[id] }));

  const handleProductClick = (product) => {
    navigate('/product-detail', { state: { product } });
  };

  const handleBuyOnPartner = (e, product) => {
    e.stopPropagation();
    if (product._id === '1' || product._id === '4') return window.open('https://www.ikea.com/in/en/', '_blank');
    if (product._id === '2' || product._id === '5') return window.open('https://www.amazon.in/', '_blank');
    if (product._id === '3' || product._id === '6') return window.open('https://www.decathlon.in/', '_blank');
    
    if (product._id && !product._id.startsWith('fallback')) {
      // Real product — use backend redirect (appends utm_source=ecosankalan)
      window.open(getProductRedirectUrl(product._id), '_blank', 'noopener,noreferrer');
    } else {
      navigate('/product-detail', { state: { product } });
    }
  };

  const filtered = products.filter(p => {
    const matchesChip = activeChip === 'All' || (p.category || '').toLowerCase() === activeChip.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesChip && matchesSearch;
  });

  const suggestions = searchQuery 
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => p.name).slice(0, 5)
    : [];

  const maskCode = (code) => {
    if (!code) return '••••••••';
    return code.slice(0, 3) + '•'.repeat(Math.max(0, code.length - 5)) + code.slice(-2);
  };

  const formatExpiry = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `Valid until ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  };

  // Show only active vouchers (not expired)
  const activeVouchers = myVouchers.filter(v => !v.expiresAt || new Date(v.expiresAt) > new Date());

  return (
    <div className="shop-root">
      <main className="shop-main">

        {/* Search */}
        <div className="shop-search-wrap" style={{ position: 'relative' }}>
          <span className="material-symbols-outlined shop-search-icon">shopping_bag</span>
          <input 
            className="shop-search-input" 
            placeholder="Search eco products..." 
            type="text" 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {showSuggestions && searchQuery && suggestions.length > 0 && (
            <div className="shop-search-suggestions" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface-container)', borderRadius: '12px', marginTop: '0.5rem', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              {suggestions.map((sug, i) => (
                <div key={i} style={{ padding: '0.75rem 1rem', borderBottom: i === suggestions.length - 1 ? 'none' : '1px solid var(--surface-dim)', cursor: 'pointer', fontSize: '0.875rem' }} onMouseDown={(e) => { e.preventDefault(); setSearchQuery(sug); setShowSuggestions(false); }}>
                  {sug}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hero */}
        <section className="shop-hero">
          <div className="shop-hero-left">
            <h1 className="shop-hero-title">Curated for the <span className="shop-hero-accent">Conscious</span></h1>
            <p className="shop-hero-desc">Redeem your hard-earned eco-points for premium sustainable essentials. High impact, zero waste, delivered to your doorstep.</p>
          </div>
          <div className="shop-balance-card">
            <div className="shop-balance-icon-wrap">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
            </div>
            <div>
              <span className="shop-balance-label">Your Balance</span>
              <span className="shop-balance-amount">{loading ? '…' : userPoints.toLocaleString('en-IN')} EP</span>
            </div>
          </div>
        </section>

        {/* My Vouchers */}
        {activeVouchers.length > 0 && (
          <section className="shop-section">
            <div className="shop-section-header">
              <h2 className="shop-section-title">My Vouchers</h2>
              <button className="shop-view-all" onClick={() => navigate('/vouchers')}>View All</button>
            </div>
            <div className="shop-vouchers-list">
              {activeVouchers.slice(0, 3).map(v => (
                <div className="shop-voucher-card" key={v._id}>
                  <div className="shop-voucher-left">
                    <div className="shop-voucher-logo-wrap">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>confirmation_number</span>
                    </div>
                    <span className="shop-voucher-brand">{v.partnerName}</span>
                  </div>
                  <div className="shop-voucher-dash" />
                  <div className="shop-voucher-right">
                    <div>
                      <h3 className="shop-voucher-discount">{v.discountLabel || 'Voucher'}</h3>
                      <p className="shop-voucher-valid">{formatExpiry(v.expiresAt)}</p>
                    </div>
                    <div className="shop-voucher-code-row">
                      <code className="shop-voucher-code" onClick={() => toggleCode(v._id)}>
                        {revealedCodes[v._id] ? v.code : maskCode(v.code)}
                      </code>
                      <button className="shop-copy-btn" onClick={() => toggleCode(v._id)}>
                        <span className="material-symbols-outlined">content_copy</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Filter Chips */}
        <div className="shop-chips-wrap">
          <div className="shop-chips-scroll">
            {FILTER_CHIPS.map(chip => (
              <button key={chip} className={`shop-chip${activeChip === chip ? ' active' : ''}`} onClick={() => setActiveChip(chip)}>{chip}</button>
            ))}
          </div>
        </div>

        {/* Featured Partners */}
        <section className="shop-section">
          <h3 className="shop-section-title" style={{ marginBottom: '1rem' }}>Featured Partners</h3>
          <div className="shop-partners-scroll">
            {PARTNERS.map(p => (
              <div className="shop-partner-tile" key={p.name}>
                <img src={p.logo} alt={p.name} className="shop-partner-logo" />
                <span className="shop-partner-name-display">{p.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Product Grid */}
        <section className="shop-section">
          <div className="shop-section-header">
            <h3 className="shop-section-title">Sustainable Picks</h3>
            <span className="shop-view-all-plain">See All</span>
          </div>

          {loading ? (
            <Loader text="Loading catalog..." />
          ) : (
            <div className="shop-grid">
              {filtered.map(product => (
                <div className="shop-card" key={product._id} onClick={() => handleProductClick(product)}>
                  <div className="shop-card-img-wrap">
                    <img className="shop-card-img" src={product.imageUrl || product.img || (product.imageUrls && product.imageUrls[0]) || (product.imgs && product.imgs[0])} alt={product.name} />
                    <div className="shop-card-partner-badge">
                      <span className="material-symbols-outlined shop-verified-icon">verified</span>
                      <span className="shop-partner-name">{product.partnerName || product.partner}</span>
                    </div>
                  </div>
                  <div className="shop-card-body">
                    <h4 className="shop-card-name">{product.name}</h4>
                    <div className="shop-card-pts-row">
                      <span className="material-symbols-outlined shop-star-icon" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                      <span className="shop-card-pts">{product.ecoPointsCost || product.points} pts</span>
                    </div>
                    <button className="shop-buy-btn" onClick={e => handleBuyOnPartner(e, product)}>
                      Buy on Partner
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
      <BottomNav />
    </div>
  );
}
