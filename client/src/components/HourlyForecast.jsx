import { useEffect, useState, useRef } from 'react';
import { getWindColor, getWindLabel } from './WindGauge';

function degToCompass(deg) {
  if (deg == null) return '';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function formatHour(timeStr) {
  const d = new Date(timeStr);
  const h = d.getHours();
  if (h === 0)  return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function ArrowSmall({ direction, color, size = 14 }) {
  if (direction == null) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 14 14"
      style={{ transform: `rotate(${direction}deg)`, display: 'block', flexShrink: 0 }}>
      <path d="M7 1 L10 10 L7 8 L4 10 Z" fill={color} opacity={0.9}/>
    </svg>
  );
}

export default function HourlyForecast({ spot }) {
  const [hours, setHours]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [hovered, setHovered] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!spot) return;
    setLoading(true);
    setError(null);
    setHours([]);
    fetch(`/api/forecast?lat=${spot.lat}&lon=${spot.lon}`)
      .then(r => r.json())
      .then(data => {
        setHours(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [spot?.lat, spot?.lon]);

  // Scroll to current hour on load
  useEffect(() => {
    if (hours.length && scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [hours]);

  const maxWind = Math.max(...hours.map(h => h.avg || 0), 25);

  if (loading) return (
    <div style={{ padding: '16px 0', textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Loading forecast...</div>
    </div>
  );

  if (error) return (
    <div style={{ padding: '10px 0', fontSize: 11, color: '#ff4757' }}>Failed to load forecast</div>
  );

  const hoveredHour = hovered != null ? hours[hovered] : null;

  return (
    <div>
      {/* Hovered detail */}
      <div style={{
        height: 36, display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 8, padding: '0 4px',
      }}>
        {hoveredHour ? (
          <>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', color: getWindColor(hoveredHour.avg) }}>
              {hoveredHour.avg != null ? `${Math.round(hoveredHour.avg)} kts` : '—'}
            </span>
            {hoveredHour.gust != null && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                G {Math.round(hoveredHour.gust)}
              </span>
            )}
            <ArrowSmall direction={hoveredHour.direction} color={getWindColor(hoveredHour.avg)} size={14} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {degToCompass(hoveredHour.direction)}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {formatHour(hoveredHour.time)}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hover a bar to see details</span>
        )}
      </div>

      {/* Chart */}
      <div
        ref={scrollRef}
        style={{
          overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.1) transparent',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, minWidth: 'max-content', height: 100, paddingTop: 8 }}>
          {hours.map((hour, i) => {
            const color  = getWindColor(hour.avg);
            const barH   = hour.avg != null ? Math.max(4, (hour.avg / maxWind) * 80) : 3;
            const isNow  = i === 0;
            const isHov  = hovered === i;
            const h      = new Date(hour.time).getHours();
            const showLabel = i === 0 || h % 3 === 0;

            return (
              <div
                key={hour.time}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 3, width: 28,
                  cursor: 'default',
                }}
              >
                {/* Bar */}
                <div style={{
                  width: '100%', height: barH,
                  background: isHov
                    ? color
                    : `linear-gradient(to top, ${color}cc, ${color}55)`,
                  borderRadius: '3px 3px 1px 1px',
                  boxShadow: isHov ? `0 0 8px ${color}88` : 'none',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  marginTop: 'auto',
                }}>
                  {isNow && (
                    <div style={{
                      position: 'absolute', top: -6, left: '50%',
                      transform: 'translateX(-50%)',
                      width: 4, height: 4, borderRadius: '50%',
                      background: '#b6ff4a',
                      boxShadow: '0 0 6px #b6ff4a',
                    }}/>
                  )}
                </div>

                {/* Direction arrow */}
                <div style={{ opacity: isHov ? 1 : 0.5, transition: 'opacity 0.15s' }}>
                  <ArrowSmall direction={hour.direction} color={color} size={10} />
                </div>

                {/* Time label */}
                <div style={{
                  fontSize: 9, color: isNow ? '#b6ff4a' : 'rgba(255,255,255,0.25)',
                  fontWeight: isNow ? 700 : 400,
                  whiteSpace: 'nowrap',
                  visibility: showLabel ? 'visible' : 'hidden',
                }}>
                  {formatHour(hour.time)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Wind quality legend */}
      <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        {[
          { label: 'Light', color: '#63b3ed' },
          { label: 'Perfect', color: '#b6ff4a' },
          { label: 'Great', color: '#00e5ff' },
          { label: 'Strong', color: '#ff8c42' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
