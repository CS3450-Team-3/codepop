'use client';

import { Settings, Menu } from 'lucide-react';
import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';

export default function ManageSettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          <h1 className="text-base font-bold text-slate-900">Settings</h1>
          <div className="w-9" />
        </div>
      </header>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="mx-auto max-w-2xl px-4 pb-10 pt-20">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Manager Settings</h2>
          <p className="mt-1 text-sm text-slate-500">
            Configure store preferences and notifications.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Settings size={28} className="text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Settings</p>
          <p className="mt-1 text-xs text-slate-400">Coming soon</p>
        </div>
      </main>
    </div>
  );
}
