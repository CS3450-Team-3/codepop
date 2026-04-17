// app/auth/layout.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/app/contextProviders/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

const ROLE_HOME: Record<string, string> = {
  customer:          '/',
  store_manager:     '/manage/dashboard',
  logistics_manager: '/logistics/dashboard',
  admin:             '/admin/dashboard',
  super_admin:       '/admin/dashboard',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    router.replace(ROLE_HOME[user.user_type ?? ''] ?? '/');
  }, [user, loading, router]);

  // Show spinner while checking — prevents the login form
  // flashing briefly before the redirect fires
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center app-bg relative">
        <Loader2 size={28} className="animate-spin text-violet-500" />
      </div>
    );
  }

  // Already authed — render nothing while redirect fires
  if (user) return null;

  return (
    <div className="min-h-screen app-bg relative">
      <Header
        onMenuClick={() => setSidebarOpen(true)}
      />
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 pt-14">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-slate-900">
            Codepop
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white px-4 py-8 shadow-xl border border-slate-200 sm:rounded-xl sm:px-10">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
