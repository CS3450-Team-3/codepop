// app/admin/servers/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Menu,
  RefreshCw,
  Loader2,
  Server,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  Key,
} from 'lucide-react';
import { getServers, getServer, discoverServer } from '@/models/api/admin';
import { Server as ServerType } from '@/models/types/server';
import Sidebar from '@/components/layout/Sidebar';

// ── Server card ───────────────────────────────────────────────────────────────
function ServerCard({ server }: { server: ServerType }) {
  const [expanded, setExpanded] = useState(false);
  const isActive = server.Status === 'Active';

  const lastSeen = server.LastSeen
    ? new Date(server.LastSeen)
    : null;

  const lastSeenLabel = lastSeen
    ? lastSeen.toLocaleString()
    : 'Unknown';

  // How long ago was this server last seen
  const minutesAgo = lastSeen
    ? Math.floor((Date.now() - lastSeen.getTime()) / 60000)
    : null;

  const freshness =
    minutesAgo === null
      ? null
      : minutesAgo < 5
      ? 'Just now'
      : minutesAgo < 60
      ? `${minutesAgo}m ago`
      : minutesAgo < 1440
      ? `${Math.floor(minutesAgo / 60)}h ago`
      : `${Math.floor(minutesAgo / 1440)}d ago`;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
      >
        {/* Icon */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            isActive ? 'bg-green-50' : 'bg-red-50'
          }`}
        >
          <Shield
            size={18}
            className={isActive ? 'text-green-600' : 'text-red-400'}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 truncate">
            {server.StoreName || `Server ${server.ServerID.slice(0, 8)}`}
          </p>
          <p className="max-w-[180px] truncate text-xs text-slate-400">
            {server.ServerURL}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              isActive
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {isActive ? (
              <CheckCircle size={10} />
            ) : (
              <XCircle size={10} />
            )}
            {server.Status ?? 'Unknown'}
          </span>
          {expanded ? (
            <ChevronUp size={15} className="text-slate-400" />
          ) : (
            <ChevronDown size={15} className="text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Server ID</span>
              <span className="font-mono text-xs text-slate-600 truncate max-w-[180px]">
                {server.ServerID}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">URL</span>
              <a
                href={server.ServerURL}
                target="_blank"
                rel="noopener noreferrer"
                className="max-w-[180px] truncate text-xs font-medium text-violet-600 hover:underline"
              >
                {server.ServerURL}
              </a>
            </div>
            {server.Region != null && (
              <div className="flex justify-between">
                <span className="text-slate-500">Region</span>
                <span className="font-medium text-slate-700">
                  {server.Region}
                </span>
              </div>
            )}
            {server.IsRegionLeader && (
              <div className="flex justify-between">
                <span className="text-slate-500">Region Leader</span>
                <span className="font-semibold text-violet-600">Yes</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Last Seen</span>
              <span className="text-xs text-slate-600">
                {lastSeenLabel}
                {freshness && (
                  <span className="ml-1 text-slate-400">({freshness})</span>
                )}
              </span>
            </div>
          </div>

          {/* Public key preview */}
          {server.PublicKey && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Key size={12} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-500">
                  Public Key
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="font-mono text-[10px] text-slate-500 break-all line-clamp-3">
                  {server.PublicKey}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── This server identity card ─────────────────────────────────────────────────
function ThisServerCard() {
  const [identity, setIdentity] = useState<Record<string, unknown> | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    discoverServer()
      .then(setIdentity)
      .catch(() => setIdentity(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!identity) return null;

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Globe size={15} className="text-violet-600" />
        <p className="text-sm font-bold text-violet-800">
          This Server
        </p>
      </div>
      <div className="space-y-1.5 text-xs">
        {Object.entries(identity)
          .slice(0, 4)
          .map(([key, value]) => (
            <div key={key} className="flex justify-between gap-2">
              <span className="text-violet-600 shrink-0">{key}</span>
              <span className="font-mono text-violet-800 truncate text-right">
                {String(value)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
type StatusFilter = 'all' | 'active' | 'inactive';

export default function AdminServersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [servers, setServers] = useState<ServerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getServers();
      setServers(data);
    } catch {
      setError('Could not load servers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeCount = servers.filter((s) => s.Status === 'Active').length;
  const inactiveCount = servers.filter((s) => s.Status !== 'Active').length;

  const filtered = servers.filter((s) => {
    if (statusFilter === 'active') return s.Status === 'Active';
    if (statusFilter === 'inactive') return s.Status !== 'Active';
    return true;
  });

  const tabs: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: servers.length },
    { id: 'active', label: 'Active', count: activeCount },
    { id: 'inactive', label: 'Offline', count: inactiveCount },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="fixed top-0 z-40 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-base font-bold text-slate-900">
            Server Network
          </h1>
          <button
            onClick={load}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
          >
            <RefreshCw
              size={18}
              className={loading ? 'animate-spin' : ''}
            />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-t border-slate-100">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setStatusFilter(t.id)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                statusFilter === t.id
                  ? 'border-b-2 border-violet-600 text-violet-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    statusFilter === t.id
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="mx-auto max-w-2xl px-4 pb-10 pt-28 space-y-4">
        {/* This server identity */}
        <ThisServerCard />

        {/* Summary */}
        {!loading && servers.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm">
              <p className="text-xl font-bold text-slate-900">
                {servers.length}
              </p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
            <div
              className={`rounded-2xl border p-3 text-center shadow-sm ${
                activeCount === servers.length
                  ? 'border-green-100 bg-green-50'
                  : 'border-slate-100 bg-white'
              }`}
            >
              <p className="text-xl font-bold text-green-600">
                {activeCount}
              </p>
              <p className="text-xs text-slate-500">Active</p>
            </div>
            <div
              className={`rounded-2xl border p-3 text-center shadow-sm ${
                inactiveCount > 0
                  ? 'border-red-100 bg-red-50'
                  : 'border-slate-100 bg-white'
              }`}
            >
              <p
                className={`text-xl font-bold ${
                  inactiveCount > 0 ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                {inactiveCount}
              </p>
              <p className="text-xs text-slate-500">Offline</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <Loader2
              size={28}
              className="animate-spin text-violet-500 mb-3"
            />
            <p className="text-sm">Loading servers...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-5 text-center">
            <AlertCircle
              className="mx-auto mb-2 text-red-400"
              size={22}
            />
            <p className="text-sm font-medium text-red-700">{error}</p>
            <button
              onClick={load}
              className="mt-3 text-xs font-bold text-red-500 underline"
            >
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Server size={28} className="text-slate-300" />
            </div>
            <p className="text-base font-semibold text-slate-700">
              No {statusFilter !== 'all' ? statusFilter : ''} servers
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((server) => (
              <ServerCard key={server.ServerID} server={server} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}