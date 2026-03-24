const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const KPH_TO_KTS  = 0.539957;
const MS_TO_KTS   = 1.94384;
const NOAA_UA     = 'KitePR-Dashboard/1.0 (kitesurfing wind tracker)';
const CACHE_TTL   = 5 * 60 * 1000; // 5 minutes

// Simple in-memory cache
const cache = { data: null, ts: 0 };

// Stagger concurrent Open-Meteo calls to avoid rate limiting
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PR_SPOTS = [
  // ── Kite spots ──────────────────────────────────────────────────────────
  { id: 567580, name: 'Ocean Park',   location: 'San Juan',   lat: 18.45444, lon: -66.05504, region: 'North', type: 'kite' },
  { id: 86742,  name: 'Shacks',       location: 'Aguadilla',  lat: 18.50258, lon: -67.12644, region: 'North', type: 'kite' },
  { id: null,   name: 'Las Picuas',   location: 'Río Mar',    lat: 18.4124,  lon: -65.7704,  region: 'East',  type: 'kite' },
  { id: null,   name: 'Luquillo',     location: 'Luquillo',   lat: 18.3865,  lon: -65.7289,  region: 'East',  type: 'kite' },
  { id: null,   name: 'Dakiti',       location: 'Culebra',    lat: 18.2924,  lon: -65.2791,  region: 'East',  type: 'kite' },
  { id: 86743,  name: 'Ponce',        location: 'Ponce',      lat: 18.01,    lon: -66.61,    region: 'South', type: 'kite' },
  { id: null,   name: 'Pozuelo',      location: 'Guayama',    lat: 17.933,   lon: -66.1973,  region: 'South', type: 'kite' },
  { id: null,   name: 'La Parguera',  location: 'Lajas',      lat: 17.9693,  lon: -67.0296,  region: 'South', type: 'kite' },
  { id: null,   name: 'Boquerón',     location: 'Cabo Rojo',  lat: 18.0276,  lon: -67.1694,  region: 'West',  type: 'kite' },
  { id: null,   name: 'Isabela',      location: 'Isabela',    lat: 18.5142,  lon: -67.0544,  region: 'West',  type: 'kite' },

  // ── Ocean buoys (NDBC) ──────────────────────────────────────────────────
  { buoy: '41053', name: 'Buoy – North PR',     location: 'North offshore',  lat: 18.474, lon: -66.099, region: 'North', type: 'buoy' },
  { buoy: '41056', name: 'Buoy – Vieques Sound',location: 'East offshore',   lat: 18.261, lon: -65.464, region: 'East',  type: 'buoy' },
  { buoy: '41052', name: 'Buoy – East PR',      location: 'SE offshore',     lat: 18.249, lon: -64.763, region: 'East',  type: 'buoy' },
  { buoy: '42085', name: 'Buoy – South PR',     location: 'South offshore',  lat: 17.870, lon: -66.537, region: 'South', type: 'buoy' },

  // ── Airports (NOAA) ─────────────────────────────────────────────────────
  { noaa: 'TJSJ', name: 'SJU – Muñoz Marín',  location: 'San Juan',   lat: 18.4394,  lon: -66.0018,  region: 'North', type: 'airport' },
  { noaa: 'TJIG', name: 'SIG – Isla Grande',   location: 'San Juan',   lat: 18.4568,  lon: -66.0981,  region: 'North', type: 'airport' },
  { noaa: 'TJBQ', name: 'BQN – Aguadilla',     location: 'Aguadilla',  lat: 18.4948,  lon: -67.1294,  region: 'North', type: 'airport' },
  { noaa: 'TJMZ', name: 'MAZ – Mayagüez',      location: 'Mayagüez',   lat: 18.2556,  lon: -67.1485,  region: 'West',  type: 'airport' },
  { noaa: 'TJPS', name: 'PSE – Ponce',         location: 'Ponce',      lat: 18.0083,  lon: -66.5630,  region: 'South', type: 'airport' },
  { noaa: 'TJRV', name: 'NRR – Ceiba',         location: 'Ceiba',      lat: 18.2453,  lon: -65.6434,  region: 'East',  type: 'airport' },
  { noaa: 'TJVQ', name: 'VQS – Vieques',       location: 'Vieques',    lat: 18.1158,  lon: -65.4936,  region: 'East',  type: 'airport' },
  { noaa: 'TJCP', name: 'CPX – Culebra',       location: 'Culebra',    lat: 18.3127,  lon: -65.3034,  region: 'East',  type: 'airport' },
];

