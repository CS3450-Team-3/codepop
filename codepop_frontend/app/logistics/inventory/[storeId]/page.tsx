'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Menu, RefreshCw, Loader2, ChevronLeft, Store,
  Pencil, Check, X, ArrowRightLeft,
} from 'lucide-react';
import Link from 'next/link';
import { getRegionalInventory, updatePeerInventoryThreshold, createTransferRequest } from '@/models/api/manager';
import { AggregateInventoryResponse, StoreInventoryResult, InventoryReportItem } from '@/models/types/inventory';
import { CreateTransferRequestPayload } from '@/models/types/transfer';
import Sidebar from '@/components/layout/Sidebar';

// ── Threshold edit cell ───────────────────────────────────────────────────────
function ThresholdCell({
  item,
  storeId,
  onSaved,
}: {
  item: InventoryReportItem;
  storeId: string;
  onSaved: (itemId: number, newThreshold: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(item.ThresholdLevel));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) return;
    setSaving(true);
    try {
      await updatePeerInventoryThreshold(storeId, item.InventoryID, parsed);
      onSaved(item.InventoryID, parsed);
      setEditing(false);
    } catch {
      // stay in editing mode on error
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setValue(String(item.ThresholdLevel));
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-violet-600 transition-colors group"
      >
        <span>min {item.ThresholdLevel}</span>
        <Pencil size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-slate-400">min</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-14 rounded-lg border border-violet-300 px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
        autoFocus
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
      />
      {saving ? (
        <Loader2 size={12} className="animate-spin text-violet-500" />
      ) : (
        <>
          <button onClick={save} className="text-green-600 hover:text-green-700"><Check size={13} /></button>
          <button onClick={cancel} className="text-slate-400 hover:text-slate-600"><X size={13} /></button>
        </>
      )}
    </div>
  );
}

// ── Transfer request modal ────────────────────────────────────────────────────
function TransferModal({
  fromStoreId,
  fromStoreName,
  item,
  allStores,
  onClose,
  onSubmitted,
}: {
  fromStoreId: string;
  fromStoreName: string;
  item: InventoryReportItem;
  allStores: [string, StoreInventoryResult][];
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [toServer, setToServer] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const otherStores = allStores.filter(([id]) => id !== fromStoreId);

  const submit = async () => {
    if (!toServer) { setError('Select a destination store.'); return; }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) { setError('Enter a valid quantity.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload: CreateTransferRequestPayload = {
        FromServer: fromStoreId,
        ToServer: toServer,
        ItemName: item.ItemName,
        Quantity: qty,
        Notes: notes,
      };
      await createTransferRequest(payload);
      onSubmitted();
    } catch {
      setError('Failed to submit request. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm px-4 pb-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Transfer Request</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Item</p>
          <p className="text-sm font-semibold text-slate-800">{item.ItemName}</p>
          <p className="text-xs text-slate-400">From: {fromStoreName}</p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Destination Store</label>
          <select
            value={toServer}
            onChange={(e) => setToServer(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            <option value="">Select store...</option>
            {otherStores.map(([id, s]) => (
              <option key={id} value={id}>
                {s.store_name || id.slice(0, 12).toUpperCase()}
                {s.store_city ? ` — ${s.store_city}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quantity</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for transfer..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          onClick={submit}
          disabled={saving}
          className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Submitting...' : 'Submit Transfer Request'}
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function StoreInventoryPage() {
  const params = useParams();
  const storeId = params.storeId as string;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aggregate, setAggregate] = useState<AggregateInventoryResponse | null>(null);
  const [items, setItems] = useState<InventoryReportItem[]>([]);
  const [store, setStore] = useState<StoreInventoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [transferItem, setTransferItem] = useState<InventoryReportItem | null>(null);
  const [transferSuccess, setTransferSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRegionalInventory();
      setAggregate(data);
      const storeData = data.results[storeId];
      if (storeData) {
        setStore(storeData);
        const sorted = [...(storeData.inventory_items ?? [])].sort((a, b) => a.Quantity - b.Quantity);
        setItems(sorted);
      }
    } catch {
      // show error state
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const handleThresholdSaved = (itemId: number, newThreshold: number) => {
    setItems((prev) => prev.map((i) => i.InventoryID === itemId ? { ...i, ThresholdLevel: newThreshold } : i));
  };

  const allStores = Object.entries(aggregate?.results ?? []) as [string, StoreInventoryResult][];
  const storeName = store?.store_name || storeId.slice(0, 12).toUpperCase();
  const storeLocation = [store?.store_city, store?.store_state].filter(Boolean).join(', ');

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
          <h1 className="text-base font-bold text-slate-900 truncate max-w-[160px]">{loading ? 'Loading...' : storeName}</h1>
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

      <main className="mx-auto max-w-2xl px-4 pb-10 pt-20 space-y-4">
        <Link href="/logistics/inventory" className="flex items-center gap-1 text-sm font-semibold text-violet-600 hover:underline">
          <ChevronLeft size={15} /> All Stores
        </Link>

        {loading ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <Loader2 size={28} className="animate-spin text-violet-500 mb-3" />
            <p className="text-sm">Loading inventory...</p>
          </div>
        ) : !store || store.error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm text-red-600">{store?.error ?? 'Store not found.'}</p>
          </div>
        ) : (
          <>
            {/* Store header card */}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Store size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{storeName}</p>
                {storeLocation && <p className="text-xs text-slate-400">{storeLocation}</p>}
              </div>
              <div className="ml-auto flex gap-2 text-xs">
                {(store.out_of_stock ?? 0) > 0 && (
                  <span className="rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-600">{store.out_of_stock} out</span>
                )}
                {(store.below_threshold ?? 0) > 0 && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-600">{store.below_threshold} low</span>
                )}
              </div>
            </div>

            {transferSuccess && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                Transfer request submitted successfully.
              </div>
            )}

            {/* Inventory table */}
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm divide-y divide-slate-50">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span>Item</span>
                <span className="text-right">Stock</span>
                <span className="text-right">Threshold</span>
                <span />
              </div>
              {items.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-400">No inventory data</p>
              ) : (
                items.map((item) => {
                  const isOut = item.Quantity === 0;
                  const isLow = !isOut && item.Quantity <= item.ThresholdLevel;
                  return (
                    <div key={item.InventoryID} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{item.ItemName}</p>
                        {item.ItemType && <p className="text-xs text-slate-400">{item.ItemType}</p>}
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        isOut ? 'bg-red-50 text-red-600' :
                        isLow ? 'bg-amber-50 text-amber-600' :
                        'bg-green-50 text-green-600'
                      }`}>
                        {item.Quantity}
                      </span>
                      <ThresholdCell item={item} storeId={storeId} onSaved={handleThresholdSaved} />
                      <button
                        onClick={() => { setTransferSuccess(false); setTransferItem(item); }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-violet-50 hover:text-violet-600 transition-colors"
                        title="Request transfer"
                      >
                        <ArrowRightLeft size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            <p className="text-center text-xs text-slate-400">Items sorted lowest stock first</p>
          </>
        )}
      </main>

      {transferItem && (
        <TransferModal
          fromStoreId={storeId}
          fromStoreName={storeName}
          item={transferItem}
          allStores={allStores}
          onClose={() => setTransferItem(null)}
          onSubmitted={() => {
            setTransferItem(null);
            setTransferSuccess(true);
          }}
        />
      )}
    </div>
  );
}
