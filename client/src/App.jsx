import { useState, useEffect, useCallback } from 'react';
import SpotCard from './components/SpotCard';
import KiteMap from './components/KiteMap';
import { getWindLabel, getWindColor } from './components/WindGauge';

const REFRESH_MS = 5 * 60 * 1000;
const REGIONS = ['All', 'North', 'East', 'South', 'West'];
const TYPES   = ['All', 'Kite Spots', 'Airports', 'Buoys'];

function Header({ lastUpdated, loading, onRefresh }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: 58,
      borderBottom: '1px solid var(--border)',
      background: 'rgba(5,10,20,0.92)', backdropFilter: 'blur(20px)',
      position: 'relative', zIndex: 100, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
          <path d="M14 2 C8 2 3 7 3 13 C3 20 14 26 14 26 C14 26 25 20 25 13 C25 7 20 2 14 2Z"
            fill="none" stroke="#00e5ff" strokeWidth="1.5"/>
          <path d="M14 8 L19 20 L14 17 L9 20 Z" fill="#00e5ff" opacity="0.9"/>
          <path d="M14 8 L9 20 L14 17 L19 20 Z" fill="#00e5ff" opacity="0.3"/>
        </svg>
        <div>
          <div style={{
            fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-display)',
            background: 'linear-gradient(90deg, #00e5ff, #b6ff4a)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}>KITE PR</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.14em', marginTop: -1 }}>
            PUERTO RICO WIND TRACKER
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: loading ? '#ff8c42' : '#b6ff4a',
          boxShadow: `0 0 7px ${loading ? '#ff8c42' : '#b6ff4a'}`,
        }}/>
        <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.1em' }}>
          {loading ? 'UPDATING' : 'LIVE'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {lastUpdated && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lastUpdated}</span>}
        <button onClick={onRefresh} disabled={loading} style={{
          background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)',
          borderRadius: 8, padding: '5px 14px',
          color: loading ? 'var(--text-muted)' : 'var(--cyan)',
          fontSize: 11, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-main)', letterSpacing: '0.04em', transition: 'all 0.2s',
        }}>
          ↻ Refresh
        </button>
      </div>
    </header>
  );
}

