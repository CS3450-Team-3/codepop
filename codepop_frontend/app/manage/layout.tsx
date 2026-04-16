'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contextProviders/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ManageLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const allowedRoles = new Set(['store_manager', 'admin', 'super_admin']);
  const isAuthorized = !!user && allowedRoles.has(user.user_type || '');

  useEffect(() => {
    if (loading) return;
    if (!user || !allowedRoles.has(user.user_type || '')) {
      router.replace('/auth/login');
    }
  }, [loading, user, router]);

  if (loading || !isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 size={28} className="animate-spin text-violet-500" />
      </div>
    );
  }

  return <>{children}</>;
}
