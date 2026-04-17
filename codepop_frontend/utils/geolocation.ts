/**
 * Decode a geohash into latitude and longitude coordinates.
 */
export function decodeGeohash(hash: string) {
  const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
  const lat: [number, number] = [-90.0, 90.0];
  const lon: [number, number] = [-180.0, 180.0];
  let isLon = true;

  for (const char of hash) {
    const bits = BASE32.indexOf(char);
    if (bits === -1) continue;

    for (let i = 4; i >= 0; i--) {
      const bit = (bits >> i) & 1;
      if (isLon) {
        const mid = (lon[0] + lon[1]) / 2;
        if (bit) lon[0] = mid; else lon[1] = mid;
      } else {
        const mid = (lat[0] + lat[1]) / 2;
        if (bit) lat[0] = mid; else lat[1] = mid;
      }
      isLon = !isLon;
    }
  }
  return { latitude: (lat[0] + lat[1]) / 2, longitude: (lon[0] + lon[1]) / 2 };
}

/**
 * Calculate the Haversine distance between two points in kilometers.
 */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Heuristic: Estimate drive time in minutes based on distance in miles.
 * Default: 2 minutes per mile (approx. 30 mph).
 */
export function estimateDriveTimeMinutes(distanceMi: number): number {
  return Math.max(1, Math.round(distanceMi * 2));
}
