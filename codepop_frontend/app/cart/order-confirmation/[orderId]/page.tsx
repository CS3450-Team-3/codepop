// app/cart/order-confirmation/[orderId]/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, ShoppingBag, Home, Loader2, MapPin, Clock, AlertTriangle, Coffee } from 'lucide-react';
import { getOrder, updateOrder } from '@/models/api/order';
import { getDrink } from '@/models/api/drinks';
import { getInventory } from '@/models/api/inventory';
import { Order } from '@/models/types/order';
import { Drink } from '@/models/types/drink';
import { Inventory } from '@/models/types/inventory';
import { Server } from '@/models/types/server';
import { decodeGeohash, haversineKm, estimateDriveTimeMinutes } from '@/utils/geolocation';
import DrinkColorAvatar from '@/components/drinks/DrinkColorAvatar';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import CustomizeModal from '@/components/modals/CustomizeModal';
import api from '@/models/api/api';

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

interface ServerWithGeohash extends Server {
  StoreGeohash?: string;
}

export default function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [store, setStore] = useState<ServerWithGeohash | null>(null);
  
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [criticalError, setCriticalError] = useState<string | null>(null);

  const [distance, setDistance] = useState<number | null>(null);
  const [driveTime, setDriveTime] = useState<number | null>(null);
  const [updatingJIT, setUpdatingJIT] = useState(false);
  const [locationError, setLocationError] = useState<boolean>(false);
  const [locating, setLocating] = useState<boolean>(false);
  const [arriving, setArriving] = useState<boolean>(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  // null = modal closed, undefined = custom (blank) drink
  const [modalDrink, setModalDrink] = useState<Drink | null | undefined>(
    undefined
  );
  const isModalOpen = modalDrink !== undefined;

  const watchIdRef = useRef<number | null>(null);

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

  const formatStoreAddress = (s: ServerWithGeohash | null) => {
    if (!s) return "";
    const parts = [s.StoreAddress, s.StoreCity, s.StoreState].filter(Boolean);
    return parts.join(", ");
  };

  // 1. Critical Path: Fetch basic Order info
  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const data = await getOrder(orderId);
      setOrder(data);
      setLoadingOrder(false);
      return data;
    } catch (err) {
      setCriticalError("Could not find your order. Please check the ID.");
      setLoadingOrder(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
    getInventory().then(setInventory).catch(() => {});
  }, [fetchOrder]);

  // 2. Secondary Path: Fetch detailed drinks and store info (Non-blocking)
  useEffect(() => {
    if (!order) return;
    let mounted = true;

    // Fetch detailed drinks
    if (order.Drinks && order.Drinks.length > 0 && drinks.length === 0) {
      const drinkPromises = order.Drinks.map(id => getDrink(id).catch(() => null));
      Promise.all(drinkPromises).then(data => {
        if (mounted) setDrinks(data.filter((d): d is Drink => d !== null));
      });
    }

    // Fetch servers to find store info
    if (!store) {
      fetch("/api/servers")
        .then(res => res.ok ? res.json() : [])
        .then((servers: ServerWithGeohash[]) => {
          if (!mounted) return;
          
          const orderServerId = order.OriginatingServer ? String(order.OriginatingServer) : null;
          const cookieStoreId = getCookie("storeId");
          
          const foundStore = servers.find(s => String(s.ServerID) === orderServerId) 
                          || servers.find(s => String(s.ServerID) === cookieStoreId)
                          || servers[0];
          
          if (foundStore) setStore(foundStore);
        })
        .catch(() => console.warn("Could not load store metadata"));
    }

    return () => { mounted = false; };
  }, [order, drinks.length, store]);

  const startTracking = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setLocating(true);
    setLocationError(false);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (store?.StoreGeohash) {
          const { latitude: storeLat, longitude: storeLon } = decodeGeohash(store.StoreGeohash);
          const distKm = haversineKm(pos.coords.latitude, pos.coords.longitude, storeLat, storeLon);
          const distMi = distKm * 0.621371;
          const timeMin = estimateDriveTimeMinutes(distMi);
          setDistance(distMi);
          setDriveTime(timeMin);
        }
        setLocating(false);
        setLocationError(false);

        watchIdRef.current = navigator.geolocation.watchPosition(
          (watchPos) => {
            if (store?.StoreGeohash) {
              const { latitude: sLat, longitude: sLon } = decodeGeohash(store.StoreGeohash);
              const dKm = haversineKm(watchPos.coords.latitude, watchPos.coords.longitude, sLat, sLon);
              const dMi = dKm * 0.621371;
              const tMin = estimateDriveTimeMinutes(dMi);
              setDistance(dMi);
              setDriveTime(tMin);
            }
          },
          null,
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setLocationError(true);
        }
        console.warn("Geolocation failed", err);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [store]);

  useEffect(() => {
    if (store?.StoreGeohash && distance === null && !locationError && !locating && order?.OrderStatus !== 'Completed') {
      startTracking();
    }
  }, [store, startTracking, distance, locationError, locating, order?.OrderStatus]);

  useEffect(() => {
     return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // 4. One-time JIT backend update
  useEffect(() => {
    if (!order || !driveTime || order.PickupTime || updatingJIT || order.OrderStatus === 'Completed') return;

    async function sendJITUpdate() {
      try {
        setUpdatingJIT(true);
        const arrivalTime = new Date();
        arrivalTime.setMinutes(arrivalTime.getMinutes() + driveTime!);
        
        await updateOrder(order!.OrderID, {
          Drinks: order!.Drinks,
          PickupTime: arrivalTime.toISOString(),
        });
        
        setOrder(prev => prev ? { ...prev, PickupTime: arrivalTime.toISOString() } : null);
      } catch {
        console.error("Failed to update JIT arrival time");
      } finally {
        setUpdatingJIT(false);
      }
    }

    sendJITUpdate();
  }, [order, driveTime, updatingJIT]);

  const handleArrive = async () => {
    if (!orderId || arriving) return;
    setArriving(true);
    try {
      await api.post(`orders/${orderId}/arrive/`);
      // Refresh status
      const updated = await fetchOrder();
      
      // Auto-refresh after 5 seconds to show Completed status
      setTimeout(() => {
        fetchOrder();
      }, 5500);
    } catch (err) {
      console.error("Arrival failed", err);
    } finally {
      setArriving(false);
    }
  };

  if (loadingOrder) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center app-bg relative">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <Loader2 size={32} className="animate-spin text-violet-500" />
        <p className="mt-4 text-sm text-slate-500 font-medium">Loading your confirmation...</p>
        <BottomNav onCustomizeClick={() => setModalDrink(customDrinkScaffold)} />
      </div>
    );
  }

  if (criticalError || !order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center app-bg relative px-4">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Order Error</h2>
          <p className="text-slate-500 text-sm">{criticalError || "Order not found."}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-6 w-full rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-colors shadow-lg"
          >
            Back to Home
          </button>
        </div>
        <BottomNav onCustomizeClick={() => setModalDrink(customDrinkScaffold)} />
      </div>
    );
  }

  const isCompleted = order.OrderStatus === 'Completed';
  const isProcessing = order.OrderStatus === 'Processing';

  return (
    <div className="flex min-h-screen flex-col app-bg relative items-center">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="w-full max-w-md px-4 pb-40 pt-20 relative z-10">
        {/* Success header */}
        <div className="text-center mb-8">
          <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full shadow-sm border ${isCompleted ? 'bg-green-100 border-green-50' : 'bg-violet-100 border-violet-50'}`}>
            {isCompleted ? <CheckCircle size={44} className="text-green-500" /> : <Coffee size={44} className="text-violet-500 animate-pulse" />}
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {isCompleted ? "Ready for Pickup!" : "Order Placed!"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {isCompleted 
              ? "Your drinks are fresh and waiting in the locker." 
              : isProcessing 
                ? "We're preparing your order right now!" 
                : "Your drink is being prepared for a fresh arrival."}
          </p>
        </div>

        {/* JIT status card */}
        {!isCompleted && (
          <div className="mb-6 w-full">
            {distance !== null || driveTime !== null ? (
              <div className="rounded-2xl bg-violet-600 p-5 text-white shadow-lg shadow-violet-200 transition-all">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                    <Clock size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-violet-100 mb-0.5">Live Travel Progress</p>
                    <p className="text-xl font-black">{driveTime} mins away</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-widest text-violet-100 mb-0.5">Distance</p>
                    <p className="text-lg font-bold">{distance?.toFixed(1)} mi</p>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="relative mb-3 h-2.5 w-full rounded-full bg-violet-400/30 overflow-hidden">
                  <div 
                    className="absolute right-0 top-0 h-full bg-white rounded-full transition-all duration-1000 ease-in-out"
                    style={{ width: `${Math.max(5, Math.min(100, (1 - (distance! / 5)) * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-violet-100">
                  <span>Home</span>
                  <span>{store?.StoreName || "Store"}</span>
                </div>

                <div className="mt-5 pt-4 border-t border-white/10">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-violet-200" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white leading-none mb-1">{store?.StoreName}</p>
                      <p className="text-[11px] text-violet-100 leading-tight opacity-90 truncate">{formatStoreAddress(store)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                  {locating ? (
                     <Loader2 size={20} className="animate-spin text-violet-500" />
                  ) : (
                     <MapPin size={20} className={store && !locationError ? "animate-bounce" : ""} />
                  )}
                </div>
                <p className="text-sm font-bold text-slate-800">
                  {locationError ? "Location access required" : "Calculating drive time..."}
                </p>
                
                {store && (
                  <div className="mt-2 mb-4 bg-slate-50 rounded-xl p-3 border border-slate-100">
                     <p className="text-xs font-bold text-slate-900">{store.StoreName}</p>
                     <p className="text-[10px] text-slate-500 mt-0.5">{formatStoreAddress(store)}</p>
                  </div>
                )}

                <p className="text-xs text-slate-400 mt-1 mb-4 px-4">
                  {locationError 
                    ? "We need your location to time your order perfectly." 
                    : "Please enable location services so we can start your drinks as you approach."}
                </p>
                
                <button
                  onClick={startTracking}
                  className="mx-auto flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-violet-700 transition-all active:scale-95 shadow-md shadow-violet-100"
                >
                  <MapPin size={14} />
                  {locationError ? "Try Again" : locating ? "Locating..." : "Enable Location"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* I'M HERE BUTTON */}
        {!isCompleted && (
          <button
            onClick={handleArrive}
            disabled={arriving || isProcessing}
            className={`mb-6 w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-lg transition-all active:scale-[0.98] shadow-lg ${
              isProcessing 
                ? "bg-amber-100 text-amber-700 border-2 border-amber-200 cursor-wait" 
                : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200"
            }`}
          >
            {arriving ? (
              <Loader2 size={24} className="animate-spin" />
            ) : isProcessing ? (
              <>
                <Coffee size={24} className="animate-bounce" />
                Preparing...
              </>
            ) : (
              "I'm Here!"
            )}
          </button>
        )}

        {/* Order Details */}
        <div className="space-y-4">
          {/* Items card */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Your Drinks</h2>
            {drinks.length > 0 ? (
              <div className="space-y-4">
                {drinks.map((drink, idx) => (
                  <div key={`${drink.DrinkID}-${idx}`} className="flex items-center gap-4">
                    <DrinkColorAvatar
                      sodas={drink.SodaUsed}
                      name={drink.Name}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{drink.Name}</p>
                      <p className="text-xs text-slate-500">
                        {drink.Size} · {drink.Ice} Ice
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-4 text-slate-400">
                <Loader2 size={16} className="animate-spin mr-2" />
                <span className="text-xs">Fetching items...</span>
              </div>
            )}
          </div>

          {/* Metadata card */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Store Info</h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-start">
                <span className="text-slate-500 shrink-0">Location</span>
                <div className="text-right min-w-0">
                  {store ? (
                    <>
                      <p className="font-bold text-slate-900 truncate">{store.StoreName}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{formatStoreAddress(store)}</p>
                    </>
                  ) : (
                    <span className="text-slate-300 italic">Finding store...</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-50">
                <span className="text-slate-500">Order ID</span>
                <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded">
                  #{order.OrderID.slice(-12).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-50">
                <span className="text-slate-500">Status</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  isCompleted ? 'bg-green-100 text-green-700' : 'bg-violet-50 text-violet-600'
                }`}>
                  {order.OrderStatus ?? 'Pending'}
                </span>
              </div>
              {order.LockerCombo && (
                <div className="flex justify-between items-center pt-2.5 border-t border-slate-50">
                  <span className="text-slate-500">Locker Code</span>
                  <span className="font-black text-xl text-violet-600">
                    {order.LockerCombo}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={() => router.push('/customer/orders')}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-900 text-sm font-bold text-white hover:bg-slate-800 transition-all active:scale-[0.98]"
          >
            <ShoppingBag size={18} />
            View My Orders
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-[0.98]"
          >
            <Home size={18} />
            Back to Home
          </button>
        </div>
      </main>

      <BottomNav onCustomizeClick={() => setModalDrink(customDrinkScaffold)} />

      {isModalOpen && (
        <CustomizeModal
          drink={modalDrink ?? customDrinkScaffold}
          inventory={inventory}
          onClose={() => setModalDrink(undefined)}
        />
      )}
    </div>
  );
}