function QuickBar({ spots }) {
  const live = spots.filter(s => s.wind?.avg != null);
  if (!live.length) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      padding: '0 24px', height: 36,
      borderBottom: '1px solid var(--border)',
      background: 'rgba(13,21,37,0.4)',
      overflowX: 'auto', flexShrink: 0,
    }}>
      <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.14em', marginRight: 18, whiteSpace: 'nowrap' }}>
        QUICK LOOK
      </span>
      {live.map((spot, i) => (
        <div key={spot.id ?? spot.name} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '0 14px', borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
          whiteSpace: 'nowrap',
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: getWindColor(spot.wind.avg),
            boxShadow: `0 0 5px ${getWindColor(spot.wind.avg)}99`,
          }}/>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{spot.name}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: getWindColor(spot.wind.avg), fontFamily: 'var(--font-display)' }}>
            {Math.round(spot.wind.avg)} kts
          </span>
          {spot.wind.directionText && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{spot.wind.directionText}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function FilterBar({ region, setRegion, typeFilter, setTypeFilter }) {
  const regionColors = { North: '#00e5ff', East: '#b6ff4a', South: '#ff8c42', West: '#c084fc' };
  return (
    <div style={{ padding: '10px 12px 6px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Type filter */}
      <div style={{ display: 'flex', gap: 4 }}>
        {TYPES.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{
            background: typeFilter === t ? 'rgba(255,255,255,0.1)' : 'transparent',
            border: `1px solid ${typeFilter === t ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 20, padding: '3px 10px',
            color: typeFilter === t ? 'var(--text-primary)' : 'var(--text-muted)',
            fontSize: 10, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-main)', letterSpacing: '0.04em', transition: 'all 0.2s',
          }}>{t}</button>
        ))}
      </div>
      {/* Region filter */}
      <div style={{ display: 'flex', gap: 4 }}>
        {REGIONS.map(r => (
          <button key={r} onClick={() => setRegion(r)} style={{
            background: region === r ? (regionColors[r] ? `${regionColors[r]}18` : 'rgba(255,255,255,0.08)') : 'transparent',
            border: `1px solid ${region === r ? (regionColors[r] ? `${regionColors[r]}50` : 'rgba(255,255,255,0.2)') : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 20, padding: '3px 10px',
            color: region === r ? (regionColors[r] || 'var(--text-primary)') : 'var(--text-muted)',
            fontSize: 10, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-main)', letterSpacing: '0.04em', transition: 'all 0.2s',
          }}>{r}</button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [spots, setSpots]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [region, setRegion]         = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  const fetchSpots = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/spots');
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setSpots(data);
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpots();
    const interval = setInterval(fetchSpots, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchSpots]);

  const filtered = spots
    .filter(s => region === 'All' || s.region === region)
    .filter(s => {
      if (typeFilter === 'All') return true;
      if (typeFilter === 'Airports') return s.type === 'airport';
      if (typeFilter === 'Buoys') return s.type === 'buoy';
      return s.type === 'kite';
    });

  const selectKey = s => s.id ?? s.name;
  const selectedSpot = spots.find(s => selectKey(s) === selectedId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header lastUpdated={lastUpdated} loading={loading} onRefresh={fetchSpots} />
      <QuickBar spots={spots} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: 310, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid var(--border)',
          background: 'rgba(5,10,20,0.65)',
          overflow: 'hidden',
        }}>
          <FilterBar region={region} setRegion={setRegion} typeFilter={typeFilter} setTypeFilter={setTypeFilter} />

          <div style={{ overflowY: 'auto', flex: 1, padding: '0 12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {error && (
              <div style={{
                background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)',
                borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#ff4757',
              }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>⚠ Cannot reach server</div>
                <code style={{ fontSize: 10, color: '#ff8c42' }}>cd server && node index.js</code>
              </div>
            )}

            {loading && !spots.length
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              : filtered.map(spot => (
                  <SpotCard
                    key={selectKey(spot)}
                    spot={spot}
                    selected={selectKey(spot) === selectedId}
                    onClick={() => setSelectedId(selectKey(spot) === selectedId ? null : selectKey(spot))}
                  />
                ))
            }

            <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                iKitesurf stations · Open-Meteo forecast<br/>
                Auto-refreshes every 5 min
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {spots.length > 0 && (
            <KiteMap
              spots={spots}
              selectedId={selectedId}
              onSpotSelect={id => setSelectedId(id === selectedId ? null : id)}
            />
          )}

          {!spots.length && !error && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 12,
            }}>
              <div style={{ fontSize: 36, opacity: 0.15 }}>🪁</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading spots...</div>
            </div>
          )}

          {/* Selected spot overlay */}
          {selectedSpot?.wind?.avg != null && (() => {
            const s = selectedSpot;
            const label = getWindLabel(s.wind.avg);
            const color = getWindColor(s.wind.avg);
            return (
              <div style={{
                position: 'absolute', top: 16, right: 16,
                background: 'rgba(5,10,20,0.93)',
                border: `1px solid ${color}30`,
                borderRadius: 16, padding: '16px 20px',
                backdropFilter: 'blur(24px)',
                zIndex: 1000, minWidth: 200,
                boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px ${color}15`,
                animation: 'fade-in 0.3s ease forwards',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                  {s.region} · {s.location}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 10 }}>
                  {s.name}
                </div>
                <div style={{ fontSize: 42, fontWeight: 800, fontFamily: 'var(--font-display)', color, lineHeight: 1 }}>
                  {Math.round(s.wind.avg)}
                  <span style={{ fontSize: 16, fontWeight: 500, marginLeft: 4, opacity: 0.6 }}>kts</span>
                </div>
                {s.wind.gust != null && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Gust {Math.round(s.wind.gust)} kts · {s.wind.directionText || ''}
                  </div>
                )}
                <div style={{
                  marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: `${color}15`, border: `1px solid ${color}30`,
                  borderRadius: 20, padding: '4px 10px',
                  fontSize: 11, fontWeight: 700, color, letterSpacing: '0.06em',
                }}>
                  {label.emoji} {label.text}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
      borderLeft: '3px solid rgba(255,255,255,0.05)',
      borderRadius: 14, padding: '14px 16px',
    }}>
      <div style={{ height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 7, width: '50%' }}/>
      <div style={{ height: 9,  background: 'rgba(255,255,255,0.03)', borderRadius: 4, marginBottom: 14, width: '30%' }}/>
      <div style={{ height: 80, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}/>
    </div>
  );
}
