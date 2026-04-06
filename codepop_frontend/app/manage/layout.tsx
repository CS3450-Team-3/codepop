'use client';

import { ReactNode, useEffect } from 'react';
import { useAuth } from '../contextProviders/AuthContext';
import { useRouter } from 'next/navigation';

export default function ManageLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const allowedRoles = new Set(['store_manager', 'admin', 'super_admin']);
  const isAuthorized = !!user && allowedRoles.has(user.user_type || '');

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace('/auth/login');
      return;
    }

    if (!allowedRoles.has(user.user_type || '')) {
      router.replace('/auth/login');
    }
  }, [loading, user, router]);

  if (loading) {
    // TODO: maybe add a nicer loading state here later
    return <div>Loading...</div>;
  }

  if (!user || !isAuthorized) {
    return null;
  }

  return (
    <div className="manage-layout">
      <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">CodePop Manager Portal</h1>
        <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded">Logout</button>
      </header>
      <main className="p-8">
        {children}
      </main>
    </div>
  );
}
