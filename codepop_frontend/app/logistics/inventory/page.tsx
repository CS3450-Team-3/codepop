'use client';

import { useState, useEffect, useCallback } from 'react';
import { Menu, RefreshCw, Loader2, ChevronLeft, ChevronRight, Store, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { getRegionalInventory } from '@/models/api/manager';
import { AggregateInventoryResponse, StoreInventoryResult } from '@/models/types/inventory';
import Sidebar from '@/components/layout/Sidebar';

function storeDisplayName(id: string, store: StoreInventoryResult): string {
  return store.store_name || id.slice(0, 12).toUpperCase();
}

function storeSubtitle(id: string, store: StoreInventoryResult): string {
  const loc = [store.store_city, store.store_state].filter(Boolean).join(', ');
  return loc || id.slice(0, 16).toUpperCase();
}

export default function LogisticsInventoryPage() {
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
          <h1 className="text-base font-bold text-slate-900">Regional Inventory</h1>
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
        <div className="flex items-center justify-between">
          <Link href="/logistics/dashboard" className="flex items-center gap-1 text-sm font-semibold text-violet-600 hover:underline">
            <ChevronLeft size={15} /> Dashboard
          </Link>
          <p className="text-xs text-slate-400">
            Updated {lastRefresh.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <Loader2 size={28} className="animate-spin text-violet-500 mb-3" />
            <p className="text-sm">Loading inventory...</p>
          </div>
        ) : storeEntries.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <Store size={32} className="mb-3 opacity-30" />
            <p className="text-sm">No stores found in region</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm divide-y divide-slate-50">
            {storeEntries.map(([id, store]) => (
              <Link
                key={id}
                href={`/logistics/inventory/${id}`}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 flex items-center justify-center rounded-xl ${store.error ? 'bg-red-50 text-red-500' : 'bg-violet-50 text-violet-600'}`}>
                    <Store size={17} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{storeDisplayName(id, store)}</p>
                    <p className="text-xs text-slate-400">{storeSubtitle(id, store)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!store.error && (store.out_of_stock ?? 0) > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                      <AlertTriangle size={10} /> {store.out_of_stock} out
                    </span>
                  )}
                  {!store.error && (store.below_threshold ?? 0) > 0 && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">
                      {store.below_threshold} low
                    </span>
                  )}
                  {store.error && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-500">
                      Unreachable
                    </span>
                  )}
                  <ChevronRight size={14} className="text-slate-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
