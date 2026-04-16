'use client';

import { MessageCircle } from 'lucide-react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import { useState } from 'react';
import { Drink } from '@/models/types/drink';

export default function HelpPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalDrink, setModalDrink] = useState<Drink | null>(null);

  const customDrinkScaffold: Drink = {
    DrinkID: 'custom',
    Name: 'Custom Drink',
    SodaUsed: [],
    SyrupsUsed: [],
    AddIns: [],
    Price: 3.99,
    User_Created: true,
    Favorite: [],
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        onMenuClick={() => setSidebarOpen(true)}
      />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="mx-auto max-w-2xl px-4 pb-28 pt-20">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Help &amp; Support</h1>
          <p className="mt-1 text-sm text-slate-500">
            Get help with your orders or talk to our AI assistant.
          </p>
        </div>

        {/* Placeholder — chatbot goes here */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-100">
            <MessageCircle size={28} className="text-violet-500" />
          </div>
          <p className="text-sm font-semibold text-slate-700">
            AI Support Chatbot
          </p>
          <p className="mt-1 text-xs text-slate-400">Coming soon</p>
        </div>
      </main>

      <BottomNav onCustomizeClick={() => setModalDrink(customDrinkScaffold)} />
    </div>
  );
}
