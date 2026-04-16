// app/admin/dashboard/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Menu,
  RefreshCw,
  Loader2,
  DollarSign,
  ShoppingBag,
  Server,
  Package,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Activity,
  Users,
  Bell,
  Shield,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/app/contextProviders/AuthContext';
import { getRevenues } from '@/models/api/revenue';
import { getOrders } from '@/models/api/order';
import { getServers, getMasterList } from '@/models/api/admin';
import { getInventoryReport } from '@/models/api/inventory';
import { getNotifications } from '@/models/api/notifications';
import { Revenue } from '@/models/types/revenue';
import { Order } from '@/models/types/order';
import { Server as ServerType, MasterListSyncResponse } from '@/models/types/server';
import { InventoryReportResponse } from '@/models/types/inventory';
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

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">{title}</h3>
        {href && (
          <Link
            href={href}
            className="flex items-center gap-0.5 text-xs font-semibold text-violet-600 hover:underline"
          >
            View all <ChevronRight size={13} />
          </Link>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm divide-y divide-slate-50">
        {children}
      </div>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [servers, setServers] = useState<ServerType[]>([]);
  const [inventoryReport, setInventoryReport] =
    useState<InventoryReportResponse | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [masterList, setMasterList] =
    useState<MasterListSyncResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    const [rev, ord, srv, inv, notifs, ml] = await Promise.allSettled([
      getRevenues(),
      getOrders(),
      getServers(),
      getInventoryReport(),
      getNotifications(),
      getMasterList(),
    ]);
    if (rev.status === 'fulfilled') setRevenues(rev.value);
    if (ord.status === 'fulfilled') setOrders(ord.value);
    if (srv.status === 'fulfilled') setServers(srv.value);
    if (inv.status === 'fulfilled') setInventoryReport(inv.value);
    if (notifs.status === 'fulfilled') setNotifications(notifs.value);
    if (ml.status === 'fulfilled') setMasterList(ml.value);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Derived metrics ───────────────────────────────────────────────────────
  const totalRevenue = revenues.reduce(
    (sum, r) => sum + (r.TotalAmount ?? 0),
    0
  );
  const refundedRevenue = revenues
    .filter((r) => r.Refunded)
    .reduce((sum, r) => sum + (r.TotalAmount ?? 0), 0);
  const refundCount = revenues.filter((r) => r.Refunded).length;
  const refundRate =
    revenues.length > 0
      ? ((refundCount / revenues.length) * 100).toFixed(1)
      : '0.0';

  const activeOrders = orders.filter(
    (o) => o.OrderStatus === 'Pending' || o.OrderStatus === 'Processing'
  ).length;
  const completedOrders = orders.filter(
    (o) => o.OrderStatus === 'Completed'
  ).length;
  const cancelledOrders = orders.filter(
    (o) => o.OrderStatus === 'Cancelled'
  ).length;

  const activeServers = servers.filter((s) => s.Status === 'Active').length;
  const inactiveServers = servers.filter(
    (s) => s.Status !== 'Active'
  ).length;

  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.CreationTime).getTime() -
        new Date(a.CreationTime).getTime()
    )
    .slice(0, 5);

  const recentRevenue = [...revenues]
    .sort(
      (a, b) =>
        new Date(b.SaleDate ?? '').getTime() -
        new Date(a.SaleDate ?? '').getTime()
    )
    .slice(0, 4);

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
            Admin Dashboard
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
            Welcome back, {user?.first_name ?? user?.username} 👋
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
            {/* ── Server health banner ── */}
            {inactiveServers > 0 && (
              <Link href="/admin/servers">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-600" />
                    <p className="text-sm font-bold text-red-800">
                      {inactiveServers} server
                      {inactiveServers !== 1 ? 's' : ''} offline
                    </p>
                    <ChevronRight
                      size={14}
                      className="ml-auto text-red-400"
                    />
                  </div>
                  <p className="mt-1 text-xs text-red-600">
                    {activeServers} of {servers.length} servers active
                  </p>
                </div>
              </Link>
            )}

            {/* ── Revenue stats ── */}
            <div>
              <h3 className="mb-2 text-sm font-bold text-slate-700">
                Revenue
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={<DollarSign size={20} />}
                  label="Total Revenue"
                  value={`$${totalRevenue.toFixed(2)}`}
                  sub={`${revenues.length} transactions`}
                  accent="green"
                />
                <StatCard
                  icon={<TrendingUp size={20} />}
                  label="Refund Rate"
                  value={`${refundRate}%`}
                  sub={`$${refundedRevenue.toFixed(2)} refunded`}
                  accent={parseFloat(refundRate) > 5 ? 'red' : 'amber'}
                  warning={parseFloat(refundRate) > 5}
                />
              </div>
            </div>

            {/* ── Order stats ── */}
            <div>
              <h3 className="mb-2 text-sm font-bold text-slate-700">
                Orders
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-amber-100 bg-white p-3 text-center shadow-sm">
                  <p className="text-xl font-bold text-amber-600">
                    {activeOrders}
                  </p>
                  <p className="text-xs text-slate-500">Active</p>
                </div>
                <div className="rounded-2xl border border-green-100 bg-white p-3 text-center shadow-sm">
                  <p className="text-xl font-bold text-green-600">
                    {completedOrders}
                  </p>
                  <p className="text-xs text-slate-500">Completed</p>
                </div>
                <div className="rounded-2xl border border-red-100 bg-white p-3 text-center shadow-sm">
                  <p className="text-xl font-bold text-red-500">
                    {cancelledOrders}
                  </p>
                  <p className="text-xs text-slate-500">Cancelled</p>
                </div>
              </div>
            </div>

            {/* ── Infrastructure stats ── */}
            <div>
              <h3 className="mb-2 text-sm font-bold text-slate-700">
                Infrastructure
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={<Server size={20} />}
                  label="Active Servers"
                  value={activeServers}
                  sub={`${servers.length} total in network`}
                  accent={inactiveServers > 0 ? 'red' : 'violet'}
                  warning={inactiveServers > 0}
                  href="/admin/servers"
                />
                <StatCard
                  icon={<Package size={20} />}
                  label="Inventory Alerts"
                  value={
                    (inventoryReport?.out_of_stock ?? 0) +
                    (inventoryReport?.below_threshold ?? 0)
                  }
                  sub={`${inventoryReport?.out_of_stock ?? 0} out · ${inventoryReport?.below_threshold ?? 0} low`}
                  accent={
                    (inventoryReport?.out_of_stock ?? 0) > 0
                      ? 'red'
                      : 'amber'
                  }
                  warning={
                    (inventoryReport?.out_of_stock ?? 0) +
                      (inventoryReport?.below_threshold ?? 0) >
                    0
                  }
                />
                <StatCard
                  icon={<Users size={20} />}
                  label="Network Users"
                  value={masterList?.status ?? '—'}
                  sub="master list sync"
                  accent="blue"
                  href="/admin/users"
                />
                <StatCard
                  icon={<Activity size={20} />}
                  label="Notifications"
                  value={notifications.length}
                  sub="system notifications"
                  accent="violet"
                />
              </div>
            </div>

            {/* ── Server network list ── */}
            <Section title="Server Network" href="/admin/servers">
              {servers.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-400">
                  No servers registered
                </p>
              ) : (
                servers.slice(0, 4).map((server) => (
                  <div
                    key={server.ServerID}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50">
                        <Shield size={15} className="text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {server.StoreName ||
                            `Server ${server.ServerID.slice(0, 6)}`}
                        </p>
                        <p className="max-w-[160px] truncate text-xs text-slate-400">
                          {server.ServerURL}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          server.Status === 'Active'
                            ? 'bg-green-50 text-green-600'
                            : 'bg-red-50 text-red-500'
                        }`}
                      >
                        {server.Status === 'Active' ? (
                          <CheckCircle size={10} />
                        ) : (
                          <XCircle size={10} />
                        )}
                        {server.Status ?? 'Unknown'}
                      </span>
                      {server.Region != null && (
                        <span className="text-[10px] text-slate-400">
                          Region {server.Region}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </Section>

            {/* ── Recent orders ── */}
            <Section title="Recent Orders">
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
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50">
                        <ShoppingBag size={15} className="text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          #{order.OrderID.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-slate-400">
                          {order.Drinks.length} drink
                          {order.Drinks.length !== 1 ? 's' : ''} ·{' '}
                          {new Date(
                            order.CreationTime
                          ).toLocaleDateString()}
                        </p>
                      </div>
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
            </Section>

            {/* ── Recent transactions ── */}
            <Section title="Recent Transactions">
              {recentRevenue.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-400">
                  No transactions yet
                </p>
              ) : (
                recentRevenue.map((rev) => (
                  <div
                    key={rev.RevenueID}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        #{rev.OrderID.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-slate-400">
                        {rev.SaleDate
                          ? new Date(rev.SaleDate).toLocaleString()
                          : '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold ${
                          rev.Refunded
                            ? 'text-red-500 line-through'
                            : 'text-slate-900'
                        }`}
                      >
                        ${(rev.TotalAmount ?? 0).toFixed(2)}
                      </p>
                      {rev.Refunded && (
                        <p className="text-xs text-red-400">Refunded</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </Section>

            {/* ── System notifications ── */}
            {notifications.length > 0 && (
              <Section title="System Notifications">
                {notifications.slice(0, 4).map((notif) => (
                  <div key={notif.NotificationID} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-slate-800 flex-1">
                        {notif.Message}
                      </p>
                      {notif.Global && (
                        <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
                          Global
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {notif.Type}
                      {notif.Timestamp
                        ? ` · ${new Date(
                            notif.Timestamp
                          ).toLocaleString()}`
                        : ''}
                    </p>
                  </div>
                ))}
              </Section>
            )}
          </>
        )}
      </main>
    </div>
  );
}