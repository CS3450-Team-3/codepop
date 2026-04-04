// app/hooks/useRequireAuth.ts
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contextProviders/AuthContext';
import { UserType } from '@/models/types/user';

interface UseRequireAuthOptions {
  allowedRoles?: UserType[];
  redirectTo?: string;
}

export function useRequireAuth({
  allowedRoles,
  redirectTo = '/auth/login',
}: UseRequireAuthOptions = {}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Not logged in → send to login
    if (!user) {
      const current = window.location.pathname;
      router.replace(`${redirectTo}?next=${current}`);
      return;
    }

    // Logged in but wrong role → unauthorized
    if (allowedRoles && !allowedRoles.includes(user.user_type as UserType)) {
      router.replace('/unauthorized');
    }
  }, [user, loading, allowedRoles, redirectTo, router]);

  return { user, loading };
}