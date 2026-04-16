'use client';

import { useState, useEffect } from 'react';
import { Menu, MapPin, Navigation, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/models/api/api';

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

interface ProxyInstance {
  name: string;
  backend_port: number;
  frontend_port: number;
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

function portFromUrl(url: string): number | null {
  try {
    const port = parseInt(new URL(url).port, 10);
    return isNaN(port) ? null : port;
  } catch {
    return null;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LocationsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stores, setStores] = useState<StoreServer[]>([]);
  const [currentServerId, setCurrentServerId] = useState<string | null>(null);
  const [instances, setInstances] = useState<ProxyInstance[]>([]);
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
    }

    Promise.all([
      api.get('servers/').then(r => r.data as StoreServer[]).catch(() => [] as StoreServer[]),
      api.get('p2p/discover/').then(r => r.data).catch(() => null),
      fetch('/__proxy/instances').then(r => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([serverList, discovery, instanceList]) => {
      setStores(serverList);
      if (discovery?.ServerID) setCurrentServerId(discovery.ServerID);
      setInstances(instanceList);
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

  const connectToStore = (store: StoreServer) => {
    const port = portFromUrl(store.ServerURL);
    const instance = port ? instances.find(inst => inst.backend_port === port) : null;
    setSwitching(store.ServerID);
    if (instance) {
      document.cookie = `codepop_instance=${instance.name}; path=/; SameSite=Lax`;
      window.location.href = '/';
    } else {
      // Proxy not running (e.g. GCP) — fall back to manual selector
      window.location.href = '/__proxy_selector__';
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
    <div className="min-h-screen bg-slate-50">
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">

                      {/* Name + badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900 text-sm">
                          {store.StoreName || 'Unnamed Store'}
                        </p>
                        {isCurrent && (
                          <span className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600">
                            <CheckCircle2 size={10} />
                            Current
                          </span>
                        )}
                        {store.IsRegionLeader && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                            Region Leader
                          </span>
                        )}
                      </div>

                      {/* Address */}
                      {addressLine && (
                        <p className="mt-1 flex items-start gap-1 text-xs text-slate-500">
                          <MapPin size={11} className="mt-0.5 shrink-0 text-slate-400" />
                          {addressLine}
                        </p>
                      )}

                      {/* Distance + status */}
                      <div className="mt-2 flex items-center gap-3 flex-wrap">
                        {distance && (
                          <span className="text-xs font-semibold text-violet-600">
                            {distance} away
                          </span>
                        )}
                        <span className={`text-xs ${store.Status === 'Active' ? 'text-green-600' : 'text-slate-400'}`}>
                          {store.Status ?? 'Unknown'}
                        </span>
                      </div>
                    </div>

                    {/* Connect button — hidden for current store */}
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
