export function getWindColor(kts) {
  if (kts == null) return '#2d3748';
  if (kts < 8)   return '#4a5568';  // too light
  if (kts < 12)  return '#63b3ed';  // light
  if (kts < 20)  return '#b6ff4a';  // perfect
  if (kts < 28)  return '#00e5ff';  // great
  if (kts < 35)  return '#ff8c42';  // strong
  return '#ff4757';                  // danger
}

export function getWindLabel(kts) {
  if (kts == null) return { text: 'No Data',    emoji: '—',  color: '#4a5568' };
  if (kts < 8)    return { text: 'Too Light',   emoji: '😴', color: '#4a5568' };
  if (kts < 12)   return { text: 'Light',       emoji: '🪁', color: '#63b3ed' };
  if (kts < 20)   return { text: 'PERFECT',     emoji: '🔥', color: '#b6ff4a' };
  if (kts < 28)   return { text: 'Great',       emoji: '⚡', color: '#00e5ff' };
  if (kts < 35)   return { text: 'Strong',      emoji: '💨', color: '#ff8c42' };
  return           { text: 'Dangerous',         emoji: '⚠️', color: '#ff4757' };
}

// Main gauge component
export default function WindGauge({ avg, gust, size = 130 }) {
  const max = 40;
  const pct = Math.min((avg || 0) / max, 1);
  const color = getWindColor(avg);

  const cx = size / 2, cy = size / 2;
  const r = size * 0.38;
  const trackWidth = size * 0.065;

  // Arc from 210° to 330° (300° sweep)
  const START = 210, SWEEP = 300;

  function polarXY(deg, radius = r) {
    const rad = (deg - 90) * (Math.PI / 180);
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  }

  function arcD(startDeg, endDeg) {
    const [sx, sy] = polarXY(startDeg);
    const [ex, ey] = polarXY(endDeg);
    const large = (endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
  }

  const fillEnd = START + SWEEP * pct;

  // Tick marks at 0, 10, 20, 30, 40 kts
  const ticks = [0, 10, 20, 30, 40].map(val => {
    const deg = START + (val / max) * SWEEP;
    const inner = r - trackWidth / 2 - 3;
    const outer = r + trackWidth / 2 + 4;
    const [x1, y1] = polarXY(deg, inner);
    const [x2, y2] = polarXY(deg, outer);
    return { val, x1, y1, x2, y2, deg };
  });

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        {/* Outer glow ring */}
        {avg != null && avg >= 8 && (
          <circle cx={cx} cy={cy} r={r + trackWidth}
            fill="none" stroke={color} strokeWidth={1} opacity={0.12} />
        )}

        {/* Track background */}
        <path d={arcD(START, START + SWEEP)}
          fill="none" stroke="rgba(255,255,255,0.06)"
          strokeWidth={trackWidth} strokeLinecap="round" />

        {/* Colored fill */}
        {pct > 0 && (
          <path d={arcD(START, fillEnd)}
            fill="none" stroke={color}
            strokeWidth={trackWidth} strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 ${size * 0.06}px ${color}99)`,
              transition: 'all 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        )}

        {/* Tick marks */}
        {ticks.map(({ val, x1, y1, x2, y2 }) => (
          <line key={val} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} strokeLinecap="round" />
        ))}

        {/* Tick labels: 10, 20, 30 */}
        {ticks.filter(t => t.val > 0 && t.val < 40).map(({ val, deg }) => {
          const [lx, ly] = polarXY(deg, r + trackWidth / 2 + size * 0.13);
          return (
            <text key={val} x={lx} y={ly + 3} textAnchor="middle"
              fill="rgba(255,255,255,0.22)" fontSize={size * 0.078}
              fontFamily="Inter, sans-serif">
              {val}
            </text>
          );
        })}

        {/* Center: wind speed */}
        <text x={cx} y={cy - size * 0.06} textAnchor="middle"
          fill={avg != null ? color : 'rgba(255,255,255,0.18)'}
          fontSize={avg != null && avg >= 10 ? size * 0.22 : size * 0.19}
          fontWeight="800" fontFamily="'Space Grotesk', sans-serif"
          style={{ transition: 'fill 0.6s' }}>
          {avg != null ? Math.round(avg) : '—'}
        </text>

        {/* Unit label */}
        <text x={cx} y={cy + size * 0.1} textAnchor="middle"
          fill="rgba(255,255,255,0.35)" fontSize={size * 0.085}
          fontFamily="Inter, sans-serif" fontWeight="500" letterSpacing="0.05em">
          KTS
        </text>

        {/* Gust */}
        {gust != null && (
          <>
            <text x={cx} y={cy + size * 0.24} textAnchor="middle"
              fill="rgba(255,255,255,0.25)" fontSize={size * 0.075}
              fontFamily="Inter, sans-serif">
              GUST
            </text>
            <text x={cx} y={cy + size * 0.35} textAnchor="middle"
              fill="rgba(255,255,255,0.45)" fontSize={size * 0.11}
              fontWeight="700" fontFamily="'Space Grotesk', sans-serif">
              {Math.round(gust)}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
