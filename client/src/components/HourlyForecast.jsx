import { useEffect, useState, useRef } from 'react';
import { getWindColor } from './WindGauge';

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
      .then(data => { setHours(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [spot?.lat, spot?.lon]);

  if (loading) return <div style={{ padding: '12px 0', fontSize: 11, color: 'var(--text-muted)' }}>Loading forecast...</div>;
  if (error)   return <div style={{ padding: '10px 0', fontSize: 11, color: '#ff4757' }}>Failed to load forecast</div>;
  if (!hours.length) return null;

  const maxWind = Math.max(...hours.map(h => h.avg || 0), 20);
  const CHART_H = 80;
  const BAR_W   = 26;

  return (
    <div>
      <div
        ref={scrollRef}
        style={{ overflowX: 'auto', overflowY: 'visible', paddingBottom: 4,
          scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
      >
        {/* Extra top padding so tooltip doesn't get clipped */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2,
          minWidth: 'max-content', height: CHART_H + 50, paddingTop: 44, paddingBottom: 0,
          position: 'relative' }}
        >
          {hours.map((hour, i) => {
            const color  = getWindColor(hour.avg);
            const barH   = hour.avg != null ? Math.max(5, (hour.avg / maxWind) * CHART_H) : 4;
            const isNow  = i === 0;
            const isHov  = hovered === i;
            const showLabel = i === 0 || new Date(hour.time).getHours() % 3 === 0;

            return (
              <div
                key={hour.time}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  width: BAR_W, height: '100%',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'flex-end',
                  gap: 3, cursor: 'crosshair', position: 'relative',
                  flexShrink: 0,
                }}
              >
                {/* Tooltip above bar */}
                {isHov && (
                  <div style={{
                    position: 'absolute', bottom: barH + 22, left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(5,10,20,0.97)',
                    border: `1px solid ${color}55`,
                    borderRadius: 8, padding: '6px 10px',
                    whiteSpace: 'nowrap', zIndex: 999,
                    boxShadow: `0 4px 16px rgba(0,0,0,0.6), 0 0 0 1px ${color}22`,
                    pointerEvents: 'none',
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                      {hour.avg != null ? `${Math.round(hour.avg)} kts` : '—'}
                    </div>
                    {hour.gust != null && (
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                        Gust {Math.round(hour.gust)} kts
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
                      {degToCompass(hour.direction)} · {formatHour(hour.time)}
                    </div>
                    {/* Arrow pointing down */}
                    <div style={{
                      position: 'absolute', bottom: -5, left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0, height: 0,
                      borderLeft: '5px solid transparent',
                      borderRight: '5px solid transparent',
                      borderTop: `5px solid ${color}55`,
                    }}/>
                  </div>
                )}

                {/* Bar */}
                <div style={{
                  width: '80%', height: barH,
                  background: isHov ? color : `linear-gradient(to top, ${color}dd, ${color}44)`,
                  borderRadius: '3px 3px 1px 1px',
                  boxShadow: isHov ? `0 0 10px ${color}99` : 'none',
                  transition: 'all 0.12s ease',
                  position: 'relative', flexShrink: 0,
                }}>
                  {isNow && (
                    <div style={{
                      position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)',
                      width: 4, height: 4, borderRadius: '50%',
                      background: '#b6ff4a', boxShadow: '0 0 6px #b6ff4a',
                    }}/>
                  )}
                </div>

                {/* Time label */}
                <div style={{
                  fontSize: 9, whiteSpace: 'nowrap', flexShrink: 0,
                  color: isNow ? '#b6ff4a' : isHov ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)',
                  fontWeight: isNow || isHov ? 600 : 400,
                  visibility: showLabel || isHov ? 'visible' : 'hidden',
                }}>
                  {formatHour(hour.time)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        {[['Light','#63b3ed'],['Perfect','#b6ff4a'],['Great','#00e5ff'],['Strong','#ff8c42']].map(([label, color]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: color }}/>
            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
