const EARTH_RADIUS_MILES = 3958.8;
const MAX_CACHED_LOCATIONS = 1000;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

function calculateDistance(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Nominatim's usage policy allows at most one request per second, so lookups
// are spaced out and each location is looked up once per server process.
const cache = new Map();
let nextRequestAt = 0;

async function lookup(location) {
  const wait = nextRequestAt - Date.now();
  nextRequestAt = Math.max(Date.now(), nextRequestAt) + 1000;
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(location)}`,
      { headers: { 'User-Agent': 'CauseConnect (https://github.com/steven-vu24/cause-connect-project)' } }
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const [match] = await response.json();
    return match ? { lat: parseFloat(match.lat), lon: parseFloat(match.lon) } : null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
}

function getCoordinates(location) {
  const key = location.trim().toLowerCase();
  if (!cache.has(key)) {
    if (cache.size >= MAX_CACHED_LOCATIONS) cache.clear();
    cache.set(
      key,
      lookup(location).then((coords) => {
        if (!coords) cache.delete(key);
        return coords;
      })
    );
  }
  return cache.get(key);
}

module.exports = { calculateDistance, getCoordinates };
