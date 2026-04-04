'use client';

import { Package, Menu, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getInventory, getInventoryReport } from '@/models/api/inventory';
import { Inventory, InventoryReportResponse } from '@/models/types/inventory';
import Sidebar from '@/components/layout/Sidebar';

export default function ManageInventoryPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [report, setReport] = useState<InventoryReportResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [inv, rep] = await Promise.all([
        getInventory(),
        getInventoryReport(),
      ]);
      setInventory(inv);
      setReport(rep);
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
          <h1 className="text-base font-bold text-slate-900">Inventory</h1>
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
          <h2 className="text-xl font-bold text-slate-900">Inventory</h2>
          <p className="mt-1 text-sm text-slate-500">
            Monitor stock levels and threshold alerts.
          </p>
        </div>

        {/* Summary */}
        {report && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm text-center">
              <p className="text-2xl font-bold text-slate-900">{report.total_items}</p>
              <p className="text-xs text-slate-500">Total Items</p>
            </div>
            <div className="rounded-2xl border border-red-100 bg-white p-3 shadow-sm text-center">
              <p className="text-2xl font-bold text-red-600">{report.out_of_stock}</p>
              <p className="text-xs text-slate-500">Out of Stock</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-white p-3 shadow-sm text-center">
              <p className="text-2xl font-bold text-amber-600">{report.below_threshold}</p>
              <p className="text-xs text-slate-500">Low Stock</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <Loader2 size={28} className="animate-spin text-violet-500 mb-3" />
            <p className="text-sm">Loading inventory...</p>
          </div>
        ) : inventory.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Package size={28} className="text-slate-300" />
            </div>
            <p className="text-base font-semibold text-slate-700">
              No inventory items
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm divide-y divide-slate-50">
            {inventory.map((item) => {
              const isLow = item.Quantity <= item.ThresholdLevel;
              return (
                <div
                  key={item.InventoryID}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {isLow && (
                      <AlertTriangle size={15} className="shrink-0 text-amber-500" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {item.ItemName}
                      </p>
                      <p className="text-xs text-slate-400">{item.ItemType}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold ${
                        item.Quantity === 0
                          ? 'text-red-600'
                          : isLow
                          ? 'text-amber-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {item.Quantity}
                    </p>
                    <p className="text-xs text-slate-400">
                      min {item.ThresholdLevel}
                    </p>
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
