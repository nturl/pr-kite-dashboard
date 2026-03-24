import { useEffect, useState } from 'react';
import { getWindColor } from './WindGauge';

function degToCompass(deg) {
  if (deg == null) return '';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function formatDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tmrw';
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export default function DailyForecast({ spot }) {
  const [days, setDays]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!spot) return;
    setLoading(true);
    setError(null);
    setDays([]);
    fetch(`/api/forecast/daily?lat=${spot.lat}&lon=${spot.lon}`)
      .then(r => r.json())
      .then(data => { setDays(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [spot?.lat, spot?.lon]);

  if (loading) return <div style={{ padding: '10px 0', fontSize: 11, color: 'var(--text-muted)' }}>Loading forecast...</div>;
  if (error)   return <div style={{ padding: '10px 0', fontSize: 11, color: '#ff4757' }}>Failed to load forecast</div>;
  if (!days.length) return null;

  const maxWind = Math.max(...days.map(d => d.max || 0), 20);
  const BAR_MAX = 72;

  return (
    <div>
      <div style={{ display: 'flex', gap: 4 }}>
        {days.map((day, i) => {
          const color  = getWindColor(day.max);
          const barH   = day.max != null ? Math.max(6, (day.max / maxWind) * BAR_MAX) : 4;
          const isToday = i === 0;

          return (
            <div
              key={day.date}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4,
              }}
            >
              {/* Wind speed */}
              <div style={{
                fontSize: 11, fontWeight: 700,
                color: day.max != null ? color : 'rgba(255,255,255,0.2)',
                fontFamily: 'var(--font-display)',
              }}>
                {day.max != null ? Math.round(day.max) : '—'}
              </div>

              {/* Bar */}
              <div style={{
                width: '100%', height: BAR_MAX,
                display: 'flex', alignItems: 'flex-end',
              }}>
                <div style={{
                  width: '100%', height: barH,
                  background: `linear-gradient(to top, ${color}dd, ${color}44)`,
                  borderRadius: '3px 3px 1px 1px',
                  position: 'relative',
                }}>
                  {isToday && (
                    <div style={{
                      position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)',
                      width: 4, height: 4, borderRadius: '50%',
                      background: '#b6ff4a', boxShadow: '0 0 6px #b6ff4a',
                    }}/>
                  )}
                </div>
              </div>

              {/* Direction */}
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>
                {degToCompass(day.direction)}
              </div>

              {/* Day label */}
              <div style={{
                fontSize: 9, fontWeight: isToday ? 700 : 400,
                color: isToday ? '#b6ff4a' : 'rgba(255,255,255,0.35)',
                whiteSpace: 'nowrap',
              }}>
                {formatDay(day.date)}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 6, fontSize: 9, color: 'rgba(255,255,255,0.2)', textAlign: 'right' }}>
        kts · max daily wind
      </div>
    </div>
  );
}
