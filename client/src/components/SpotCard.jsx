import WindGauge, { getWindColor, getWindLabel } from './WindGauge';
import WindArrow from './WindArrow';
import HourlyForecast from './HourlyForecast';

export default function SpotCard({ spot, selected, onClick }) {
  const wind  = spot.wind;
  const avg   = wind?.avg;
  const label = getWindLabel(avg);
  const color = getWindColor(avg);
  const isOffline = spot.stationId && !spot.stationUp;

  const regionColors = {
    North: '#00e5ff',
    East:  '#b6ff4a',
    South: '#ff8c42',
    West:  '#c084fc',
  };
  const regionColor = regionColors[spot.region] || '#00e5ff';

  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? `rgba(0,229,255,0.05)` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${selected ? 'rgba(0,229,255,0.35)' : 'rgba(255,255,255,0.07)'}`,
        borderLeft: `3px solid ${avg != null ? color : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 14,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: selected ? `0 0 24px rgba(0,229,255,0.08)` : 'none',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {spot.type === 'airport' && <span style={{ fontSize: 12 }}>✈️</span>}
            {spot.type === 'buoy'    && <span style={{ fontSize: 12 }}>🌊</span>}
            {spot.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', color: regionColor, textTransform: 'uppercase' }}>
              {spot.region}
            </span>
            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{spot.location}</span>
          </div>
        </div>

        <div style={{
          fontSize: 10, fontWeight: 700, padding: '3px 8px',
          borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase',
          background: isOffline ? 'rgba(74,85,104,0.15)' : avg != null ? `${color}18` : 'rgba(74,85,104,0.1)',
          color: isOffline ? '#4a5568' : avg != null ? color : '#4a5568',
          border: `1px solid ${isOffline ? 'rgba(74,85,104,0.25)' : avg != null ? `${color}35` : 'rgba(74,85,104,0.2)'}`,
          whiteSpace: 'nowrap',
        }}>
          {isOffline ? 'Offline' : avg != null ? `${label.emoji} ${label.text}` : 'No Data'}
        </div>
      </div>

      {/* Current conditions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <WindGauge avg={avg} gust={wind?.gust} size={120} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <WindArrow direction={wind?.direction} directionText={wind?.directionText} size={60} />
          <div style={{ textAlign: 'center' }}>
            {wind?.source && (
              <div style={{
                fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2,
                color: wind.source === 'ikitesurf' ? 'rgba(0,229,255,0.5)' : wind.source === 'noaa' ? 'rgba(192,132,252,0.6)' : wind.source === 'ndbc' ? 'rgba(56,189,248,0.7)' : 'rgba(182,255,74,0.4)',
              }}>
                {wind.source === 'ikitesurf' ? 'iKitesurf' : wind.source === 'noaa' ? 'NOAA' : wind.source === 'ndbc' ? 'NDBC Buoy' : 'Open-Meteo'}
              </div>
            )}
            {wind?.timestamp && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatTime(wind.timestamp)}</div>
            )}
            {wind?.isGustOnly && (
              <div style={{ fontSize: 9, color: '#ff8c42', marginTop: 2 }}>peak wind</div>
            )}
            {wind?.waveHeight != null && (
              <div style={{ fontSize: 10, color: 'rgba(56,189,248,0.8)', marginTop: 3, fontWeight: 600 }}>
                🌊 {wind.waveHeight.toFixed(1)}m swell
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hourly forecast — only when selected */}
      {selected && (
        <div style={{
          marginTop: 16, paddingTop: 14,
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
            color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10,
          }}>
            24-Hour Forecast
          </div>
          <HourlyForecast spot={spot} />
        </div>
      )}

      {/* Footer */}
      {spot.id && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <a
            href={`https://wx.ikitesurf.com/spot/${spot.id}`}
            target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ fontSize: 10, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--cyan)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
            </svg>
            View full forecast on iKitesurf
          </a>
        </div>
      )}
    </div>
  );
}

function formatTime(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts.includes('T') || ts.includes(' ') ? ts : Number(ts) * 1000);
    if (isNaN(d)) return ts;
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return ''; }
}
