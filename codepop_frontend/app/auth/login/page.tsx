'use client';

import { useAuth } from '@/app/contextProviders/AuthContext';
import { useState } from 'react';
import Link from 'next/link';
import { useAuthRedirect } from '@/app/hooks/useAuthRedirect';
import { InputField } from '@/components/inputField';

export default function LoginPage() {
  const { login, user, loading: authLoading } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [status, setStatus] = useState({ loading: false, error: null as string | null });

  useAuthRedirect(user, authLoading);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ loading: true, error: null });
    try {
      await login(form.username, form.password);
    } catch (err: any) {
      // TODO: this requires the backend to return meaningful error messages, otherwise we should probably just display a generic "invalid credentials" message for any 400/401 error
      setStatus({ loading: false, error: err?.message || 'Invalid credentials' });
    }
  };

  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Log in to your account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          label="Username"
          name="username"
          type="text"
          required
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <InputField
          label="Password"
          name="password"
          type="password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        {status.error && <p className="text-sm text-red-600">{status.error}</p>}

        <button
          type="submit"
          disabled={status.loading}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 transition-colors"
        >
          {status.loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
      
      <p className="mt-6 text-center text-sm text-slate-600">
        Don't have an account?{' '}
        <Link href="/auth/register" className="font-medium text-violet-600 hover:text-violet-500">
          Create one for free
        </Link>
      </p>
    </>
  );
}