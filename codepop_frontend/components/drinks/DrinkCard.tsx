// components/drinks/DrinkCard.tsx
'use client';

import { TrendingUp, Star } from 'lucide-react';
import { Drink } from '@/models/types/drink';
import DrinkColorAvatar from './DrinkColorAvatar';

interface DrinkCardProps {
  drink: Drink;
  onOrderNow: (drink: Drink) => void;
  rank?: number; // optional ranking badge (1, 2, 3...)
  aiSuggested?: boolean;
  aiQuote?: string;
}

export default function DrinkCard({
  drink,
  onOrderNow,
  rank,
  aiSuggested = false,
  aiQuote,
}: DrinkCardProps) {
  // Build a short description from the drink's ingredients
  const description = [
  ...(Array.isArray(drink.SyrupsUsed) ? drink.SyrupsUsed : []),
  ...(Array.isArray(drink.AddIns) ? drink.AddIns : []),
]
  .slice(0, 4)
  .join(', ');

const sodaLabel = Array.isArray(drink.SodaUsed)
  ? drink.SodaUsed.join(', ')
  : drink.SodaUsed ?? '';

  return (
    <div className="relative flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      {/* Rank badge */}
      {rank !== undefined && (
        <div className="absolute top-3 left-3 z-10 bg-violet-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow">
          #{rank}
        </div>
      )}

      {/* Card body */}
      <div className="flex items-start gap-3 p-4">
        <DrinkColorAvatar sodas={drink.SodaUsed} name={drink.Name} size="lg" />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 truncate">
                {drink.Name}
                {aiSuggested && (
                  <span className="ml-1.5 inline-block">
                    <Star size={13} className="inline text-violet-500" />
                  </span>
                )}
              </h3>

              {/* Badge row */}
              <div className="mt-0.5 flex items-center gap-1.5">
                {aiSuggested ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-600">
                    <TrendingUp size={10} /> AI Suggested
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                    <TrendingUp size={10} /> Popular
                  </span>
                )}
              </div>
            </div>

            <span className="shrink-0 font-bold text-violet-600">
              ${drink.Price.toFixed(2)}
            </span>
          </div>

          {/* Description */}
          {(description || sodaLabel) && (
            <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">
              {sodaLabel}
              {description ? ` with ${description}` : ''}
            </p>
          )}

          {/* AI quote */}
          {aiQuote && (
            <p className="mt-1 text-xs italic text-violet-500">"{aiQuote}"</p>
          )}
        </div>
      </div>

      {/* Order button */}
      <button
        onClick={() => onOrderNow(drink)}
        className="mx-4 mb-4 w-[calc(100%-2rem)] rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 active:scale-[0.98]"
      >
        {aiSuggested ? 'Customize & Order' : 'Order Now'}
      </button>
    </div>
  );
}