// ── iKitesurf scraper ────────────────────────────────────────────────────
async function fetchIkitesurfSpot(spotId) {
  const res = await axios.get(`https://wx.ikitesurf.com/spot/${spotId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    timeout: 12000,
  });
  const html = res.data;

  const get = (re) => { const m = html.match(re); return m ? m[1] : null; };
  const stationId = get(/"Station_Id"\s*:\s*(\d+)/);
  const statusId  = get(/"Status_Id"\s*:\s*(\d+)/);
  const spotName  = get(/"spot_name"\s*:\s*"([^"]+)"/);
  const lat       = get(/"latitude"\s*:\s*([\d.-]+)/);
  const lon       = get(/"longitude"\s*:\s*([\d.-]+)/);

  let windData = null;
  const dvMatch = html.match(/"data_values"\s*:\s*(\[\[[\s\S]*?\]\])/);
  if (dvMatch) {
    try {
      const row = JSON.parse(dvMatch[1])[0];
      const avgKph  = typeof row[2] === 'number' ? row[2] : null;
      const gustKph = typeof row[7] === 'number' ? row[7] : null;
      const dirDeg  = typeof row[5] === 'number' ? row[5] : null;
      const dirText = typeof row[6] === 'string' ? row[6] : null;
      const effectiveKph = avgKph ?? gustKph;
      if (effectiveKph != null) {
        windData = {
          avg:           parseFloat((effectiveKph * KPH_TO_KTS).toFixed(1)),
          gust:          avgKph != null && gustKph != null ? parseFloat((gustKph * KPH_TO_KTS).toFixed(1)) : null,
          direction:     dirDeg,
          directionText: dirText,
          timestamp:     row[0] || null,
          source:        'ikitesurf',
          isGustOnly:    avgKph == null,
        };
      }
    } catch (_) {}
  }

  return {
    stationId: stationId ? parseInt(stationId) : null,
    stationUp: statusId ? parseInt(statusId) === 1 : false,
    spotName, lat: lat ? parseFloat(lat) : null,
    lon: lon ? parseFloat(lon) : null,
    windData,
  };
}

// ── NOAA airport observations ────────────────────────────────────────────
async function fetchNOAA(stationId) {
  const res = await axios.get(
    `https://api.weather.gov/stations/${stationId}/observations/latest`,
    {
      headers: { 'User-Agent': NOAA_UA, 'Accept': 'application/json' },
      timeout: 10000,
    }
  );
  const p = res.data?.properties;
  if (!p) return null;
  const mps = p.windSpeed?.value;
  const gustMps = p.windGust?.value;
  return {
    avg:           mps     != null ? parseFloat((mps * MS_TO_KTS).toFixed(1))     : null,
    gust:          gustMps != null ? parseFloat((gustMps * MS_TO_KTS).toFixed(1)) : null,
    direction:     p.windDirection?.value ?? null,
    directionText: degToCompass(p.windDirection?.value),
    timestamp:     p.timestamp ?? null,
    source:        'noaa',
    isGustOnly:    false,
  };
}

// ── NDBC ocean buoys ─────────────────────────────────────────────────────
async function fetchNDBC(stationId) {
  const res = await axios.get(
    `https://www.ndbc.noaa.gov/data/realtime2/${stationId}.txt`,
    { headers: { 'User-Agent': NOAA_UA }, timeout: 10000 }
  );
  const lines = res.data.split('\n').filter(l => l && !l.startsWith('#'));
  if (!lines.length) return null;
  const parts = lines[0].trim().split(/\s+/);
  // cols: YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP ...
  const parse = (v) => (v === 'MM' || v == null) ? null : parseFloat(v);
  const wspd = parse(parts[6]);
  const gst  = parse(parts[7]);
  const wdir = parse(parts[5]);
  const wvht = parse(parts[8]); // wave height metres
  const [yr, mo, dy, hr, mn] = parts;
  const timestamp = `${yr}-${mo}-${dy}T${hr}:${mn}:00`;
  return {
    avg:           wspd != null ? parseFloat((wspd * MS_TO_KTS).toFixed(1)) : null,
    gust:          gst  != null ? parseFloat((gst  * MS_TO_KTS).toFixed(1)) : null,
    direction:     wdir,
    directionText: degToCompass(wdir),
    waveHeight:    wvht,
    timestamp,
    source:        'ndbc',
    isGustOnly:    false,
  };
}

