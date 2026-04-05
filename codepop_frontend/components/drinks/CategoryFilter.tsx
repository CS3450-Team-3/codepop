// components/drinks/CategoryFilter.tsx
'use client';

import { Flame, Star, Droplets, Zap, Sparkles, LayoutGrid } from 'lucide-react';

export type DrinkCategory =
  | 'all'
  | 'trending'
  | 'signature'
  | 'fruity'
  | 'energy'
  | 'classic'
  | 'custom';

interface Category {
  id: DrinkCategory;
  label: string;
  icon: React.ReactNode;
}

const CATEGORIES: Category[] = [
  { id: 'all',       label: 'All',       icon: <LayoutGrid size={14} /> },
  { id: 'trending',  label: 'Trending',  icon: <Flame size={14} /> },
  { id: 'signature', label: 'Signature', icon: <Star size={14} /> },
  { id: 'fruity',    label: 'Fruity',    icon: <Droplets size={14} /> },
  { id: 'energy',    label: 'Energy',    icon: <Zap size={14} /> },
  { id: 'classic',   label: 'Classic',   icon: <Sparkles size={14} /> },
  { id: 'custom',    label: 'Custom',    icon: <Sparkles size={14} /> },
];

interface CategoryFilterProps {
  active: DrinkCategory;
  onChange: (cat: DrinkCategory) => void;
  onCustomClick?: () => void;
}

export default function CategoryFilter({
  active,
  onChange,
  onCustomClick,
}: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none px-4">
      {CATEGORIES.map((cat) => {
        const isActive = cat.id === active;
        return (
          <button
            key={cat.id}
            //onClick={() => (cat.id === 'custom' ? onCustomClick?.() : onChange(cat.id))}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
              isActive
                ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-violet-300 hover:text-violet-600'
            }`}
            onClick={() => (cat.id === 'custom' ? onCustomClick?.() : onChange(cat.id))}
          >
            {cat.icon}
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}