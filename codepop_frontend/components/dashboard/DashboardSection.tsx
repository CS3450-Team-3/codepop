"use client";

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function DashboardSection({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">{title}</h3>
        {href && (
          <Link
            href={href}
            className="flex items-center gap-0.5 text-xs font-semibold text-violet-600 hover:underline"
          >
            View all <ChevronRight size={13} />
          </Link>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm divide-y divide-slate-50">
        {children}
      </div>
    </section>
  );
}