// ── Open-Meteo fallback ──────────────────────────────────────────────────
async function fetchOpenMeteo(lat, lon) {
  const res = await axios.get('https://api.open-meteo.com/v1/forecast', {
    params: {
      latitude: lat, longitude: lon,
      current: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m',
      wind_speed_unit: 'kn',
      timezone: 'America/Puerto_Rico',
    },
    timeout: 10000,
  });
  const c = res.data?.current;
  if (!c) return null;
  return {
    avg:           c.wind_speed_10m    != null ? parseFloat(c.wind_speed_10m.toFixed(1))    : null,
    gust:          c.wind_gusts_10m   != null ? parseFloat(c.wind_gusts_10m.toFixed(1))   : null,
    direction:     c.wind_direction_10m ?? null,
    directionText: degToCompass(c.wind_direction_10m),
    timestamp:     c.time,
    source:        'open-meteo',
    isGustOnly:    false,
  };
}

function degToCompass(deg) {
  if (deg == null) return null;
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// ── Fetch one spot ───────────────────────────────────────────────────────
async function fetchSpot(spot) {
  try {
    if (spot.buoy) {
      // Ocean buoy: NDBC live reading
      const wind = await fetchNDBC(spot.buoy).catch(() => fetchOpenMeteo(spot.lat, spot.lon));
      return { ...spot, wind };
    }

    if (spot.noaa) {
      // Airport: use NOAA live observation
      const wind = await fetchNOAA(spot.noaa).catch(() => fetchOpenMeteo(spot.lat, spot.lon));
      return { ...spot, wind };
    }

    if (spot.id) {
      // iKitesurf spot: scrape page, fall back to Open-Meteo if station down
      const data = await fetchIkitesurfSpot(spot.id);
      const wind = data.windData?.avg != null
        ? data.windData
        : await fetchOpenMeteo(data.lat || spot.lat, data.lon || spot.lon);
      return {
        ...spot,
        name:      data.spotName || spot.name,
        lat:       data.lat      || spot.lat,
        lon:       data.lon      || spot.lon,
        stationId: data.stationId,
        stationUp: data.stationUp,
        wind,
      };
    }

    // Kite spot without iKitesurf station: Open-Meteo only
    const wind = await fetchOpenMeteo(spot.lat, spot.lon);
    return { ...spot, wind };

  } catch (err) {
    return { ...spot, wind: null, error: err.message };
  }
}

// ── Routes ───────────────────────────────────────────────────────────────
// Fetch all spots sequentially to avoid rate limiting Open-Meteo
async function refreshCache() {
  console.log('Refreshing wind cache...');
  const results = [];
  for (const spot of PR_SPOTS) {
    results.push(await fetchSpot(spot));
    await sleep(300); // 300ms between every request
  }
  cache.data = results;
  cache.ts   = Date.now();
  console.log('Cache refreshed:', results.filter(s => s.wind?.avg != null).length + '/' + results.length + ' spots with data');
  return results;
}

app.get('/api/spots', async (req, res) => {
  if (cache.data && Date.now() - cache.ts < CACHE_TTL) {
    return res.json(cache.data);
  }
  const results = await refreshCache();
  res.json(results);
});

// Pre-warm cache on startup and refresh every 10 minutes
refreshCache();
setInterval(refreshCache, 10 * 60 * 1000);

app.get('/api/spot/:id', async (req, res) => {
  const spotId = parseInt(req.params.id);
  const spot = PR_SPOTS.find(s => s.id === spotId) || { id: spotId, name: 'Unknown', location: 'Puerto Rico', lat: 18.2, lon: -66.5 };
  res.json(await fetchSpot(spot));
});

app.get('/api/forecast', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon required' });
  try {
    const result = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat, longitude: lon,
        hourly: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m',
        wind_speed_unit: 'kn',
        timezone: 'America/Puerto_Rico',
        forecast_days: 2,
      },
      timeout: 10000,
    });
    const h = result.data.hourly;
    const now = new Date();
    const hours = h.time
      .map((t, i) => ({
        time:      t,
        avg:       h.wind_speed_10m[i]    != null ? parseFloat(h.wind_speed_10m[i].toFixed(1))    : null,
        gust:      h.wind_gusts_10m[i]   != null ? parseFloat(h.wind_gusts_10m[i].toFixed(1))   : null,
        direction: h.wind_direction_10m[i] ?? null,
      }))
      .filter(h => new Date(h.time) >= new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()))
      .slice(0, 24);
    res.json(hours);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve React build in production
const path = require('path');
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '../client/dist');
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => res.sendFile(path.join(clientBuild, 'index.html')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`PR Kite API running on http://localhost:${PORT}`));
