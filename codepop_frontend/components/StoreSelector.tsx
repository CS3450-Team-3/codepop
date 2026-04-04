'use client';

import { useEffect, useState } from 'react';
import { getServers } from '@/models/api/admin';
import { Server } from '@/models/types/server';
import { Store, MapPin, Loader2, AlertCircle } from 'lucide-react';

interface StoreSelectorProps {
  onSelect: (id: string) => void;
}

export default function StoreSelector({ onSelect }: StoreSelectorProps) {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getServers();
        setServers(data);
      } catch (err) {
        setError('Could not load stores. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md text-center">
        {/* Header Section */}
        <div className="mb-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600">
            <Store size={28} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome to CodePop</h1>
          <p className="mt-2 text-slate-600">
            Select a store location to start building your custom soda.
          </p>
        </div>

        {/* Content Section */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="mb-4 animate-spin text-violet-600" size={32} />
              <p className="text-sm font-medium text-slate-500">Finding nearby stores...</p>
            </div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 p-4 text-center">
              <AlertCircle className="mx-auto mb-2 text-red-600" size={24} />
              <p className="text-sm font-medium text-red-800">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-3 text-xs font-bold uppercase tracking-wider text-red-600 hover:underline"
              >
                Try Again
              </button>
            </div>
          ) : servers.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-slate-500">No active stores found at the moment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-left text-xs font-bold uppercase tracking-widest text-slate-400">
                Available Locations
              </p>
              {servers.map((server) => (
                <button
                  key={server.ServerID}
                  onClick={() => onSelect(server.ServerID)}
                  className="group flex w-full items-center justify-between rounded-xl border border-slate-200 p-4 transition-all hover:border-violet-300 hover:bg-violet-50 hover:shadow-md active:scale-[0.98]"
                >
                  <div className="flex items-start gap-3 text-left">
                    <div className="mt-1 rounded-md bg-slate-100 p-2 text-slate-500 group-hover:bg-violet-200 group-hover:text-violet-700">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 group-hover:text-violet-900">
                        {server.StoreName || `Store #${server.ServerID.slice(0, 4)}`}
                      </div>
                      <div className="text-sm text-slate-500">
                        {typeof server.Region === 'number' ? `Region ${server.Region}` : 'Standard Location'}
                      </div>
                    </div>
                  </div>
                  <div className="text-slate-300 group-hover:text-violet-400">
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="mt-6 text-sm text-slate-400">
          Not near a CodePop? Check our <span className="underline cursor-pointer">expansion map</span>.
        </p>
      </div>
    </div>
  );
}