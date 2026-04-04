'use client';

import { Server, Menu, RefreshCw, Loader2, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getServers } from '@/models/api/admin';
import { Server as ServerType } from '@/models/types/server';
import Sidebar from '@/components/layout/Sidebar';

export default function AdminServersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [servers, setServers] = useState<ServerType[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getServers();
      setServers(data);
    } catch {
      // TODO: show error state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
          <h1 className="text-base font-bold text-slate-900">Server Network</h1>
          <button
            onClick={load}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="mx-auto max-w-2xl px-4 pb-10 pt-20 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">P2P Server Network</h2>
          <p className="mt-1 text-sm text-slate-500">
            Monitor all active servers in the decentralized network.
          </p>
        </div>

        {/* Summary */}
        {!loading && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-slate-900">{servers.length}</p>
              <p className="text-xs text-slate-500">Total Servers</p>
            </div>
            <div className="rounded-2xl border border-green-100 bg-white p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-green-600">
                {servers.filter((s) => s.Status === 'Active').length}
              </p>
              <p className="text-xs text-slate-500">Active</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <Loader2 size={28} className="animate-spin text-violet-500 mb-3" />
            <p className="text-sm">Loading servers...</p>
          </div>
        ) : servers.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Server size={28} className="text-slate-300" />
            </div>
            <p className="text-base font-semibold text-slate-700">
              No servers registered
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm divide-y divide-slate-50">
            {servers.map((server) => (
              <div
                key={server.ServerID}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50">
                    <Shield size={16} className="text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {server.StoreName || `Server ${server.ServerID.slice(0, 6)}`}
                    </p>
                    <p className="max-w-[180px] truncate text-xs text-slate-400">
                      {server.ServerURL}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      server.Status === 'Active'
                        ? 'bg-green-50 text-green-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {server.Status ?? 'Unknown'}
                  </span>
                  {server.Region !== null && server.Region !== undefined && (
                    <span className="text-xs text-slate-400">
                      Region {server.Region}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
