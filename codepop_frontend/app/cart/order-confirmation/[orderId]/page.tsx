// app/cart/order-confirmation/[orderId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, ShoppingBag, Home, Loader2 } from 'lucide-react';
import { getOrder } from '@/models/api/order';
import { Order } from '@/models/types/order';

export default function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    getOrder(orderId)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [orderId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      {loading ? (
        <Loader2 size={32} className="animate-spin text-violet-500" />
      ) : (
        <div className="w-full max-w-sm text-center">
          {/* Success icon */}
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle size={44} className="text-green-500" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Order Placed!</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your drink is being prepared. We'll notify you when it's ready.
          </p>

          {order && (
            <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Order Details
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Order ID</span>
                  <span className="font-mono text-xs text-slate-700">
                    {order.OrderID.slice(0, 8)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className="font-semibold text-violet-600">
                    {order.OrderStatus ?? 'Pending'}
                  </span>
                </div>
                {order.LockerCombo && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Locker Code</span>
                    <span className="font-bold text-slate-900">
                      {order.LockerCombo}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => router.push('/customer/orders')}
              className="flex items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700 transition-colors"
            >
              <ShoppingBag size={16} />
              View My Orders
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Home size={16} />
              Back to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}