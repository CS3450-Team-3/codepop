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
  Home,
  Trophy,
  Package,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '@/app/contextProviders/AuthContext';
import ServerSwitcher from './ServerSwitcher';
import { useState } from 'react';
import SocialDrinkingModal from '../modals/SocialDrinkingModal';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const locationsItem: NavItem = {
  label: 'Locations',
  href: '/locations',
  icon: <MapPin size={19} />,
};

const mainSection: NavSection = {
  items: [
    { label: 'Home', href: '/', icon: <Home size={19} /> },
    { label: 'My Orders', href: '/customer/orders', icon: <ShoppingBag size={19} /> },
    { label: 'My Profile', href: '/customer/profile', icon: <User size={19} /> },
    locationsItem,
  ],
};

const moreSection: NavSection = {
  title: 'More',
  items: [
    { label: 'Help & Support', href: '/help',    icon: <HelpCircle size={19} /> },
    { label: 'Share with Friends', href: '/share', icon: <Share2 size={19} /> },
    { label: 'Leaderboard', href: '/leaderboard', icon: <Trophy size={19} /> },
  ],
};


function getNavSections(userType?: string): NavSection[] {
  // ── Customer ──────────────────────────────────────────────
  if (!userType || userType === 'customer') {
    return [
      mainSection,
      moreSection,
    ];
  }

  // ── Store Manager ─────────────────────────────
  if (userType === 'store_manager') {
    return [
      mainSection,
      {
        title: 'Management',
        items: [
          { label: 'Dashboard', href: '/manage/dashboard', icon: <LayoutDashboard size={19} /> },
          { label: 'Orders',    href: '/manage/orders',    icon: <ShoppingBag size={19} /> },
          { label: 'Inventory', href: '/manage/inventory', icon: <MapPin size={19} /> },
        ],
      },
      moreSection
    ];
  }

  if (userType === 'logistics_manager') {
    return [
      mainSection,
      {
        items: [
          { label: 'Dashboard', href: '/logistics/dashboard', icon: <LayoutDashboard size={19} /> },
          { label: 'Inventory', href: '/logistics/inventory', icon: <Package size={19} /> },
        ],
      },
      moreSection
    ];
  }

  // ── Admin / Super Admin ───────────────────────────────────
  if (userType === 'admin' || userType === 'super_admin') {
    const adminItems = [
      { label: 'Admin Dashboard',          href: '/admin/dashboard',     icon: <Shield size={19} /> },
      { label: 'Store Manager',            href: '/manage/dashboard',    icon: <LayoutDashboard size={19} /> },
      { label: 'Logistics Manager',  href: '/logistics/dashboard', icon: <LayoutDashboard size={19} /> },
      { label: 'Inventory', href: '/logistics/inventory', icon: <Package size={19} /> },
      { label: 'User Management', href: '/admin/users',   icon: <User size={19} /> },
      { label: 'Servers',         href: '/admin/servers', icon: <LayoutDashboard size={19} /> },
      { label: 'Settings',        href: '/admin/settings', icon: <Settings size={19} /> },
    ];

    if (userType === 'super_admin') {
      adminItems.splice(1, 0, { label: 'Global Revenue', href: '/admin/global-revenue', icon: <DollarSign size={19} /> });
    }

    return [
      mainSection,
      {
        title: 'Administration',
        items: adminItems,
      },
      moreSection
    ];
  }

  return [];
}

function NavLink({
  item,
  isActive,
  onClose,
}: {
  item: NavItem;
  isActive: boolean;
  onClose: () => void;
}) {
  return (
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
  );
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const sections = getNavSections(user?.user_type);

  const [socialModalOpen, setSocialModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    onClose();
    router.push('/');
  };

  const initials =
    user
      ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() ||
        user.username[0].toUpperCase()
      : 'G';

  const displayName = user
    ? user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.username
    : 'Guest User';

  const roleLabel: Record<string, string> = {
    customer:          'Customer',
    store_manager:     'Store Manager',
    logistics_manager: 'Logistics Manager',
    admin:             'Admin',
    super_admin:       'Super Admin',
  };

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
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
              {initials}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{displayName}</p>
              <p className="text-xs text-slate-400">
                {user
                  ? roleLabel[user.user_type ?? ''] ?? user.email ?? user.username
                  : 'Guest User'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {user ? (
            <>
              {sections.map((section, i) => (
                <div key={i}>
                  {section.title && (
                    <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {section.title}
                    </p>
                  )}
                  <ul className="space-y-0.5">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <NavLink
                          item={item}
                          isActive={pathname === item.href}
                          onClose={onClose}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="border-t border-slate-100 pt-3">
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
            // ── Guest ──────────────────────────────────────
            <ul className="space-y-0.5">
              <li>
                <NavLink
                  item={{ label: 'Home', href: '/', icon: <Home size={19} /> }}
                  isActive={pathname === '/'}
                  onClose={onClose}
                />
              </li>
              <li>
                <NavLink
                  item={locationsItem}
                  isActive={pathname === '/locations'}
                  onClose={onClose}
                />
              </li>
              <li>
                <NavLink
                  item={{ label: 'Sign In', href: '/auth/login', icon: <LogIn size={19} /> }}
                  isActive={pathname === '/auth/login'}
                  onClose={onClose}
                />
              </li>
              <li>
                <NavLink
                  item={{ label: 'Create Account', href: '/auth/register', icon: <UserPlus size={19} /> }}
                  isActive={pathname === '/auth/register'}
                  onClose={onClose}
                />
              </li>
            </ul>
          )}
        </nav>

        {/* Share & Save — customers only */}
        {user?.user_type === 'customer' && (
          <div className="mx-4 mb-6 rounded-2xl bg-violet-50 p-4">
            <p className="text-sm font-bold text-slate-800">Share &amp; Save!</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Post with{' '}
              <span className="font-semibold text-violet-600">#SocialDrinking</span>{' '}
              for 10% off
            </p>
            <button
              onClick={() => setSocialModalOpen(true)}  // ← wired up
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Learn More
            </button>
          </div>
        )}
      </aside>
      <SocialDrinkingModal
        open={socialModalOpen}
        onClose={() => setSocialModalOpen(false)}
      />
    </>
  );
}
