// app/admin/layout.tsx
'use client';

import { useRequireAuth } from '@/app/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useRequireAuth({
    allowedRoles: ['admin', 'super_admin'],
  });

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 size={28} className="animate-spin text-violet-500" />
      </div>
    );
  }

  return <>{children}</>;
}