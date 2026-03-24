// Compass rose with animated direction arrow
export default function WindArrow({ direction, directionText, size = 64 }) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* Compass ring */}
        <svg viewBox="0 0 64 64" width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
          <circle
            cx={32} cy={32} r={30}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
          {/* Cardinal tick marks */}
          {[0,90,180,270].map(deg => {
            const rad = (deg - 90) * Math.PI / 180;
            return (
              <line
                key={deg}
                x1={32 + 26 * Math.cos(rad)}
                y1={32 + 26 * Math.sin(rad)}
                x2={32 + 30 * Math.cos(rad)}
                y2={32 + 30 * Math.sin(rad)}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={1.5}
              />
            );
          })}
          {/* N label */}
          <text x={32} y={7} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={7} fontFamily="Inter">N</text>
        </svg>

        {/* Arrow (rotates to wind direction) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: direction != null ? `rotate(${direction}deg)` : 'none',
            transition: 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55}>
            {/* Arrow pointing up (= North = 0°) */}
            <path
              d="M12 3 L16 13 L12 11 L8 13 Z"
              fill="#00e5ff"
              style={{ filter: 'drop-shadow(0 0 4px #00e5ff88)' }}
            />
            <path
              d="M12 21 L8 11 L12 13 L16 11 Z"
              fill="rgba(255,255,255,0.15)"
            />
          </svg>
        </div>
      </div>

      {/* Direction text */}
      <span style={{
        fontSize: 12,
        fontWeight: 600,
        color: direction != null ? '#00e5ff' : 'rgba(255,255,255,0.25)',
        letterSpacing: '0.05em',
        fontFamily: 'var(--font-display)',
      }}>
        {directionText || (direction != null ? degToCompass(direction) : '—')}
      </span>
    </div>
  );
}

function degToCompass(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}
