// app/hooks/useAuthRedirect.ts
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User } from '@/models/types/user';

const ROLE_HOME: Record<string, string> = {
  customer:           '/',
  store_manager:      '/manage/dashboard',
  logistics_manager:  '/manage/dashboard',
  admin:              '/admin/dashboard',
  super_admin:        '/admin/dashboard',
};

export function useAuthRedirect(user: User | null, loading: boolean) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (loading || !user) return;

    // If they were trying to go somewhere specific before being redirected
    // to login, send them there — otherwise send them to their role home
    const next = searchParams.get('next');
    const destination = next ?? ROLE_HOME[user.user_type ?? ''] ?? '/';
    router.replace(destination);
  }, [user, loading, router, searchParams]);
}
