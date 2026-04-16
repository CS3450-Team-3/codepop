"use client";

import Link from 'next/link';
import { AlertTriangle, ChevronRight } from 'lucide-react';


export default function StatCard({
  icon,
  label,
  value,
  sub,
  accent = 'violet',
  warning = false,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'violet' | 'green' | 'amber' | 'red' | 'blue';
  warning?: boolean;
  href?: string;
}) {
  const accentClasses = {
    violet: 'bg-violet-50 text-violet-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  const content = (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-sm transition-shadow ${
        warning ? 'border-amber-200' : 'border-slate-100'
      } ${href ? 'hover:shadow-md' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentClasses[accent]}`}
        >
          {icon}
        </div>
        <div className="flex items-center gap-1">
          {warning && <AlertTriangle size={14} className="text-amber-500" />}
          {href && <ChevronRight size={14} className="text-slate-300" />}
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}