'use client';

import { ReactNode } from 'react';
import { useAuth } from '../contextProviders/AuthContext';
import { useRouter } from 'next/navigation';

export default function ManageLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  
  if (loading) {
    // TODO: maybe add a nicer loading state here later
    return <div>Loading...</div>;
  }

  // TODO: we should probably also check if the user type is correct here and redirect if not, but for now we'll just assume that the redirect worked as expected
  if (!user) {
    // TODO: move this to a useEffect
    router.push("/auth/login");
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
