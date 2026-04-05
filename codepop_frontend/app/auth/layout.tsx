// app/auth/layout.tsx
'use client';

import { useAuth } from '@/app/contextProviders/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const ROLE_HOME: Record<string, string> = {
  customer:          '/',
  store_manager:     '/manage/dashboard',
  logistics_manager: '/manage/dashboard',
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

  useEffect(() => {
    if (loading || !user) return;
    router.replace(ROLE_HOME[user.user_type ?? ''] ?? '/');
  }, [user, loading, router]);

  // Show spinner while checking — prevents the login form
  // flashing briefly before the redirect fires
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 size={28} className="animate-spin text-violet-500" />
      </div>
    );
  }

  // Already authed — render nothing while redirect fires
  if (user) return null;

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 py-12 sm:px-6 lg:px-8">
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
  );
}