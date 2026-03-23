'use client';

import { useState } from "react";
import { useAuth } from "@/app/contextProviders/AuthContext";
import { InputField } from "@/components/inputField";
import { useAuthRedirect } from "@/app/hooks/useAuthRedirect";
import Link from 'next/link';

export default function RegisterPage() {
  const { register, user, loading: authLoading } = useAuth();
  const [form, setForm] = useState({
    username: "", password: "", confirm_password: "", first_name: "", last_name: "", email: "", user_type: "customer",
  });
  const [status, setStatus] = useState({ loading: false, error: null as string | null });

  useAuthRedirect(user, authLoading);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ loading: true, error: null });

    if (form.password !== form.confirm_password) {
      setStatus({ loading: false, error: "Passwords do not match" });
      return;
    }

    try {
      await register(form);
    } catch (err: any) {
      console.error(err);
      setStatus({ loading: false, error: err?.message || 'An error occurred' });
    }
  };

  const updateForm = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Create your Codepop account</h1>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="grid grid-cols-2 gap-4">
          <InputField label="First Name" onChange={e => updateForm('first_name', e.target.value)} />
          <InputField label="Last Name" onChange={e => updateForm('last_name', e.target.value)} />
        </div>
        
        <InputField label="Username" onChange={e => updateForm('username', e.target.value)} />
        <InputField label="Password" type="password" onChange={e => updateForm('password', e.target.value)} />
        <InputField label="Confirm Password" type="password" onChange={e => updateForm('confirm_password', e.target.value)} />
        <InputField label="Email" type="email" onChange={e => updateForm('email', e.target.value)} />

        {status.error && <p className="text-sm text-red-600">{status.error}</p>}

        <button type="submit" className="w-full flex justify-center py-2.5 px-4 rounded-lg shadow-sm text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors">
          Create Account
        </button>
        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-violet-600 hover:text-violet-500">
            Log in
          </Link>
        </p>
      </form>
    </>
  );
}