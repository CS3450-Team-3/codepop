// components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  X,
  User,
  ShoppingBag,
  MapPin,
  Share2,
  HelpCircle,
  Settings,
  LogOut,
  LogIn,
  UserPlus,
  LayoutDashboard,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/app/contextProviders/AuthContext';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

function getNavItems(userType?: string): NavItem[] {
  const base: NavItem[] = [
    { label: 'My Orders',  href: '/customer/orders',  icon: <ShoppingBag size={19} /> },
    { label: 'My Profile', href: '/customer/profile', icon: <User size={19} /> },
    { label: 'Locations',  href: '/locations',        icon: <MapPin size={19} /> },
    { label: 'Share with Friends', href: '/share',    icon: <Share2 size={19} /> },
    { label: 'Help & Support',     href: '/help',     icon: <HelpCircle size={19} /> },
    { label: 'Settings',           href: '/settings', icon: <Settings size={19} /> },
  ];

  if (userType === 'store_manager' || userType === 'logistics_manager') {
    return [
      { label: 'Manager Dashboard', href: '/manage/dashboard', icon: <LayoutDashboard size={19} /> },
      { label: 'Locations',  href: '/locations',  icon: <MapPin size={19} /> },
      { label: 'Settings',   href: '/settings',   icon: <Settings size={19} /> },
    ];
  }

  if (userType === 'admin' || userType === 'super_admin') {
    return [
      { label: 'Admin Dashboard', href: '/admin/dashboard', icon: <Shield size={19} /> },
      { label: 'Settings',        href: '/settings',        icon: <Settings size={19} /> },
    ];
  }

  return base;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const navItems = getNavItems(user?.user_type);

  const handleLogout = () => {
    logout();
    onClose();
    router.push('/');
  };

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() ||
      user.username[0].toUpperCase()
    : 'G';

  const displayName = user
    ? user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.username
    : 'Guest User';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed left-0 top-0 z-[60] flex h-full w-[280px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
              {initials}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{displayName}</p>
              <p className="text-xs text-slate-400">
                {user ? (user.email ?? user.username) : 'Guest User'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {user ? (
            <>
              <ul className="space-y-0.5">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-violet-50 text-violet-700'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className={isActive ? 'text-violet-600' : 'text-slate-400'}>
                          {item.icon}
                        </span>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-3 border-t border-slate-100 pt-3">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={19} />
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            // Guest state
            <ul className="space-y-0.5">
              <li>
                <Link
                  href="/auth/login"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <LogIn size={19} className="text-slate-400" />
                  Sign In
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/register"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <UserPlus size={19} className="text-slate-400" />
                  Create Account
                </Link>
              </li>
              <li>
                <Link
                  href="/locations"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <MapPin size={19} className="text-slate-400" />
                  Locations
                </Link>
              </li>
            </ul>
          )}
        </nav>

        {/* Share & Save promo — only for authenticated customers */}
        {user?.user_type === 'customer' && (
          <div className="mx-4 mb-6 rounded-2xl bg-violet-50 p-4">
            <p className="text-sm font-bold text-slate-800">Share &amp; Save!</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Post with{' '}
              <span className="font-semibold text-violet-600">#SocialDrinking</span>{' '}
              for 10% off
            </p>
            <button className="mt-3 w-full rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">
              Learn More
            </button>
          </div>
        )}
      </aside>
    </>
  );
}