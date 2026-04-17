// app/logistics/layout.tsx
'use client';

import { useRequireAuth } from '@/app/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';

export default function LogisticLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useRequireAuth({
    allowedRoles: [
      'logistics_manager',
      'admin',
      'super_admin',
    ],
  });

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center app-bg relative">
        <Loader2 size={28} className="animate-spin text-violet-500" />
      </div>
    );
  }

  return <>{children}</>;
}