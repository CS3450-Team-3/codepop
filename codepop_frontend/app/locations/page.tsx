'use client';

import { useState, useEffect } from 'react';
import { Menu, MapPin, Navigation, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { getServers, discoverServer, selectServer } from '@/models/api/server';
import { useAuth } from '@/app/contextProviders/AuthContext';

const ROLE_HOME: Record<string, string> = {
  customer:          '/',
  store_manager:     '/manage/dashboard',
  logistics_manager: '/manage/dashboard',
  admin:             '/admin/dashboard',
  super_admin:       '/admin/dashboard',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface StoreServer {
  ServerID: string;
  ServerURL: string;
  Status: string;
  StoreName: string;
  StoreAddress: string;
  StoreCity: string;
  StoreState: string;
  StoreZip: string;
  StoreGeohash: string;
  IsRegionLeader: boolean;
}

// ── Geo helpers ───────────────────────────────────────────────────────────────

const GEOHASH_CHARS = '0123456789bcdefghjkmnpqrstuvwxyz';

function decodeGeohash(geohash: string): [number, number] | null {
  if (!geohash) return null;
  let minLat = -90, maxLat = 90, minLon = -180, maxLon = 180;
  let isLon = true;
  for (const c of geohash.toLowerCase()) {
    const bits = GEOHASH_CHARS.indexOf(c);
    if (bits === -1) return null;
    for (let mask = 16; mask >= 1; mask >>= 1) {
      if (isLon) {
        const mid = (minLon + maxLon) / 2;
        if (bits & mask) minLon = mid; else maxLon = mid;
      } else {
        const mid = (minLat + maxLat) / 2;
        if (bits & mask) minLat = mid; else maxLat = mid;
      }
      isLon = !isLon;
    }
  }
  return [(minLat + maxLat) / 2, (minLon + maxLon) / 2];
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LocationsPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stores, setStores] = useState<StoreServer[]>([]);
  const [currentServerId, setCurrentServerId] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [zipInput, setZipInput] = useState('');
  const [zipError, setZipError] = useState('');
  const [zipLoading, setZipLoading] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('codepop_user_coords');
    if (saved) {
      try { setUserCoords(JSON.parse(saved)); } catch { /* ignore corrupt data */ }
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserCoords(coords);
          localStorage.setItem('codepop_user_coords', JSON.stringify(coords));
        },
        () => {},
      );
    }

    Promise.all([
      getServers().then(r => r as unknown as StoreServer[]).catch(() => [] as StoreServer[]),
      discoverServer().catch(() => null),
    ]).then(([serverList, discovery]) => {
      setStores(serverList);
      if (discovery && 'ServerID' in discovery) setCurrentServerId(discovery.ServerID as string);
      setLoading(false);
    });
  }, []);

  const geocodeZip = async () => {
    const zip = zipInput.trim();
    if (!zip) return;
    setZipError('');
    setZipLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&country=us&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } },
      );
      const results = await res.json();
      if (!results.length) {
        setZipError('ZIP code not found.');
        return;
      }
      const coords: [number, number] = [
        parseFloat(results[0].lat),
        parseFloat(results[0].lon),
      ];
      setUserCoords(coords);
      localStorage.setItem('codepop_user_coords', JSON.stringify(coords));
      setZipInput('');
    } catch {
      setZipError('Could not look up that ZIP code.');
    } finally {
      setZipLoading(false);
    }
  };

  const connectToStore = async (store: StoreServer) => {
    setSwitching(store.ServerID);
    const dashboard = ROLE_HOME[user?.user_type ?? ''] ?? '/';
    try {
      await selectServer(store.ServerURL);
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (!token) {
        window.location.href = dashboard;
        return;
      }
      let tokenValid = false;
      try {
        const check = await fetch('/api/proxy/backend/users/me/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        tokenValid = check.ok;
      } catch {
        tokenValid = false;
      }
      if (tokenValid) {
        window.location.href = dashboard;
      } else {
        try {
          const refresh = await fetch('/api/proxy/backend/auth/refresh/', {
            method: 'POST',
            credentials: 'include',
          });
          if (refresh.ok) {
            const data = await refresh.json();
            if (data.access) localStorage.setItem('access_token', data.access);
            window.location.href = dashboard;
            return;
          }
        } catch { /* fall through */ }
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/auth/login';
      }
    } catch {
      setSwitching(null);
    }
  };

  const getDistance = (store: StoreServer): string | null => {
    if (!userCoords || !store.StoreGeohash) return null;
    const coords = decodeGeohash(store.StoreGeohash);
    if (!coords) return null;
    const miles = haversine(userCoords[0], userCoords[1], coords[0], coords[1]);
    return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
  };

  return (
    <div className="min-h-screen app-bg">
      {/* Header */}
      <header className="fixed top-0 z-40 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-base font-bold text-slate-900">Locations</h1>
          <div className="w-9" />
        </div>
      </header>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="mx-auto max-w-2xl px-4 pb-10 pt-20 space-y-5">

        {/* ZIP input */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
          <p className="mb-3 text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Navigation size={15} className="text-violet-500" />
            Your Location
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter ZIP code"
              value={zipInput}
              onChange={e => { setZipInput(e.target.value); setZipError(''); }}
              onKeyDown={e => e.key === 'Enter' && geocodeZip()}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <button
              onClick={geocodeZip}
              disabled={zipLoading || !zipInput.trim()}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              {zipLoading && <Loader2 size={14} className="animate-spin" />}
              Update
            </button>
          </div>
          {zipError && (
            <p className="mt-2 flex items-center gap-1 text-xs text-red-500">
              <AlertCircle size={12} />
              {zipError}
            </p>
          )}
          {userCoords && !zipError && (
            <p className="mt-2 text-xs text-slate-400">
              Location set · distances shown below
            </p>
          )}
        </div>

        {/* Store list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : stores.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-12">No stores found.</p>
        ) : (
          <div className="space-y-3">
            {stores.map(store => {
              const isCurrent = store.ServerID === currentServerId;
              const distance = getDistance(store);
              const isSwitching = switching === store.ServerID;
              const addressLine = [store.StoreAddress, store.StoreCity, store.StoreState, store.StoreZip]
                .filter(Boolean)
                .join(', ');

              return (
                <div
                  key={store.ServerID}
                  className={`rounded-2xl bg-white border shadow-sm p-4 transition-all ${
                    isCurrent
                      ? 'border-violet-200 ring-1 ring-violet-200'
                      : 'border-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 text-sm truncate">
                          {store.StoreName || 'Unnamed Store'}
                        </p>
                        {isCurrent && (
                          <span className="shrink-0 flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600">
                            <CheckCircle2 size={10} />
                            Current
                          </span>
                        )}
                      </div>
                      {addressLine && (
                        <p className="mt-0.5 flex items-start gap-1 text-xs text-slate-500">
                          <MapPin size={11} className="mt-0.5 shrink-0 text-slate-400" />
                          {addressLine}
                        </p>
                      )}
                      {distance && (
                        <p className="mt-1 text-xs font-semibold text-violet-600">
                          {distance} away
                        </p>
                      )}
                    </div>

                    {!isCurrent && (
                      <button
                        onClick={() => connectToStore(store)}
                        disabled={isSwitching}
                        className="shrink-0 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                      >
                        {isSwitching && <Loader2 size={12} className="animate-spin" />}
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
