'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

interface StoreContextType {
  storeId: string | null;
  setStore: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('codepop_store_id');
    if (saved) setStoreId(saved);
  }, []);

  const setStore = (id: string) => {
    setStoreId(id);
    localStorage.setItem('codepop_store_id', id);
  };

  return (
    <StoreContext.Provider value={{ storeId, setStore }}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};