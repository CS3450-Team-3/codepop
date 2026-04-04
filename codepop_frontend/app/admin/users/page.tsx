'use client';

import { Users, Menu, RefreshCw, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getUsers } from '@/models/api/user';
import { GetUser } from '@/models/types/user';
import Sidebar from '@/components/layout/Sidebar';

export default function AdminUsersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState<GetUser | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch {
      // TODO: show error state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="fixed top-0 z-40 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-base font-bold text-slate-900">User Management</h1>
          <button
            onClick={load}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="mx-auto max-w-2xl px-4 pb-10 pt-20">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Users</h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage user accounts and permissions.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <Loader2 size={28} className="animate-spin text-violet-500 mb-3" />
            <p className="text-sm">Loading users...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-100">
              <Users size={28} className="text-violet-500" />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              User Management
            </p>
            <p className="mt-1 text-xs text-slate-400">Coming soon</p>
          </div>
        )}
      </main>
    </div>
  );
}
