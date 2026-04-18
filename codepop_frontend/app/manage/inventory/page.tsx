// app/manage/inventory/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contextProviders/AuthContext';
import {
  Menu,
  RefreshCw,
  Loader2,
  Package,
  AlertTriangle,
  AlertCircle,
  Plus,
  Minus,
  RotateCcw,
  X,
  Check,
} from 'lucide-react';
import {
  getInventory,
  getInventoryReport,
  patchInventoryItem,
  updateInventoryItem,
} from '@/models/api/inventory';
import {
  Inventory,
  InventoryReportResponse,
  ItemType,
} from '@/models/types/inventory';
import Sidebar from '@/components/layout/Sidebar';

// ── Update modal ──────────────────────────────────────────────────────────────
type UpdateMode = 'usage' | 'restock';

interface UpdateModalProps {
  item: Inventory;
  mode: UpdateMode;
  onClose: () => void;
  onSuccess: (updatedItem: Inventory) => void;
}

function UpdateModal({ item, mode, onClose, onSuccess }: UpdateModalProps) {
  const [amount, setAmount] = useState(1);
  const [newTotal, setNewTotal] = useState(item.Quantity);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // For restock mode, let them set the absolute new quantity
  // For usage mode, decrement by amount
  const previewQuantity =
    mode === 'usage'
      ? Math.max(0, item.Quantity - amount)
      : newTotal;

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    setWarning(null);

    try {
      let updated: Inventory;

      if (mode === 'usage') {
        // PATCH with Quantity (absolute)
        // Alternative: could use { used_quantity: amount }
        updated = await patchInventoryItem(item.InventoryID, {
          Quantity: Math.max(0, item.Quantity - amount),
        });
      } else {
        // Full PUT to set absolute quantity
        updated = await updateInventoryItem(item.InventoryID, {
          ItemName: item.ItemName,
          ItemType: item.ItemType,
          Quantity: newTotal,
          ThresholdLevel: item.ThresholdLevel,
        });
      }

      onSuccess(updated);
      onClose();
    } catch {
      setError('Failed to update inventory. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-2xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {mode === 'usage' ? 'Report Usage' : 'Restock Item'}
            </h3>
            <p className="text-sm text-slate-500">{item.ItemName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current stock */}
        <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Current Stock</span>
            <span className="font-bold text-slate-900">{item.Quantity}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-slate-500">Threshold</span>
            <span className="font-medium text-slate-600">
              {item.ThresholdLevel}
            </span>
          </div>
        </div>

        {/* Input */}
        {mode === 'usage' ? (
          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Amount Used
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAmount((a) => Math.max(1, a - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                min={1}
                max={item.Quantity}
                value={amount}
                onChange={(e) =>
                  setAmount(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-bold text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
              <button
                onClick={() =>
                  setAmount((a) => Math.min(item.Quantity, a + 1))
                }
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              New quantity will be{' '}
              <span className="font-bold text-slate-700">
                {previewQuantity}
              </span>
            </p>
          </div>
        ) : (
          <div className="mb-4 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Set New Quantity
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setNewTotal((n) => Math.max(0, n - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  min={0}
                  value={newTotal}
                  onChange={(e) =>
                    setNewTotal(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-bold text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                />
                <button
                  onClick={() => setNewTotal((n) => n + 1)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Change of{' '}
                <span
                  className={`font-bold ${
                    newTotal - item.Quantity >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {newTotal - item.Quantity >= 0 ? '+' : ''}
                  {newTotal - item.Quantity}
                </span>{' '}
                from current stock
              </p>
            </div>
          </div>
        )}


        {/* Warning */}
        {warning && (
          <div className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            {warning}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin mx-auto" />
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Inventory row ─────────────────────────────────────────────────────────────
function InventoryRow({
  item,
  onUpdate,
}: {
  item: Inventory;
  onUpdate: (mode: UpdateMode) => void;
}) {
  const isOut = item.Quantity === 0;
  const isLow = item.Quantity <= item.ThresholdLevel;

  const pct = Math.min(
    100,
    item.ThresholdLevel > 0
      ? (item.Quantity / (item.ThresholdLevel * 3)) * 100
      : 100
  );

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isOut ? (
            <AlertCircle size={15} className="shrink-0 text-red-500" />
          ) : isLow ? (
            <AlertTriangle size={15} className="shrink-0 text-amber-500" />
          ) : (
            <Check size={15} className="shrink-0 text-green-500" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {item.ItemName}
            </p>
            <p className="text-xs text-slate-400">{item.ItemType}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Usage button */}
          <button
            onClick={() => onUpdate('usage')}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Report usage"
          >
            <Minus size={13} />
          </button>

          {/* Quantity display */}
          <div className="w-10 text-center">
            <p
              className={`text-sm font-bold ${
                isOut
                  ? 'text-red-600'
                  : isLow
                  ? 'text-amber-600'
                  : 'text-slate-900'
              }`}
            >
              {item.Quantity}
            </p>
          </div>

          {/* Restock button */}
          <button
            onClick={() => onUpdate('restock')}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-green-300 hover:bg-green-50 hover:text-green-600 transition-colors"
            title="Restock"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Stock bar */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${
            isOut
              ? 'bg-red-400'
              : isLow
              ? 'bg-amber-400'
              : 'bg-green-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-0.5 text-right text-[10px] text-slate-400">
        min {item.ThresholdLevel}
      </p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
type ItemTypeFilter = 'All' | ItemType;

const TYPE_FILTERS: ItemTypeFilter[] = [
  'All',
  'Soda',
  'Syrup',
  'Add In',
  'Physical',
];

export default function ManageInventoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [report, setReport] = useState<InventoryReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<ItemTypeFilter>('All');

  useEffect(() => {
    if (authLoading) return;
    const allowed = ['store_manager', 'admin', 'super_admin'];
    if (!user || !allowed.includes(user.user_type ?? '')) {
      router.replace('/auth/login');
    }
  }, [user, authLoading, router]);

  // Modal state
  const [modalItem, setModalItem] = useState<Inventory | null>(null);
  const [modalMode, setModalMode] = useState<UpdateMode>('usage');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [inv, rep] = await Promise.all([
        getInventory(),
        getInventoryReport(),
      ]);
      // Include ALL items from report for full picture (getInventory filters out-of-stock)
      // Use report items for display, fall back to getInventory
      setInventory(rep.inventory_items.length > 0 ? rep.inventory_items as unknown as Inventory[] : inv);
      setReport(rep);
    } catch {
      setError('Could not load inventory. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdateSuccess = useCallback((updatedItem: Inventory) => {
    setInventory((prev) =>
      prev.map((i) =>
        i.InventoryID === updatedItem.InventoryID ? updatedItem : i
      )
    );
    // Refresh report counts
    load();
  }, [load]);

  const openModal = (item: Inventory, mode: UpdateMode) => {
    setModalItem(item);
    setModalMode(mode);
  };

  const filteredInventory =
    typeFilter === 'All'
      ? inventory
      : inventory.filter((i) => i.ItemType === typeFilter);

  const sortedInventory = [...filteredInventory].sort((a, b) => {
    // Out of stock first, then low stock, then alphabetical
    if (a.Quantity === 0 && b.Quantity !== 0) return -1;
    if (b.Quantity === 0 && a.Quantity !== 0) return 1;
    const aLow = a.Quantity <= a.ThresholdLevel;
    const bLow = b.Quantity <= b.ThresholdLevel;
    if (aLow && !bLow) return -1;
    if (bLow && !aLow) return 1;
    return a.ItemName.localeCompare(b.ItemName);
  });

  return (
    <div className="min-h-screen app-bg relative">
      <header className="fixed top-0 z-40 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-base font-bold text-slate-900">Inventory</h1>
          <button
            onClick={load}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
          >
            <RefreshCw
              size={18}
              className={loading ? 'animate-spin' : ''}
            />
          </button>
        </div>

        {/* Type filter tabs */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 pt-1 scrollbar-none">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                typeFilter === f
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="relative z-10 mx-auto max-w-2xl px-4 pb-10 pt-28 space-y-4">
        {/* Summary cards */}
        {report && (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm">
              <p className="text-xl font-bold text-slate-900">
                {report.total_items}
              </p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
            <div
              className={`rounded-2xl border p-3 text-center shadow-sm ${
                report.out_of_stock > 0
                  ? 'border-red-100 bg-red-50'
                  : 'border-slate-100 bg-white'
              }`}
            >
              <p
                className={`text-xl font-bold ${
                  report.out_of_stock > 0 ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                {report.out_of_stock}
              </p>
              <p className="text-xs text-slate-500">Out of Stock</p>
            </div>
            <div
              className={`rounded-2xl border p-3 text-center shadow-sm ${
                report.below_threshold > 0
                  ? 'border-amber-100 bg-amber-50'
                  : 'border-slate-100 bg-white'
              }`}
            >
              <p
                className={`text-xl font-bold ${
                  report.below_threshold > 0
                    ? 'text-amber-600'
                    : 'text-slate-900'
                }`}
              >
                {report.below_threshold}
              </p>
              <p className="text-xs text-slate-500">Low Stock</p>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 px-1 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Minus size={11} className="text-slate-400" /> = report usage
          </span>
          <span className="flex items-center gap-1">
            <RotateCcw size={11} className="text-slate-400" /> = restock
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <Loader2
              size={28}
              className="animate-spin text-violet-500 mb-3"
            />
            <p className="text-sm">Loading inventory...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-5 text-center">
            <AlertCircle
              className="mx-auto mb-2 text-red-400"
              size={22}
            />
            <p className="text-sm font-medium text-red-700">{error}</p>
            <button
              onClick={load}
              className="mt-3 text-xs font-bold text-red-500 underline"
            >
              Try again
            </button>
          </div>
        ) : sortedInventory.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Package size={28} className="text-slate-300" />
            </div>
            <p className="text-base font-semibold text-slate-700">
              No items
              {typeFilter !== 'All' ? ` in ${typeFilter}` : ''}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm divide-y divide-slate-50">
            {sortedInventory.map((item) => (
              <InventoryRow
                key={item.InventoryID}
                item={item}
                onUpdate={(mode) => openModal(item, mode)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Update modal */}
      {modalItem && (
        <UpdateModal
          item={modalItem}
          mode={modalMode}
          onClose={() => setModalItem(null)}
          onSuccess={handleUpdateSuccess}
        />
      )}
    </div>
  );
}