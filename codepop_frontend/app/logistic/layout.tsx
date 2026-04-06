"use client";

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contextProviders/AuthContext';

export default function LogisticLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const allowedRoles = new Set(['logistics_manager', 'admin', 'super_admin']);
  const isAuthorized = !!user && allowedRoles.has(user.user_type || '');

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user || !allowedRoles.has(user.user_type || '')) {
      router.replace('/auth/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
