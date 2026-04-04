// app/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/app/contextProviders/AuthContext';
import { useStore } from '@/app/contextProviders/StoreContext';
import { getDrinks } from '@/models/api/drinks';
import { getInventory } from '@/models/api/inventory';
import { Drink } from '@/models/types/drink';
import { Inventory } from '@/models/types/inventory';
import StoreSelector from '@/components/StoreSelector';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import CategoryFilter, { DrinkCategory } from '@/components/drinks/CategoryFilter';
import DrinkCard from '@/components/drinks/DrinkCard';
import CustomizeModal from '@/components/modals/CustomizeModal';
import { Loader2, AlertCircle } from 'lucide-react';

// Map category filter → drink properties to filter/sort by
function filterDrinks(drinks: Drink[], category: DrinkCategory): Drink[] {
  switch (category) {
    case 'trending':
      // Highest rated first
      return [...drinks].sort((a, b) => (b.Rating ?? 0) - (a.Rating ?? 0));

    case 'signature':
      // Not user-created (house drinks)
      return drinks.filter((d) => !d.User_Created);

    case 'custom':
      // User-created drinks
      return drinks.filter((d) => d.User_Created);

    case 'fruity': {
      const fruityKeywords = ['mango', 'strawberry', 'cherry', 'peach', 'lime', 'lemon', 'berry', 'tropical', 'pineapple', 'coconut', 'watermelon', 'raspberry', 'blueberry'];
      return drinks.filter((d) =>
        [...(d.SyrupsUsed ?? []), ...(d.AddIns ?? []), ...d.SodaUsed]
          .some((ingredient) =>
            fruityKeywords.some((kw) => ingredient.toLowerCase().includes(kw))
          )
      );
    }

    case 'energy': {
      const energyKeywords = ['energy', 'boost', 'dew', 'power', 'caffeine', 'monster', 'red bull'];
      return drinks.filter((d) =>
        [...d.SodaUsed, ...(d.AddIns ?? [])]
          .some((ingredient) =>
            energyKeywords.some((kw) => ingredient.toLowerCase().includes(kw))
          )
      );
    }

    case 'classic': {
      const classicSodas = ['coke', 'cola', 'sprite', 'dr pepper', 'dr. pepper', 'root beer', '7up'];
      return drinks.filter((d) =>
        d.SodaUsed.some((soda) =>
          classicSodas.some((kw) => soda.toLowerCase().includes(kw))
        )
      );
    }

    case 'all':
    default:
      return drinks;
  }
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { storeId, setStore } = useStore();

  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [drinksLoading, setDrinksLoading] = useState(true);
  const [drinksError, setDrinksError] = useState<string | null>(null);

  const [category, setCategory] = useState<DrinkCategory>('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // The drink currently open in the customize modal
  // null = modal closed, undefined = custom (blank) drink
  const [modalDrink, setModalDrink] = useState<Drink | null | undefined>(
    undefined
  );
  const isModalOpen = modalDrink !== undefined;

  // ── Data fetching ──────────────────────────────────────────
  useEffect(() => {
    if (!storeId) return;

    const load = async () => {
      setDrinksLoading(true);
      setDrinksError(null);
      try {
        const [drinksData, inventoryData] = await Promise.all([
          getDrinks(),
          getInventory(),
        ]);
        setDrinks(drinksData);
        setInventory(inventoryData);
      } catch {
        setDrinksError('Could not load drinks. Please try again.');
      } finally {
        setDrinksLoading(false);
      }
    };

    load();
  }, [storeId]);

  // ── Filtering ──────────────────────────────────────────────
  const filteredDrinks = useMemo(
    () => filterDrinks(drinks, category),
    [drinks, category]
  );

  // ── Custom drink scaffold for the "build from scratch" flow ──
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

  const openCustomize = (drink: Drink) => setModalDrink(drink);
  const openCustomDrink = () => setModalDrink(customDrinkScaffold);
  const closeModal = () => setModalDrink(undefined);

  // ── Loading / store gate ───────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 size={32} className="animate-spin text-violet-500" />
          <p className="text-sm font-medium">Loading CodePop...</p>
        </div>
      </div>
    );
  }

  if (!storeId) {
    return <StoreSelector onSelect={setStore} />;
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        onMenuClick={() => setSidebarOpen(true)}
        onCustomizeClick={openCustomDrink}
      />

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="mx-auto max-w-2xl px-0 pb-28 pt-14">
        {/* ── Hero greeting ── */}
        <section className="bg-white px-4 py-5 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-900">
            {user
              ? `Hey ${user.first_name ?? user.username} 👋`
              : 'Welcome to CodePop 👋'}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {user
              ? "What are we building today?"
              : "Build your perfect custom soda. No account needed."}
          </p>
        </section>

        {/* ── Category filter ── */}
        <section className="sticky top-14 z-20 bg-white py-3 border-b border-slate-100">
          <CategoryFilter active={category} onChange={setCategory} onCustomClick={openCustomDrink} />
        </section>

        {/* ── Drinks list ── */}
        <section className="px-4 pt-4">
          <h2 className="mb-3 text-base font-bold text-slate-800">
            {category === 'all'
              ? 'All Drinks'
              : category === 'trending'
              ? 'Trending Drinks'
              : category === 'signature'
              ? 'Signature Drinks'
              : category === 'fruity'
              ? 'Fruity Drinks'
              : category === 'energy'
              ? 'Energy Drinks'
              : category === 'classic'
              ? 'Classic Drinks'
              : category === 'custom'
              ? 'Custom Drinks'
              : 'Custom Drinks'}
          </h2>

          {drinksLoading ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <Loader2 size={28} className="animate-spin text-violet-500 mb-3" />
              <p className="text-sm">Loading drinks...</p>
            </div>
          ) : drinksError ? (
            <div className="rounded-2xl bg-red-50 p-5 text-center">
              <AlertCircle className="mx-auto mb-2 text-red-400" size={24} />
              <p className="text-sm font-medium text-red-700">{drinksError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 text-xs font-bold text-red-500 underline"
              >
                Try again
              </button>
            </div>
          ) : filteredDrinks.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p className="text-sm">No drinks in this category yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDrinks.map((drink, index) => (
                <DrinkCard
                  key={drink.DrinkID}
                  drink={drink}
                  onOrderNow={openCustomize}
                  rank={category === 'trending' ? index + 1 : undefined}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav onCustomizeClick={openCustomDrink} />

      {/* Customize modal — shared between "Order Now" and "+ Custom" */}
      {isModalOpen && (
        <CustomizeModal
          drink={modalDrink ?? customDrinkScaffold}
          inventory={inventory}
          onClose={closeModal}
        />
      )}
    </div>
  );
}