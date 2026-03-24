import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { getWindColor, getWindLabel } from './WindGauge';
import 'leaflet/dist/leaflet.css';

function createSpotIcon(avg, selected, type) {
  const color = getWindColor(avg);
  const size  = selected ? 18 : 14;
  const pad   = 12;
  const total = size + pad;
  const c     = total / 2;

  let shape;
  if (type === 'buoy') {
    // Diamond shape for buoys
    const h = size / 2 + 1;
    shape = `
      <polygon points="${c},${c - h} ${c + h},${c} ${c},${c + h} ${c - h},${c}"
        fill="${color}" opacity="0.9" style="filter:drop-shadow(0 0 6px ${color}99)"/>
      <polygon points="${c},${c - h} ${c + h},${c} ${c},${c + h} ${c - h},${c}"
        fill="none" stroke="${color}" stroke-width="1" opacity="0.4"/>
    `;
  } else if (type === 'airport') {
    // Square for airports
    const h = size / 2;
    shape = `
      <rect x="${c - h}" y="${c - h}" width="${size}" height="${size}" rx="3"
        fill="${color}" opacity="0.85" style="filter:drop-shadow(0 0 6px ${color}88)"/>
    `;
  } else {
    // Circle for kite spots
    shape = `
      <circle cx="${c}" cy="${c}" r="${size / 2 + 2}" fill="${color}22"/>
      <circle cx="${c}" cy="${c}" r="${size / 2}" fill="${color}" style="filter:drop-shadow(0 0 8px ${color}99)"/>
    `;
  }

  const ring = selected
    ? `<circle cx="${c}" cy="${c}" r="${size / 2 + 6}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.45"/>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}">${shape}${ring}</svg>`;

  return L.divIcon({
    html: svg,
    className: 'spot-marker-icon',
    iconSize: [total, total],
    iconAnchor: [c, c],
  });
}

export default function KiteMap({ spots, selectedId, onSpotSelect }) {
  return (
    <MapContainer
      center={[18.22, -66.6]}
      zoom={9}
      style={{ width: '100%', height: '100%', borderRadius: 0 }}
      zoomControl={true}
      attributionControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        maxZoom={17}
      />
      {spots.map(spot => (
        <Marker
          key={spot.id ?? spot.name}
          position={[spot.lat, spot.lon]}
          icon={createSpotIcon(spot.wind?.avg, (spot.id ?? spot.name) === selectedId, spot.type)}
          eventHandlers={{ click: () => onSpotSelect(spot.id ?? spot.name) }}
        >
          <Tooltip
            permanent={false}
            direction="top"
            offset={[0, -8]}
            opacity={1}
          >
            <div style={{
              background: '#0d1525',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              padding: '6px 10px',
              fontFamily: 'Inter, sans-serif',
              color: '#f0f4ff',
              fontSize: 12,
              minWidth: 110,
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}>
              <div style={{ fontWeight: 700, marginBottom: 2, fontFamily: 'Space Grotesk, sans-serif' }}>{spot.name}</div>
              <div style={{ color: spot.wind?.avg ? getWindColor(spot.wind.avg) : 'rgba(255,255,255,0.3)', fontWeight: 600, fontSize: 13 }}>
                {spot.wind?.avg != null
                  ? `${Math.round(spot.wind.avg)} kts ${spot.wind.directionText || ''}`
                  : 'No data'}
              </div>
              {spot.wind?.gust != null && (
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 1 }}>
                  Gust {Math.round(spot.wind.gust)} kts
                </div>
              )}
            </div>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
