// app/cart/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Minus, Plus, ShoppingCart } from 'lucide-react';
import { useCart } from '@/app/contextProviders/CartContext';
import DrinkColorAvatar from '@/components/drinks/DrinkColorAvatar';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { useState } from 'react';
import { Drink } from '@/models/types/drink';
import CustomizeModal from '@/components/modals/CustomizeModal';
import { Inventory } from '@/models/types/inventory';

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, totalPrice } = useCart();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customizeModalDrink, setCustomizeModalDrink] = useState<Drink | null>(null);

  const customDrinkScaffold: Drink = {
    DrinkID: 'custom',
    Name: 'Custom Drink',
    SodaUsed: [],
    SyrupsUsed: [],
    AddIns: [],
    Price: 3.99,
    User_Created: true,
    Favorite: [],
  };

  return (
    <div className="min-h-screen app-bg relative">
      {/* Header */}
      <header className="fixed top-0 z-40 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={22} />
          </button>

          <span className="text-base font-bold text-slate-900">Your Cart</span>

          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs font-semibold text-red-400 hover:text-red-600 transition-colors"
            >
              Clear all
            </button>
          )}
          {items.length === 0 && <div className="w-16" />}
        </div>
      </header>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="mx-auto max-w-2xl px-4 pb-40 pt-20">
        {items.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <ShoppingCart size={28} className="text-slate-300" />
            </div>
            <p className="text-base font-semibold text-slate-700">
              Your cart is empty
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Head back and find something delicious
            </p>
            <button
              onClick={() => router.push('/')}
              className="mt-5 rounded-2xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-700 transition-colors"
            >
              Browse Drinks
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.cartItemId}
                  className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm border border-slate-100"
                >
                  <DrinkColorAvatar
                    sodas={item.drink.SodaUsed}
                    name={item.drink.Name}
                    size="md"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-slate-900 truncate">
                          {item.drink.Name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {item.size} · {item.selectedSoda}
                          {item.selectedSyrups.length > 0 &&
                            ` · ${item.selectedSyrups.join(', ')}`}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.cartItemId)}
                        className="ml-2 shrink-0 rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between">
                      {/* Quantity stepper */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateQuantity(item.cartItemId, item.quantity - 1)
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-5 text-center text-sm font-bold text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.cartItemId, item.quantity + 1)
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <span className="font-bold text-violet-600">
                        ${(item.linePrice * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order summary */}
            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm text-slate-500">
                <span>Tax (est.)</span>
                <span>${(totalPrice * 0.08).toFixed(2)}</span>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3 flex justify-between text-base font-bold text-slate-900">
                <span>Total</span>
                <span>${(totalPrice * 1.08).toFixed(2)}</span>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Sticky checkout bar */}
      {items.length > 0 && (
        <div className="fixed bottom-16 left-0 z-20 w-full border-t border-slate-100 bg-white/95 backdrop-blur-md px-4 py-3">
          <button
            onClick={() => router.push('checkout')}
            className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-bold text-white hover:bg-violet-700 transition-colors active:scale-[0.98]"
          >
            Checkout · ${(totalPrice * 1.08).toFixed(2)}
          </button>
        </div>
      )}

      <BottomNav onCustomizeClick={() => setCustomizeModalDrink(customDrinkScaffold)} />

      {customizeModalDrink && (
        <CustomizeModal
          drink={customizeModalDrink}
          inventory={[] as Inventory[]}
          onClose={() => setCustomizeModalDrink(null)}
        />
      )}
    </div>
  );
}