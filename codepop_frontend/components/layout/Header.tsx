// components/layout/Header.tsx
'use client';

import { Menu } from 'lucide-react';
import Image from 'next/image';

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
  rightAction?: React.ReactNode;
  showLogo?: boolean;
}

export default function Header({
  onMenuClick,
  title,
  rightAction,
}: HeaderProps) {
  const isStaffMode = Boolean(title);

  return (
    <header className="fixed top-0 z-40 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md">
      <div className="relative flex h-14 items-center justify-center px-4">

        {/* Left — always hamburger */}
        <button
          onClick={onMenuClick}
          className="absolute left-4 flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

        {/* Center — logo OR title */}
        {isStaffMode ? (
          <h1 className="text-base font-bold text-slate-900">{title}</h1>
        ) : (
          <Image
            src="/static_image/CodePop_Logo.png"
            alt="CodePop Logo"
            // scaled down could be bigger but this was the quick way to fix the image being too big and overflowing off the header
            width={80}
            height={30}
            className="object-contain"
          />
        )}

        {/* Right — optional action slot */}
        {rightAction && (
          <div className="absolute right-4">
            {rightAction}
          </div>
        )}

      </div>
    </header>
  );
}