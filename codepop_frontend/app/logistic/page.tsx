'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, MapPin, Menu, Package, User, Route, Send, Truck, CheckCircle2, Trash2, AlertTriangle, CalendarDays, LogOut } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/proxy').replace(/\/$/, '');
const apiUrl = (path: string) => `${API_BASE}${path}`;
const ROUTE_PLANS_STORAGE_KEY = 'codepop-routing-plans-v1';
const STORE_SCHEDULES_STORAGE_KEY = 'codepop-store-schedules-v1';

interface InventoryItem {
  InventoryID: number;
  ItemName: string;
  Quantity: number;
  ThresholdLevel: number;
  ItemType: string;
}

interface InventoryReport {
  inventory_items: InventoryItem[];
  total_items: number;
  out_of_stock: number;
  below_threshold: number;
}

interface StoreInventory {
  serverId: string;
  storeName: string;
  address: string;
  region: number | null;
  inventory_items: InventoryItem[];
  critical: InventoryItem[];
  low_stock: InventoryItem[];
  in_stock: InventoryItem[];
}

interface ServerRegistryItem {
  ServerID: string;
  ServerURL: string;
  Status: string;
  Region: number | null;
  RegionName: string | null;
  StoreName?: string;
}

interface RegionInfo {
  id: number;
  name: string;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: string;
  home_server?: string | null;
}

type RouteStatus = 'planned' | 'in_transit' | 'delivered';

interface RoutePlan {
  id: string;
  sourceStoreId: string;
  destinationStoreId: string;
  itemName: string;
  quantity: number;
  etaDays: number;
  priority: 'critical' | 'high' | 'normal';
  status: RouteStatus;
  createdAt: string;
}

interface StoreSchedule {
  serverId: string;
  restockEveryDays: number;
  nextRestockDate: string;
  flavorAmounts: Record<string, number>;
  notes: string;
  updatedAt: string;
}

const statusLabel: Record<RouteStatus, string> = {
  planned: 'Planned',
  in_transit: 'In Transit',
  delivered: 'Delivered',
};

