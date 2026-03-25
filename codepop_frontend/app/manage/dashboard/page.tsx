'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'; // Backend URL

interface InventoryItem {
  InventoryID: number;
  ItemName: string;
  Quantity: number;
  ThresholdLevel: number;
}

interface Order {
  OrderID: string;
  UserID: string;
  OrderStatus: string;
  PaymentStatus: string;
  TotalAmount: number;
  Drinks: Array<{ name: string; size: string; price: number }>;
  CustomerName?: string;
  CustomerPhone?: string;
}

interface InventoryReport {
  inventory_items: InventoryItem[];
  total_items: number;
  out_of_stock: number;
  below_threshold: number;
}

interface RevenueRecord {
  RevenueID: string;
  OrderID: string;
  TotalAmount: number;
  SaleDate: string;
  Refunded: boolean;
}

interface ManagerProfile {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function StoreManagerDashboard() {
  const router = useRouter();
  const storeId = 'Downtown Plaza';

  const [inventoryReport, setInventoryReport] = useState<InventoryReport | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [revenues, setRevenues] = useState<RevenueRecord[]>([]);
  const [managerProfile, setManagerProfile] = useState<ManagerProfile | null>(null);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [revenueError, setRevenueError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('active');
  const [dashboardView, setDashboardView] = useState<'report' | 'revenue' | 'profile'>('report');
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | ''>('');
  const [usedQuantity, setUsedQuantity] = useState('1');
  const [usageError, setUsageError] = useState<string | null>(null);
  const [usageMessage, setUsageMessage] = useState<string | null>(null);
  const [isSubmittingUsage, setIsSubmittingUsage] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const storeName = 'Downtown Plaza';

  useEffect(() => {
    setLoading(true);
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    setInventoryError(null);
    setOrdersError(null);
    setRevenueError(null);
    setProfileError(null);

    try {
      const token = localStorage.getItem('access_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Fetch live inventory report for low-stock and usage updates.
      try {
        const inventoryRes = await fetch(`${BASE_URL}/backend/inventory/report/`, { headers });
        if (!inventoryRes.ok) {
          const inventoryMessage = `Couldn't get inventory report. Error code: ${inventoryRes.status}`;
          setInventoryReport({
            inventory_items: [],
            total_items: 0,
            out_of_stock: 0,
            below_threshold: 0,
          });
          setInventoryError(inventoryMessage);
        } else {
          setInventoryReport(await inventoryRes.json());
        }
      } catch {
        setInventoryReport({
          inventory_items: [],
          total_items: 0,
          out_of_stock: 0,
          below_threshold: 0,
        });
        setInventoryError("Couldn't get inventory report. Error code: network_error");
      }

      // Revenue is optional for initial dashboard load; show a revenue-tab message on failure.
      try {
        const revenueRes = await fetch(`${BASE_URL}/backend/revenues/`, { headers });
        if (!revenueRes.ok) {
          setRevenues([]);
          setRevenueError(`Couldn't get revenue. Error code: ${revenueRes.status}`);
        } else {
          setRevenues(await revenueRes.json());
        }
      } catch {
        setRevenues([]);
        setRevenueError("Couldn't get revenue. Error code: network_error");
      }

      // Profile data for manager profile tab.
      try {
        const profileRes = await fetch(`${BASE_URL}/backend/users/me/`, { headers });
        if (!profileRes.ok) {
          setManagerProfile(null);
          setProfileError(`Couldn't get manager profile. Error code: ${profileRes.status}`);
        } else {
          setManagerProfile(await profileRes.json());
        }
      } catch {
        setManagerProfile(null);
        setProfileError("Couldn't get manager profile. Error code: network_error");
      }

      try {
        const ordersRes = await fetch(`${BASE_URL}/backend/orders/`, { headers });
        if (!ordersRes.ok) {
          const ordersMessage = `Couldn't get orders. Error code: ${ordersRes.status}`;
          setOrders([]);
          setOrdersError(ordersMessage);
        } else {
          setOrders(await ordersRes.json());
        }
      } catch {
        setOrders([]);
        setOrdersError("Couldn't get orders. Error code: network_error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${BASE_URL}/backend/orders/${orderId}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ OrderStatus: newStatus })
      });
      if (response.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Failed to update order status', err);
    }
  };

  const openUsageModal = () => {
    const firstInventoryId = inventoryReport?.inventory_items?.[0]?.InventoryID;
    setSelectedInventoryId(firstInventoryId ?? '');
    setUsedQuantity('1');
    setUsageError(null);
    setShowUsageModal(true);
  };

  const submitUsageReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUsageError(null);
    setUsageMessage(null);

    if (selectedInventoryId === '') {
      setUsageError('Please select a stock item.');
      return;
    }

    const parsedUsedQuantity = Number(usedQuantity);
    if (!Number.isInteger(parsedUsedQuantity) || parsedUsedQuantity <= 0) {
      setUsageError('Used quantity must be a positive whole number.');
      return;
    }

    try {
      setIsSubmittingUsage(true);

      const token = localStorage.getItem('access_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${BASE_URL}/backend/inventory/${selectedInventoryId}/`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ used_quantity: parsedUsedQuantity }),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detailText =
          responseData?.details && typeof responseData.details === 'object'
            ? JSON.stringify(responseData.details)
            : '';
        const apiError = responseData?.error || 'Failed to update inventory.';
        throw new Error(detailText ? `${apiError} ${detailText}` : apiError);
      }

      setUsageMessage(
        responseData?.warning
          ? `Inventory updated. ${responseData.warning}`
          : 'Inventory updated successfully.'
      );
      setShowUsageModal(false);
      await fetchDashboardData();
    } catch (err) {
      setUsageError(err instanceof Error ? err.message : 'Failed to update inventory.');
    } finally {
      setIsSubmittingUsage(false);
    }
  };

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }

    try {
      setIsSigningOut(true);

      const accessToken = localStorage.getItem('access_token');
      const refreshToken =
        localStorage.getItem('refresh_token') ||
        localStorage.getItem('refresh');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      // Best-effort server logout to blacklist refresh token; always clear local auth.
      await fetch(`${BASE_URL}/backend/auth/logout/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ refresh: refreshToken }),
      }).catch(() => null);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('refresh');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('user_id');
      setIsSigningOut(false);
      router.push('/auth/sign_in');
    }
  };

  if (loading) {
    return <div className="p-4 text-center">{error ? error : 'Loading dashboard...'}</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">{error}</div>;
  }

  // Calculate order counts by status
  const pendingCount = orders.filter(o => o.OrderStatus === 'Pending').length;
  const preparingCount = orders.filter(o => o.OrderStatus === 'Processing').length;
  const readyCount = orders.filter(o => o.OrderStatus === 'Ready').length;
  const completedCount = orders.filter(o => o.OrderStatus === 'Completed').length;

  // Get low stock items
  const sortedInventoryItems = [...(inventoryReport?.inventory_items || [])].sort((a, b) =>
    a.ItemName.localeCompare(b.ItemName)
  );

  const lowStockItems = sortedInventoryItems.filter(
    item => item.Quantity <= item.ThresholdLevel
  );

  const sortedRevenue = [...revenues].sort(
    (a, b) => new Date(b.SaleDate).getTime() - new Date(a.SaleDate).getTime()
  );
  const totalRevenue = revenues.reduce((sum, revenue) => sum + Number(revenue.TotalAmount || 0), 0);
  const refundedRevenue = revenues
    .filter((revenue) => revenue.Refunded)
    .reduce((sum, revenue) => sum + Number(revenue.TotalAmount || 0), 0);
  const refundedCount = revenues.filter((revenue) => revenue.Refunded).length;
  const displayName =
    managerProfile && (managerProfile.first_name || managerProfile.last_name)
      ? `${managerProfile.first_name} ${managerProfile.last_name}`.trim()
      : managerProfile?.username || 'Store Manager';

  // Filter orders for active/completed tabs
  const activeOrders = orders.filter(o => o.OrderStatus !== 'Completed');
  const completedOrders = orders.filter(o => o.OrderStatus === 'Completed');
  const displayedOrders = activeTab === 'active' ? activeOrders : completedOrders;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Store Manager Dashboard</h1>
          <p className="text-sm text-gray-600">{storeName}</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="bg-white border-2 border-gray-300 text-gray-800 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-gray-50"
        >
          <span className="material-icons">refresh</span> Refresh
        </button>
      </div>

      <div className="p-6 pb-28 space-y-6">
        {dashboardView === 'report' ? (
          <>
            {/* Action Buttons */}
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={openUsageModal}
                className="bg-white border-2 border-gray-300 text-gray-800 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-gray-50"
              >
                <span className="material-icons">assignment</span> Report Usage
              </button>
            </div>

            {usageMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {usageMessage}
              </div>
            )}

            {inventoryError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {inventoryError}
              </div>
            )}

            {ordersError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {ordersError}
              </div>
            )}

            {/* Low Stock Alerts */}
            {lowStockItems.length > 0 && (
              <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-orange-600 text-xl">⚠️</span>
                  <h2 className="font-semibold text-orange-800">Low Stock Alerts</h2>
                </div>
                <div className="space-y-3">
                  {lowStockItems.slice(0, 3).map((item) => (
                    <div key={item.InventoryID} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-800">{item.ItemName}</p>
                        <p className="text-xs text-gray-600">Flavor Shots</p>
                      </div>
                      <span className="bg-white text-gray-800 px-3 py-1 rounded text-sm font-medium">
                        {item.Quantity} bottles
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Order Status Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                <div className="text-4xl font-bold text-orange-500">{pendingCount}</div>
                <p className="text-gray-600 mt-2">Pending</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                <div className="text-4xl font-bold text-blue-500">{preparingCount}</div>
                <p className="text-gray-600 mt-2">Preparing</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                <div className="text-4xl font-bold text-green-500">{readyCount}</div>
                <p className="text-gray-600 mt-2">Ready</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                <div className="text-4xl font-bold text-gray-600">{completedCount}</div>
                <p className="text-gray-600 mt-2">Completed</p>
              </div>
            </div>

            {/* Orders Section */}
            <div className="bg-white rounded-lg shadow-sm">
              {/* Tab Buttons */}
              <div className="flex border-b">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`flex-1 py-3 text-center font-medium ${
                    activeTab === 'active'
                      ? 'border-b-2 border-orange-500 text-orange-600'
                      : 'text-gray-600'
                  }`}
                >
                  Active ({activeOrders.length})
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`flex-1 py-3 text-center font-medium ${
                    activeTab === 'completed'
                      ? 'border-b-2 border-green-500 text-green-600'
                      : 'text-gray-600'
                  }`}
                >
                  Completed ({completedOrders.length})
                </button>
              </div>

              {/* Orders List */}
              <div className="divide-y">
                {displayedOrders.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No orders found</div>
                ) : (
                  displayedOrders.slice(0, 5).map((order) => (
                    <div key={order.OrderID} className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">Order #{order.OrderID}</h3>
                          <p className="text-sm text-gray-600">{order.CustomerName || 'Customer'}</p>
                          <p className="text-xs text-gray-500">{order.CustomerPhone || '(555) 123-4567'}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded text-xs font-semibold ${
                            order.OrderStatus === 'Pending'
                              ? 'bg-orange-100 text-orange-800'
                              : order.OrderStatus === 'Processing'
                              ? 'bg-blue-100 text-blue-800'
                              : order.OrderStatus === 'Ready'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {order.OrderStatus.toUpperCase()}
                        </span>
                      </div>

                      {/* Order Items */}
                      {order.Drinks && order.Drinks.length > 0 && (
                        <div className="bg-gray-50 p-3 rounded mb-3 text-sm">
                          {order.Drinks.map((drink, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>
                                1x {drink.name} ({drink.size})
                              </span>
                              <span className="font-medium">${(drink.price || 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Order Total */}
                      <div className="flex justify-between items-end mb-3">
                        <div></div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">Total:</p>
                          <p className="text-lg font-bold">${(order.TotalAmount || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : dashboardView === 'revenue' ? (
          <>
            {revenueError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {revenueError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                <div className="text-3xl font-bold text-emerald-600">${totalRevenue.toFixed(2)}</div>
                <p className="text-gray-600 mt-2">Total Revenue</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                <div className="text-3xl font-bold text-red-500">${refundedRevenue.toFixed(2)}</div>
                <p className="text-gray-600 mt-2">Refunded Amount</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h2 className="font-semibold text-lg">Revenue Records</h2>
                <span className="text-sm text-gray-500">Refunded: {refundedCount}</span>
              </div>
              <div className="divide-y">
                {sortedRevenue.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No revenue records found for this store</div>
                ) : (
                  sortedRevenue.map((revenue) => (
                    <div key={revenue.RevenueID} className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-800">Order {revenue.OrderID}</p>
                        <p className="text-xs text-gray-500">{new Date(revenue.SaleDate).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">${Number(revenue.TotalAmount || 0).toFixed(2)}</p>
                        <p className={`text-xs ${revenue.Refunded ? 'text-red-600' : 'text-emerald-600'}`}>
                          {revenue.Refunded ? 'Refunded' : 'Captured'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="text-xl font-medium text-gray-900">Store Manager Profile</h2>
              <p className="mt-6 text-gray-900 font-medium">{displayName}</p>
              <p className="mt-1 text-sm text-gray-600">Role: Store Manager</p>
              <p className="mt-1 text-sm text-gray-600">Store ID: {storeId || 'N/A'}</p>

              {managerProfile?.email && (
                <p className="mt-4 text-gray-700">Email: {managerProfile.email}</p>
              )}

              {profileError && (
                <p className="mt-4 text-sm text-red-600">{profileError}</p>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="text-xl font-medium text-gray-900">About Codepop</h2>
              <p className="mt-7 text-gray-600">Version 1.0.0</p>
              <p className="mt-2 text-gray-700">Your favorite soda shop, now in your pocket!</p>
            </div>

            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full bg-white border border-gray-300 rounded-xl py-3 font-medium flex items-center justify-center gap-2 hover:bg-gray-50"
              type="button"
            >
              <span className="material-icons text-base">logout</span>
              <span>{isSigningOut ? 'Signing Out...' : 'Sign Out'}</span>
            </button>
          </>
        )}
      </div>

      {showUsageModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={submitUsageReport}
            className="w-full max-w-md bg-white rounded-xl shadow-lg p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Report Inventory Usage</h2>
              <button
                type="button"
                onClick={() => {
                  setShowUsageModal(false);
                  setUsageError(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label htmlFor="usage-item" className="block text-sm font-medium text-gray-700">Stock Item</label>
              <select
                id="usage-item"
                value={selectedInventoryId}
                onChange={(e) => setSelectedInventoryId(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              >
                {sortedInventoryItems.map((item) => (
                  <option key={item.InventoryID} value={item.InventoryID}>
                    {item.ItemName} (In stock: {item.Quantity})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="usage-quantity" className="block text-sm font-medium text-gray-700">Used Quantity</label>
              <input
                id="usage-quantity"
                type="number"
                min={1}
                step={1}
                value={usedQuantity}
                onChange={(e) => setUsedQuantity(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              />
            </div>

            {usageError && (
              <p className="text-sm text-red-600">{usageError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowUsageModal(false);
                  setUsageError(null);
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingUsage}
                className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 disabled:opacity-60"
              >
                {isSubmittingUsage ? 'Saving...' : 'Update Stock'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-6 py-4 flex justify-around">
        <button
          onClick={() => setDashboardView('revenue')}
          className={`flex flex-col items-center gap-1 ${
            dashboardView === 'revenue' ? 'text-emerald-600' : 'text-gray-600 hover:text-emerald-600'
          }`}
        >
          <span className="material-icons">attach_money</span>
          <span className="text-xs">Revenue</span>
        </button>
        <button
          onClick={() => setDashboardView('report')}
          className={`flex flex-col items-center gap-1 ${
            dashboardView === 'report' ? 'text-orange-500' : 'text-gray-600 hover:text-orange-500'
          }`}
        >
          <span className="material-icons">inventory</span>
          <span className="text-xs">Report</span>
        </button>
        <button
          onClick={() => setDashboardView('profile')}
          className={`flex flex-col items-center gap-1 ${
            dashboardView === 'profile' ? 'text-fuchsia-600' : 'text-gray-600 hover:text-blue-500'
          }`}
        >
          <span className="material-icons">person</span>
          <span className="text-xs">Profile</span>
        </button>
      </div>
    </div>
  );
}
