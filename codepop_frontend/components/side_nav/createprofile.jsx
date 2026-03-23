import React, { useState } from "react";

export default function CreateProfile({ onCreate }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    avatar: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Simple validation
    if (!form.name || !form.email || !form.password) {
      return setError("Please fill in all required fields");
    }

    setError("");

    // Send data upward or to API
    if (onCreate) onCreate(form);

    console.log("Profile created:", form);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-md p-6 rounded-xl shadow-md"
      >
        <h1 className="text-xl font-semibold mb-4 text-center">
          Create Profile
        </h1>

        {/* Name */}
        <div className="mb-3">
          <label className="text-sm text-gray-600">Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full border p-2 rounded mt-1"
            placeholder="Enter your name"
          />
        </div>

        {/* Email */}
        <div className="mb-3">
          <label className="text-sm text-gray-600">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="w-full border p-2 rounded mt-1"
            placeholder="Enter your email"
          />
        </div>

        {/* Password */}
        <div className="mb-3">
          <label className="text-sm text-gray-600">Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            className="w-full border p-2 rounded mt-1"
            placeholder="Create a password"
          />
        </div>

        {/* Avatar */}
        <div className="mb-4">
          <label className="text-sm text-gray-600">
            Profile Picture URL (optional)
          </label>
          <input
            type="text"
            name="avatar"
            value={form.avatar}
            onChange={handleChange}
            className="w-full border p-2 rounded mt-1"
            placeholder="https://..."
          />
        </div>

        {/* Preview Avatar */}
        {form.avatar && (
          <div className="flex justify-center mb-4">
            <img
              src={form.avatar}
              alt="preview"
              className="w-16 h-16 rounded-full object-cover"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm mb-3">{error}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-purple-600 text-white py-2 rounded-lg"
        >
          Create Account
        </button>
      </form>
    </div>
  );
};