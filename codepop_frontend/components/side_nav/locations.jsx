import { useEffect, useState } from "react";

function decodeGeohash(hash) {
  const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
  const lat = [-90.0, 90.0];
  const lon = [-180.0, 180.0];
  let isLon = true;
  for (const char of hash) {
    const bits = BASE32.indexOf(char);
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

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Locations() {
  const [coords, setCoords] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [error, setError] = useState("");

  const [servers, setServers] = useState([]);
  const [sortedStores, setSortedStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(true);

  // Fetch all servers once on mount
  useEffect(() => {
    fetch("/api/servers")
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((data) => {
        setServers(data);
        setLoadingStores(false);
      });
  }, []);

  // Get user location
  useEffect(() => {
    async function applyCoords(latitude, longitude) {
      setCoords({ latitude, longitude });
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );
        const data = await res.json();
        setLocationName(data.display_name);
      } catch (err) {
        console.error(err);
      }
    }

    async function ipFallback() {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        if (data.latitude && data.longitude) {
          await applyCoords(data.latitude, data.longitude);
          return;
        }
      } catch (err) {
        console.error("IP geolocation fallback failed:", err);
      }
      setError("Unable to determine your location.");
    }

    if (!navigator.geolocation) {
      ipFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => applyCoords(position.coords.latitude, position.coords.longitude),
      () => ipFallback(),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Sort stores by distance whenever coords or servers change.
  // If coords are unavailable (denied/unsupported), still show all stores without distances.
  useEffect(() => {
    if (servers.length === 0) return;

    const withDistance = servers.map((server) => {
      if (!coords || !server.StoreGeohash) {
        return { ...server, distanceMi: null };
      }
      try {
        const { latitude: storeLat, longitude: storeLon } = decodeGeohash(server.StoreGeohash);
        const distanceMi = haversineKm(coords.latitude, coords.longitude, storeLat, storeLon) * 0.621371;
        return { ...server, distanceMi };
      } catch {
        return { ...server, distanceMi: null };
      }
    });

    // Known distances ascending, unknowns at the end
    withDistance.sort((a, b) => {
      if (a.distanceMi === null && b.distanceMi === null) return 0;
      if (a.distanceMi === null) return 1;
      if (b.distanceMi === null) return -1;
      return a.distanceMi - b.distanceMi;
    });

    setSortedStores(withDistance);
  }, [coords, servers]);

  return (
    <div className="min-h-screen flex flex-col items-center py-8 bg-gray-100 p-4">
      {/* User location card */}
      <div className="bg-white p-6 rounded-xl shadow-md max-w-md w-full mb-6 text-center">
        <h1 className="text-xl font-semibold mb-4">Your Location</h1>

        {error && <p className="text-red-500">{error}</p>}

        {!coords && !error && (
          <p className="text-gray-500">Getting your location...</p>
        )}

        {coords && (
          <div className="space-y-2">
            <p>
              <span className="font-medium">Latitude:</span>{" "}
              {coords.latitude}
            </p>
            <p>
              <span className="font-medium">Longitude:</span>{" "}
              {coords.longitude}
            </p>
            {locationName && (
              <p className="text-gray-600 mt-3">{locationName}</p>
            )}
          </div>
        )}
      </div>

      {/* Nearby stores card */}
      <div className="bg-white p-6 rounded-xl shadow-md max-w-md w-full">
        <h2 className="text-lg font-semibold mb-4">Nearby Stores</h2>

        {loadingStores && (
          <p className="text-gray-500">Finding nearby stores...</p>
        )}

        {!loadingStores && !coords && !error && (
          <p className="text-gray-500">Allow location access to see distances.</p>
        )}

        {!loadingStores && error && (
          <p className="text-gray-500">Enable location access to sort stores by distance.</p>
        )}

        {!loadingStores && sortedStores.length === 0 && (
          <p className="text-gray-500">No stores found.</p>
        )}

        {sortedStores.map((store) => (
          <div key={store.ServerID} className="py-3 border-b last:border-0">
            <div className="font-medium">{store.StoreName}</div>
            <div className="text-sm text-gray-500">
              {store.distanceMi !== null
                ? `${store.distanceMi.toFixed(1)} mi away`
                : "Distance unavailable"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
