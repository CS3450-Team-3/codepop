'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getGlobalRevenues } from '@/models/api/revenue';
import { GlobalRevenueResponse, StoreRevenueInfo, Revenue } from '@/models/types/revenue';
import { Globe, DollarSign, AlertCircle, MapPin, Building2, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

const GlobalRevenuePage = () => {
  const [data, setData] = useState<GlobalRevenueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRegions, setExpandedRegions] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getGlobalRevenues();
      setData(result);
      // Expand all regions by default
      const initialExpanded: Record<string, boolean> = {};
      Object.keys(result.results).forEach(region => {
        initialExpanded[region] = true;
      });
      setExpandedRegions(initialExpanded);
    } catch (err) {
      setError('Failed to load global revenue data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleRegion = (region: string) => {
    setExpandedRegions(prev => ({ ...prev, [region]: !prev[region] }));
  };

  const calculateStoreStats = (store: StoreRevenueInfo) => {
    if ('error' in store.Revenues) return { total: 0, count: 0, error: store.Revenues.error };
    const revenues = store.Revenues as Revenue[];
    const total = revenues.reduce((acc, rev) => acc + (rev.Refunded ? 0 : (rev.TotalAmount || 0)), 0);
    return { total, count: revenues.length, error: null };
  };

  const calculateRegionStats = (regionName: string) => {
    if (!data) return { total: 0, storeCount: 0 };
    const stores = data.results[regionName];
    let total = 0;
    let storeCount = 0;
    Object.values(stores).forEach(store => {
      const stats = calculateStoreStats(store);
      total += stats.total;
      storeCount++;
    });
    return { total, storeCount };
  };

  const calculateGlobalTotal = () => {
    if (!data) return 0;
    let total = 0;
    Object.keys(data.results).forEach(regionName => {
      total += calculateRegionStats(regionName).total;
    });
    return total;
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center app-bg">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center app-bg p-4">
        <AlertCircle className="mb-4 h-16 w-16 text-red-500" />
        <h1 className="text-2xl font-bold text-slate-800">Oops! Something went wrong.</h1>
        <p className="text-slate-600">{error || 'Could not fetch data.'}</p>
        <button 
          onClick={fetchData}
          className="mt-6 rounded-xl bg-violet-600 px-6 py-2 font-bold text-white transition-colors hover:bg-violet-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const globalTotal = calculateGlobalTotal();

  return (
    <div className="min-h-screen app-bg relative">
      <Header
        onMenuClick={() => setSidebarOpen(true)}
        title="Global Revenue"
        rightAction={
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        }
      />

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="mx-auto max-w-7xl px-4 pb-10 pt-20">
        {/* Page Header Content */}
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-violet-600">
              <Globe size={20} />
              <span className="text-sm font-bold uppercase tracking-wider">Super Admin Overview</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Global Revenue</h1>
            <p className="mt-2 text-lg text-slate-600">Performance insights across all regional stores.</p>
          </div>
          
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-green-100 p-3 text-green-600">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase">Total Global Revenue</p>
                <p className="text-3xl font-bold text-slate-900">${globalTotal.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Regions */}
        <div className="space-y-8">
          {data && Object.keys(data.results).sort().map(regionName => {
            const regionStats = calculateRegionStats(regionName);
            const stores = data.results[regionName];
            const isExpanded = expandedRegions[regionName];

            return (
              <div key={regionName} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
                {/* Region Header */}
                <button 
                  onClick={() => toggleRegion(regionName)}
                  className="flex w-full items-center justify-between bg-slate-50/50 p-6 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-violet-100 p-2 text-violet-600">
                      <MapPin size={20} />
                    </div>
                    <div className="text-left">
                      <h2 className="text-xl font-bold text-slate-900">{regionName}</h2>
                      <p className="text-sm text-slate-500">{regionStats.storeCount} active stores in region</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-semibold uppercase text-slate-400">Regional Revenue</p>
                      <p className="text-lg font-bold text-slate-900">${regionStats.total.toFixed(2)}</p>
                    </div>
                    {isExpanded ? <ChevronDown className="text-slate-400" /> : <ChevronRight className="text-slate-400" />}
                  </div>
                </button>

                {/* Stores List */}
                {isExpanded && (
                  <div className="border-t border-slate-100">
                    <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0">
                      {Object.values(stores).sort((a,b) => a.StoreName.localeCompare(b.StoreName)).map(store => {
                        const stats = calculateStoreStats(store);
                        return (
                          <div key={store.ServerID} className="p-6 transition-colors hover:bg-slate-50/30">
                            <div className="mb-4 flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-slate-100 p-2 text-slate-500">
                                  <Building2 size={18} />
                                </div>
                                <div>
                                  <h3 className="font-bold text-slate-900">{store.StoreName}</h3>
                                  <p className="text-xs text-slate-500">{store.ServerID}</p>
                                </div>
                              </div>
                              {stats.error ? (
                                <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                                  Offline
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/10">
                                  Connected
                                </span>
                              )}
                            </div>
                            
                            {stats.error ? (
                              <div className="flex items-center gap-2 text-sm text-red-500 italic">
                                <AlertCircle size={14} />
                                <span>{stats.error}</span>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-xl bg-slate-50 p-4">
                                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Revenue</p>
                                  <p className="text-xl font-bold text-slate-900">${stats.total.toFixed(2)}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-4">
                                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Orders</p>
                                  <p className="text-xl font-bold text-slate-900">{stats.count}</p>
                                </div>
                              </div>
                            )}
                            <p className="mt-4 text-xs text-slate-400">{store.StoreAddress}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default GlobalRevenuePage;
