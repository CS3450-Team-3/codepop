// components/modals/CustomizeModal.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { Drink } from '@/models/types/drink';
import { Inventory } from '@/models/types/inventory';
import { useCart } from '@/app/contextProviders/CartContext';
import { calculateDrinkPrice, SIZE_UPCHARGES, SYRUP_UPCHARGE } from '@/utils/pricing';

type Size = 'Small' | 'Medium' | 'Large';

const SIZE_CONFIG: Record<Size, { label: string; oz: string; upcharge: number }> = {
  Small:  { label: 'Small',  oz: '16oz', upcharge: SIZE_UPCHARGES['small'] },
  Medium: { label: 'Medium', oz: '24oz', upcharge: SIZE_UPCHARGES['medium'] },
  Large:  { label: 'Large',  oz: '32oz', upcharge: SIZE_UPCHARGES['large'] },
};

interface CustomizeModalProps {
  drink: Drink | null;
  inventory: Inventory[];
  onClose: () => void;
}

export default function CustomizeModal({
  drink,
  inventory,
  onClose,
}: CustomizeModalProps) {
  const { addItem } = useCart();

  const availableSodas = inventory
    .filter((i) => i.ItemType === 'Soda' && (i.InStock ?? i.Quantity > 0))
    .map((i) => i.ItemName);

  const availableSyrups = inventory
    .filter((i) => i.ItemType === 'Syrup' && (i.InStock ?? i.Quantity > 0))
    .map((i) => i.ItemName);

  const availableAddIns = inventory
    .filter((i) => i.ItemType === 'Add In' && (i.InStock ?? i.Quantity > 0))
    .map((i) => i.ItemName);

  // Pre-fill from the drink, fallback to first available
  const defaultSoda =
    drink?.SodaUsed?.[0] ?? availableSodas[0] ?? '';

  const [selectedSoda, setSelectedSoda] = useState(defaultSoda);
  const [selectedSyrups, setSelectedSyrups] = useState<string[]>(
    drink?.SyrupsUsed ?? []
  );
  const [selectedAddIns, setSelectedAddIns] = useState<string[]>(
    drink?.AddIns ?? []
  );
  const [size, setSize] = useState<Size>('Medium');
  const [quantity, setQuantity] = useState(1);

  // Reset state when a new drink is opened
  useEffect(() => {
    if (!drink) return;
    setSelectedSoda(drink.SodaUsed?.[0] ?? availableSodas[0] ?? '');
    setSelectedSyrups(drink.SyrupsUsed ?? []);
    setSelectedAddIns(drink.AddIns ?? []);
    setSize('Medium');
    setQuantity(1);
  }, [drink?.DrinkID]);

  const toggleSyrup = useCallback((syrup: string) => {
    setSelectedSyrups((prev) =>
      prev.includes(syrup) ? prev.filter((s) => s !== syrup) : [...prev, syrup]
    );
  }, []);

  const toggleAddIn = useCallback((addIn: string) => {
    setSelectedAddIns((prev) =>
      prev.includes(addIn) ? prev.filter((a) => a !== addIn) : [...prev, addIn]
    );
  }, []);

  const linePrice = drink
    ? calculateDrinkPrice({
        ...drink,
        Size: size,
        SyrupsUsed: selectedSyrups,
        AddIns: selectedAddIns,
      })
    : 0;

  const handleAddToCart = () => {
    if (!drink) return;
    addItem({
      drink: {
        ...drink,
        SodaUsed: [selectedSoda],
        SyrupsUsed: selectedSyrups,
        AddIns: selectedAddIns,
        Size: size,
      },
      selectedSoda,
      selectedSyrups,
      selectedAddIns,
      size,
      quantity,
      linePrice,
    });
    onClose();
  };

  // Close on backdrop click or Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!drink) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Sheet — slides up on mobile, centered on desktop */}
      <div className="relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white sm:max-w-md sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{drink.Name}</h2>
            <p className="text-sm text-slate-500">Customize your drink</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Base Soda */}
          <section>
            <label className="block text-sm font-bold text-slate-800 mb-2">
              Base Soda <span className="text-violet-500">*</span>
            </label>
            {availableSodas.length === 0 ? (
              <p className="text-sm text-slate-400">No sodas in stock</p>
            ) : (
              <div className="relative">
                <select
                  value={selectedSoda}
                  onChange={(e) => setSelectedSoda(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                >
                  {availableSodas.map((soda) => (
                    <option key={soda} value={soda}>
                      {soda}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </section>

          {/* Size */}
          <section>
            <label className="block text-sm font-bold text-slate-800 mb-2">
              Size
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(SIZE_CONFIG) as Size[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`flex flex-col items-center rounded-xl border py-3 text-sm transition-all ${
                    size === s
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="font-semibold">{SIZE_CONFIG[s].label}</span>
                  <span className="text-xs opacity-70">{SIZE_CONFIG[s].oz}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Flavor Shots / Syrups */}
          {availableSyrups.length > 0 && (
            <section>
              <div className="flex items-baseline justify-between mb-2">
                <label className="text-sm font-bold text-slate-800">
                  Flavor Shots
                </label>
                <span className="text-xs text-slate-400">
                  +${SYRUP_UPCHARGE.toFixed(2)} each
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Select as many as you'd like
              </p>
              <div className="grid grid-cols-2 gap-2">
                {availableSyrups.map((syrup) => {
                  const checked = selectedSyrups.includes(syrup);
                  return (
                    <button
                      key={syrup}
                      onClick={() => toggleSyrup(syrup)}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all ${
                        checked
                          ? 'border-violet-400 bg-violet-50 text-violet-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`h-4 w-4 shrink-0 rounded flex items-center justify-center border transition-colors ${
                          checked
                            ? 'border-violet-600 bg-violet-600'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {checked && (
                          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      {syrup}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Add-Ins */}
          {availableAddIns.length > 0 && (
            <section>
              <div className="flex items-baseline justify-between mb-2">
                <label className="text-sm font-bold text-slate-800">
                  Add-Ins
                </label>
                <span className="text-xs text-slate-400">Free</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {availableAddIns.map((addIn) => {
                  const checked = selectedAddIns.includes(addIn);
                  return (
                    <button
                      key={addIn}
                      onClick={() => toggleAddIn(addIn)}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all ${
                        checked
                          ? 'border-violet-400 bg-violet-50 text-violet-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`h-4 w-4 shrink-0 rounded flex items-center justify-center border transition-colors ${
                          checked
                            ? 'border-violet-600 bg-violet-600'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {checked && (
                          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      {addIn}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Quantity */}
          <section>
            <label className="block text-sm font-bold text-slate-800 mb-3">
              Quantity
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className="w-6 text-center text-lg font-bold text-slate-900">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </section>
        </div>

        {/* Sticky footer */}
        <div className="border-t border-slate-100 px-5 py-4">
          <button
            onClick={handleAddToCart}
            disabled={!selectedSoda}
            className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-bold text-white transition-all hover:bg-violet-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add to Cart — ${(linePrice * quantity).toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}