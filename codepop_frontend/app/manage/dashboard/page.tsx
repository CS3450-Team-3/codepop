// app/manage/dashboard/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Menu,
  RefreshCw,
  Loader2,
  ShoppingBag,
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
  Bell,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/app/contextProviders/AuthContext';
import { getInventoryReport } from '@/models/api/inventory';
import { getRevenues } from '@/models/api/revenue';
import { getOrders } from '@/models/api/order';
import { getNotifications } from '@/models/api/notifications';
import { InventoryReportResponse } from '@/models/types/inventory';
import { Revenue } from '@/models/types/revenue';
import { Order } from '@/models/types/order';
import { Notification } from '@/models/types/notification';
import Sidebar from '@/components/layout/Sidebar';

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  accent = 'violet',
  warning = false,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'violet' | 'green' | 'amber' | 'red' | 'blue';
  warning?: boolean;
  href?: string;
}) {
  const accentClasses = {
    violet: 'bg-violet-50 text-violet-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  const content = (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-sm transition-shadow ${
        warning ? 'border-amber-200' : 'border-slate-100'
      } ${href ? 'hover:shadow-md' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentClasses[accent]}`}
        >
          {icon}
        </div>
        <div className="flex items-center gap-1">
          {warning && <AlertTriangle size={14} className="text-amber-500" />}
          {href && <ChevronRight size={14} className="text-slate-300" />}
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ManagerDashboardPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [inventoryReport, setInventoryReport] =
    useState<InventoryReportResponse | null>(null);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, rev, ord, notifs] = await Promise.all([
        getInventoryReport(),
        getRevenues(),
        getOrders(),
        getNotifications(),
      ]);
      setInventoryReport(inv);
      setRevenues(rev);
      setOrders(ord);
      setNotifications(notifs);
      setLastRefresh(new Date());
    } catch {
      // Individual sections show their own empty states
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Derived metrics ───────────────────────────────────────────────────────
  const todayRevenue = revenues
    .filter((r) => {
      if (!r.SaleDate) return false;
      const d = new Date(r.SaleDate);
      const today = new Date();
      return (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      );
    })
    .reduce((sum, r) => sum + (r.TotalAmount ?? 0), 0);

  const pendingOrders = orders.filter(
    (o) => o.OrderStatus === 'Pending'
  ).length;
  const processingOrders = orders.filter(
    (o) => o.OrderStatus === 'Processing'
  ).length;

  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.CreationTime).getTime() -
        new Date(a.CreationTime).getTime()
    )
    .slice(0, 4);

  const lowStockItems = (inventoryReport?.inventory_items ?? [])
    .filter((i) => i.Quantity <= i.ThresholdLevel)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="fixed top-0 z-40 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-base font-bold text-slate-900">
            Manager Dashboard
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
      </header>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="mx-auto max-w-2xl px-4 pb-10 pt-20 space-y-6">
        {/* Greeting */}
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Hey {user?.first_name ?? user?.username} 👋
          </h2>
          <p className="text-sm text-slate-400">
            Last updated{' '}
            {lastRefresh.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <Loader2
              size={28}
              className="animate-spin text-violet-500 mb-3"
            />
            <p className="text-sm">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* ── Low stock banner ── */}
            {lowStockItems.length > 0 && (
              <Link href="/manage/inventory">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <p className="text-sm font-bold text-amber-800">
                      {lowStockItems.length} item
                      {lowStockItems.length !== 1 ? 's' : ''} low on stock
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {lowStockItems.map((item) => (
                      <span
                        key={item.InventoryID}
                        className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700"
                      >
                        {item.ItemName} ({item.Quantity} left)
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            )}

            {/* ── Stats grid ── */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<DollarSign size={20} />}
                label="Today's Revenue"
                value={`$${todayRevenue.toFixed(2)}`}
                sub={`${revenues.length} total records`}
                accent="green"
              />
              <StatCard
                icon={<ShoppingBag size={20} />}
                label="Active Orders"
                value={pendingOrders + processingOrders}
                sub={`${pendingOrders} pending · ${processingOrders} processing`}
                accent="blue"
                href="/manage/orders"
              />
              <StatCard
                icon={<Package size={20} />}
                label="Inventory Items"
                value={inventoryReport?.total_items ?? 0}
                sub={`${inventoryReport?.out_of_stock ?? 0} out of stock`}
                accent={
                  (inventoryReport?.out_of_stock ?? 0) > 0 ? 'red' : 'violet'
                }
                warning={(inventoryReport?.out_of_stock ?? 0) > 0}
                href="/manage/inventory"
              />
              <StatCard
                icon={<TrendingUp size={20} />}
                label="Below Threshold"
                value={inventoryReport?.below_threshold ?? 0}
                sub="items need restocking"
                accent="amber"
                warning={(inventoryReport?.below_threshold ?? 0) > 0}
                href="/manage/inventory"
              />
            </div>

            {/* ── Quick actions ── */}
            <section>
              <h3 className="mb-2 text-sm font-bold text-slate-700">
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/manage/orders"
                  className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-violet-300 hover:text-violet-700 transition-colors"
                >
                  <ShoppingBag size={18} className="text-violet-500" />
                  Manage Orders
                </Link>
                <Link
                  href="/manage/inventory"
                  className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-violet-300 hover:text-violet-700 transition-colors"
                >
                  <Package size={18} className="text-violet-500" />
                  Update Stock
                </Link>
              </div>
            </section>

            {/* ── Recent orders ── */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">
                  Recent Orders
                </h3>
                <Link
                  href="/manage/orders"
                  className="flex items-center gap-0.5 text-xs font-semibold text-violet-600 hover:underline"
                >
                  View all <ChevronRight size={13} />
                </Link>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm divide-y divide-slate-50">
                {recentOrders.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-400">
                    No orders yet
                  </p>
                ) : (
                  recentOrders.map((order) => (
                    <div
                      key={order.OrderID}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          #{order.OrderID.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-slate-400">
                          {order.Drinks.length} drink
                          {order.Drinks.length !== 1 ? 's' : ''} ·{' '}
                          {new Date(order.CreationTime).toLocaleTimeString(
                            undefined,
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          order.OrderStatus === 'Completed'
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : order.OrderStatus === 'Processing'
                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                            : order.OrderStatus === 'Cancelled'
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : 'border-amber-200 bg-amber-50 text-amber-700'
                        }`}
                      >
                        {order.OrderStatus ?? 'Pending'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* ── Notifications ── */}
            {notifications.length > 0 && (
              <section>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-700">
                    Notifications
                  </h3>
                  <Bell size={13} className="text-slate-400" />
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm divide-y divide-slate-50">
                  {notifications.slice(0, 3).map((notif) => (
                    <div key={notif.NotificationID} className="px-4 py-3">
                      <p className="text-sm text-slate-800">{notif.Message}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {notif.Type}
                        {notif.Timestamp
                          ? ` · ${new Date(notif.Timestamp).toLocaleString()}`
                          : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}