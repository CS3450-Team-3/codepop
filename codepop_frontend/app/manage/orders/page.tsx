'use client';

import { ShoppingBag, Menu, RefreshCw, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getOrders } from '@/models/api/order';
import { Order } from '@/models/types/order';
import Sidebar from '@/components/layout/Sidebar';

export default function ManageOrdersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getOrders();
      setOrders(
        [...data].sort(
          (a, b) =>
            new Date(b.CreationTime).getTime() -
            new Date(a.CreationTime).getTime()
        )
      );
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
          <h1 className="text-base font-bold text-slate-900">Orders</h1>
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

      <main className="mx-auto max-w-2xl px-4 pb-10 pt-20">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">Order Queue</h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage and update order statuses.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <Loader2 size={28} className="animate-spin text-violet-500 mb-3" />
            <p className="text-sm">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <ShoppingBag size={28} className="text-slate-300" />
            </div>
            <p className="text-base font-semibold text-slate-700">No orders yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.OrderID}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      #{order.OrderID.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-slate-400">
                      {order.Drinks.length} drink{order.Drinks.length !== 1 ? 's' : ''} ·{' '}
                      {new Date(order.CreationTime).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold border ${
                      order.OrderStatus === 'Completed'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : order.OrderStatus === 'Processing'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : order.OrderStatus === 'Cancelled'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {order.OrderStatus ?? 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
