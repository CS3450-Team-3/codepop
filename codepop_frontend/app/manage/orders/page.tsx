// app/manage/orders/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Menu,
  RefreshCw,
  Loader2,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Lock,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { getOrders, updateOrder } from '@/models/api/order';
import { Order, OrderStatus } from '@/models/types/order';
import Sidebar from '@/components/layout/Sidebar';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  Pending: {
    label: 'Pending',
    color: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: <Clock size={12} />,
  },
  Processing: {
    label: 'Processing',
    color: 'border-blue-200 bg-blue-50 text-blue-700',
    icon: <Loader2 size={12} className="animate-spin" />,
  },
  Completed: {
    label: 'Completed',
    color: 'border-green-200 bg-green-50 text-green-700',
    icon: <CheckCircle size={12} />,
  },
  Cancelled: {
    label: 'Cancelled',
    color: 'border-red-200 bg-red-50 text-red-700',
    icon: <XCircle size={12} />,
  },
};

// Next valid transitions per status
const NEXT_ACTIONS: Record<
  OrderStatus,
  { label: string; next: OrderStatus; color: string }[]
> = {
  Pending: [
    {
      label: 'Start Processing',
      next: 'Processing',
      color:
        'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
    },
    {
      label: 'Cancel',
      next: 'Cancelled',
      color: 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100',
    },
  ],
  Processing: [
    {
      label: 'Mark Complete',
      next: 'Completed',
      color:
        'border-green-200 bg-green-50 text-green-700 hover:bg-green-100',
    },
    {
      label: 'Cancel',
      next: 'Cancelled',
      color: 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100',
    },
  ],
  Completed: [],
  Cancelled: [],
};

// ── Order card ────────────────────────────────────────────────────────────────
function OrderCard({
  order,
  onStatusChange,
}: {
  order: Order;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = (order.OrderStatus as OrderStatus) ?? 'Pending';
  const statusConfig = STATUS_CONFIG[status];
  const actions = NEXT_ACTIONS[status];

  const handleAction = async (nextStatus: OrderStatus) => {
    setUpdating(true);
    setError(null);
    try {
      await onStatusChange(order.OrderID, nextStatus);
    } catch {
      setError('Failed to update status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const createdAt = new Date(order.CreationTime);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <ShoppingBag size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">
              #{order.OrderID.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-xs text-slate-400">
              {order.Drinks.length} drink
              {order.Drinks.length !== 1 ? 's' : ''} ·{' '}
              {createdAt.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusConfig.color}`}
          >
            {statusConfig.icon}
            {statusConfig.label}
          </span>
          {expanded ? (
            <ChevronUp size={16} className="text-slate-400" />
          ) : (
            <ChevronDown size={16} className="text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-4">
          {/* Order info */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Order ID</span>
              <span className="font-mono text-xs text-slate-600">
                {order.OrderID}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Created</span>
              <span className="font-medium text-slate-700">
                {createdAt.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment</span>
              <span
                className={`font-semibold ${
                  order.PaymentStatus === 'Paid'
                    ? 'text-green-600'
                    : order.PaymentStatus === 'Failed'
                    ? 'text-red-600'
                    : 'text-amber-600'
                }`}
              >
                {order.PaymentStatus ?? 'Pending'}
              </span>
            </div>
            {order.PickupTime && (
              <div className="flex justify-between">
                <span className="text-slate-500">Pickup</span>
                <span className="font-medium text-slate-700">
                  {new Date(order.PickupTime).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            {order.StripeID && (
              <div className="flex justify-between">
                <span className="text-slate-500">Stripe</span>
                <span className="font-mono text-xs text-slate-400 truncate max-w-[160px]">
                  {order.StripeID}
                </span>
              </div>
            )}
          </div>

          {/* Locker combo — show when completed */}
          {order.LockerCombo && status === 'Completed' && (
            <div className="rounded-xl bg-violet-50 p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mb-1">
                <Lock size={12} />
                Locker Code
              </div>
              <p className="text-3xl font-bold tracking-widest text-violet-700">
                {order.LockerCombo}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Action buttons */}
          {actions.length > 0 && (
            <div className="flex gap-2">
              {actions.map((action) => (
                <button
                  key={action.next}
                  onClick={() => handleAction(action.next)}
                  disabled={updating}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${action.color}`}
                >
                  {updating ? (
                    <Loader2
                      size={14}
                      className="animate-spin mx-auto"
                    />
                  ) : (
                    action.label
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
type TabFilter = 'active' | 'completed' | 'all';

export default function ManageOrdersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabFilter>('active');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
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
      setError('Could not load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = useCallback(
    async (orderId: string, newStatus: OrderStatus) => {
      // Optimistic update
      setOrders((prev) =>
        prev.map((o) =>
          o.OrderID === orderId ? { ...o, OrderStatus: newStatus } : o
        )
      );
      try {
        const order = orders.find((o) => o.OrderID === orderId);
        if (!order) return;
        await updateOrder(orderId, {
          Drinks: order.Drinks,
          OrderStatus: newStatus,
          PaymentStatus: order.PaymentStatus ?? undefined,
        });
      } catch {
        // Roll back on failure
        await load();
        throw new Error('Update failed');
      }
    },
    [orders, load]
  );

  const activeOrders = orders.filter(
    (o) => o.OrderStatus === 'Pending' || o.OrderStatus === 'Processing'
  );
  const completedOrders = orders.filter(
    (o) => o.OrderStatus === 'Completed' || o.OrderStatus === 'Cancelled'
  );
  const displayedOrders =
    tab === 'active'
      ? activeOrders
      : tab === 'completed'
      ? completedOrders
      : orders;

  const tabs: { id: TabFilter; label: string; count: number }[] = [
    { id: 'active', label: 'Active', count: activeOrders.length },
    { id: 'completed', label: 'Done', count: completedOrders.length },
    { id: 'all', label: 'All', count: orders.length },
  ];

  return (
    <div className="min-h-screen app-bg relative">
      <header className="fixed top-0 z-40 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-base font-bold text-slate-900">Order Queue</h1>
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
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                tab === t.id
                  ? 'border-b-2 border-violet-600 text-violet-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    tab === t.id
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

      <main className="mx-auto max-w-2xl px-4 pb-10 pt-28">
        {loading ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <Loader2
              size={28}
              className="animate-spin text-violet-500 mb-3"
            />
            <p className="text-sm">Loading orders...</p>
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
        ) : displayedOrders.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <ShoppingBag size={28} className="text-slate-300" />
            </div>
            <p className="text-base font-semibold text-slate-700">
              No {tab === 'active' ? 'active ' : ''}orders
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedOrders.map((order) => (
              <OrderCard
                key={order.OrderID}
                order={order}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}