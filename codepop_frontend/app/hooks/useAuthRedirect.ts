import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useAuthRedirect(user: any, loading: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;

    const routes: Record<string, string> = {
      customer: "/customer/profile",
      manager: "/manage/dashboard",
      admin: "/admin",
    };

    router.replace(routes[user.user_type] || "/");
  }, [user, loading, router]);
}