export default function LogisticsManagerDashboard() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inventoryReport, setInventoryReport] = useState<InventoryReport | null>(null);
  const [stores, setStores] = useState<StoreInventory[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [assignedRegion, setAssignedRegion] = useState<number | null>(null);
  const [userType, setUserType] = useState<string>('');
  const [allRegions, setAllRegions] = useState<RegionInfo[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardView, setDashboardView] = useState<'inventory' | 'routing' | 'scheduling' | 'profile'>('inventory');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [plans, setPlans] = useState<RoutePlan[]>([]);
  const [sourceStoreId, setSourceStoreId] = useState('');
  const [destinationStoreId, setDestinationStoreId] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [etaDays, setEtaDays] = useState('1');
  const [formError, setFormError] = useState<string | null>(null);
  const [storeSchedules, setStoreSchedules] = useState<Record<string, StoreSchedule>>({});
  const [selectedScheduleStoreId, setSelectedScheduleStoreId] = useState<string | null>(null);

  useEffect(() => {
    fetchInventoryData();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(ROUTE_PLANS_STORAGE_KEY);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as RoutePlan[];
      setPlans(Array.isArray(parsed) ? parsed : []);
    } catch {
      setPlans([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(ROUTE_PLANS_STORAGE_KEY, JSON.stringify(plans));
  }, [plans]);

  useEffect(() => {
    const saved = localStorage.getItem(STORE_SCHEDULES_STORAGE_KEY);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as Record<string, StoreSchedule>;
      setStoreSchedules(parsed && typeof parsed === 'object' ? parsed : {});
    } catch {
      setStoreSchedules({});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORE_SCHEDULES_STORAGE_KEY, JSON.stringify(storeSchedules));
  }, [storeSchedules]);

  const mapReportToStore = (
    serverId: string,
    storeName: string,
    address: string,
    region: number | null,
    data: InventoryReport
  ): StoreInventory => {
    const criticalItems = data.inventory_items.filter((item: InventoryItem) => item.Quantity === 0);
    const lowStockItems = data.inventory_items.filter(
      (item: InventoryItem) => item.Quantity > 0 && item.Quantity <= item.ThresholdLevel
    );
    const inStockItems = data.inventory_items.filter(
      (item: InventoryItem) => item.Quantity > item.ThresholdLevel
    );

    return {
      serverId,
      storeName,
      address,
      region,
      inventory_items: data.inventory_items,
      critical: criticalItems,
      low_stock: lowStockItems,
      in_stock: inStockItems,
    };
  };

  const fetchUserProfile = async () => {
    try {
      setProfileLoading(true);
      const token = localStorage.getItem('access_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(apiUrl('/backend/users/me/'), { headers });
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
      } else {
        console.error('Failed to fetch user profile');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/auth/login');
  };

  const fetchInventoryData = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('access_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const storesResponse = await fetch(apiUrl('/backend/servers/'), { headers });
      let loadedStores: StoreInventory[] = [];

      if (storesResponse.ok) {
        const servers: ServerRegistryItem[] = await storesResponse.json();
        const activeServers = servers.filter((server) => server.Status !== 'Inactive');
        let regionServers = activeServers;
        let managerRegion: number | null = null;
        let currentUserType = '';

        const meResponse = await fetch(apiUrl('/backend/users/me/'), { headers });
        if (meResponse.ok) {
          const me: UserProfile = await meResponse.json();
          currentUserType = me.user_type;
          setUserType(me.user_type);

          if (me.user_type === 'super_admin') {
            // Super admins can see all regions — load every active server.
            regionServers = activeServers;
            const regionMap = new Map<number, string>();
            activeServers.forEach((s) => {
              if (s.Region !== null && s.RegionName) regionMap.set(s.Region, s.RegionName);
            });
            const regions: RegionInfo[] = Array.from(regionMap.entries())
              .map(([id, name]) => ({ id, name }))
              .sort((a, b) => a.name.localeCompare(b.name));
            setAllRegions(regions);
            const regionIds = regions.map((r) => r.id);
            setSelectedRegion((prev) => (prev !== null && regionIds.includes(prev) ? prev : regions[0]?.id ?? null));
            setAssignedRegion(null);
          } else {
            const homeServer = activeServers.find((server) => server.ServerID === me.home_server);
            managerRegion = homeServer?.Region ?? null;
            setAssignedRegion(managerRegion);

            if (managerRegion !== null) {
              regionServers = activeServers.filter((server) => server.Region === managerRegion);
            } else {
              setError('No assigned region found for this logistics manager account.');
              setStores([]);
              setSelectedStoreId(null);
              return;
            }
          }
        } else {
          setAssignedRegion(null);
          setError('Unable to determine your assigned region. Please log in as a logistics manager.');
          setStores([]);
          setSelectedStoreId(null);
          return;
        }

        // Helper: fetch aggregate results for a given region via the backend,
        // which makes server-to-server calls on our behalf (Docker-internal URLs
        // are not reachable from the browser).
        const fetchAggregateForRegion = async (regionId: number | null): Promise<Record<string, InventoryReport | { error: string }>> => {
          const url = regionId !== null
            ? apiUrl(`/backend/inventory/aggregate/?region_id=${regionId}`)
            : apiUrl('/backend/inventory/aggregate/');
          const resp = await fetch(url, { headers });
          if (!resp.ok) return {};
          const payload = await resp.json();
          return payload && typeof payload.results === 'object' ? payload.results : {};
        };

        // Build a map of ServerID -> InventoryReport across all required regions.
        let aggregateResults: Record<string, InventoryReport | { error: string }> = {};

        if (currentUserType === 'super_admin') {
          // Fetch all regions in parallel.
          const regionIds = Array.from(new Set(activeServers.map((s) => s.Region).filter((r): r is number => r !== null)));
          const allResults = await Promise.all(regionIds.map((rid) => fetchAggregateForRegion(rid)));
          allResults.forEach((r) => Object.assign(aggregateResults, r));
        } else {
          aggregateResults = await fetchAggregateForRegion(managerRegion);
        }

        const serverReports = await Promise.all(
          regionServers.map(async (server) => {
            try {
              const aggregated = aggregateResults[server.ServerID as unknown as string];
              if (aggregated && !('error' in aggregated) && Array.isArray(aggregated.inventory_items)) {
                return mapReportToStore(
                  server.ServerID,
                  server.StoreName?.trim() || `Store ${server.ServerID.slice(0, 8)}`,
                  server.ServerURL,
                  server.Region ?? null,
                  aggregated
                );
              }
              return null;
            } catch {
              return null;
            }
          })
        );

        loadedStores = serverReports.filter((store): store is StoreInventory => store !== null);

        if (loadedStores.length === 0) {
          setError('No active stores found. The peer servers may be unreachable.');
          setStores([]);
          setSelectedStoreId(null);
          return;
        }
      } else {
        setError('Failed to fetch store registry.');
        setStores([]);
        setSelectedStoreId(null);
        return;
      }

      setStores(loadedStores);
      setSelectedStoreId((previous) => {
        if (previous && loadedStores.some((store) => store.serverId === previous)) {
          return previous;
        }
        return loadedStores[0]?.serverId ?? null;
      });
      setInventoryReport({
        inventory_items: loadedStores[0]?.inventory_items || [],
        total_items: loadedStores[0]?.inventory_items.length || 0,
        out_of_stock: loadedStores[0]?.critical.length || 0,
        below_threshold:
          (loadedStores[0]?.critical.length || 0) + (loadedStores[0]?.low_stock.length || 0),
      });
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Error loading inventory data');
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyTime = (item: InventoryItem): { days: number; label: string } => {
    // Simulate urgency based on quantity - in production would use actual usage rates
    if (item.Quantity === 0) return { days: 0, label: 'NOW' };
    if (item.Quantity < 5) return { days: 1, label: '1d' };
    if (item.Quantity < 10) return { days: 2, label: '2d' };
    return { days: 3, label: '3d' };
  };

  const buildDefaultSchedule = (store: StoreInventory): StoreSchedule => {
    const baseDate = new Date();
    const hasCritical = store.critical.length > 0;
    const hasLowStock = store.low_stock.length > 0;
    const initialOffsetDays = hasCritical ? 1 : hasLowStock ? 2 : 5;
    baseDate.setDate(baseDate.getDate() + initialOffsetDays);

    const flavorAmounts = store.inventory_items.reduce<Record<string, number>>((acc, item) => {
      const targetAmount = Math.max(item.ThresholdLevel * 2 - item.Quantity, 0);
      acc[item.ItemName] = targetAmount;
      return acc;
    }, {});

    return {
      serverId: store.serverId,
      restockEveryDays: 7,
      nextRestockDate: baseDate.toISOString().split('T')[0],
      flavorAmounts,
      notes: '',
      updatedAt: new Date().toISOString(),
    };
  };

  // For super_admin: filter stores to the selected region. For other roles: show all loaded stores.
  const filteredStores = useMemo(() => {
    if (userType !== 'super_admin' || selectedRegion === null) return stores;
    return stores.filter((store) => store.region === selectedRegion);
  }, [stores, userType, selectedRegion]);

  const selectedStore = filteredStores.find((store) => store.serverId === selectedStoreId) || filteredStores[0] || null;
  const overallItems = selectedStore
    ? [...selectedStore.inventory_items].sort((a, b) => a.ItemName.localeCompare(b.ItemName))
    : [];

  useEffect(() => {
    if (filteredStores.length === 0) {
      setSourceStoreId('');
      setDestinationStoreId('');
      return;
    }

    setSourceStoreId((previous) =>
      previous && filteredStores.some((store) => store.serverId === previous) ? previous : filteredStores[0].serverId
    );
    setDestinationStoreId((previous) => {
      if (previous && filteredStores.some((store) => store.serverId === previous)) {
        return previous;
      }
      return filteredStores[1]?.serverId || filteredStores[0].serverId;
    });

    setStoreSchedules((previous) => {
      const nextSchedules: Record<string, StoreSchedule> = { ...previous };

      filteredStores.forEach((store) => {
        const existing = nextSchedules[store.serverId];
        const defaults = buildDefaultSchedule(store);

        if (!existing) {
          nextSchedules[store.serverId] = defaults;
          return;
        }

        const mergedFlavorAmounts = store.inventory_items.reduce<Record<string, number>>((acc, item) => {
          acc[item.ItemName] = existing.flavorAmounts[item.ItemName] ?? defaults.flavorAmounts[item.ItemName] ?? 0;
          return acc;
        }, {});

        nextSchedules[store.serverId] = {
          ...existing,
          flavorAmounts: mergedFlavorAmounts,
        };
      });

      return nextSchedules;
    });

    setSelectedScheduleStoreId((previous) => {
      if (previous && filteredStores.some((store) => store.serverId === previous)) {
        return previous;
      }
      return filteredStores[0].serverId;
    });
  }, [filteredStores]);

  const sourceStore = filteredStores.find((store) => store.serverId === sourceStoreId) || null;
  const destinationStore = filteredStores.find((store) => store.serverId === destinationStoreId) || null;

  const sourceItems = useMemo(
    () =>
      sourceStore
        ? [...sourceStore.inventory_items]
            .filter((item) => item.Quantity > 0)
            .sort((a, b) => a.ItemName.localeCompare(b.ItemName))
        : [],
    [sourceStore]
  );

  useEffect(() => {
    if (sourceItems.length === 0) {
      setItemName('');
      return;
    }

    if (!itemName || !sourceItems.some((item) => item.ItemName === itemName)) {
      setItemName(sourceItems[0].ItemName);
    }
  }, [sourceItems, itemName]);

  const sourceItem = sourceItems.find((item) => item.ItemName === itemName) || null;
  const destinationItem =
    destinationStore?.inventory_items.find((item) => item.ItemName === itemName) || null;

  const suggestedQuantity = sourceItem
    ? Math.max(
        0,
        Math.min(
          sourceItem.Quantity,
          (destinationItem?.ThresholdLevel || 0) + 2 - (destinationItem?.Quantity || 0)
        )
      )
    : 0;

  const destinationPriority: 'critical' | 'high' | 'normal' = !destinationItem || destinationItem.Quantity === 0
    ? 'critical'
    : destinationItem.Quantity <= destinationItem.ThresholdLevel
    ? 'high'
    : 'normal';

  const createRoutePlan = () => {
    setFormError(null);

    const parsedQty = Number(quantity);
    const parsedEta = Number(etaDays);

    if (!sourceStore || !destinationStore) {
      setFormError('Select source and destination stores.');
      return;
    }
    if (sourceStore.serverId === destinationStore.serverId) {
      setFormError('Source and destination must be different stores.');
      return;
    }
    if (!sourceItem) {
      setFormError('Select an item to route.');
      return;
    }
    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      setFormError('Quantity must be a positive whole number.');
      return;
    }
    if (parsedQty > sourceItem.Quantity) {
      setFormError('Quantity exceeds available source stock.');
      return;
    }
    if (!Number.isInteger(parsedEta) || parsedEta <= 0) {
      setFormError('ETA days must be a positive whole number.');
      return;
    }

    const newPlan: RoutePlan = {
      id: `${Date.now()}`,
      sourceStoreId: sourceStore.serverId,
      destinationStoreId: destinationStore.serverId,
      itemName: sourceItem.ItemName,
      quantity: parsedQty,
      etaDays: parsedEta,
      priority: destinationPriority,
      status: 'planned',
      createdAt: new Date().toISOString(),
    };

    setPlans((previous) => [newPlan, ...previous]);
  };

  const setPlanStatus = (id: string, status: RouteStatus) => {
    setPlans((previous) => previous.map((plan) => (plan.id === id ? { ...plan, status } : plan)));
  };

  const deletePlan = (id: string) => {
    setPlans((previous) => previous.filter((plan) => plan.id !== id));
  };

  const findStoreName = (serverId: string) =>
    filteredStores.find((store) => store.serverId === serverId)?.storeName || serverId;

  const inTransitCount = plans.filter((plan) => plan.status === 'in_transit').length;
  const criticalCount = plans.filter(
    (plan) => plan.priority === 'critical' && plan.status !== 'delivered'
  ).length;

  const updateStoreSchedule = (storeId: string, updater: (current: StoreSchedule) => StoreSchedule) => {
    setStoreSchedules((previous) => {
      const store = filteredStores.find((candidate) => candidate.serverId === storeId);
      if (!store) {
        return previous;
      }

      const current = previous[storeId] || buildDefaultSchedule(store);
      return {
        ...previous,
        [storeId]: {
          ...updater(current),
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const selectedScheduleStore =
    filteredStores.find((store) => store.serverId === selectedScheduleStoreId) || filteredStores[0] || null;
  const selectedSchedule = selectedScheduleStore
    ? storeSchedules[selectedScheduleStore.serverId] || buildDefaultSchedule(selectedScheduleStore)
    : null;

  const getDaysUntilRestock = (dateValue: string): number => {
    if (!dateValue) {
      return 0;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(`${dateValue}T00:00:00`);
    const diffMs = target.getTime() - todayStart.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const formatRestockDistance = (dateValue: string): string => {
    const days = getDaysUntilRestock(dateValue);
    if (days < 0) {
      return `${Math.abs(days)} day(s) overdue`;
    }
    if (days === 0) {
      return 'Today';
    }
    return `In ${days} day(s)`;
  };

  const scheduleRows = filteredStores.map((store) => {
    const schedule = storeSchedules[store.serverId] || buildDefaultSchedule(store);
    const plannedUnits = Object.values(schedule.flavorAmounts).reduce((sum, amount) => sum + amount, 0);
    return {
      store,
      schedule,
      plannedUnits,
    };
  });

  const schedulePreviewDates = useMemo(() => {
    if (!selectedSchedule) {
      return [];
    }

    const dates: string[] = [];
    const cursor = new Date(`${selectedSchedule.nextRestockDate}T00:00:00`);
    const safeFrequency = Math.max(selectedSchedule.restockEveryDays, 1);

    for (let i = 0; i < 6; i += 1) {
      dates.push(cursor.toLocaleDateString());
      cursor.setDate(cursor.getDate() + safeFrequency);
    }

    return dates;
  }, [selectedSchedule]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-6">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white hover:bg-blue-500 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <Package className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Logistics Manager</h1>
        </div>
        <p className="text-blue-100">Inventory & Supply Chain</p>
      </div>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded m-6">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="p-6 pb-28">
        {dashboardView === 'inventory' ? (
          <>
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading inventory data...</p>
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-6 border border-gray-200">
                    <div className="text-3xl font-bold text-red-600">
                      {selectedStore?.critical.length || 0}
                    </div>
                    <div className="text-gray-600 text-sm">Critical Items</div>
                  </div>
                  <div className="bg-white rounded-lg p-6 border border-gray-200">
                    <div className="text-3xl font-bold text-yellow-600">
                      {selectedStore?.low_stock.length || 0}
                    </div>
                    <div className="text-gray-600 text-sm">Low Stock</div>
                  </div>
                  <div className="bg-white rounded-lg p-6 border border-gray-200">
                    <div className="text-3xl font-bold text-blue-600">{filteredStores.length}</div>
                    <div className="text-gray-600 text-sm">Locations</div>
                  </div>
                </div>

                {/* Alert Section */}
                {(selectedStore?.critical.length || 0) > 0 && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                      <h2 className="text-lg font-bold text-red-600">Urgent Shipments Needed</h2>
                    </div>
                    <p className="text-gray-700 text-sm">
                      {selectedStore?.critical.length || 0} critical item
                      {(selectedStore?.critical.length || 0) !== 1 ? 's' : ''} at{' '}
                      {selectedStore?.storeName || 'selected store'}
                    </p>
                  </div>
                )}

                {/* Store Inventory Status */}
                <div className="bg-white rounded-lg p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-gray-700" />
                    <h2 className="text-xl font-bold">Store Inventory Status</h2>
                  </div>

                  {userType === 'super_admin' && allRegions.length > 0 && (
                    <div className="mb-4">
                      <label htmlFor="region-selector" className="block text-sm font-medium text-gray-700 mb-2">
                        Select region
                      </label>
                      <select
                        id="region-selector"
                        value={selectedRegion ?? ''}
                        onChange={(e) => {
                          const region = Number(e.target.value);
                          setSelectedRegion(region);
                          setSelectedStoreId(null);
                        }}
                        className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2"
                      >
                        {allRegions.map((region) => (
                          <option key={region.id} value={region.id}>
                            {region.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="mb-5">
                    <label htmlFor="store-selector" className="block text-sm font-medium text-gray-700 mb-2">
                      Select store
                    </label>
                    <select
                      id="store-selector"
                      value={selectedStore?.serverId || ''}
                      onChange={(e) => setSelectedStoreId(e.target.value)}
                      className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2"
                    >
                      {filteredStores.map((store) => (
                        <option key={store.serverId} value={store.serverId}>
                          {store.storeName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedStore && (
                    <div className="space-y-4">
                {/* Store Header */}
                      <div className="flex justify-between items-start mb-4 pb-4 border-b">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{selectedStore.storeName}</h3>
                            {selectedStore.critical.length > 0 && (
                              <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">
                                CRITICAL
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm flex items-center gap-1 mt-1">
                            <MapPin className="w-4 h-4" />
                            {selectedStore.address}
                          </p>
                        </div>
                      </div>

                      {/* Inventory Stats */}
                      <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="bg-red-50 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {selectedStore.critical.length}
                          </div>
                          <div className="text-sm text-gray-700">Critical</div>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-yellow-600">
                            {selectedStore.low_stock.length}
                          </div>
                          <div className="text-sm text-gray-700">Low Stock</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {selectedStore.in_stock.length}
                          </div>
                          <div className="text-sm text-gray-700">In Stock</div>
                        </div>
                      </div>

                      {/* Most Urgent Items */}
                      {(selectedStore.critical.length > 0 || selectedStore.low_stock.length > 0) && (
                        <div className="mt-6">
                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" /> Most Urgent Items
                          </h4>
                          <div className="space-y-3">
                            {[...selectedStore.critical, ...selectedStore.low_stock].slice(0, 5).map((item) => {
                              const urgency = getUrgencyTime(item);
                              const bgColor =
                                item.Quantity === 0
                                  ? 'bg-red-50'
                                  : item.Quantity <= item.ThresholdLevel
                                    ? 'bg-yellow-50'
                                    : 'bg-green-50';

                              return (
                                <div key={item.InventoryID} className={`${bgColor} rounded-lg p-3`}>
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-semibold text-gray-800">{item.ItemName}</p>
                                      <p className="text-sm text-gray-600">
                                        {item.Quantity} {item.ItemType}
                                        {item.Quantity !== 1 ? 's' : ''} remaining
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-semibold text-red-600">
                                        ⏱ {urgency.label}
                                      </p>
                                      <p className="text-xs text-gray-500">until empty</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="mt-6">
                        <h4 className="font-semibold text-gray-800 mb-3">Overall Stock by Item</h4>
                        <div className="space-y-2">
                          {overallItems.map((item) => {
                            const statusClass =
                              item.Quantity === 0
                                ? 'bg-red-100 text-red-700'
                                : item.Quantity <= item.ThresholdLevel
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700';
                            const statusLabel =
                              item.Quantity === 0
                                ? 'Critical'
                                : item.Quantity <= item.ThresholdLevel
                                ? 'Low'
                                : 'OK';

                            return (
                              <div
                                key={item.InventoryID}
                                className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3"
                              >
                                <div>
                                  <p className="font-medium text-gray-800">{item.ItemName}</p>
                                  <p className="text-xs text-gray-500">Threshold: {item.ThresholdLevel}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-gray-900">{item.Quantity}</p>
                                  <span className={`text-xs px-2 py-1 rounded ${statusClass}`}>{statusLabel}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {selectedStore.critical.length === 0 && selectedStore.low_stock.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <p>All items are adequately stocked</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        ) : dashboardView === 'routing' ? (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Open Plans</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {plans.filter((plan) => plan.status !== 'delivered').length}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">In Transit</p>
                <p className="text-2xl font-semibold text-blue-700">{inTransitCount}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Critical Destinations</p>
                <p className="text-2xl font-semibold text-red-700">{criticalCount}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Route className="h-5 w-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Create Route</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="routing-source-store" className="mb-1 block text-sm font-medium text-slate-700">Source Store</label>
                    <select
                      id="routing-source-store"
                      value={sourceStoreId}
                      onChange={(e) => setSourceStoreId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    >
                      {filteredStores.map((store) => (
                        <option key={store.serverId} value={store.serverId}>
                          {store.storeName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="routing-destination-store" className="mb-1 block text-sm font-medium text-slate-700">Destination Store</label>
                    <select
                      id="routing-destination-store"
                      value={destinationStoreId}
                      onChange={(e) => setDestinationStoreId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    >
                      {filteredStores.map((store) => (
                        <option key={store.serverId} value={store.serverId}>
                          {store.storeName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="routing-supply-item" className="mb-1 block text-sm font-medium text-slate-700">Supply Item</label>
                    <select
                      id="routing-supply-item"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    >
                      {sourceItems.map((item) => (
                        <option key={item.InventoryID} value={item.ItemName}>
                          {item.ItemName} (Available: {item.Quantity})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="routing-quantity" className="mb-1 block text-sm font-medium text-slate-700">Quantity</label>
                      <input
                        id="routing-quantity"
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label htmlFor="routing-eta-days" className="mb-1 block text-sm font-medium text-slate-700">ETA (days)</label>
                      <input
                        id="routing-eta-days"
                        type="number"
                        min={1}
                        value={etaDays}
                        onChange={(e) => setEtaDays(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                  </div>

                  {formError && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {formError}
                    </div>
                  )}

                  <button
                    onClick={createRoutePlan}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                  >
                    <Send className="h-4 w-4" /> Plan Route
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Route Guidance</h2>

                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Destination Risk</p>
                    <div className="mt-2 flex items-center gap-2">
                      {destinationPriority === 'critical' ? (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      ) : destinationPriority === 'high' ? (
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                      <p className="font-medium text-slate-900">
                        {destinationPriority === 'critical'
                          ? 'Critical: destination is out of stock'
                          : destinationPriority === 'high'
                          ? 'High: destination is near threshold'
                          : 'Normal: destination has healthy stock'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Suggested Transfer</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{suggestedQuantity}</p>
                    <p className="text-sm text-slate-600">units of {itemName || 'selected item'}</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <p><span className="font-medium">From:</span> {sourceStore?.storeName || 'N/A'}</p>
                    <p><span className="font-medium">To:</span> {destinationStore?.storeName || 'N/A'}</p>
                    <p><span className="font-medium">Source stock:</span> {sourceItem?.Quantity ?? 0}</p>
                    <p><span className="font-medium">Destination stock:</span> {destinationItem?.Quantity ?? 0}</p>
                    <p><span className="font-medium">Destination threshold:</span> {destinationItem?.ThresholdLevel ?? 0}</p>
                  </div>
                </div>
              </section>
            </div>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Planned Routes</h2>

              {plans.length === 0 ? (
                <p className="text-sm text-slate-600">No routing plans yet. Create one above.</p>
              ) : (
                <div className="space-y-3">
                  {plans.map((plan) => (
                    <div key={plan.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">
                            {plan.itemName} x {plan.quantity}
                          </p>
                          <p className="text-sm text-slate-600">
                            {findStoreName(plan.sourceStoreId)} {'->'} {findStoreName(plan.destinationStoreId)}
                          </p>
                          <p className="text-xs text-slate-500">ETA: {plan.etaDays} day(s)</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded px-2 py-1 text-xs font-medium ${
                              plan.priority === 'critical'
                                ? 'bg-red-100 text-red-700'
                                : plan.priority === 'high'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {plan.priority.toUpperCase()}
                          </span>

                          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                            {statusLabel[plan.status]}
                          </span>

                          {plan.status === 'planned' && (
                            <button
                              onClick={() => setPlanStatus(plan.id, 'in_transit')}
                              className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                            >
                              <Truck className="h-3 w-3" /> Dispatch
                            </button>
                          )}

                          {plan.status === 'in_transit' && (
                            <button
                              onClick={() => setPlanStatus(plan.id, 'delivered')}
                              className="inline-flex items-center gap-1 rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Mark Delivered
                            </button>
                          )}

                          <button
                            onClick={() => deletePlan(plan.id)}
                            className="inline-flex items-center gap-1 rounded bg-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-300"
                          >
                            <Trash2 className="h-3 w-3" /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : dashboardView === 'scheduling' ? (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Regional Store Scheduling</h2>
                  <p className="text-sm text-slate-600">
                    Click a store to view and edit its restock cadence and per-flavor targets.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {userType === 'super_admin'
                    ? (allRegions.find((r) => r.id === selectedRegion)?.name ?? 'N/A')
                    : (assignedRegion ?? 'N/A')}
                </span>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-12 gap-3 border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <p className="col-span-4">Store</p>
                    <p className="col-span-2">Next Restock</p>
                    <p className="col-span-2">Frequency</p>
                    <p className="col-span-2">Flavor Units</p>
                    <p className="col-span-2">Inventory Risk</p>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {scheduleRows.map(({ store, schedule, plannedUnits }) => (
                      <button
                        key={store.serverId}
                        type="button"
                        onClick={() => setSelectedScheduleStoreId(store.serverId)}
                        className={`grid w-full grid-cols-12 gap-3 px-3 py-3 text-left transition hover:bg-slate-50 ${
                          selectedScheduleStore?.serverId === store.serverId ? 'bg-blue-50' : 'bg-white'
                        }`}
                      >
                        <div className="col-span-4">
                          <p className="font-medium text-slate-900">{store.storeName}</p>
                          <p className="text-xs text-slate-500">{store.address}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm font-medium text-slate-900">{schedule.nextRestockDate}</p>
                          <p className="text-xs text-slate-500">{formatRestockDistance(schedule.nextRestockDate)}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-slate-900">Every {schedule.restockEveryDays}d</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-slate-900">{plannedUnits}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-slate-900">
                            {store.critical.length > 0
                              ? `${store.critical.length} critical`
                              : store.low_stock.length > 0
                              ? `${store.low_stock.length} low`
                              : 'Healthy'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {selectedScheduleStore && selectedSchedule && (
              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{selectedScheduleStore.storeName} Schedule</h3>
                    <p className="text-sm text-slate-600">Set recurrence and flavor quantities for each restock run.</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Last updated: {new Date(selectedSchedule.updatedAt).toLocaleString()}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <label htmlFor="schedule-next-date" className="mb-1 block text-sm font-medium text-slate-700">
                        Next Restock Date
                      </label>
                      <input
                        id="schedule-next-date"
                        type="date"
                        value={selectedSchedule.nextRestockDate}
                        onChange={(e) =>
                          updateStoreSchedule(selectedScheduleStore.serverId, (current) => ({
                            ...current,
                            nextRestockDate: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>

                    <div>
                      <label htmlFor="schedule-frequency" className="mb-1 block text-sm font-medium text-slate-700">
                        Restock Frequency (days)
                      </label>
                      <input
                        id="schedule-frequency"
                        type="number"
                        min={1}
                        value={selectedSchedule.restockEveryDays}
                        onChange={(e) => {
                          const parsed = Number(e.target.value);
                          updateStoreSchedule(selectedScheduleStore.serverId, (current) => ({
                            ...current,
                            restockEveryDays: Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1,
                          }));
                        }}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>

                    <div>
                      <label htmlFor="schedule-notes" className="mb-1 block text-sm font-medium text-slate-700">
                        Schedule Notes
                      </label>
                      <textarea
                        id="schedule-notes"
                        value={selectedSchedule.notes}
                        onChange={(e) =>
                          updateStoreSchedule(selectedScheduleStore.serverId, (current) => ({
                            ...current,
                            notes: e.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        placeholder="Special delivery windows, staffing constraints, etc."
                      />
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-slate-600" />
                        <p className="text-sm font-medium text-slate-800">Upcoming Restocks</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                        {schedulePreviewDates.map((dateLabel, index) => (
                          <p key={`${dateLabel}-${index}`}>#{index + 1} {dateLabel}</p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Flavor Restock Quantities
                    </h4>
                    <div className="max-h-[440px] space-y-3 overflow-y-auto pr-1">
                      {selectedScheduleStore.inventory_items
                        .slice()
                        .sort((a, b) => a.ItemName.localeCompare(b.ItemName))
                        .map((item) => (
                          <div
                            key={item.InventoryID}
                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium text-slate-900">{item.ItemName}</p>
                              <p className="text-xs text-slate-500">
                                On hand: {item.Quantity} | Threshold: {item.ThresholdLevel}
                              </p>
                            </div>
                            <div className="w-28">
                              <input
                                type="number"
                                min={0}
                                value={selectedSchedule.flavorAmounts[item.ItemName] ?? 0}
                                onChange={(e) => {
                                  const parsed = Number(e.target.value);
                                  updateStoreSchedule(selectedScheduleStore.serverId, (current) => ({
                                    ...current,
                                    flavorAmounts: {
                                      ...current.flavorAmounts,
                                      [item.ItemName]:
                                        Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0,
                                    },
                                  }));
                                }}
                                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                                aria-label={`Restock amount for ${item.ItemName}`}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="text-xl font-medium text-gray-900">Logistics Manager Profile</h2>
              {profileLoading ? (
                <p className="mt-6 text-gray-600">Loading profile...</p>
              ) : userProfile ? (
                <>
                  <p className="mt-6 text-gray-900 font-medium">
                    {userProfile.first_name && userProfile.last_name
                      ? `${userProfile.first_name} ${userProfile.last_name}`
                      : userProfile.username}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">Role: Logistics Manager</p>
                  <p className="mt-1 text-sm text-gray-600">Username: {userProfile.username}</p>

                  {userProfile.email && (
                    <p className="mt-4 text-gray-700">Email: {userProfile.email}</p>
                  )}
                </>
              ) : null}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="text-xl font-medium text-gray-900">About Codepop</h2>
              <p className="mt-7 text-gray-600">Version 1.0.0</p>
              <p className="mt-2 text-gray-700">Your favorite soda shop, now in your pocket!</p>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full bg-white border border-gray-300 rounded-xl py-3 font-medium flex items-center justify-center gap-2 hover:bg-gray-50"
              type="button"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-around shadow-lg">
        <button
          onClick={() => setDashboardView('inventory')}
          className={`flex flex-col items-center gap-1 transition ${
            dashboardView === 'inventory'
              ? 'text-orange-500'
              : 'text-gray-600 hover:text-orange-500'
          }`}
        >
          <Package className="w-6 h-6" />
          <span className="text-xs font-medium">Inventory</span>
        </button>
        <button
          onClick={() => setDashboardView('routing')}
          className={`flex flex-col items-center gap-1 transition ${
            dashboardView === 'routing' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          <Route className="w-6 h-6" />
          <span className="text-xs font-medium">Routing</span>
        </button>
        <button
          onClick={() => setDashboardView('scheduling')}
          className={`flex flex-col items-center gap-1 transition ${
            dashboardView === 'scheduling' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          <CalendarDays className="w-6 h-6" />
          <span className="text-xs font-medium">Scheduling</span>
        </button>
        <button
          onClick={() => {
            setDashboardView('profile');
            if (!userProfile) {
              fetchUserProfile();
            }
          }}
          className={`flex flex-col items-center gap-1 transition ${
            dashboardView === 'profile' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          <User className="w-6 h-6" />
          <span className="text-xs font-medium">Profile</span>
        </button>
      </div>
    </div>
  );
}
