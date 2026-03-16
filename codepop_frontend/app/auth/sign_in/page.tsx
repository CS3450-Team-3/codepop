'use client';

import { signIn } from '@/models/api/auth';
import { useState } from 'react';

interface SignInFormState {
    email: string;
    password: string;
    error: string | null;
    loading: boolean;
}

export default function SignInPage() {
    const [form, setForm] = useState<SignInFormState>({
        email: '',
        password: '',
        error: null,
        loading: false,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
            error: null,
        });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setForm(f => ({ ...f, loading: true, error: null }));
        try {
            await signIn(form.email, form.password);
            // Redirect or show success as needed
        } catch (err: any) {
            setForm(f => ({
                ...f,
                error: err?.message || 'Sign in failed',
                loading: false,
            }));
        }
    };

    return (
        <div className="max-w-md mx-auto p-8">
            <h1 className="text-2xl font-bold mb-6 text-center">Sign In to CodePop</h1>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor="email" className="block mb-1 font-medium">Email</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="mb-4">
                    <label htmlFor="password" className="block mb-1 font-medium">Password</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        value={form.password}
                        onChange={handleChange}
                        required
                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                {form.error && (
                    <div className="text-red-600 mb-4">{form.error}</div>
                )}
                <button
                    type="submit"
                    disabled={form.loading}
                    className={`w-full py-3 bg-blue-600 text-white rounded font-semibold transition-colors ${
                        form.loading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-700'
                    }`}
                >
                    {form.loading ? 'Signing In...' : 'Sign In'}
                </button>
            </form>
        </div>
    );
}
