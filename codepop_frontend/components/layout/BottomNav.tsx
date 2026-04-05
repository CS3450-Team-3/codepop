// components/layout/BottomNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingCart, Plus, Sparkles } from 'lucide-react';
import { useCart } from '@/app/contextProviders/CartContext';

interface BottomNavProps {
  onCustomizeClick: () => void;
}

export default function BottomNav({ onCustomizeClick }: BottomNavProps) {
  const pathname = usePathname();
  const { totalItems } = useCart();

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="fixed bottom-0 left-0 z-30 w-full border-t border-slate-100 bg-white/95 backdrop-blur-md">
      <div className="flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 px-4 py-2.5 text-xs font-medium transition-colors ${
            isActive('/') ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`rounded-xl p-1.5 ${isActive('/') ? 'bg-violet-50' : ''}`}>
            <Home size={21} />
          </div>
          Home
        </Link>

        {/* AI Picks */}
        <Link
          href="/ai-picks"
          className={`flex flex-col items-center gap-0.5 px-4 py-2.5 text-xs font-medium transition-colors ${
            isActive('/ai-picks/') ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`rounded-xl p-1.5 ${isActive('/ai-picks/') ? 'bg-violet-50' : ''}`}>
            <Sparkles size={21} />
          </div>
          AI Picks
        </Link>

        {/* Cart */}
        <Link
          href="/cart"
          className={`relative flex flex-col items-center gap-0.5 px-4 py-2.5 text-xs font-medium transition-colors ${
            isActive('/cart/') ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`relative rounded-xl p-1.5 ${isActive('/cart/') ? 'bg-violet-50' : ''}`}>
            <ShoppingCart size={21} />
            {totalItems > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[9px] font-bold text-white">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </div>
          Cart
        </Link>
      </div>
    </nav>
  );
}