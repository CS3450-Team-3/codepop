// app/customer/orders/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Lock,
  X,
  AlertCircle,
  Package,
  CreditCard,
  ShoppingBag,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contextProviders/AuthContext';
import { getUserOrders } from '@/models/api/order';
import { getDrink } from '@/models/api/drinks';
import { getInventory } from '@/models/api/inventory';
import { Order, OrderStatus, PaymentStatus } from '@/models/types/order';
import { Drink } from '@/models/types/drink';
import { Inventory } from '@/models/types/inventory';
import { calculateDrinkPrice } from '@/utils/pricing';
import CustomizeModal from '@/components/modals/CustomizeModal';
import DrinkColorAvatar from '@/components/drinks/DrinkColorAvatar';

const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; icon: React.ReactNode; step: number }
> = {
  Pending: {
    label: 'Order Received',
    color: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: <Clock size={12} />,
    step: 1,
  },
  Processing: {
    label: 'Being Prepared',
    color: 'border-blue-200 bg-blue-50 text-blue-700',
    icon: <Loader2 size={12} className="animate-spin" />,
    step: 2,
  },
  Completed: {
    label: 'Ready for Pickup',
    color: 'border-green-200 bg-green-50 text-green-700',
    icon: <CheckCircle size={12} />,
    step: 3,
  },
  Cancelled: {
    label: 'Cancelled',
    color: 'border-red-200 bg-red-50 text-red-700',
    icon: <XCircle size={12} />,
    step: 0,
  },
};

const PAYMENT_CONFIG: Record<
  PaymentStatus,
  { label: string; color: string }
> = {
  Pending: { label: 'Payment Pending', color: 'text-amber-600' },
  Paid:    { label: 'Paid',            color: 'text-green-600' },
  Failed:  { label: 'Payment Failed',  color: 'text-red-600'   },
  Remade:  { label: 'Remade',          color: 'text-violet-600' },
};

