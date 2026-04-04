// app/ai-picks/page.tsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/app/contextProviders/AuthContext';
import { useStore } from '@/app/contextProviders/StoreContext';
import { generateGuestDrink, generateUserDrink } from '@/models/api/drinks';
import { getInventory } from '@/models/api/inventory';
import { Drink } from '@/models/types/drink';
import { Inventory } from '@/models/types/inventory';
import DrinkCard from '@/components/drinks/DrinkCard';
import CustomizeModal from '@/components/modals/CustomizeModal';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';

// The AI endpoint returns a freeform object — we normalize it into Drink shape
function normalizeDrink(raw: Record<string, unknown>, index: number): Drink {
  // Helper to always produce a string array regardless of what the AI returns
  const toStringArray = (val: unknown): string[] => {
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === 'string' && val.trim()) return [val];
    return [];
  };

  return {
    DrinkID: `ai-${index}-${Date.now()}`,
    Name:
      (raw.Name as string) ??
      (raw.name as string) ??
      `AI Pick #${index + 1}`,
    SodaUsed: toStringArray(raw.SodaUsed ?? raw.soda_used),
    SyrupsUsed: toStringArray(raw.SyrupsUsed ?? raw.syrups_used),
    AddIns: toStringArray(raw.AddIns ?? raw.add_ins),
    Price: (raw.Price as number) ?? (raw.price as number) ?? 4.99,
    Rating: raw.Rating as number | undefined,
    Size: (raw.Size as string) ?? 'Medium',
    Ice: (raw.Ice as string) ?? 'Regular',
    User_Created: false,
    Favorite: [],
  };
}

export default function AIPicksPage() {
  const { user } = useAuth();
  const { storeId } = useStore();
  const router = useRouter();

  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [modalDrink, setModalDrink] = useState<Drink | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [aiResult, inventoryData] = await Promise.all([
        user ? generateUserDrink(user.id) : generateGuestDrink(),
        getInventory(),
      ]);

      // The API returns either an array or a single object — handle both
      const rawList = Array.isArray(aiResult)
        ? (aiResult as Record<string, unknown>[])
        : [aiResult as Record<string, unknown>];

      setDrinks(rawList.map(normalizeDrink));
      setInventory(inventoryData);
      setHasLoaded(true);
    } catch {
      setError('Could not generate recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Auto-load on first mount
  useEffect(() => { load(); }, [load]);

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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="fixed top-0 z-40 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={22} />
          </button>

          <div className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Sparkles size={18} className="text-violet-500" />
            AI Picks
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-violet-300 hover:text-violet-600 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="mx-auto max-w-2xl px-4 pb-28 pt-20">
        {/* Info banner */}
        <div className="mb-4 rounded-2xl bg-violet-50 border border-violet-100 px-4 py-3">
          <p className="text-sm font-bold text-violet-700">
            ✨ AI-Generated Recommendations
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {user
              ? 'Crafted just for you based on your order history and preferences.'
              : 'Unique combinations based on trending flavors and popular ingredients.'}
          </p>
        </div>

        {/* States */}
        {loading ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <Loader2 size={32} className="animate-spin text-violet-500 mb-3" />
            <p className="text-sm font-medium">
              {user ? 'Personalizing your picks...' : 'Generating recommendations...'}
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-5 text-center">
            <AlertCircle className="mx-auto mb-2 text-red-400" size={24} />
            <p className="text-sm font-medium text-red-700">{error}</p>
            <button
              onClick={load}
              className="mt-3 text-xs font-bold text-red-500 underline"
            >
              Try again
            </button>
          </div>
        ) : hasLoaded && drinks.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm">No recommendations generated.</p>
            <button
              onClick={load}
              className="mt-2 text-xs font-bold text-violet-500 underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {drinks.map((drink, index) => (
              <DrinkCard
                key={drink.DrinkID}
                drink={drink}
                onOrderNow={(d) => setModalDrink(d)}
                rank={index + 1}
                aiSuggested
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav onCustomizeClick={() => setModalDrink(customDrinkScaffold)} />

      {modalDrink && (
        <CustomizeModal
          drink={modalDrink}
          inventory={inventory}
          onClose={() => setModalDrink(null)}
        />
      )}
    </div>
  );
}