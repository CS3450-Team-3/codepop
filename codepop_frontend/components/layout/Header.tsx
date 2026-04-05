// components/layout/Header.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, ShoppingCart, Sparkles, Plus } from 'lucide-react';
import { useAuth } from '@/app/contextProviders/AuthContext';
import { useCart } from '@/app/contextProviders/CartContext';
import Image from 'next/image';

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
      <div className="relative flex h-14 items-center justify-center px-4">
        {/* Left — hamburger */}
        <button
          onClick={onMenuClick}
          className="absolute left-4 flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <Image
            src="/static_image/CodePop_Logo.png"
            alt="CodePop Logo"
            width={120}
            height={40}
            className="object-contain"
          />
        </div>
      </div>
    </header>
  );
}