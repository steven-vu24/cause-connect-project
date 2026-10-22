const EARTH_RADIUS_MILES = 3958.8;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

function calculateDistance(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getCoordinates(location) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`,
      { headers: { 'User-Agent': 'CauseConnectApp' } }
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const [match] = await response.json();
    return match ? { lat: parseFloat(match.lat), lon: parseFloat(match.lon) } : null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
}

module.exports = { calculateDistance, getCoordinates };
