// components/layout/Header.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, ShoppingCart, Sparkles, Plus } from 'lucide-react';
import { useAuth } from '@/app/contextProviders/AuthContext';
import { useCart } from '@/app/contextProviders/CartContext';

interface HeaderProps {
  onMenuClick: () => void;
  onCustomizeClick: () => void;
}

export default function Header({ onMenuClick, onCustomizeClick }: HeaderProps) {
  const { user } = useAuth();
  const { totalItems } = useCart();
  const router = useRouter();

  return (
    <header className="fixed top-0 z-40 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left — hamburger */}
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

        {/* Center — actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/ai-picks"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-600 transition-colors"
          >
            <Sparkles size={13} className="text-violet-500" />
            AI Picks
          </Link>
          <button
            onClick={onCustomizeClick}
            className="flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors"
          >
            <Plus size={13} />
            Custom
          </button>
        </div>

        {/* Right — cart */}
        <button
          onClick={() => router.push('/cart')}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="View cart"
        >
          <ShoppingCart size={22} />
          {totalItems > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
              {totalItems > 9 ? '9+' : totalItems}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}