function OrderProgressBar({ status }: { status: OrderStatus }) {
  if (status === 'Cancelled') return null;
  const step = ORDER_STATUS_CONFIG[status].step;
  const steps = [
    { label: 'Received',  step: 1 },
    { label: 'Preparing', step: 2 },
    { label: 'Ready',     step: 3 },
  ];

  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s.step} className="flex flex-1 items-center gap-1">
          <div
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
              step >= s.step
                ? 'bg-violet-600 text-white'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            {step > s.step ? <CheckCircle size={11} /> : s.step}
          </div>
          <p
            className={`text-[10px] font-medium ${
              step >= s.step ? 'text-violet-600' : 'text-slate-400'
            }`}
          >
            {s.label}
          </p>
          {i < steps.length - 1 && (
            <div
              className={`h-0.5 flex-1 rounded-full transition-colors ${
                step > s.step ? 'bg-violet-400' : 'bg-slate-100'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

interface OrderDetailModalProps {
  order: Order;
  inventory: Inventory[];
  onClose: () => void;
  onOrderAgain: (drink: Drink) => void;
}

function OrderDetailModal({
  order,
  inventory,
  onClose,
  onOrderAgain,
}: OrderDetailModalProps) {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const status = (order.OrderStatus as OrderStatus) ?? 'Pending';
  const payment = (order.PaymentStatus as PaymentStatus) ?? 'Pending';
  const statusConfig = ORDER_STATUS_CONFIG[status];
  const paymentConfig = PAYMENT_CONFIG[payment];

  useEffect(() => {
    const fetchDrinks = async () => {
      setLoading(true);
      try {
        const fetched = await Promise.all(
          order.Drinks.map((id) => getDrink(id))
        );
        setDrinks(fetched);
      } catch {
        setError('Could not load drink details.');
      } finally {
        setLoading(false);
      }
    };
    fetchDrinks();
  }, [order.Drinks]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[90dvh] w-full flex-col rounded-t-3xl bg-white sm:max-w-md sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Order Details
            </h2>
            <p className="font-mono text-xs text-slate-400">
              #{order.OrderID.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <OrderProgressBar status={status} />

          <div className="flex flex-wrap gap-2">
            <span
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusConfig.color}`}
            >
              {statusConfig.icon}
              {statusConfig.label}
            </span>
            <span
              className={`flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold ${paymentConfig.color}`}
            >
              <CreditCard size={11} />
              {paymentConfig.label}
            </span>
          </div>

          {order.LockerCombo && status === 'Completed' && (
            <div className="rounded-2xl bg-violet-600 p-5 text-center text-white">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Lock size={16} />
                <p className="text-sm font-bold">Your Locker Code</p>
              </div>
              <p className="text-5xl font-black tracking-widest">
                {order.LockerCombo}
              </p>
              <p className="mt-2 text-xs text-violet-200">
                Enter this code at the locker to retrieve your order
              </p>
            </div>
          )}

          <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Ordered</span>
              <span className="font-medium text-slate-700">
                {new Date(order.CreationTime).toLocaleString()}
              </span>
            </div>
            {order.PickupTime && (
              <div className="flex justify-between">
                <span className="text-slate-500">Pickup</span>
                <span className="font-medium text-slate-700">
                  {new Date(order.PickupTime).toLocaleTimeString(
                    undefined,
                    { hour: '2-digit', minute: '2-digit' }
                  )}
                </span>
              </div>
            )}
            {order.StripeID && (
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction</span>
                <span className="max-w-[160px] truncate font-mono text-xs text-slate-400">
                  {order.StripeID}
                </span>
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              Drinks ({order.Drinks.length})
            </p>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2
                  size={22}
                  className="animate-spin text-violet-400"
                />
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-500">
                <AlertCircle size={14} />
                {error}
              </div>
            ) : (
              <div className="space-y-2">
                {drinks.map((drink) => (
                  <div
                    key={drink.DrinkID}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3"
                  >
                    <DrinkColorAvatar
                      sodas={
                        Array.isArray(drink.SodaUsed)
                          ? drink.SodaUsed
                          : [drink.SodaUsed]
                      }
                      name={drink.Name}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {drink.Name}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {Array.isArray(drink.SodaUsed)
                          ? drink.SodaUsed.join(', ')
                          : drink.SodaUsed}
                        {drink.SyrupsUsed && drink.SyrupsUsed.length > 0
                          ? ` · ${drink.SyrupsUsed.slice(0, 2).join(', ')}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="text-sm font-bold text-violet-600">
                        ${calculateDrinkPrice(drink).toFixed(2)}
                      </span>
                      <button
                        onClick={() => {
                          onOrderAgain(drink);
                          onClose();
                        }}
                        className="rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-violet-700 transition-colors"
                      >
                        Order Again
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  onViewDetails,
}: {
  order: Order;
  onViewDetails: (order: Order) => void;
}) {
  const status = (order.OrderStatus as OrderStatus) ?? 'Pending';
  const statusConfig = ORDER_STATUS_CONFIG[status];
  const isCompleted = status === 'Completed';
  const isActive = status === 'Pending' || status === 'Processing';

  return (
    <button
      onClick={() => onViewDetails(order)}
      className="w-full overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition-shadow hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            isCompleted
              ? 'bg-green-50'
              : isActive
              ? 'bg-violet-50'
              : 'bg-slate-100'
          }`}
        >
          <ShoppingBag
            size={20}
            className={
              isCompleted
                ? 'text-green-600'
                : isActive
                ? 'text-violet-600'
                : 'text-slate-400'
            }
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-slate-900">
                #{order.OrderID.slice(0, 8).toUpperCase()}
              </p>
              <p className="text-xs text-slate-400">
                {order.Drinks.length} drink
                {order.Drinks.length !== 1 ? 's' : ''} ·{' '}
                {new Date(order.CreationTime).toLocaleDateString(
                  undefined,
                  { month: 'short', day: 'numeric' }
                )}
              </p>
            </div>
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusConfig.color}`}
            >
              {statusConfig.icon}
              {statusConfig.label}
            </span>
          </div>

          {isActive && (
            <div className="mt-3">
              <OrderProgressBar status={status} />
            </div>
          )}

          {isCompleted && order.LockerCombo && (
            <div className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-violet-50 px-3 py-2">
              <Lock size={13} className="text-violet-500" />
              <p className="text-xs font-bold text-violet-700">
                Locker Code:{' '}
                <span className="tracking-widest">{order.LockerCombo}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-50 px-4 py-2">
        <p className="text-center text-xs text-slate-400">
          Tap to view details
        </p>
      </div>
    </button>
  );
}

type TabFilter = 'active' | 'past' | 'all';

export default function CustomerOrdersPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabFilter>('active');

  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [orderAgainDrink, setOrderAgainDrink] = useState<Drink | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [ord, inv] = await Promise.all([
        getUserOrders(user.id),
        getInventory(),
      ]);
      setOrders(
        [...ord].sort(
          (a, b) =>
            new Date(b.CreationTime).getTime() -
            new Date(a.CreationTime).getTime()
        )
      );
      setInventory(inv);
    } catch {
      setError('Could not load your orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const activeOrders = orders.filter(
    (o) => o.OrderStatus === 'Pending' || o.OrderStatus === 'Processing'
  );
  const pastOrders = orders.filter(
    (o) => o.OrderStatus === 'Completed' || o.OrderStatus === 'Cancelled'
  );
  const displayedOrders =
    tab === 'active' ? activeOrders : tab === 'past' ? pastOrders : orders;

  const tabs: { id: TabFilter; label: string; count: number }[] = [
    { id: 'active', label: 'Active', count: activeOrders.length },
    { id: 'past',   label: 'Past',   count: pastOrders.length   },
    { id: 'all',    label: 'All',    count: orders.length       },
  ];

  return (
    <>
      {/* Sticky tab bar sits directly below the fixed header (top-14) */}
      <div className="fixed top-14 z-30 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="flex">
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
      </div>

      {/* pt-28 = header (56px) + tab bar (~44px), pb-24 = bottom nav */}
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-28">
        {loading ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <Loader2
              size={28}
              className="animate-spin text-violet-500 mb-3"
            />
            <p className="text-sm">Loading your orders...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-5 text-center">
            <AlertCircle className="mx-auto mb-2 text-red-400" size={22} />
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
              {tab === 'active' ? (
                <Clock size={28} className="text-slate-300" />
              ) : (
                <Package size={28} className="text-slate-300" />
              )}
            </div>
            <p className="text-base font-semibold text-slate-700">
              {tab === 'active'
                ? 'No active orders'
                : tab === 'past'
                ? 'No past orders yet'
                : 'No orders yet'}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {tab === 'active'
                ? 'Your in-progress orders will appear here'
                : 'Your order history will appear here'}
            </p>
            {tab !== 'active' && (
              <button
                onClick={() => router.push('/')}
                className="mt-5 rounded-2xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-700 transition-colors"
              >
                Browse Drinks
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayedOrders.map((order) => (
              <OrderCard
                key={order.OrderID}
                order={order}
                onViewDetails={setDetailOrder}
              />
            ))}
          </div>
        )}
      </main>

      {/* Order detail modal */}
      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          inventory={inventory}
          onClose={() => setDetailOrder(null)}
          onOrderAgain={(drink) => {
            setDetailOrder(null);
            setOrderAgainDrink(drink);
          }}
        />
      )}

      {/* Order Again customize modal */}
      {orderAgainDrink && (
        <CustomizeModal
          drink={orderAgainDrink}
          inventory={inventory}
          onClose={() => setOrderAgainDrink(null)}
        />
      )}
    </>
  );
}