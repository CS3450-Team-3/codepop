// components/dashboard/StatusBadge.tsx
export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    planned: 'bg-slate-100 text-slate-600 border-slate-200',
    in_transit: 'bg-blue-50 text-blue-600 border-blue-100',
    delivered: 'bg-green-50 text-green-600 border-green-100',
    critical: 'bg-red-50 text-red-600 border-red-100',
    warning: 'bg-amber-50 text-amber-600 border-amber-100',
  };

  const key = status.toLowerCase().replace(' ', '_');
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles[key] || styles.planned}`}>
      {status}
    </span>
  );
}

// components/dashboard/DashboardHeader.tsx
import { Menu, RefreshCw } from 'lucide-react';

export function DashboardHeader({ title, loading, onRefresh, onOpenSidebar }: any) {
  return (
    <header className="fixed top-0 z-40 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4">
        <button onClick={onOpenSidebar} className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100">
          <Menu size={22} />
        </button>
        <h1 className="text-base font-bold text-slate-900">{title}</h1>
        <button onClick={onRefresh} disabled={loading} className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </header>
  );
}