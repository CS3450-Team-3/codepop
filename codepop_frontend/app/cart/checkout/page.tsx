// app/cart/checkout/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { ArrowLeft, ShieldCheck, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useCart } from '@/app/contextProviders/CartContext';
import { useAuth } from '@/app/contextProviders/AuthContext';
import { useStore } from '@/app/contextProviders/StoreContext';
import { createOrder } from '@/models/api/order';
import DrinkColorAvatar from '@/components/drinks/DrinkColorAvatar';

// ── Stripe instance — must be outside component so it's only created once ──
// Pull from env so the key is never hardcoded
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''
);

// ── Inner form — must be a child of <Elements> ──────────────────────────────
interface CheckoutFormProps {
  orderId: string;
  total: number;
  onSuccess: () => void;
}

function CheckoutForm({ orderId, total, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Fallback redirect URL — for 3DS etc.
        return_url: `${window.location.origin}/order-confirmation/${orderId}`,
      },
      // Don't do a full page redirect for card payments that don't need it
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed. Please try again.');
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      onSuccess();
    } else {
      setError('Unexpected payment state. Please contact support.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || processing}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 text-sm font-bold text-white transition-all hover:bg-violet-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {processing ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Processing...
          </>
        ) : (
          `Pay $${total.toFixed(2)}`
        )}
      </button>

      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <Lock size={11} />
        Secure encrypted payment via Stripe
      </div>
    </form>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
type CheckoutState =
  | { status: 'idle' }
  | { status: 'creating' }
  | { status: 'ready'; clientSecret: string; orderId: string }
  | { status: 'error'; message: string };

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { storeId } = useStore();
  const { items, totalPrice, clearCart } = useCart();

  const [checkoutState, setCheckoutState] = useState<CheckoutState>({
    status: 'idle',
  });

  const tax = totalPrice * 0.08;
  const grandTotal = totalPrice + tax;

  // ── Create the order + PaymentIntent when page mounts ───────────────────
  // NOTE: This assumes your backend's POST /orders/ returns a clientSecret
  // in the response alongside the order data. If the endpoint is different,
  // swap out the API call here.
  const initializeCheckout = useCallback(async () => {
    if (items.length === 0) {
      router.replace('/cart');
      return;
    }

    setCheckoutState({ status: 'creating' });

    try {
      // Collect all drink IDs from cart items
      // For drinks that are new customizations (User_Created), you may need
      // to POST them to /drinks/ first to get a real DrinkID — for now we
      // send the IDs we have
      const drinkIds = items.map((item) => item.drink.DrinkID);

      const order = await createOrder({
        ...(user ? { UserID: user.id } : {}),
        Drinks: drinkIds,
        OrderStatus: 'Pending',
        PaymentStatus: 'Pending',
      });

      // ⚠️  Your backend needs to return clientSecret on order creation.
      // If it's on a different field, adjust here.
      const clientSecret = (order as unknown as Record<string, string>)
        .clientSecret;

      if (!clientSecret) {
        throw new Error(
          'No clientSecret returned from server. Check backend Stripe integration.'
        );
      }

      setCheckoutState({
        status: 'ready',
        clientSecret,
        orderId: order.OrderID,
      });
    } catch (err) {
      setCheckoutState({
        status: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Failed to initialize checkout. Please try again.',
      });
    }
  }, [items, user, router]);

  useEffect(() => {
    initializeCheckout();
  }, [initializeCheckout]);

  const handleSuccess = useCallback(() => {
    clearCart();
    const orderId =
      checkoutState.status === 'ready' ? checkoutState.orderId : '';
    router.replace(`/order-confirmation/${orderId}`);
  }, [clearCart, checkoutState, router]);

  // ── Stripe Elements options ──────────────────────────────────────────────
  const elementsOptions: StripeElementsOptions =
    checkoutState.status === 'ready'
      ? {
          clientSecret: checkoutState.clientSecret,
          appearance: {
            theme: 'stripe' as const,
            variables: {
              colorPrimary: '#7c3aed',
              borderRadius: '12px',
              fontFamily: 'var(--font-geist-sans)',
            },
          },
        }
      : {};

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="fixed top-0 z-40 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="flex h-14 items-center px-4">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="flex-1 text-center text-base font-bold text-slate-900">
            Checkout
          </h1>
          {/* Spacer to center title */}
          <div className="w-9" />
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-12 pt-20">
        {/* ── Order summary ── */}
        <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
            Order Summary
          </p>

          <div className="space-y-2.5">
            {items.map((item) => (
              <div key={item.cartItemId} className="flex items-center gap-3">
                <DrinkColorAvatar
                  sodas={item.drink.SodaUsed}
                  name={item.drink.Name}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {item.drink.Name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {item.size} · qty {item.quantity}
                  </p>
                </div>
                <span className="text-sm font-bold text-slate-700">
                  ${(item.linePrice * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>Tax (8%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900">
              <span>Total</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* ── Payment section ── */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          {/* Secure badge */}
          <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-600">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Secure Payment</p>
              <p className="text-xs text-slate-400">
                Your card info never touches our servers.
              </p>
            </div>
          </div>

          {/* State-driven content */}
          {checkoutState.status === 'idle' ||
          checkoutState.status === 'creating' ? (
            <div className="flex flex-col items-center py-8 text-slate-400">
              <Loader2 size={28} className="animate-spin text-violet-500 mb-3" />
              <p className="text-sm">Preparing your order...</p>
            </div>
          ) : checkoutState.status === 'error' ? (
            <div className="rounded-xl bg-red-50 p-4 text-center">
              <AlertCircle
                className="mx-auto mb-2 text-red-400"
                size={22}
              />
              <p className="text-sm font-medium text-red-700">
                {checkoutState.message}
              </p>
              <button
                onClick={initializeCheckout}
                className="mt-3 text-xs font-bold text-red-500 underline"
              >
                Try again
              </button>
            </div>
          ) : (
            // Ready — render Stripe Elements
            <Elements stripe={stripePromise} options={elementsOptions}>
              <CheckoutForm
                orderId={checkoutState.orderId}
                total={grandTotal}
                onSuccess={handleSuccess}
              />
            </Elements>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          By completing your purchase you agree to our{' '}
          <span className="underline cursor-pointer">terms of service</span>.
        </p>
      </main>
    </div>
  );
}