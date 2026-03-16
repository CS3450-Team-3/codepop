'use client';

import { signUp } from '@/models/api/auth';
import { useState } from 'react';

export default function SignUpPage() {
    const [form, setForm] = useState({
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        try {
            await signUp(form.email, form.password, form.firstName, form.lastName);
            setSuccess('Sign up successful!');
            setForm({
                email: '',
                firstName: '',
                lastName: '',
                password: '',
                confirmPassword: '',
            });
        } catch (err: any) {
            setError(err.message || 'Sign up failed');
        }
    };

    return (
        <div className="max-w-md mx-auto mt-8 p-8 bg-white rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6 text-center">Sign Up</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="email">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        autoComplete="email"
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="firstName">
                        First Name
                    </label>
                    <input
                        id="firstName"
                        type="text"
                        name="firstName"
                        value={form.firstName}
                        onChange={handleChange}
                        required
                        autoComplete="given-name"
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="lastName">
                        Last Name
                    </label>
                    <input
                        id="lastName"
                        type="text"
                        name="lastName"
                        value={form.lastName}
                        onChange={handleChange}
                        required
                        autoComplete="family-name"
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="password">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        required
                        autoComplete="new-password"
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="confirmPassword">
                        Confirm Password
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        required
                        autoComplete="new-password"
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button
                    type="submit"
                    className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition"
                >
                    Sign Up
                </button>
                {error && (
                    <div className="text-red-600 mt-2 text-center">{error}</div>
                )}
                {success && (
                    <div className="text-green-600 mt-2 text-center">{success}</div>
                )}
            </form>
        </div>
    );
}