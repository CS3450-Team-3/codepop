// app/unauthorized/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { ShieldX, Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/app/contextProviders/AuthContext';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm text-center">
        {/* Icon */}
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <ShieldX size={40} className="text-red-500" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
        <p className="mt-2 text-sm text-slate-500">
          You don't have permission to view this page.
          {user && (
            <span className="block mt-1 text-xs text-slate-400">
              Signed in as{' '}
              <span className="font-semibold text-slate-600">
                {user.username}
              </span>{' '}
              ({user.user_type ?? 'unknown role'})
            </span>
          )}
        </p>

        <div className="mt-8 flex flex-col gap-2">
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-700"
          >
            <Home size={16} />
            Back to Home
          </button>
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}