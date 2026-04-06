'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contextProviders/AuthContext';

export default function ManageLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const allowedRoles = new Set(['store_manager', 'admin', 'super_admin']);
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

  return (
    <div className="manage-layout">
      <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">CodePop Manager Portal</h1>
      </header>
      <main className="p-8">
        {children}
      </main>
    </div>
  );
}
