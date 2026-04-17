// app/customer/layout.tsx
'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useRequireAuth } from '@/app/hooks/useRequireAuth';
import { getInventory } from '@/models/api/inventory';
import { Inventory } from '@/models/types/inventory';
import { Drink } from '@/models/types/drink';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import CustomizeModal from '@/components/modals/CustomizeModal';

const CUSTOM_DRINK_SCAFFOLD: Drink = {
  DrinkID: 'custom',
  Name: 'Custom Drink',
  SodaUsed: [],
  SyrupsUsed: [],
  AddIns: [],
  Price: 3.99,
  User_Created: true,
  Favorite: [],
};

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useRequireAuth({
    allowedRoles: ['customer', 'admin', 'super_admin'],
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalDrink, setModalDrink] = useState<Drink | null>(null);
  const [inventory, setInventory] = useState<Inventory[]>([]);

  useEffect(() => {
    // Fetch once for the whole customer section
    // so every page's customize modal has inventory data
    getInventory()
      .then(setInventory)
      .catch(() => {
        // Non-fatal — modal still works, just no inventory options
      });
  }, []);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center app-bg relative">
        <Loader2 size={28} className="animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <>
      <Header
        onMenuClick={() => setSidebarOpen(true)}
      />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {children}

      <BottomNav
        onCustomizeClick={() => setModalDrink(CUSTOM_DRINK_SCAFFOLD)}
      />

      {/* Customize modal available on every customer page */}
      {modalDrink && (
        <CustomizeModal
          drink={modalDrink}
          inventory={inventory}
          onClose={() => setModalDrink(null)}
        />
      )}
    </>
  );
}