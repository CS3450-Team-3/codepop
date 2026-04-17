'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Menu,
  RefreshCw,
  Loader2,
  Package,
  AlertTriangle,
  Store,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/app/contextProviders/AuthContext';
import { getRegionalInventory } from '@/models/api/manager';
import { AggregateInventoryResponse, StoreInventoryResult } from '@/models/types/inventory';
import Sidebar from '@/components/layout/Sidebar';
import StatCard from '@/components/dashboard/StatCard';

export default function LogisticsDashboard() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aggregate, setAggregate] = useState<AggregateInventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRegionalInventory();
      setAggregate(data);
      setLastRefresh(new Date());
    } catch {
      // empty state shown below
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const storeEntries = Object.entries(aggregate?.results ?? []) as [string, StoreInventoryResult][];
  const successfulStores = storeEntries.filter(([, v]) => !v.error);
  const totalItems = successfulStores.reduce((s, [, v]) => s + (v.total_items ?? 0), 0);
  const totalOutOfStock = successfulStores.reduce((s, [, v]) => s + (v.out_of_stock ?? 0), 0);
  const totalBelowThreshold = successfulStores.reduce((s, [, v]) => s + (v.below_threshold ?? 0), 0);
  const criticalStores = successfulStores.filter(([, v]) => (v.out_of_stock ?? 0) > 0);

  return (
    <div className="min-h-screen app-bg">
      <header className="fixed top-0 z-40 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-base font-bold text-slate-900">Logistics Dashboard</h1>
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

      <main className="mx-auto max-w-2xl px-4 pb-10 pt-20 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Hey {user?.first_name ?? user?.username}
          </h2>
          <p className="text-sm text-slate-400">
            Last updated{' '}
            {lastRefresh.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Region banner */}
        <div className="rounded-2xl bg-violet-600 p-4 text-white shadow-lg shadow-violet-200">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Assigned Region</p>
          <h2 className="text-xl font-bold">
            {successfulStores.length > 0 ? `${successfulStores.length} Store${successfulStores.length !== 1 ? 's' : ''} in Region` : 'Your Region'}
          </h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <Loader2 size={28} className="animate-spin text-violet-500 mb-3" />
            <p className="text-sm">Syncing regional inventory...</p>
          </div>
        ) : (
          <>
            {/* Out-of-stock alert banner */}
            {criticalStores.length > 0 && (
              <Link href="/logistics/inventory">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <p className="text-sm font-bold text-amber-800">
                      {criticalStores.length} store{criticalStores.length !== 1 ? 's' : ''} with out-of-stock items
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {criticalStores.map(([id, v]) => (
                      <span key={id} className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        {id.slice(0, 8).toUpperCase()} ({v.out_of_stock} out)
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<Store size={20} />}
                label="Stores Online"
                value={successfulStores.length}
                sub={`${storeEntries.length} total in region`}
                accent="violet"
              />
              <StatCard
                icon={<Package size={20} />}
                label="Total Items"
                value={totalItems}
                sub="across all stores"
                accent="blue"
                href="/logistics/inventory"
              />
              <StatCard
                icon={<AlertTriangle size={20} />}
                label="Out of Stock"
                value={totalOutOfStock}
                sub="items need restocking"
                accent={totalOutOfStock > 0 ? 'red' : 'green'}
                warning={totalOutOfStock > 0}
                href="/logistics/inventory"
              />
              <StatCard
                icon={<AlertTriangle size={20} />}
                label="Below Threshold"
                value={totalBelowThreshold}
                sub="items running low"
                accent={totalBelowThreshold > 0 ? 'amber' : 'green'}
                warning={totalBelowThreshold > 0}
                href="/logistics/inventory"
              />
            </div>

            {/* Per-store cards */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">Stores</h3>
                <Link href="/logistics/inventory" className="flex items-center gap-0.5 text-xs font-semibold text-violet-600 hover:underline">
                  View inventory <ChevronRight size={13} />
                </Link>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm divide-y divide-slate-50">
                {storeEntries.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-400">No stores found in region</p>
                ) : (
                  storeEntries.map(([id, store]) => (
                    <Link key={id} href={`/logistics/inventory/${id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 flex items-center justify-center rounded-xl ${store.error ? 'bg-red-50 text-red-500' : 'bg-violet-50 text-violet-600'}`}>
                          <Store size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {store.store_name || id.slice(0, 12).toUpperCase()}
                          </p>
                          {store.error ? (
                            <p className="text-xs text-red-500">Unreachable</p>
                          ) : (
                            <p className="text-xs text-slate-400">
                              {[store.store_city, store.store_state].filter(Boolean).join(', ') || `${store.total_items} items`}
                            </p>
                          )}
                        </div>
                      </div>
                      {!store.error && (
                        <div className="flex items-center gap-2">
                          {(store.out_of_stock ?? 0) > 0 && (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                              {store.out_of_stock} out
                            </span>
                          )}
                          {(store.below_threshold ?? 0) > 0 && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">
                              {store.below_threshold} low
                            </span>
                          )}
                          <ChevronRight size={14} className="text-slate-300" />
                        </div>
                      )}
                    </Link>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
