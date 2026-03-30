import React, { useEffect, useState } from "react";
import ngeohash from "ngeohash";

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
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ latitude, longitude });

        // Reverse geocode using OpenStreetMap
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          setLocationName(data.display_name);
        } catch (err) {
          console.error(err);
        }
      },
      () => {
        setError("Unable to retrieve your location");
      }
    );
  }, []);

  // Sort stores by distance once we have both coords and servers
  useEffect(() => {
    if (!coords || servers.length === 0) return;

    const { latitude: userLat, longitude: userLon } = coords;

    const withDistance = servers.map((server) => {
      if (!server.StoreGeohash) {
        return { ...server, distanceMi: null };
      }
      try {
        const { latitude: storeLat, longitude: storeLon } = ngeohash.decode(server.StoreGeohash);
        const distanceMi = haversineKm(userLat, userLon, storeLat, storeLon) * 0.621371;
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

        {!loadingStores && !error && sortedStores.length === 0 && (
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
