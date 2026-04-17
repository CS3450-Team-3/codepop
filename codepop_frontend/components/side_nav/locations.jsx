import { useEffect, useState } from "react";
import { decodeGeohash, haversineKm } from "@/utils/geolocation";

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function Locations() {
  const [coords, setCoords] = useState(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [locating, setLocating] = useState(true);

  const [manualInput, setManualInput] = useState("");
  const [manualSearching, setManualSearching] = useState(false);
  const [manualError, setManualError] = useState("");

  const [servers, setServers] = useState([]);
  const [sortedStores, setSortedStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(true);

  const [selectedStoreId, setSelectedStoreId] = useState(null);

  // Read selected store from cookie on mount
  useEffect(() => {
    setSelectedStoreId(getCookie("storeId"));
  }, []);

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

  // Auto-detect user location
  useEffect(() => {
    async function applyCoords(latitude, longitude, label) {
      setCoords({ latitude, longitude });
      setLocationLabel(label || "");
      setLocating(false);
    }

    async function ipFallback() {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        if (data.latitude && data.longitude) {
          const label = [data.city, data.region_code].filter(Boolean).join(", ");
          await applyCoords(data.latitude, data.longitude, label);
          return;
        }
      } catch {
        // ignore
      }
      setLocating(false);
    }

    if (!navigator.geolocation) {
      ipFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        // Reverse-geocode just for a city label, not shown as raw coords
        let label = "";
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          );
          const data = await res.json();
          const addr = data.address || {};
          label = [addr.city || addr.town || addr.village, addr.state].filter(Boolean).join(", ");
        } catch {
          // ignore
        }
        applyCoords(pos.coords.latitude, pos.coords.longitude, label);
      },
      () => ipFallback(),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Sort stores by distance whenever coords or servers change
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

    withDistance.sort((a, b) => {
      if (a.distanceMi === null && b.distanceMi === null) return 0;
      if (a.distanceMi === null) return 1;
      if (b.distanceMi === null) return -1;
      return a.distanceMi - b.distanceMi;
    });

    setSortedStores(withDistance);
  }, [coords, servers]);

  async function handleManualSearch(e) {
    e.preventDefault();
    const query = manualInput.trim();
    if (!query) return;

    setManualSearching(true);
    setManualError("");

    try {
      const params = new URLSearchParams({ q: query, format: "json", limit: "1", countrycodes: "us" });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
      const data = await res.json();
      if (data.length > 0) {
        const addr = data[0].address || {};
        const label = query;
        setCoords({ latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) });
        setLocationLabel(label);
      } else {
        setManualError("Location not found. Try a different zip or city.");
      }
    } catch {
      setManualError("Search failed. Please try again.");
    } finally {
      setManualSearching(false);
    }
  }

  function handleSelectStore(serverId) {
    document.cookie = `storeId=${encodeURIComponent(serverId)}; path=/`;
    setSelectedStoreId(serverId);
  }

  const selectedStore = servers.find((s) => s.ServerID === selectedStoreId);

  return (
    <div className="min-h-screen flex flex-col items-center py-8 bg-gray-100 p-4">

      {/* Currently shopping at */}
      {selectedStore && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-xl shadow-sm max-w-md w-full mb-4 flex items-center gap-3">
          <span className="text-green-500 text-xl">✓</span>
          <div>
            <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Shopping at</p>
            <p className="font-semibold text-gray-800">{selectedStore.StoreName}</p>
          </div>
        </div>
      )}

      {/* Location search */}
      <div className="bg-white p-6 rounded-xl shadow-md max-w-md w-full mb-6">
        <h1 className="text-lg font-semibold mb-3">Find Stores Near You</h1>

        {/* Manual search */}
        <form onSubmit={handleManualSearch} className="flex gap-2 mb-3">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Enter zip code or city"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            disabled={manualSearching}
            className="bg-blue-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {manualSearching ? "..." : "Search"}
          </button>
        </form>

        {manualError && <p className="text-red-500 text-sm mb-2">{manualError}</p>}

        {/* Location status */}
        <p className="text-sm text-gray-400">
          {locating
            ? "Detecting your location…"
            : locationLabel
              ? `Using location: ${locationLabel}`
              : coords
                ? "Location detected"
                : "Enter a location above to sort by distance"}
        </p>
      </div>

      {/* Store list */}
      <div className="bg-white p-6 rounded-xl shadow-md max-w-md w-full">
        <h2 className="text-lg font-semibold mb-4">Stores</h2>

        {loadingStores && <p className="text-gray-500">Loading stores…</p>}

        {!loadingStores && sortedStores.length === 0 && (
          <p className="text-gray-500">No stores found.</p>
        )}

        {sortedStores.map((store) => {
          const isSelected = store.ServerID === selectedStoreId;
          return (
            <div
              key={store.ServerID}
              className={`py-3 border-b last:border-0 flex items-center justify-between gap-3 ${
                isSelected ? "opacity-100" : ""
              }`}
            >
              <div>
                <div className="font-medium">{store.StoreName}</div>
                <div className="text-sm text-gray-500">
                  {store.distanceMi !== null
                    ? `${store.distanceMi.toFixed(1)} mi away`
                    : "Distance unavailable"}
                </div>
              </div>

              {isSelected ? (
                <span className="text-xs text-green-600 font-semibold bg-green-50 border border-green-200 px-2 py-1 rounded-full whitespace-nowrap">
                  Selected
                </span>
              ) : (
                <button
                  onClick={() => handleSelectStore(store.ServerID)}
                  className="text-xs text-blue-600 font-semibold border border-blue-300 px-3 py-1 rounded-full hover:bg-blue-50 transition-colors whitespace-nowrap"
                >
                  Shop here
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
